from __future__ import annotations

from typing import Any

from .mock_adapter import MockAdapter


def complete_package() -> dict[str, Any]:
    adapter = MockAdapter()
    records = [row.to_dict() for row in adapter.normalize(adapter.fetch({}))]
    return {
        "records": records,
        "source_cross_checked": True,
        "uses_future_information": False,
        "hypotheses": [{"deadline": "2027-06-30", "invalidation": ["margin path breaks"]}],
        "risk_policy": {
            "auto_order_enabled": False,
            "max_single_name_weight": 0.10,
            "max_sector_weight": 0.30,
            "thesis_stop_rule": "required",
            "liquidity_rule": "five_days_to_exit",
        },
        "backtest": {
            "future_function": False,
            "survivorship_bias": False,
            "costs_included": True,
            "out_of_sample_complete": True,
        },
        "output_policy": {
            "executes_orders": False,
            "pass_means_buy": False,
            "labels_separated": True,
        },
    }
