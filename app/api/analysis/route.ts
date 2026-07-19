import { NextRequest, NextResponse } from "next/server";

type DailyBar = {
  date: string;
  open: number;
  close: number;
  high: number;
  low: number;
  volume: number;
};

function normalizeCode(raw: string) {
  const code = raw.replace(/\D/g, "");
  if (code.length !== 6) throw new Error("请输入6位股票代码");
  if (/^(4|8|92)/.test(code)) throw new Error("已排除北交所股票");
  if (/^68/.test(code)) throw new Error("已排除科创板股票");
  if (/^6/.test(code)) return `sh${code}`;
  if (/^(0|2|3)/.test(code)) return `sz${code}`;
  throw new Error("暂不支持该代码所属市场");
}

function average(values: number[]) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function daysBetween(start: string, end: string) {
  const startTime = new Date(`${start}T00:00:00+08:00`).getTime();
  const endTime = new Date(`${end}T00:00:00+08:00`).getTime();
  return Math.max(0, Math.floor((endTime - startTime) / 86_400_000));
}

export async function GET(request: NextRequest) {
  try {
    const symbol = normalizeCode(request.nextUrl.searchParams.get("code") ?? "");
    const cost = Number(request.nextUrl.searchParams.get("cost"));
    const buyDate = request.nextUrl.searchParams.get("buyDate") ?? "";
    if (!Number.isFinite(cost) || cost <= 0) throw new Error("请输入有效成本价");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(buyDate)) throw new Error("请输入买入日期");

    const response = await fetch(
      `https://web.ifzq.gtimg.cn/appstock/app/fqkline/get?param=${symbol},day,,,60,qfq`,
      { headers: { "User-Agent": "Mozilla/5.0", Referer: "https://finance.qq.com/" }, cache: "no-store" },
    );
    if (!response.ok) throw new Error("行情接口暂时不可用");
    const payload = await response.json();
    if (payload.code !== 0) throw new Error(payload.msg || "行情接口返回异常");
    const stock = payload.data?.[symbol];
    const rawBars = stock?.qfqday ?? stock?.day ?? [];
    const bars: DailyBar[] = rawBars
      .map((row: unknown[]) => ({
        date: String(row[0]),
        open: Number(row[1]),
        close: Number(row[2]),
        high: Number(row[3]),
        low: Number(row[4]),
        volume: Number(row[5]),
      }))
      .filter((bar: DailyBar) => Number.isFinite(bar.close));
    if (bars.length < 20) throw new Error("历史行情不足，暂时不能判断");

    const latest = bars[bars.length - 1];
    const closes = bars.map((bar) => bar.close);
    const ma5 = average(closes.slice(-5));
    const ma20 = average(closes.slice(-20));
    const ma60 = average(closes.slice(-Math.min(60, closes.length)));
    const returnRate = (latest.close - cost) / cost;
    const heldDays = daysBetween(buyDate, latest.date);

    let signal: "HOLD" | "REVIEW" | "SELL" = "HOLD";
    let headline = "趋势尚未破坏，可以继续观察";
    const reasons: string[] = [];

    if (returnRate >= 0.5) {
      signal = "SELL";
      headline = "已达到50%高风险目标线，优先锁定收益";
      reasons.push("收益率已达到预设目标，继续持有会重新暴露全部浮盈");
    } else if (returnRate <= -0.08) {
      signal = "SELL";
      headline = "已触发8%风险止损线";
      reasons.push("本金保护优先于收益目标");
    } else if (heldDays >= 30) {
      signal = "SELL";
      headline = "一个月观察期已经结束";
      reasons.push("按事先约定的时间规则退出，不临时延长周期");
    } else if (latest.close < ma20 && ma5 < ma20) {
      signal = "SELL";
      headline = "短期趋势跌破20日均线";
      reasons.push("现价低于20日均线且5日均线同步走弱");
    } else if (latest.close < ma20 || ma5 < ma20) {
      signal = "REVIEW";
      headline = "趋势转弱，暂缓加仓并人工复核";
      reasons.push("价格或短期均线出现一项弱化信号");
    } else {
      reasons.push("现价和5日均线仍位于20日均线之上");
    }

    if (latest.close >= ma60) reasons.push("现价未跌破60日均线");
    if (returnRate > 0) reasons.push(`当前浮盈 ${(returnRate * 100).toFixed(2)}%`);
    if (returnRate <= 0) reasons.push(`当前浮亏 ${(Math.abs(returnRate) * 100).toFixed(2)}%`);

    const quoteFields = stock?.qt?.[symbol] ?? [];
    return NextResponse.json({
      symbol,
      code: symbol.slice(2),
      name: quoteFields[1] || symbol.toUpperCase(),
      latestDate: latest.date,
      price: latest.close,
      cost,
      returnRate,
      heldDays,
      ma5,
      ma20,
      ma60,
      signal,
      headline,
      reasons,
      checkedAt: new Date().toISOString(),
      source: "腾讯财经前复权日线（非交易所官方源）",
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "分析失败" }, { status: 400 });
  }
}
