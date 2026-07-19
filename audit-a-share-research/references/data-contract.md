# Data contract

Require internal symbols such as `600000.SH`, `000001.SZ`, or `430047.BJ`. Preserve raw OHLC, share volume, CNY amount, adjustment factor and type, suspension/listing status, provider endpoint, source time, availability time, ingestion time, and schema version.

Block empty tables, silent unit conversion, mixed adjustment semantics, or data used before availability. Keep provider-specific mappings inside adapters.
