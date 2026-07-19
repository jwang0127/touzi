export type TencentQuote = {
  symbol: string;
  code: string;
  name: string;
  price: number;
  previousClose: number;
  open: number;
  high: number;
  low: number;
  change: number;
  changePercent: number;
  volume: number;
  amount: number;
  turnoverRate: number | null;
  pe: number | null;
  pb: number | null;
  marketCapYi: number | null;
  asOf: string;
  source: "腾讯财经";
  provenanceUrl: string;
};

const TENCENT_QUOTE_URL = "https://qt.gtimg.cn/q=";

export function normalizeAshareCode(raw: string) {
  const code = raw.replace(/\D/g, "");
  if (code.length !== 6) throw new Error("请输入 6 位股票代码");
  if (/^6/.test(code)) return `sh${code}`;
  if (/^(0|1|2|3)/.test(code)) return `sz${code}`;
  if (/^(4|8|9)/.test(code)) return `bj${code}`;
  throw new Error("暂不支持该证券代码");
}

function nullableNumber(value: string | undefined) {
  const number = Number(value);
  return Number.isFinite(number) && value !== "" ? number : null;
}

function formatTencentTime(raw: string | undefined) {
  if (!raw || !/^\d{14}$/.test(raw)) return new Date().toISOString();
  return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}T${raw.slice(8, 10)}:${raw.slice(10, 12)}:${raw.slice(12, 14)}+08:00`;
}

export function parseTencentPayload(body: string, labels: Record<string, string> = {}) {
  const quotes: TencentQuote[] = [];
  const matches = body.matchAll(/v_([a-zA-Z0-9_]+)="([^"]*)"/g);
  for (const match of matches) {
    const symbol = match[1];
    const fields = match[2].split("~");
    if (fields.length < 35 || !fields[3]) continue;
    quotes.push({
      symbol,
      code: fields[2] || symbol.replace(/^\D+/, ""),
      name: labels[symbol] || fields[1] || symbol.toUpperCase(),
      price: Number(fields[3]),
      previousClose: Number(fields[4]),
      open: Number(fields[5]),
      volume: Number(fields[6]),
      asOf: formatTencentTime(fields[30]),
      change: Number(fields[31]),
      changePercent: Number(fields[32]),
      high: Number(fields[33]),
      low: Number(fields[34]),
      amount: Number(fields[37] || 0),
      turnoverRate: nullableNumber(fields[38]),
      pe: nullableNumber(fields[39]),
      marketCapYi: nullableNumber(fields[45]),
      pb: nullableNumber(fields[46]),
      source: "腾讯财经",
      provenanceUrl: `${TENCENT_QUOTE_URL}${symbol}`,
    });
  }
  return quotes;
}

export async function fetchTencentQuotes(symbols: string[], labels: Record<string, string> = {}) {
  const unique = [...new Set(symbols)].slice(0, 60);
  if (!unique.length) return [];
  const url = `${TENCENT_QUOTE_URL}${unique.join(",")}`;
  const response = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0", Referer: "https://stockapp.finance.qq.com/" },
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`腾讯财经行情暂不可用（HTTP ${response.status}）`);
  const buffer = await response.arrayBuffer();
  let body: string;
  try { body = new TextDecoder("gb18030").decode(buffer); }
  catch { body = new TextDecoder().decode(buffer); }
  const quotes = parseTencentPayload(body, labels);
  if (!quotes.length) throw new Error("腾讯财经未返回有效行情");
  return quotes;
}

