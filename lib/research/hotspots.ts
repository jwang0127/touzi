import type { TencentQuote } from "../market-data/tencent";

export const THEME_BASKETS = [
  { id: "ai-optics", name: "AI算力 / 光模块", symbols: ["sz300308", "sz300502", "sz300394"], thesis: "云端算力资本开支向高速互联扩散，观察订单、良率与客户集中度。" },
  { id: "innovative-drug", name: "创新药 / CRO", symbols: ["sh600276", "sh603259", "sz300347"], thesis: "管线兑现与海外授权驱动估值修复，重点核对现金流和临床里程碑。" },
  { id: "semiconductor", name: "半导体 / 存储", symbols: ["sh603986", "sh600584", "sh688008"], thesis: "AI服务器与国产替代支撑需求，风险在周期库存与高估值。" },
  { id: "commercial-space", name: "商业航天", symbols: ["sh600118", "sh600879", "sh688568"], thesis: "卫星组网和发射频次是验证变量，关注订单转化与回款。" },
  { id: "robotics", name: "机器人 / 自动化", symbols: ["sh688017", "sh603662", "sz300124"], thesis: "从样机走向量产需要验证成本、交付和真实客户需求。" },
  { id: "high-dividend", name: "高股息 / 电力", symbols: ["sh600900", "sh601088", "sh600941"], thesis: "低波动现金流资产在风险偏好下降时具备防御价值。" },
  { id: "brokerage", name: "券商 / 金融科技", symbols: ["sh600030", "sz300059", "sh601211"], thesis: "成交活跃度与资本市场改革是弹性来源，关注政策与估值。" },
  { id: "resources", name: "黄金 / 战略资源", symbols: ["sh601899", "sh600547", "sh603993"], thesis: "商品价格与供给约束共同驱动，需防范价格反转和拥挤交易。" },
] as const;

export function rankHotspots(quotes: TencentQuote[]) {
  const quoteMap = new Map(quotes.map(quote => [quote.symbol, quote]));
  return THEME_BASKETS.map(theme => {
    const members = theme.symbols.map(symbol => quoteMap.get(symbol)).filter(Boolean) as TencentQuote[];
    const averageChange = members.length ? members.reduce((sum, q) => sum + q.changePercent, 0) / members.length : 0;
    const breadth = members.length ? members.filter(q => q.changePercent > 0).length / members.length : 0;
    const dispersion = members.length ? Math.max(...members.map(q => q.changePercent)) - Math.min(...members.map(q => q.changePercent)) : 0;
    const score = Math.max(0, Math.min(100, 50 + averageChange * 4 + (breadth - 0.5) * 24 - Math.max(0, dispersion - 4) * 1.5));
    const state = averageChange >= 2 && breadth >= 2 / 3 ? "强势扩散" : averageChange >= 0.5 ? "结构活跃" : averageChange <= -5 ? "急跌 / 高波动" : averageChange <= -1 ? "降温观察" : "中性轮动";
    const evidence = members.length === theme.symbols.length ? "FACT" : "UNKNOWN";
    return {
      ...theme, averageChange, breadth, dispersion, score, state, evidence,
      members: members.map(q => ({ code: q.code, name: q.name, price: q.price, changePercent: q.changePercent, asOf: q.asOf })),
      asOf: members.map(q => q.asOf).sort().at(-1) ?? new Date().toISOString(),
      source: "腾讯财经主题篮子即时行情",
    };
  }).sort((a, b) => b.score - a.score);
}
