import { NextRequest, NextResponse } from "next/server";

function normalizeCode(raw: string) {
  const code = raw.replace(/\D/g, "");
  if (code.length !== 6) throw new Error("请输入6位股票代码");
  if (/^(4|8|92)/.test(code)) throw new Error("已按要求排除北交所股票");
  if (/^68/.test(code)) throw new Error("已按要求排除科创板股票");
  if (/^6/.test(code)) return `sh${code}`;
  if (/^(0|2|3)/.test(code)) return `sz${code}`;
  throw new Error("暂不支持该代码所属市场");
}

export async function GET(request: NextRequest) {
  try {
    const symbol = normalizeCode(request.nextUrl.searchParams.get("code") ?? "");
    const response = await fetch(`https://qt.gtimg.cn/q=${symbol}`, {
      headers: { "User-Agent": "Mozilla/5.0", Referer: "https://finance.qq.com/" },
      cache: "no-store",
    });
    if (!response.ok) throw new Error("行情接口暂时不可用");
    const buffer = await response.arrayBuffer();
    let body: string;
    try {
      body = new TextDecoder("gb18030").decode(buffer);
    } catch {
      body = new TextDecoder().decode(buffer);
    }
    const match = body.match(/="([^"]*)"/);
    const fields = match?.[1]?.split("~") ?? [];
    if (fields.length < 35 || !fields[3]) throw new Error("没有找到有效行情");
    return NextResponse.json({
      symbol,
      name: fields[1],
      code: fields[2],
      price: Number(fields[3]),
      previousClose: Number(fields[4]),
      open: Number(fields[5]),
      timestamp: fields[30],
      change: Number(fields[31]),
      changePercent: Number(fields[32]),
      high: Number(fields[33]),
      low: Number(fields[34]),
      source: "腾讯财经只读行情（非交易所官方源）",
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "查询失败" }, { status: 400 });
  }
}
