import assert from "node:assert/strict";
import test from "node:test";
import { detectThreeWave } from "../lib/threeWave.ts";

test("detects a fixed-window wave-three breakout", () => {
  const bars = Array.from({ length: 45 }, (_, index) => {
    let close = 10;
    if (index >= 15 && index <= 25) close = 9.2 + (index - 15) * 0.28;
    if (index > 25 && index <= 32) close = 12 - (index - 25) * 0.18;
    if (index > 32) close = 10.74 + (index - 32) * 0.14;
    return {
      date: `2026-01-${String(index + 1).padStart(2, "0")}`,
      close,
      high: close + 0.1,
      low: index === 15 ? 9 : close - 0.1,
      volume: index >= 40 ? 1500 : 1000,
    };
  });
  const result = detectThreeWave(bars);
  assert.equal(result.detected, true);
  assert.equal(result.stage, "CONFIRMED");
  assert.ok(result.retracement >= 0.25 && result.retracement <= 0.78);
});
