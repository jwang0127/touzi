from __future__ import annotations

import argparse
import json
from pathlib import Path

from .audit import audit_package


def main() -> None:
    parser = argparse.ArgumentParser(description="Audit an A-share research evidence package.")
    parser.add_argument("input", type=Path)
    parser.add_argument("--report", type=Path, default=Path("audit_report.json"))
    args = parser.parse_args()
    package = json.loads(args.input.read_text(encoding="utf-8"))
    result = audit_package(package)
    args.report.parent.mkdir(parents=True, exist_ok=True)
    args.report.write_text(json.dumps(result.to_report(), ensure_ascii=False, indent=2), encoding="utf-8")
    print(result.verdict)


if __name__ == "__main__":
    main()
