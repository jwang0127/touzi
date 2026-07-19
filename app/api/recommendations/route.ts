import { NextResponse } from "next/server";

type MarketRow = {
  f12: string;
  f14: string;
  f2: number;
  f3: number;
  f8: number;
  f9: number;
  f20: number;
  f24: number;
};

const FALLBACK_POOL: MarketRow[] = [
  ["601918", "新集能源"], ["600919", "江苏银行"], ["601077", "渝农商行"],
  ["600938", "中国海油"], ["601899", "紫金矿业"], ["600219", "南山铝业"],
  ["600985", "淮北矿业"], ["601688", "华泰证券"], ["603125", "常青科技"],
  ["002151", "北斗星通"], ["603303", "得邦照明"], ["601101", "昊华能源"],
].map(([f12, f14]) => ({ f12, f14, f2: 10, f3: 0, f8: 2, f9: 20, f20: 10_000_000_000, f24: 10 }));

function average(values: number[]) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function standardDeviation(values: number[]) {
  const mean = average(values);
  return Math.sqrt(average(values.map((value) => (value - mean) ** 2)));
}

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

async function enrich(row: MarketRow) {
  const symbol = row.f12.startsWith("6") ? `sh${row.f12}` : `sz${row.f12}`;
  const response = await fetch(
    `https://web.ifzq.gtimg.cn/appstock/app/fqkline/get?param=${symbol},day,,,60,qfq`,
    { headers: { "User-Agent": "Mozilla/5.0", Referer: "https://finance.qq.com/" }, cache: "no-store" },
  );
  if (!response.ok) return null;
  const payload = await response.json();
  const stock = payload.data?.[symbol];
  const quote = stock?.qt?.[symbol] ?? [];
  const rawBars = stock?.qfqday ?? stock?.day ?? [];
  const bars = rawBars
    .map((item: unknown[]) => ({ date: String(item[0]), close: Number(item[2]) }))
    .filter((item: { close: number }) => Number.isFinite(item.close));
  if (bars.length < 40) return null;

  const closes = bars.map((item: { close: number }) => item.close);
  const latest = closes[closes.length - 1];
  const ma5 = average(closes.slice(-5));
  const ma20 = average(closes.slice(-20));
  const ma60 = average(closes.slice(-Math.min(60, closes.length)));
  const return20 = latest / closes[closes.length - 21] - 1;
  const return60 = latest / closes[0] - 1;
  const dailyChange = closes.length > 1 ? (latest / closes[closes.length - 2] - 1) * 100 : row.f3;
  const turnover = Number(quote[38]) || row.f8;
  const pe = Number(quote[52]) || row.f9;
  const dailyReturns = closes.slice(-21).slice(1).map((price, index) => price / closes.slice(-21)[index] - 1);
  const volatility20 = standardDeviation(dailyReturns);

  let trendScore = 35;
  const reasons: string[] = [];
  const risks: string[] = [];
  if (latest > ma20) { trendScore += 15; reasons.push("现价位于20日均线之上"); }
  if (ma5 > ma20) { trendScore += 15; reasons.push("5日趋势强于20日趋势"); }
  if (latest > ma60) { trendScore += 10; reasons.push("中期趋势尚未破坏"); }
  if (return20 > 0 && return20 <= 0.2) { trendScore += 10; reasons.push(`近20日上涨 ${(return20 * 100).toFixed(1)}%，未明显过热`); }
  if (return60 >= 0.05 && return60 <= 0.3) {
    trendScore += 10;
    reasons.push(`近60日涨幅 ${(return60 * 100).toFixed(1)}%`);
  }
  if (return60 < 0) { trendScore -= 15; risks.push("近60日趋势仍为负"); }
  if (return60 > 0.35) { trendScore -= 10; risks.push("近60日涨幅过大，追高风险上升"); }
  if (pe > 0 && pe <= 25) reasons.push(`动态市盈率约 ${pe.toFixed(1)} 倍`);
  if (volatility20 > 0.04) risks.push("近20日波动较大");
  if (dailyChange < -3) { trendScore -= 20; risks.push("最近交易日明显走弱"); }
  if (return20 > 0.25) { trendScore -= 20; risks.push("短期涨幅可能已经透支"); }
  if (ma5 < ma20) risks.push("短期均线仍弱于20日线");

  const lotCost = latest * 100;
  const valuationScore = pe <= 15 ? 90 : pe <= 25 ? 78 : pe <= 40 ? 58 : 38;
  const liquidityScore = turnover >= 1 && turnover <= 5 ? 85 : turnover <= 8 ? 72 : 58;
  const riskScore = volatility20 <= 0.02 ? 90 : volatility20 <= 0.03 ? 78 : volatility20 <= 0.04 ? 62 : 38;
  const normalizedTrendScore = clampScore(trendScore);
  const score = clampScore(
    normalizedTrendScore * 0.45 + valuationScore * 0.2 + liquidityScore * 0.15 + riskScore * 0.2,
  );
  const suggestedShares = Math.max(100, Math.floor((3000 * 0.8) / lotCost) * 100);
  const suggestedCost = suggestedShares * latest;
  const stopPrice = latest * 0.92;
  return {
    code: row.f12,
    symbol,
    name: row.f14,
    price: latest,
    latestDate: bars[bars.length - 1].date,
    score,
    lotCost,
    cashAfterOneLot: 3000 - lotCost,
    suggestedShares,
    suggestedCost,
    suggestedCash: 3000 - suggestedCost,
    plannedMaxLoss: (latest - stopPrice) * suggestedShares,
    ma5,
    ma20,
    ma60,
    return20,
    return60,
    pe,
    turnover,
    reasons,
    risks: risks.length ? risks : ["未发现技术面关键缺陷，但仍需核对公告"],
    coverageGap: "自动评分尚未纳入突发公告、行业政策和财报全文；采用前必须人工复核交易所披露。",
    scoreBreakdown: [
      { label: "趋势", score: normalizedTrendScore, note: "5/20/60日均线与近20日涨幅" },
      { label: "估值", score: valuationScore, note: "动态市盈率，仅作横向初筛" },
      { label: "流动性", score: liquidityScore, note: "换手率是否适合短期进出" },
      { label: "风险", score: riskScore, note: "近20日收益波动" },
    ],
    status: score >= 72 ? "CANDIDATE" : "WAIT",
    stopPrice,
    targetPrice: latest * 1.5,
  };
}

