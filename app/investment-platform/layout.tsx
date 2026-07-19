import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "投资看板｜实时智能投研平台",
  description: "连接腾讯财经与东方财富的实时行情、商业热点、股票搜索和结构化研究平台。",
  openGraph: {
    title: "投资看板｜实时智能投研平台",
    description: "实时行情、商业热点、个股研究与产业链研究，事实和推断分开呈现。",
    images: ["/investment-platform-og.png"],
  },
};

export default function InvestmentPlatformLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
