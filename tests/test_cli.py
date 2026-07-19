import io
import json
import tempfile
import unittest
from contextlib import redirect_stdout
from pathlib import Path
from unittest.mock import patch

from a_share_research.cli import main
from a_share_research.fixtures import complete_package


class CliTests(unittest.TestCase):
    def test_stdout_contains_only_verdict(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            input_path = Path(directory) / "package.json"
            report_path = Path(directory) / "audit_report.json"
            input_path.write_text(json.dumps(complete_package()), encoding="utf-8")
            buffer = io.StringIO()
            with patch("sys.argv", ["audit", str(input_path), "--report", str(report_path)]):
                with redirect_stdout(buffer):
                    main()
            self.assertEqual(buffer.getvalue(), "PASS\n")
            self.assertEqual(json.loads(report_path.read_text(encoding="utf-8"))["verdict"], "PASS")


if __name__ == "__main__":
    unittest.main()
