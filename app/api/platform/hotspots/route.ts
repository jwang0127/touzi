import { NextResponse } from "next/server";
import { fetchTencentQuotes } from "@/lib/market-data/tencent";
import { rankHotspots, THEME_BASKETS } from "@/lib/research/hotspots";

export async function GET() {
  try {
    const quotes = await fetchTencentQuotes(THEME_BASKETS.flatMap(theme => [...theme.symbols]));
    const hotspots = rankHotspots(quotes);
    return NextResponse.json({ hotspots, asOf: hotspots.map(item => item.asOf).sort().at(-1), fetchedAt: new Date().toISOString(), evidence: "INFERENCE" },
      { headers: { "Cache-Control": "public, max-age=60, s-maxage=180, stale-while-revalidate=300" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "热点雷达暂不可用", evidence: "UNKNOWN" }, { status: 502 });
  }
}

