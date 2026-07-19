from __future__ import annotations

import re
from dataclasses import dataclass
from urllib.request import Request, urlopen

WORKING_ENDPOINT = "https://qt.gtimg.cn/q="


@dataclass(frozen=True)
class TencentQuote:
    symbol: str
    name: str
    price: float
    previous_close: float
    open_price: float
    high: float
    low: float
    change: float
    change_percent: float
    timestamp: str
    raw_source: str = "tencent:qt.gtimg.cn"


def normalize_symbol(code: str) -> str:
    digits = re.sub(r"\D", "", code)
    if len(digits) != 6:
        raise ValueError("股票代码必须是6位数字")
    if digits.startswith(("4", "8", "92")):
        raise ValueError("已按要求排除北交所股票")
    if digits.startswith(("68", "689")):
        raise ValueError("已按要求排除科创板股票")
    if digits.startswith("6"):
        return f"sh{digits}"
    if digits.startswith(("0", "2", "3")):
        return f"sz{digits}"
    raise ValueError("暂不支持该股票代码所属市场")


def parse_quote(text: str, symbol: str) -> TencentQuote:
    match = re.search(r'="([^"]*)"', text)
    if not match:
        raise ValueError("腾讯行情返回格式无法识别")
    fields = match.group(1).split("~")
    if len(fields) < 35 or not fields[3]:
        raise ValueError("腾讯行情没有返回有效报价")
    return TencentQuote(
        symbol=symbol,
        name=fields[1],
        price=float(fields[3]),
        previous_close=float(fields[4]),
        open_price=float(fields[5]),
        timestamp=fields[30],
        change=float(fields[31]),
        change_percent=float(fields[32]),
        high=float(fields[33]),
        low=float(fields[34]),
    )


class TencentQuoteAdapter:
    name = "tencent-quote"
    version = "0.1.0"

    def fetch_quote(self, code: str, timeout: float = 10.0) -> TencentQuote:
        symbol = normalize_symbol(code)
        request = Request(
            f"{WORKING_ENDPOINT}{symbol}",
            headers={"User-Agent": "Mozilla/5.0", "Referer": "https://finance.qq.com/"},
        )
        with urlopen(request, timeout=timeout) as response:
            text = response.read().decode("gb18030", errors="replace")
        return parse_quote(text, symbol)

    def provenance(self) -> dict[str, object]:
        return {
            "endpoint": WORKING_ENDPOINT,
            "network_access": True,
            "read_only": True,
            "official_exchange_source": False,
            "audit_default": "REVIEW",
        }
