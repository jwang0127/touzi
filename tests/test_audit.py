import copy
import unittest

from a_share_research.audit import audit_package
from a_share_research.fixtures import complete_package


class AuditTests(unittest.TestCase):
    def test_complete_package_passes(self) -> None:
        self.assertEqual(audit_package(complete_package()).verdict, "PASS")

    def test_missing_evidence_requires_review(self) -> None:
        package = complete_package()
        package["source_cross_checked"] = False
        self.assertEqual(audit_package(package).verdict, "REVIEW")

    def test_future_information_blocks(self) -> None:
        package = complete_package()
        package["uses_future_information"] = True
        self.assertEqual(audit_package(package).verdict, "BLOCK")

    def test_empty_table_blocks(self) -> None:
        package = complete_package()
        package["records"] = []
        self.assertEqual(audit_package(package).verdict, "BLOCK")

    def test_automatic_ordering_blocks(self) -> None:
        package = complete_package()
        package["risk_policy"]["auto_order_enabled"] = True
        self.assertEqual(audit_package(package).verdict, "BLOCK")

    def test_audit_bypass_blocks(self) -> None:
        package = copy.deepcopy(complete_package())
        package["skip_review"] = True
        self.assertEqual(audit_package(package).verdict, "BLOCK")


if __name__ == "__main__":
    unittest.main()
