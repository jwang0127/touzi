import { NextRequest, NextResponse } from "next/server";
import { fetchTencentQuotes, normalizeAshareCode } from "@/lib/market-data/tencent";

export async function GET(request: NextRequest) {
  try {
    const codes = (request.nextUrl.searchParams.get("codes") ?? "")
      .split(",").map(code => code.replace(/\D/g, "")).filter(code => code.length === 6).slice(0, 30);
    if (!codes.length) return NextResponse.json({ quotes: [], fetchedAt: new Date().toISOString(), source: "腾讯财经" });
    const quotes = await fetchTencentQuotes(codes.map(normalizeAshareCode));
    return NextResponse.json({ quotes, fetchedAt: new Date().toISOString(), source: "腾讯财经", evidence: "FACT" },
      { headers: { "Cache-Control": "public, max-age=20, s-maxage=30" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "自选行情暂不可用", evidence: "UNKNOWN" }, { status: 502 });
  }
}
