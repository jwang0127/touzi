export type WaveBar = {
  date: string;
  close: number;
  high: number;
  low: number;
  volume: number;
};

export type ThreeWaveResult = {
  detected: boolean;
  stage: "CONFIRMED" | "READY" | "NONE";
  score: number;
  wave1StartDate: string | null;
  wave1PeakDate: string | null;
  wave2LowDate: string | null;
  wave1Gain: number;
  retracement: number;
  breakout: number;
  volumeRatio: number;
  reasons: string[];
  risks: string[];
};

const emptyResult: ThreeWaveResult = {
  detected: false,
  stage: "NONE",
  score: 0,
  wave1StartDate: null,
  wave1PeakDate: null,
  wave2LowDate: null,
  wave1Gain: 0,
  retracement: 0,
  breakout: 0,
  volumeRatio: 0,
  reasons: [],
  risks: ["固定窗口内未形成可复核的三浪结构"],
};

function average(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

export function detectThreeWave(input: WaveBar[]): ThreeWaveResult {
  const bars = input.slice(-60);
  if (bars.length < 35) return emptyResult;

  const latest = bars[bars.length - 1];
  const recentVolume = average(bars.slice(-5).map((bar) => bar.volume));
  const priorVolume = average(bars.slice(-25, -5).map((bar) => bar.volume));
  const volumeRatio = priorVolume > 0 ? recentVolume / priorVolume : 1;
  let best: ThreeWaveResult | null = null;

  for (let wave2Index = bars.length - 15; wave2Index <= bars.length - 3; wave2Index += 1) {
    const peakStart = Math.max(5, wave2Index - 20);
    const peakEnd = wave2Index - 2;
    if (peakEnd <= peakStart) continue;
    let peakIndex = peakStart;
    for (let index = peakStart + 1; index <= peakEnd; index += 1) {
      if (bars[index].high > bars[peakIndex].high) peakIndex = index;
    }

    const startFrom = Math.max(0, peakIndex - 22);
    const startTo = peakIndex - 4;
    if (startTo <= startFrom) continue;
    let startIndex = startFrom;
    for (let index = startFrom + 1; index <= startTo; index += 1) {
      if (bars[index].low < bars[startIndex].low) startIndex = index;
    }

    const wave1Start = bars[startIndex].low;
    const wave1Peak = bars[peakIndex].high;
    const wave2Low = bars[wave2Index].low;
    const wave1Height = wave1Peak - wave1Start;
    if (wave1Height <= 0) continue;
    const wave1Gain = wave1Height / wave1Start;
    const retracement = (wave1Peak - wave2Low) / wave1Height;
    const breakout = latest.close / wave1Peak - 1;
    if (wave1Gain < 0.08 || wave1Gain > 0.5 || wave2Low <= wave1Start || retracement < 0.25 || retracement > 0.78) continue;

    let score = 35;
    const reasons: string[] = [`第一浪上涨 ${(wave1Gain * 100).toFixed(1)}%`];
    const risks: string[] = [];
    if (retracement >= 0.382 && retracement <= 0.618) {
      score += 25;
      reasons.push(`第二浪回撤 ${(retracement * 100).toFixed(1)}%，位于38.2%–61.8%区间`);
    } else {
      score += 14;
      reasons.push(`第二浪回撤 ${(retracement * 100).toFixed(1)}%，仍在有效边界内`);
    }
    let stage: ThreeWaveResult["stage"] = "NONE";
    if (breakout >= 0) {
      score += 25;
      stage = "CONFIRMED";
      reasons.push("收盘价已突破第一浪高点");
    } else if (breakout >= -0.03) {
      score += 15;
      stage = "READY";
      reasons.push("距离第一浪高点不足3%，处于突破准备区");
    } else {
      risks.push("尚未接近第一浪高点，不能确认第三浪");
    }
    if (volumeRatio >= 1.05) {
      score += 15;
      reasons.push(`近5日量能为此前20日的 ${volumeRatio.toFixed(2)} 倍`);
    } else if (volumeRatio >= 0.8) {
      score += 7;
      risks.push("量能仅为中性，突破仍需确认");
    } else {
      risks.push("近5日量能不足，假突破风险较高");
    }

    const result: ThreeWaveResult = {
      detected: stage !== "NONE" && score >= 70,
      stage,
      score: Math.min(100, score),
      wave1StartDate: bars[startIndex].date,
      wave1PeakDate: bars[peakIndex].date,
      wave2LowDate: bars[wave2Index].date,
      wave1Gain,
      retracement,
      breakout,
      volumeRatio,
      reasons,
      risks: risks.length ? risks : ["形态成立，但波浪识别仍可能随新数据重绘"],
    };
    if (!best || result.score > best.score) best = result;
  }

  return best ?? emptyResult;
}
