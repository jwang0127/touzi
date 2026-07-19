import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "3000元持仓助手｜每日持有或卖出检查",
  description: "根据收益目标、风险止损、持有期限和趋势规则，每日检查A股持仓状态。",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
