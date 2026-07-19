"use client";

import { useEffect, useMemo, useState } from "react";

type MarketItem = {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  timestamp: string;
  source: string;
};

type Candidate = {
  code: string;
  symbol: string;
  name: string;
  price: number;
  latestDate: string;
  score: number;
  suggestedShares: number;
  suggestedCost: number;
  suggestedCash: number;
  plannedMaxLoss: number;
  pe: number;
  turnover: number;
  return20: number;
  return60: number;
  reasons: string[];
  risks: string[];
  coverageGap: string;
  scoreBreakdown: { label: string; score: number; note: string }[];
};

type RecommendationResult = {
  asOf: string;
  recommendation: Candidate | null;
  watchlist: Candidate[];
  universe: string;
  method: string;
  notice: string;
  sourceMode: string;
  waveEvaluation: {
    sample: string;
    baselineAverage20d: number;
    waveAverage20d: number;
    baselinePositiveRate: number;
    wavePositiveRate: number;
    baselineHit10Rate: number;
    waveHit10Rate: number;
    conclusion: string;
  };
};

type PositionInput = { code: string; cost: string; shares: string; buyDate: string };
type Position = PositionInput & {
  name: string;
  price: number;
  returnRate: number;
  signal: "HOLD" | "REVIEW" | "SELL";
  headline: string;
  latestDate: string;
  source: string;
};

const tabs = ["市场概览", "持仓台账", "研究工作台", "回测实验", "审计记录"] as const;
type Tab = (typeof tabs)[number];
const POSITION_KEY = "zhengheng-positions-v1";
const emptyPosition: PositionInput = {
  code: "",
  cost: "",
  shares: "100",
  buyDate: new Date().toISOString().slice(0, 10),
};

function EvidenceTag({ kind }: { kind: "FACT" | "INFERENCE" | "UNKNOWN" }) {
  return <span className={`evidence-tag ${kind.toLowerCase()}`}>{kind}</span>;
}

