import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "证衡研究台｜A股投资研究看板",
  description: "面向A股研究、回测与模拟持仓的证据化投资工作台，不连接券商，不自动下单。",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
