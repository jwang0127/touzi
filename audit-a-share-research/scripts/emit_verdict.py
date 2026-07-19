from __future__ import annotations

import sys

levels = {value.upper() for value in sys.argv[1:]}
print("BLOCK" if "BLOCK" in levels else ("REVIEW" if "REVIEW" in levels else "PASS"))
