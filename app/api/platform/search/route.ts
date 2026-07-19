import { NextRequest, NextResponse } from "next/server";
import { searchAshareSecurities } from "@/lib/market-data/eastmoney";

export async function GET(request: NextRequest) {
  try {
    const query = request.nextUrl.searchParams.get("q") ?? "";
    if (!query.trim()) return NextResponse.json({ results: [], asOf: new Date().toISOString(), source: "东方财富" });
    const results = await searchAshareSecurities(query);
    return NextResponse.json({ results, asOf: new Date().toISOString(), source: "东方财富", evidence: "FACT" },
      { headers: { "Cache-Control": "public, max-age=30, s-maxage=60" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "股票搜索暂不可用", evidence: "UNKNOWN" }, { status: 502 });
  }
}

