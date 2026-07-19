from __future__ import annotations

import json
import sys
from pathlib import Path

payload = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
critical = payload.get("future_function") or payload.get("survivorship_bias") or payload.get("costs_included") is False
print("BLOCK" if critical else ("PASS" if payload.get("out_of_sample_complete") else "REVIEW"))
