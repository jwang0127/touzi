import { normalizeAshareCode } from "./tencent";
import type { DailyBar } from "./eastmoney";

type TencentKlinePayload = {
  data?: Record<string, { qfqday?: Array<Array<string | Record<string, string>>>; day?: Array<Array<string | Record<string, string>>> }>;
};

export async function fetchTencentDailyBars(code: string, limit = 120) {
  const symbol = normalizeAshareCode(code);
  const url = `https://web.ifzq.gtimg.cn/appstock/app/fqkline/get?param=${symbol},day,,,${limit},qfq`;
  const response = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0", Referer: "https://stockapp.finance.qq.com/" },
    next: { revalidate: 300 },
  });
  if (!response.ok) throw new Error(`腾讯财经日线暂不可用（HTTP ${response.status}）`);
  const payload = await response.json() as TencentKlinePayload;
  const rows = payload.data?.[symbol]?.qfqday ?? payload.data?.[symbol]?.day ?? [];
  const bars = rows.map<DailyBar>(row => ({
    date: String(row[0] ?? ""), open: Number(row[1]), close: Number(row[2]),
    high: Number(row[3]), low: Number(row[4]), volume: Number(row[5]), amount: 0,
    changePercent: 0, turnoverRate: 0, source: "腾讯财经", provenanceUrl: url,
  })).filter(bar => /^\d{4}-\d{2}-\d{2}$/.test(bar.date) && Number.isFinite(bar.close));
  for (let index = 1; index < bars.length; index += 1) {
    const previous = bars[index - 1].close;
    bars[index].changePercent = previous ? Number((((bars[index].close / previous) - 1) * 100).toFixed(4)) : 0;
  }
  if (bars.length < 20) throw new Error("腾讯财经历史日线不足 20 个交易日");
  return { name: code, bars, asOf: bars.at(-1)!.date, source: "腾讯财经" as const, provenanceUrl: url };
}
