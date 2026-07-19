from __future__ import annotations

from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from typing import Any


@dataclass(frozen=True)
class Finding:
    gate: str
    level: str
    code: str
    message: str


@dataclass(frozen=True)
class AuditResult:
    verdict: str
    findings: tuple[Finding, ...]
    audited_at: str

    def to_report(self) -> dict[str, Any]:
        return {
            "verdict": self.verdict,
            "gates": [asdict(item) for item in self.findings],
            "missing_evidence": [asdict(item) for item in self.findings if item.level == "REVIEW"],
            "blocking_findings": [asdict(item) for item in self.findings if item.level == "BLOCK"],
            "audited_at": self.audited_at,
        }


def _finding(gate: str, level: str, code: str, message: str) -> Finding:
    return Finding(gate=gate, level=level, code=code, message=message)


def audit_package(package: dict[str, Any]) -> AuditResult:
    findings: list[Finding] = []

    records = package.get("records") or []
    if not records:
        findings.append(_finding("data", "BLOCK", "EMPTY_TABLE", "Canonical data is empty."))
    if package.get("uses_future_information"):
        findings.append(_finding("data", "BLOCK", "POINT_IN_TIME", "Future information is used."))
    if not package.get("source_cross_checked", False):
        findings.append(_finding("data", "REVIEW", "SOURCE_CHECK", "Independent source check is missing."))

    hypotheses = package.get("hypotheses") or []
    if not hypotheses:
        findings.append(_finding("hypothesis", "REVIEW", "NO_HYPOTHESIS", "No falsifiable hypothesis is recorded."))
    elif any(not item.get("invalidation") or not item.get("deadline") for item in hypotheses):
        findings.append(_finding("hypothesis", "REVIEW", "NOT_FALSIFIABLE", "A hypothesis lacks a deadline or invalidation condition."))

    risk = package.get("risk_policy") or {}
    if risk.get("auto_order_enabled") is True:
        findings.append(_finding("risk", "BLOCK", "AUTO_ORDER", "Automatic ordering is enabled."))
    required_risk = ("max_single_name_weight", "max_sector_weight", "thesis_stop_rule", "liquidity_rule")
    if any(risk.get(key) in (None, "") for key in required_risk):
        findings.append(_finding("risk", "REVIEW", "RISK_LIMITS", "One or more risk limits are not confirmed."))

    backtest = package.get("backtest") or {}
    if backtest.get("future_function") or backtest.get("survivorship_bias"):
        findings.append(_finding("backtest", "BLOCK", "BACKTEST_BIAS", "Material backtest bias is detected."))
    if backtest.get("costs_included") is False:
        findings.append(_finding("backtest", "BLOCK", "ZERO_COST", "Trading costs are omitted."))
    if not backtest.get("out_of_sample_complete", False):
        findings.append(_finding("backtest", "REVIEW", "OUT_OF_SAMPLE", "Out-of-sample validation is incomplete."))

    output = package.get("output_policy") or {}
    if output.get("executes_orders") or output.get("pass_means_buy"):
        findings.append(_finding("output", "BLOCK", "BOUNDARY", "Research output crosses the human decision boundary."))
    if not output.get("labels_separated", False):
        findings.append(_finding("output", "REVIEW", "LABELS", "FACT, INFERENCE, and UNKNOWN are not fully separated."))
    if package.get("skip_review"):
        findings.append(_finding("output", "BLOCK", "BYPASS", "An audit bypass was requested."))

    if any(item.level == "BLOCK" for item in findings):
        verdict = "BLOCK"
    elif any(item.level == "REVIEW" for item in findings):
        verdict = "REVIEW"
    else:
        verdict = "PASS"
    return AuditResult(verdict, tuple(findings), datetime.now(timezone.utc).isoformat())