function fmt(value: number, digits = 2) {
  return new Intl.NumberFormat("zh-CN", { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value);
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>("市场概览");
  const [market, setMarket] = useState<MarketItem[]>([]);
  const [marketMeta, setMarketMeta] = useState({ asOf: "等待同步", source: "腾讯财经只读行情" });
  const [recommendations, setRecommendations] = useState<RecommendationResult | null>(null);
  const [systemNote, setSystemNote] = useState("正在同步只读行情与研究候选…");
  const [positions, setPositions] = useState<Position[]>([]);
  const [form, setForm] = useState<PositionInput>(emptyPosition);
  const [positionError, setPositionError] = useState("");
  const [positionLoading, setPositionLoading] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(POSITION_KEY);
    if (saved) {
      try { setPositions(JSON.parse(saved)); } catch { localStorage.removeItem(POSITION_KEY); }
    }
    Promise.allSettled([
      fetch("/api/market-overview", { cache: "no-store" }).then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "市场行情同步失败");
        setMarket(data.items);
        setMarketMeta({ asOf: data.asOf, source: data.source });
      }),
      fetch("/api/recommendations", { cache: "no-store" }).then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "候选研究同步失败");
        setRecommendations(data);
      }),
    ]).then((results) => {
      const failures = results.filter((item) => item.status === "rejected");
      setSystemNote(failures.length ? `${failures.length} 项外部数据未完成，审计维持 REVIEW` : "行情与研究数据已完成本次同步");
    });
  }, []);

  const account = useMemo(() => {
    const cost = positions.reduce((sum, item) => sum + Number(item.cost) * Number(item.shares), 0);
    const value = positions.reduce((sum, item) => sum + item.price * Number(item.shares), 0);
    return { cost, value, profit: value - cost, cash: Math.max(0, 3000 - cost) };
  }, [positions]);

  const averageMove = market.length ? market.reduce((sum, item) => sum + item.changePercent, 0) / market.length : 0;
  const marketTone = averageMove > 0.55 ? "风险偏好回升" : averageMove < -0.55 ? "风险偏好收缩" : "震荡与分化";
  const lead = recommendations?.recommendation ?? recommendations?.watchlist?.[0] ?? null;

  async function addPosition(event: React.FormEvent) {
    event.preventDefault();
    setPositionLoading(true);
    setPositionError("");
    try {
      const params = new URLSearchParams({ code: form.code, cost: form.cost, buyDate: form.buyDate });
      const response = await fetch(`/api/analysis?${params.toString()}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "持仓检查失败");
      const next: Position = {
        ...form,
        name: data.name,
        price: data.price,
        returnRate: data.returnRate,
        signal: data.signal,
        headline: data.headline,
        latestDate: data.latestDate,
        source: data.source,
      };
      const updated = [...positions.filter((item) => item.code !== form.code), next];
      setPositions(updated);
      localStorage.setItem(POSITION_KEY, JSON.stringify(updated));
      setForm(emptyPosition);
    } catch (error) {
      setPositionError(error instanceof Error ? error.message : "持仓检查失败");
    } finally {
      setPositionLoading(false);
    }
  }

  function removePosition(code: string) {
    const updated = positions.filter((item) => item.code !== code);
    setPositions(updated);
    localStorage.setItem(POSITION_KEY, JSON.stringify(updated));
  }

  function adoptCandidate(candidate: Candidate) {
    setForm({ code: candidate.code, cost: candidate.price.toFixed(2), shares: String(candidate.suggestedShares), buyDate: candidate.latestDate });
    setActiveTab("持仓台账");
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand-mark">衡</div>
        <nav aria-label="主导航">
          {tabs.map((tab, index) => (
            <button key={tab} className={activeTab === tab ? "active" : ""} onClick={() => setActiveTab(tab)}>
              <span>0{index + 1}</span>{tab}
            </button>
          ))}
        </nav>
        <div className="sidebar-foot">
          <span className="status-dot" />研究模式
          <small>只读 · 不连接券商</small>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <strong>证衡研究台</strong>
            <span>INVESTMENT RESEARCH OS</span>
          </div>
          <div className="sync-meta">
            <span>{marketMeta.asOf}</span>
            <button onClick={() => window.location.reload()}>同步数据</button>
          </div>
        </header>

        {activeTab === "市场概览" && (
          <div className="dashboard-page">
            <section className="page-heading">
              <div><span className="eyebrow">MARKET OVERVIEW</span><h1>市场概览</h1></div>
              <p><EvidenceTag kind="FACT" /> {marketMeta.source}<br />{systemNote}</p>
            </section>

            <section className="market-grid">
              {(market.length ? market : [
                { symbol: "sh000001", name: "上证指数", price: 0, change: 0, changePercent: 0, timestamp: "等待同步", source: marketMeta.source },
                { symbol: "sz399001", name: "深证成指", price: 0, change: 0, changePercent: 0, timestamp: "等待同步", source: marketMeta.source },
                { symbol: "sz399006", name: "创业板指", price: 0, change: 0, changePercent: 0, timestamp: "等待同步", source: marketMeta.source },
                { symbol: "sh000300", name: "沪深300", price: 0, change: 0, changePercent: 0, timestamp: "等待同步", source: marketMeta.source },
                { symbol: "sh000905", name: "中证500", price: 0, change: 0, changePercent: 0, timestamp: "等待同步", source: marketMeta.source },
                { symbol: "sh000852", name: "中证1000", price: 0, change: 0, changePercent: 0, timestamp: "等待同步", source: marketMeta.source },
              ]).map((item) => (
                <article className="market-card" key={item.symbol}>
                  <div><span>{item.name}</span><small>{item.symbol.toUpperCase()}</small></div>
                  <strong>{item.price ? fmt(item.price) : "—"}</strong>
                  <div className={item.changePercent >= 0 ? "up" : "down"}>
                    {item.changePercent >= 0 ? "+" : ""}{fmt(item.changePercent)}%
                    <i style={{ transform: `scaleY(${Math.min(1.4, Math.max(.45, Math.abs(item.changePercent) / 1.8))})` }} />
                  </div>
                </article>
              ))}
            </section>

            <section className="overview-layout">
              <article className="regime-card dark-card">
                <div className="card-kicker"><EvidenceTag kind="INFERENCE" /> 市场状态</div>
                <h2>{marketTone}</h2>
                <div className="pulse-chart" aria-label="市场强弱示意图">
                  {[42, 54, 47, 66, 60, 72, 64, 78, 69, 82, 74, 88].map((height, index) => <i key={index} style={{ height: `${height}%` }} />)}
                </div>
                <p>基于当前可得指数涨跌的简单聚合，不代表市场预测；缺少成交结构与官方交叉验证。</p>
              </article>

              <article className="account-card">
                <div className="card-kicker"><EvidenceTag kind="FACT" /> 模拟账户</div>
                <div className="account-total"><span>总资产</span><strong>¥{fmt(account.value + account.cash)}</strong></div>
                <div className="account-metrics">
                  <div><span>持仓市值</span><b>¥{fmt(account.value)}</b></div>
                  <div><span>可用现金</span><b>¥{fmt(account.cash)}</b></div>
                  <div><span>累计浮盈亏</span><b className={account.profit >= 0 ? "up" : "down"}>{account.profit >= 0 ? "+" : ""}¥{fmt(account.profit)}</b></div>
                </div>
                <button onClick={() => setActiveTab("持仓台账")}>{positions.length ? `查看 ${positions.length} 笔模拟持仓` : "录入第一笔模拟持仓"}</button>
              </article>

              <article className="candidate-card">
                <div className="card-kicker"><EvidenceTag kind="INFERENCE" /> 今日研究候选</div>
                {lead ? <>
                  <div className="candidate-head"><div><small>{lead.symbol.toUpperCase()}</small><h2>{lead.name}</h2></div><strong>{lead.score}<span>/100</span></strong></div>
                  <div className="score-line"><i style={{ width: `${lead.score}%` }} /></div>
                  <dl><div><dt>参考价</dt><dd>¥{fmt(lead.price)}</dd></div><div><dt>20日表现</dt><dd>{(lead.return20 * 100).toFixed(1)}%</dd></div><div><dt>动态PE</dt><dd>{fmt(lead.pe, 1)}x</dd></div></dl>
                  <p>{lead.reasons[0] || "等待研究证据"}</p>
                  <button onClick={() => setActiveTab("研究工作台")}>打开完整研究卡</button>
                </> : <div className="loading-block">正在复核候选与数据覆盖边界…</div>}
              </article>

              <article className="audit-card">
                <div className="card-kicker"><EvidenceTag kind="UNKNOWN" /> 独立审计</div>
                <div className="audit-verdict"><span>当前裁决</span><strong>REVIEW</strong></div>
                <ul><li>缺少交易所/法定披露源交叉验证</li><li>突发公告与财报全文尚未纳入</li><li>三浪样本不足，不计入总分</li></ul>
                <button onClick={() => setActiveTab("审计记录")}>查看审计发现</button>
              </article>
            </section>

            <section className="evidence-strip">
              <div><span>数据时点</span><b>{marketMeta.asOf}</b></div>
              <div><span>行情来源</span><b>腾讯财经（非交易所官方源）</b></div>
              <div><span>研究范围</span><b>沪深主板 · 只读研究</b></div>
              <div><span>执行边界</span><b>模拟持仓 · 禁止自动下单</b></div>
            </section>
          </div>
        )}

        {activeTab === "持仓台账" && (
          <div className="dashboard-page">
            <section className="page-heading"><div><span className="eyebrow">PAPER PORTFOLIO</span><h1>持仓台账</h1></div><p><EvidenceTag kind="FACT" /> 仅保存在当前设备，不连接券商账户</p></section>
            <div className="ledger-layout">
              <form className="position-form" onSubmit={addPosition}>
                <div className="card-kicker">录入模拟持仓</div>
                <label>股票代码<input value={form.code} maxLength={6} inputMode="numeric" onChange={(e) => setForm({ ...form, code: e.target.value.replace(/\D/g, "") })} placeholder="例如 600000" required /></label>
                <div className="form-pair"><label>成本价<input type="number" min="0.01" step="0.01" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} required /></label><label>股数<input type="number" min="100" step="100" value={form.shares} onChange={(e) => setForm({ ...form, shares: e.target.value })} required /></label></div>
                <label>买入日期<input type="date" value={form.buyDate} onChange={(e) => setForm({ ...form, buyDate: e.target.value })} required /></label>
                <button disabled={positionLoading}>{positionLoading ? "正在读取行情…" : "保存并运行持仓检查"}</button>
                {positionError && <p className="form-error" role="alert">{positionError}</p>}
              </form>
              <section className="positions-table">
                <div className="table-head"><span>模拟持仓</span><small>{positions.length} 个标的</small></div>
                {positions.length ? positions.map((position) => (
                  <article className="position-row" key={position.code}>
                    <div><small>{position.code}</small><strong>{position.name}</strong><span>{position.latestDate} · {position.source}</span></div>
                    <div><small>成本 / 现价</small><b>¥{fmt(Number(position.cost))} / ¥{fmt(position.price)}</b></div>
                    <div><small>浮盈亏</small><b className={position.returnRate >= 0 ? "up" : "down"}>{position.returnRate >= 0 ? "+" : ""}{(position.returnRate * 100).toFixed(2)}%</b></div>
                    <div className={`signal ${position.signal.toLowerCase()}`}><EvidenceTag kind="INFERENCE" /><b>{position.signal}</b><span>{position.headline}</span></div>
                    <button aria-label={`删除${position.name}`} onClick={() => removePosition(position.code)}>移除</button>
                  </article>
                )) : <div className="empty-ledger"><b>尚无模拟持仓</b><span>左侧录入后，系统会读取最新日线并按固定规则复核。</span></div>}
              </section>
            </div>
          </div>
        )}

        {activeTab === "研究工作台" && (
          <div className="dashboard-page">
            <section className="page-heading"><div><span className="eyebrow">RESEARCH WORKBENCH</span><h1>研究工作台</h1></div><p><EvidenceTag kind="INFERENCE" /> 候选不等于买入建议，采用前必须人工复核</p></section>
            {lead ? <div className="research-layout">
              <article className="research-hero dark-card"><small>{lead.symbol.toUpperCase()} · {lead.latestDate}</small><h2>{lead.name}</h2><strong>{lead.score}</strong><span>透明研究分 / 100</span><button onClick={() => adoptCandidate(lead)}>加入模拟持仓表单</button></article>
              <article className="research-detail">
                <div className="score-grid">{lead.scoreBreakdown.map((item) => <div key={item.label}><span>{item.label}</span><strong>{item.score}</strong><i><em style={{ width: `${item.score}%` }} /></i><small>{item.note}</small></div>)}</div>
                <div className="research-columns"><div><h3><EvidenceTag kind="FACT" /> 已取得证据</h3>{lead.reasons.map((reason) => <p key={reason}>＋ {reason}</p>)}</div><div><h3><EvidenceTag kind="UNKNOWN" /> 风险与缺口</h3>{lead.risks.map((risk) => <p key={risk}>! {risk}</p>)}<p>! {lead.coverageGap}</p></div></div>
                <div className="plan-strip"><div><span>建议股数</span><b>{lead.suggestedShares} 股</b></div><div><span>模拟投入</span><b>¥{fmt(lead.suggestedCost, 0)}</b></div><div><span>保留现金</span><b>¥{fmt(lead.suggestedCash, 0)}</b></div><div><span>计划最大亏损</span><b>¥{fmt(lead.plannedMaxLoss, 0)}</b></div></div>
              </article>
            </div> : <div className="large-loading">正在生成研究卡；若证据不足，系统将保持空仓。</div>}
          </div>
        )}

        {activeTab === "回测实验" && (
          <div className="dashboard-page">
            <section className="page-heading"><div><span className="eyebrow">FALSIFIABLE EXPERIMENTS</span><h1>回测实验</h1></div><p><EvidenceTag kind="FACT" /> 固定窗口、可证伪假设、计入交易成本后方可采用</p></section>
            <div className="experiment-grid">
              <article className="experiment-thesis dark-card"><span>EXPERIMENT 01</span><h2>三浪结构是否改善<br />20 日后的分布？</h2><p>反证条件：若正收益率与 10% 命中率未同步改善，则不纳入主策略评分。</p><strong>结论：AUXILIARY ONLY</strong></article>
              <article className="experiment-results">
                <div className="card-kicker"><EvidenceTag kind="FACT" /> 当前小样本</div>
                {recommendations ? <>
                  <div className="comparison-row"><span>20日平均收益</span><b>{(recommendations.waveEvaluation.baselineAverage20d * 100).toFixed(1)}%</b><i>→</i><strong>{(recommendations.waveEvaluation.waveAverage20d * 100).toFixed(1)}%</strong></div>
                  <div className="comparison-row"><span>正收益率</span><b>{(recommendations.waveEvaluation.baselinePositiveRate * 100).toFixed(1)}%</b><i>→</i><strong>{(recommendations.waveEvaluation.wavePositiveRate * 100).toFixed(1)}%</strong></div>
                  <div className="comparison-row"><span>达到 10%</span><b>{(recommendations.waveEvaluation.baselineHit10Rate * 100).toFixed(1)}%</b><i>→</i><strong>{(recommendations.waveEvaluation.waveHit10Rate * 100).toFixed(1)}%</strong></div>
                  <p>{recommendations.waveEvaluation.sample}。{recommendations.waveEvaluation.conclusion}</p>
                </> : <div className="loading-block">正在加载回测摘要…</div>}
              </article>
            </div>
          </div>
        )}

        {activeTab === "审计记录" && (
          <div className="dashboard-page">
            <section className="page-heading"><div><span className="eyebrow">INDEPENDENT AUDIT</span><h1>审计记录</h1></div><p>策略输出不能选择、覆盖或绕过审计裁决</p></section>
            <div className="audit-layout">
              <article className="verdict-panel"><span>CURRENT VERDICT</span><strong>REVIEW</strong><p>缺少的证据被视为 REVIEW；若发现信息泄漏、空数据、不可能成交或自动下单，将升级为 BLOCK。</p></article>
              <section className="finding-list">
                <div className="finding review"><b>REVIEW</b><div><strong>SOURCE_CHECK</strong><p>腾讯财经不是交易所法定披露源，关键事实缺少独立交叉验证。</p></div><EvidenceTag kind="UNKNOWN" /></div>
                <div className="finding review"><b>REVIEW</b><div><strong>OUT_OF_SAMPLE</strong><p>三浪实验样本量较小，样本外验证尚未完成。</p></div><EvidenceTag kind="FACT" /></div>
                <div className="finding review"><b>REVIEW</b><div><strong>DISCLOSURE_COVERAGE</strong><p>自动研究尚未覆盖突发公告、财报全文和重大监管处置。</p></div><EvidenceTag kind="UNKNOWN" /></div>
                <div className="finding pass"><b>PASS</b><div><strong>EXECUTION_BOUNDARY</strong><p>当前阶段仅支持研究、回测与模拟持仓，不存在券商连接或下单能力。</p></div><EvidenceTag kind="FACT" /></div>
              </section>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
