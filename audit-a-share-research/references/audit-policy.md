# Audit policy

Apply five independent gates: data, hypothesis, risk, backtest, and output boundary.

- `BLOCK`: material leakage, fabrication, impossible execution, audit bypass, automatic order, or a critical missing control.
- `REVIEW`: evidence, thresholds, timestamps, stress tests, or user-confirmed risk limits are incomplete.
- `PASS`: every gate has sufficient evidence and no critical defect is found.

Priority is always `BLOCK > REVIEW > PASS`. A passing process says nothing about whether a security should be bought.
