from __future__ import annotations

import json
import sys
from datetime import datetime
from pathlib import Path

payload = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
decision = datetime.fromisoformat(payload["decision_time"].replace("Z", "+00:00"))
blocked = any(datetime.fromisoformat(item["available_timestamp"].replace("Z", "+00:00")) > decision for item in payload.get("records", []))
print("BLOCK" if blocked else "PASS")
