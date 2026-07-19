import { normalizeAshareCode } from "./tencent";

export type SecuritySearchResult = {
  code: string;
  name: string;
  market: string;
  quoteId: string;
  type: string;
  source: "东方财富" | "腾讯财经";
  asOf: string;
};

export type DailyBar = {
  date: string;
  open: number;
  close: number;
  high: number;
  low: number;
  volume: number;
  amount: number;
  changePercent: number;
  turnoverRate: number;
  source: "东方财富";
  provenanceUrl: string;
};

const SEARCH_TOKEN = "D43BF722C8E33BDC906FB84D85E326E8";

export async function searchAshareSecurities(query: string) {
  const input = query.trim().slice(0, 30);
  if (!input) return [];
  const url = `https://searchapi.eastmoney.com/api/suggest/get?input=${encodeURIComponent(input)}&type=14&token=${SEARCH_TOKEN}&count=12`;
  const response = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0", Referer: "https://quote.eastmoney.com/" },
    next: { revalidate: 60 },
  });
  if (!response.ok) throw new Error(`东方财富搜索暂不可用（HTTP ${response.status}）`);
  const payload = await response.json() as { QuotationCodeTable?: { Data?: Array<Record<string, string>> } };
  const now = new Date().toISOString();
  return (payload.QuotationCodeTable?.Data ?? [])
    .filter(item => /^\d{6}$/.test(item.Code ?? "") && /^(0|1)\./.test(item.QuoteID ?? ""))
    .map<SecuritySearchResult>(item => ({
      code: item.Code,
      name: item.Name,
      market: item.QuoteID.startsWith("1.") ? "上海" : "深圳",
      quoteId: item.QuoteID,
      type: item.SecurityTypeName || "A股",
      source: "东方财富",
      asOf: now,
    }));
}

function eastmoneySecId(code: string) {
  const symbol = normalizeAshareCode(code);
  return `${symbol.startsWith("sh") ? "1" : "0"}.${code}`;
}

export async function fetchEastmoneyDailyBars(code: string, limit = 120) {
  const secid = eastmoneySecId(code);
  const fields1 = "f1,f2,f3,f4,f5,f6";
  const fields2 = "f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61";
  const url = `https://push2his.eastmoney.com/api/qt/stock/kline/get?secid=${secid}&klt=101&fqt=1&lmt=${limit}&end=20500101&fields1=${fields1}&fields2=${fields2}`;
  const response = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0", Referer: "https://quote.eastmoney.com/" },
    next: { revalidate: 300 },
  });
  if (!response.ok) throw new Error(`东方财富日线暂不可用（HTTP ${response.status}）`);
  const payload = await response.json() as { data?: { name?: string; klines?: string[] } };
  const rows = payload.data?.klines ?? [];
  const bars = rows.map<DailyBar>(row => {
    const f = row.split(",");
    return {
      date: f[0], open: Number(f[1]), close: Number(f[2]), high: Number(f[3]), low: Number(f[4]),
      volume: Number(f[5]), amount: Number(f[6]), changePercent: Number(f[8]), turnoverRate: Number(f[10]),
      source: "东方财富", provenanceUrl: url,
    };
  }).filter(bar => Number.isFinite(bar.close));
  if (bars.length < 20) throw new Error("历史日线不足 20 个交易日");
  return { name: payload.data?.name || code, bars, asOf: bars.at(-1)!.date, source: "东方财富" as const, provenanceUrl: url };
}
