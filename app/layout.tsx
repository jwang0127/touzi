import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "3000元每日荐股助手｜自动筛选与持有卖出检查",
  description: "自动筛选沪深主板候选，并根据风险止损、持有期限和趋势规则每日检查模拟持仓。",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