export async function GET() {
  try {
    const fields = "f12,f14,f2,f3,f8,f9,f20,f24";
    const marketUrl = `https://push2.eastmoney.com/api/qt/clist/get?pn=1&pz=1200&po=1&np=1&fltt=2&invt=2&fid=f24&fs=m:0+t:6,m:1+t:2&fields=${fields}`;
    let rows: MarketRow[] = FALLBACK_POOL;
    let sourceMode = "降级候选池复核";
    try {
      const marketResponse = await fetch(marketUrl, {
        headers: { "User-Agent": "Mozilla/5.0", Referer: "https://quote.eastmoney.com/" },
        cache: "no-store",
      });
      if (!marketResponse.ok) throw new Error("market source unavailable");
      const marketPayload = await marketResponse.json();
      if (!marketPayload.data?.diff?.length) throw new Error("market source empty");
      rows = marketPayload.data.diff;
      sourceMode = "沪深主板全市场扫描";
    } catch {
      // The live Tencent trend check below still refreshes every fallback symbol.
    }
    const filtered = rows
      .filter((row) =>
        row.f2 >= 3 && row.f2 <= 29 &&
        row.f9 > 0 && row.f9 <= 60 &&
        row.f20 >= 3_000_000_000 &&
        row.f8 >= 0.4 && row.f8 <= 10 &&
        row.f24 >= 2 && row.f24 <= 35 &&
        row.f3 > -7 && row.f3 < 7 &&
        !/ST|退/.test(row.f14) &&
        !row.f12.startsWith("68")
      )
      .slice(0, 24);

    const enriched = (await Promise.all(filtered.map(enrich)))
      .filter((candidate) => candidate !== null && candidate.lotCost <= 3000);
    const ranked = enriched
      .sort((a, b) => (b?.score ?? 0) - (a?.score ?? 0))
      .slice(0, 3);
    if (!ranked.length) throw new Error("今天没有股票通过最低筛选条件");

    return NextResponse.json({
      asOf: ranked[0]?.latestDate,
      capital: 3000,
      targetReturn: 0.5,
      minimumScore: 72,
      recommendation: ranked[0]?.score && ranked[0].score >= 72 ? ranked[0] : null,
      watchlist: ranked,
      universe: "沪深主板，排除北交所、科创板、ST、退市整理和一手超过3000元的股票",
      method: "全市场价格/估值/流动性初筛 + 腾讯前复权60日趋势复核",
      sourceMode,
      notice: "50%是高风险目标线，不是预计收益或保证。",
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "推荐失败" }, { status: 503 });
  }
}
