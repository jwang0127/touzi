import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "证衡研究台｜A股中长期研究审计系统",
  description: "用可追溯证据、可证伪假设和五道独立闸门审计A股中长期研究流程。",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
