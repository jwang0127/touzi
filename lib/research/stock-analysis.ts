import type { DailyBar } from "../market-data/eastmoney";
import type { TencentQuote } from "../market-data/tencent";

function average(values: number[]) { return values.reduce((sum, value) => sum + value, 0) / values.length; }
function stdev(values: number[]) { const mean = average(values); return Math.sqrt(average(values.map(v => (v - mean) ** 2))); }

export function analyzeStock(quote: TencentQuote, bars: DailyBar[]) {
  const closes = bars.map(bar => bar.close);
  const latest = bars.at(-1)!;
  const ma5 = average(closes.slice(-5));
  const ma20 = average(closes.slice(-20));
  const ma60 = average(closes.slice(-Math.min(60, closes.length)));
  const return20 = closes.length > 20 ? latest.close / closes.at(-21)! - 1 : 0;
  const return60 = closes.length > 60 ? latest.close / closes.at(-61)! - 1 : 0;
  const dailyReturns = closes.slice(1).map((close, i) => close / closes[i] - 1).slice(-60);
  const annualizedVolatility = stdev(dailyReturns) * Math.sqrt(242);
  const trendScore = Math.round(Math.max(0, Math.min(100,
    50 + (latest.close > ma20 ? 15 : -15) + (ma5 > ma20 ? 12 : -12) + (ma20 > ma60 ? 10 : -10) + Math.max(-13, Math.min(13, return20 * 100)),
  )));
  const verdict = trendScore >= 72 ? "趋势较强，等待合适赔率" : trendScore >= 48 ? "结构中性，继续跟踪" : "趋势偏弱，优先补证据";
  return {
    ma5, ma20, ma60, return20, return60, annualizedVolatility, trendScore, verdict,
    facts: [
      `最新交易日 ${latest.date}，收盘 ${latest.close.toFixed(2)}`,
      `20日收益 ${(return20 * 100).toFixed(2)}%，60日收益 ${(return60 * 100).toFixed(2)}%`,
      `MA5 / MA20 / MA60 为 ${ma5.toFixed(2)} / ${ma20.toFixed(2)} / ${ma60.toFixed(2)}`,
    ],
    inferences: [
      latest.close > ma20 ? "价格位于20日均线上方，短期结构未破坏。" : "价格位于20日均线下方，短期结构需要修复。",
      annualizedVolatility > 0.55 ? "近60日波动率偏高，仓位上限应更保守。" : "近60日波动率处于可跟踪区间。",
    ],
    unknowns: ["财报、公告、产业链订单与管理层变化尚未自动核验。", "研究分数不构成买卖指令，仍需人工审计。"],
  };
}

