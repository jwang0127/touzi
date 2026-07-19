# Engineering rules

- Scope phase 1 to research, backtesting, and paper-trading support. Never connect to a broker or place orders.
- Keep data adapters separate from research and audit logic. Strategy code must not select or override an audit verdict.
- Label every research statement as `FACT`, `INFERENCE`, or `UNKNOWN`.
- Require point-in-time timestamps and provenance for all market and financial records.
- The audit CLI must print exactly one of `PASS`, `REVIEW`, or `BLOCK`; detailed findings belong in the JSON report.
- Run `python -m unittest discover -s tests -v` and `npm test` before delivery.
- Treat missing evidence as `REVIEW` and material leakage, empty data, impossible execution, or automatic ordering as `BLOCK`.

Done means the implementation is reproducible, tests pass, provenance is retained, hypotheses are falsifiable, and the audit cannot be bypassed by strategy output.
