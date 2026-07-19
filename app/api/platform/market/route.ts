import { NextResponse } from "next/server";
import { fetchTencentQuotes } from "@/lib/market-data/tencent";

const labels = {
  sh000001: "上证指数", sz399001: "深证成指", sz399006: "创业板指", sh000688: "科创50",
  sh000300: "沪深300", sh000905: "中证500", sh000852: "中证1000", sh000906: "中证800",
};

export async function GET() {
  try {
    const quotes = await fetchTencentQuotes(Object.keys(labels), labels);
    return NextResponse.json({
      quotes,
      asOf: quotes.map(q => q.asOf).sort().at(-1),
      fetchedAt: new Date().toISOString(),
      source: "腾讯财经",
      evidence: "FACT",
      freshness: "交易时段分钟级；非交易时段保留最近收盘快照",
    }, { headers: { "Cache-Control": "public, max-age=30, s-maxage=60, stale-while-revalidate=120" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "市场行情暂不可用", evidence: "UNKNOWN" }, { status: 502 });
  }
}
