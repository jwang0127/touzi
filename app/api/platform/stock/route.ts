import { NextRequest, NextResponse } from "next/server";
import { fetchEastmoneyDailyBars } from "@/lib/market-data/eastmoney";
import { fetchTencentQuotes, normalizeAshareCode } from "@/lib/market-data/tencent";
import { analyzeStock } from "@/lib/research/stock-analysis";

export async function GET(request: NextRequest) {
  try {
    const code = (request.nextUrl.searchParams.get("code") ?? "").replace(/\D/g, "");
    const symbol = normalizeAshareCode(code);
    const [quotes, history] = await Promise.all([fetchTencentQuotes([symbol]), fetchEastmoneyDailyBars(code, 120)]);
    const quote = quotes[0];
    if (!quote) throw new Error("没有找到该股票行情");
    const analysis = analyzeStock(quote, history.bars);
    return NextResponse.json({ quote, history: { ...history, bars: history.bars.slice(-90) }, analysis, auditVerdict: "REVIEW", fetchedAt: new Date().toISOString() },
      { headers: { "Cache-Control": "public, max-age=30, s-maxage=60, stale-while-revalidate=120" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "个股研究暂不可用", evidence: "UNKNOWN", auditVerdict: "REVIEW" }, { status: 502 });
  }
}
