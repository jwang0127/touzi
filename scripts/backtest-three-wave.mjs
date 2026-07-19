import { detectThreeWave } from "../lib/threeWave.ts";

const symbols = [
  "sh601918", "sh600919", "sh601077", "sh600938", "sh601899", "sh600219",
  "sh600985", "sh601688", "sh603125", "sz002151", "sh603303", "sh601101",
];

const average = (values) => values.reduce((sum, value) => sum + value, 0) / values.length;

function technicalScore(bars) {
  const closes = bars.map((bar) => bar.close);
  const latest = closes.at(-1);
  const ma5 = average(closes.slice(-5));
  const ma20 = average(closes.slice(-20));
  const ma60 = average(closes.slice(-60));
  const return20 = latest / closes.at(-21) - 1;
  const return60 = latest / closes.at(-60) - 1;
  let score = 35;
  if (latest > ma20) score += 15;
  if (ma5 > ma20) score += 15;
  if (latest > ma60) score += 10;
  if (return20 > 0 && return20 <= 0.2) score += 10;
  if (return60 >= 0.05 && return60 <= 0.3) score += 10;
  if (return60 < 0) score -= 15;
  if (return60 > 0.35) score -= 10;
  return Math.max(0, Math.min(100, score));
}

async function load(symbol) {
  const url = `https://web.ifzq.gtimg.cn/appstock/app/fqkline/get?param=${symbol},day,,,240,qfq`;
  const response = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0", Referer: "https://finance.qq.com/" } });
  const payload = await response.json();
  const stock = payload.data?.[symbol];
  const rows = stock?.qfqday ?? stock?.day ?? [];
  return rows.map((item) => ({
    date: String(item[0]), close: Number(item[2]), high: Number(item[3]), low: Number(item[4]), volume: Number(item[5]),
  }));
}

function summarize(values) {
  const sorted = [...values].sort((a, b) => a - b);
  return {
    samples: values.length,
    average20d: average(values),
    median20d: sorted[Math.floor(sorted.length / 2)],
    positiveRate: values.filter((value) => value > 0).length / values.length,
    hit10Rate: values.filter((value) => value >= 0.1).length / values.length,
  };
}

const histories = Object.fromEntries(await Promise.all(symbols.map(async (symbol) => [symbol, await load(symbol)])));
const reference = histories[symbols[0]];
const baselineReturns = [];
const enhancedReturns = [];
let changedSelections = 0;

for (let referenceIndex = 80; referenceIndex < reference.length - 20; referenceIndex += 5) {
  const date = reference[referenceIndex].date;
  const candidates = [];
  for (const symbol of symbols) {
    const history = histories[symbol];
    const cutoff = history.findIndex((bar) => bar.date === date);
    if (cutoff < 80 || cutoff + 20 >= history.length) continue;
    const past = history.slice(0, cutoff + 1);
    const baseline = technicalScore(past);
    const wave = detectThreeWave(past);
    const waveBonus = wave.detected ? Math.min(10, Math.max(0, (wave.score - 70) / 3)) : 0;
    candidates.push({ symbol, cutoff, baseline, enhanced: baseline + waveBonus, wave, history });
  }
  if (!candidates.length) continue;
  const baselinePick = [...candidates].sort((a, b) => b.baseline - a.baseline)[0];
  const enhancedPick = [...candidates].sort((a, b) => b.enhanced - a.enhanced)[0];
  if (baselinePick.symbol !== enhancedPick.symbol) changedSelections += 1;
  baselineReturns.push(baselinePick.history[baselinePick.cutoff + 20].close / baselinePick.history[baselinePick.cutoff].close - 1);
  enhancedReturns.push(enhancedPick.history[enhancedPick.cutoff + 20].close / enhancedPick.history[enhancedPick.cutoff].close - 1);
}

console.log(JSON.stringify({
  universeSize: symbols.length,
  interval: "每5个交易日取样，观察后续20个交易日",
  changedSelections,
  baseline: summarize(baselineReturns),
  withThreeWave: summarize(enhancedReturns),
}, null, 2));
