import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "投资看板｜研究与纸面交易平台",
  description: "基于视频框架复刻的市场、持仓、策略、个股与产业瓶颈研究工作台。",
  openGraph: {
    title: "投资看板｜研究与纸面交易平台",
    description: "把重复的信息整理交给 AI，把判断留给人。",
    images: ["/investment-platform-og.png"],
  },
};

export default function InvestmentPlatformLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
