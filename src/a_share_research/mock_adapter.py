from __future__ import annotations

from typing import Any

from .contracts import CanonicalMarketRecord
from .validation import validate_records


class MockAdapter:
    name = "mock"
    version = "1.0.0"

    def fetch(self, request: dict[str, Any]) -> list[dict[str, Any]]:
        if request.get("empty"):
            return []
        symbol = request.get("symbol", "600000.SH")
        return [
            {
                "symbol": symbol,
                "trade_date": "2026-07-17",
                "open_raw": 10.20,
                "high_raw": 10.62,
                "low_raw": 10.12,
                "close_raw": 10.48,
                "volume_shares": 12_000_000,
                "amount_cny": 124_800_000.0,
                "adj_factor": 1.0,
                "adjustment_type": "NONE",
                "suspend_status": "TRADING",
                "listing_status": "LISTED",
                "source": "mock:daily-bars",
                "source_timestamp": "2026-07-17T15:00:00+08:00",
                "available_timestamp": "2026-07-17T15:05:00+08:00",
                "ingested_at": "2026-07-17T15:06:00+08:00",
                "schema_version": "1.0.0",
            }
        ]

    def normalize(self, payload: list[dict[str, Any]]) -> list[CanonicalMarketRecord]:
        return [CanonicalMarketRecord(**row) for row in payload]

    def validate(self, table: list[CanonicalMarketRecord]) -> dict[str, object]:
        return validate_records(table)

    def provenance(self) -> dict[str, Any]:
        return {
            "adapter": self.name,
            "version": self.version,
            "network_access": False,
            "data_kind": "synthetic",
        }
