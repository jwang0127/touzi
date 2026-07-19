# Phase 0–1 implementation plan

## Scope frozen for this delivery

This repository delivers a safe, synthetic-data-only foundation for an A-share medium/long-term research system. It includes a canonical market-record contract, a `MockAdapter`, deterministic validation, a five-gate independent audit, adversarial fixtures, and a public-facing status dashboard.

It deliberately excludes live market feeds, company selection models, broker connections, automatic orders, third-party investment skills, API keys, public tunnels, and claims of predictive performance.

## Milestones

1. Freeze evidence labels, timestamps, provenance, and risk boundaries.
2. Validate canonical synthetic records without provider-specific logic.
3. Audit data, hypotheses, risk rules, backtest evidence, and output boundaries independently.
4. Prove `PASS`, `REVIEW`, and `BLOCK` behavior with unit and adversarial tests.
5. Present the implementation, limitations, and next phase in a responsive dashboard.

## Acceptance criteria

- Empty canonical data is blocked.
- Missing non-critical evidence is reviewed.
- Future information and automatic ordering are blocked.
- A complete synthetic package passes.
- The CLI emits exactly one verdict and writes reasons to a JSON report.
- No network or credential is required to run the tests.

## Next phase

Add two read-only data adapters behind the same contract, reconcile samples against exchange or statutory disclosure sources, and add suspended, delisted, ex-rights, and announcement-time fixtures. Do not add live trading.
