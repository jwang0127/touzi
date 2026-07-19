from __future__ import annotations

import re
from datetime import datetime

from .contracts import CanonicalMarketRecord

SYMBOL_PATTERN = re.compile(r"^[0-9]{6}\.(SH|SZ|BJ)$")
ENUMS = {
    "adjustment_type": {"NONE", "QFQ", "HFQ"},
    "suspend_status": {"TRADING", "SUSPENDED"},
    "listing_status": {"LISTED", "DELISTING", "DELISTED"},
}


def _parse_time(value: str) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def validate_records(records: list[CanonicalMarketRecord]) -> dict[str, object]:
    errors: list[str] = []
    warnings: list[str] = []
    if not records:
        return {"valid": False, "errors": ["canonical table is empty"], "warnings": []}

    for index, row in enumerate(records):
        prefix = f"row[{index}]"
        if not SYMBOL_PATTERN.match(row.symbol):
            errors.append(f"{prefix}: invalid symbol")
        if min(row.open_raw, row.high_raw, row.low_raw, row.close_raw) < 0:
            errors.append(f"{prefix}: negative price")
        if row.high_raw < max(row.open_raw, row.low_raw, row.close_raw):
            errors.append(f"{prefix}: high price is inconsistent")
        if row.low_raw > min(row.open_raw, row.high_raw, row.close_raw):
            errors.append(f"{prefix}: low price is inconsistent")
        if row.volume_shares < 0 or row.amount_cny < 0:
            errors.append(f"{prefix}: negative volume or amount")
        if row.adj_factor <= 0:
            errors.append(f"{prefix}: adjustment factor must be positive")
        for field, allowed in ENUMS.items():
            if getattr(row, field) not in allowed:
                errors.append(f"{prefix}: invalid {field}")
        if not row.source.strip():
            errors.append(f"{prefix}: source is required")
        try:
            source_time = _parse_time(row.source_timestamp)
            available_time = _parse_time(row.available_timestamp)
            ingested_time = _parse_time(row.ingested_at)
            if available_time < source_time:
                warnings.append(f"{prefix}: available time predates source timestamp")
            if ingested_time < available_time:
                errors.append(f"{prefix}: ingestion predates availability")
        except ValueError:
            errors.append(f"{prefix}: invalid ISO-8601 timestamp")
        if row.suspend_status == "SUSPENDED" and row.volume_shares != 0:
            errors.append(f"{prefix}: suspended record has volume")
        if row.schema_version != "1.0.0":
            errors.append(f"{prefix}: unsupported schema version")

    return {"valid": not errors, "errors": errors, "warnings": warnings}
