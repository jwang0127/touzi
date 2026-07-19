import unittest

from a_share_research.tencent_adapter import normalize_symbol, parse_quote


SAMPLE_FIELDS = [""] * 35
SAMPLE_FIELDS[0] = "1"
SAMPLE_FIELDS[1] = "浦发银行"
SAMPLE_FIELDS[2] = "600000"
SAMPLE_FIELDS[3] = "8.87"
SAMPLE_FIELDS[4] = "8.85"
SAMPLE_FIELDS[5] = "8.85"
SAMPLE_FIELDS[30] = "20260717161445"
SAMPLE_FIELDS[31] = "0.02"
SAMPLE_FIELDS[32] = "0.23"
SAMPLE_FIELDS[33] = "8.97"
SAMPLE_FIELDS[34] = "8.82"
SAMPLE = f'v_sh600000="{"~".join(SAMPLE_FIELDS)}";'


class TencentAdapterTests(unittest.TestCase):
    def test_exchange_prefixes(self) -> None:
        self.assertEqual(normalize_symbol("600000"), "sh600000")
        self.assertEqual(normalize_symbol("000001"), "sz000001")
        self.assertEqual(normalize_symbol("300001"), "sz300001")

    def test_excluded_markets(self) -> None:
        with self.assertRaises(ValueError):
            normalize_symbol("688001")
        with self.assertRaises(ValueError):
            normalize_symbol("830001")

    def test_parse_quote(self) -> None:
        quote = parse_quote(SAMPLE, "sh600000")
        self.assertEqual(quote.name, "浦发银行")
        self.assertEqual(quote.price, 8.87)
        self.assertEqual(quote.timestamp, "20260717161445")


if __name__ == "__main__":
    unittest.main()
