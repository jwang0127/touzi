from __future__ import annotations

from dataclasses import asdict, dataclass
from datetime import datetime
from typing import Any, Protocol


@dataclass(frozen=True)
class CanonicalMarketRecord:
    symbol: str
    trade_date: str
    open_raw: float
    high_raw: float
    low_raw: float
    close_raw: float
    volume_shares: int
    amount_cny: float
    adj_factor: float
    adjustment_type: str
    suspend_status: str
    listing_status: str
    source: str
    source_timestamp: str
    available_timestamp: str
    ingested_at: str
    schema_version: str = "1.0.0"

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)

    def available_at(self) -> datetime:
        return datetime.fromisoformat(self.available_timestamp.replace("Z", "+00:00"))


class DataAdapter(Protocol):
    name: str
    version: str

    def fetch(self, request: dict[str, Any]) -> list[dict[str, Any]]: ...
    def normalize(self, payload: list[dict[str, Any]]) -> list[CanonicalMarketRecord]: ...
    def validate(self, table: list[CanonicalMarketRecord]) -> dict[str, Any]: ...
    def provenance(self) -> dict[str, Any]: ...
