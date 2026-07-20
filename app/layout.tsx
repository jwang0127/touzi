import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "投资看板｜股票研究与纸面交易工作台",
  description: "聚合实时行情、持仓观察、热点筛选、可证伪策略和个股研究；仅用于研究、回测与纸面交易。",
  openGraph: {
    title: "投资看板｜股票研究与纸面交易工作台",
    description: "事实、推断与未知分层呈现的股票研究看板，不连接券商，不自动下单。",
    images: ["/investment-platform-og.png"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
