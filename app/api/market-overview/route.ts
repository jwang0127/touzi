import { NextResponse } from "next/server";

const INDEX_SYMBOLS = ["sh000001", "sz399001", "sz399006", "sh000300", "sh000905", "sh000852"];

function decodeQuote(buffer: ArrayBuffer) {
  try { return new TextDecoder("gb18030").decode(buffer); }
  catch { return new TextDecoder().decode(buffer); }
}

export async function GET() {
  try {
    const response = await fetch(`https://qt.gtimg.cn/q=${INDEX_SYMBOLS.join(",")}`, {
      headers: { "User-Agent": "Mozilla/5.0", Referer: "https://finance.qq.com/" },
      cache: "no-store",
    });
    if (!response.ok) throw new Error("市场行情接口暂时不可用");
    const body = decodeQuote(await response.arrayBuffer());
    const items = body.split(";")
      .map((line) => {
        const symbol = line.match(/^v_([^=]+)/)?.[1] ?? "";
        const fields = line.match(/="([^"]*)"/)?.[1]?.split("~") ?? [];
        if (!symbol || fields.length < 35 || !fields[3]) return null;
        return {
          symbol,
          name: fields[1],
          price: Number(fields[3]),
          change: Number(fields[31]),
          changePercent: Number(fields[32]),
          timestamp: fields[30],
          source: "腾讯财经只读行情（非交易所官方源）",
        };
      })
      .filter((item) => item !== null);
    if (!items.length) throw new Error("市场行情为空");
    return NextResponse.json({
      asOf: new Date().toISOString(),
      source: "腾讯财经只读行情（非交易所官方源）",
      provenance: { adapter: "tencent-quote", requestedSymbols: INDEX_SYMBOLS, fetchedAt: new Date().toISOString() },
      items,
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "市场行情同步失败" }, { status: 503 });
  }
}
