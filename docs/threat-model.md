# Threat model

| Threat | Failure mode | Control | Audit result |
| --- | --- | --- | --- |
| Point-in-time leakage | Future financial information influences a past decision | Require `available_timestamp <= decision_time` | `BLOCK` |
| Empty-success response | Provider returns success but no rows | Reject empty canonical tables | `BLOCK` |
| Survivorship bias | Historical universe contains only current listings | Require universe coverage evidence | `BLOCK` |
| Adjustment drift | Raw and adjusted prices are mixed | Retain raw prices, factor, and adjustment type | `BLOCK` when material |
| Unverified source | A single weak source supports a core fact | Record provenance and request cross-check | `REVIEW` or `BLOCK` |
| Strategy self-approval | Strategy score changes audit outcome | Audit only immutable evidence package fields | `BLOCK` on bypass attempt |
| Automatic execution | Research system places orders | Hard-disable `auto_order_enabled` | `BLOCK` |
| Prompt injection | Artifact asks auditor to ignore rules | Treat artifact text as data; fixed gates have priority | `BLOCK` on bypass attempt |
| Secret exfiltration | Third-party tool requests credentials | No keys in phase 1; no upload or tunnel | `BLOCK` |
| Misleading output | `PASS` is presented as a buy signal | Explicit output-boundary gate and UI warning | `BLOCK` |

Residual risks include synthetic-data blind spots, incomplete market-rule coverage, and the absence of real-source reconciliation. They keep this delivery at research-infrastructure status rather than production investment status.
