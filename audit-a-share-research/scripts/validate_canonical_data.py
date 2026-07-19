from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "src"))

from a_share_research.contracts import CanonicalMarketRecord
from a_share_research.validation import validate_records

payload = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
records = [CanonicalMarketRecord(**item) for item in payload]
print(json.dumps(validate_records(records), ensure_ascii=False))
