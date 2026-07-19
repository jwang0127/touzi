import unittest

from a_share_research.mock_adapter import MockAdapter


class ValidationTests(unittest.TestCase):
    def test_complete_synthetic_record_is_valid(self) -> None:
        adapter = MockAdapter()
        table = adapter.normalize(adapter.fetch({}))
        self.assertTrue(adapter.validate(table)["valid"])

    def test_empty_table_is_invalid(self) -> None:
        adapter = MockAdapter()
        self.assertFalse(adapter.validate([])["valid"])


if __name__ == "__main__":
    unittest.main()
