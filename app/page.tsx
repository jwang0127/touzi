"use client";

import { useCallback, useEffect, useState } from "react";

type Holding = {
  code: string;
  cost: string;
  shares: string;
  buyDate: string;
};

type Analysis = {
  symbol: string;
  code: string;
  name: string;
  latestDate: string;
  price: number;
  cost: number;
  returnRate: number;
  heldDays: number;
  ma5: number;
  ma20: number;
  ma60: number;
  signal: "HOLD" | "REVIEW" | "SELL";
  headline: string;
  reasons: string[];
  checkedAt: string;
  source: string;
};

const STORAGE_KEY = "a-share-holding-v2";
const defaultHolding: Holding = {
  code: "",
  cost: "",
  shares: "100",
  buyDate: new Date().toISOString().slice(0, 10),
};

const signalLabel = { HOLD: "继续持有", REVIEW: "谨慎观察", SELL: "卖出" };

export default function Home() {
  const [holding, setHolding] = useState<Holding>(defaultHolding);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);

  const checkHolding = useCallback(async (value: Holding) => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ code: value.code, cost: value.cost, buyDate: value.buyDate });
      const response = await fetch(`/api/analysis?${params.toString()}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "检查失败");
      setAnalysis(data);
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...value, lastChecked: new Date().toISOString() }));
    } catch (caught) {
      setAnalysis(null);
      setError(caught instanceof Error ? caught.message : "检查失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    let initial = defaultHolding;
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        initial = { code: parsed.code, cost: parsed.cost, shares: parsed.shares, buyDate: parsed.buyDate };
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
    setHolding(initial);
    setReady(true);
    if (initial.code && initial.cost && initial.buyDate) void checkHolding(initial);
  }, [checkHolding]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(holding));
    await checkHolding(holding);
  }

  const shares = Number(holding.shares) || 0;
  const marketValue = analysis ? analysis.price * shares : 0;
  const profit = analysis ? (analysis.price - analysis.cost) * shares : 0;
  const invested = Number(holding.cost) * shares || 0;
  const remainingCash = Math.max(0, 3000 - invested);

  return (
    <main className="monitor-page">
      <header className="simple-header">
        <div>
          <span className="logo">持</span>
          <strong>3000元持仓助手</strong>
        </div>
        <span>每天打开自动检查 · 不自动下单</span>
      </header>

      <section className="monitor-hero">
        <div>
          <span className="overline">ONE-MONTH POSITION MONITOR</span>
          <h1>今天应该<br /><em>持有还是卖出？</em></h1>
          <p>输入真实持仓，系统按照收益目标、风险止损、30天期限和均线趋势给出研究信号。</p>
        </div>
        <div className="capital-summary">
          <div><span>本金</span><strong>¥3,000</strong></div>
          <div><span>目标线</span><strong>+50%</strong></div>
          <small>50%是高风险目标线，不是预期收益或保证。</small>
        </div>
      </section>

      <section className="monitor-grid">
        <form className="holding-form" onSubmit={submit}>
          <div className="panel-title">
            <span>01</span>
            <div><h2>我的持仓</h2><p>数据只保存在当前设备浏览器。</p></div>
          </div>

          <label>
            股票代码
            <input
              inputMode="numeric"
              maxLength={6}
              value={holding.code}
              onChange={(event) => setHolding({ ...holding, code: event.target.value.replace(/\D/g, "") })}
              required
            />
            <small>自动识别沪深；排除北交所和科创板</small>
          </label>

          <div className="form-row">
            <label>
              买入成本价
              <input type="number" min="0.01" step="0.01" value={holding.cost} onChange={(event) => setHolding({ ...holding, cost: event.target.value })} required />
            </label>
            <label>
              持有股数
              <input type="number" min="100" step="100" value={holding.shares} onChange={(event) => setHolding({ ...holding, shares: event.target.value })} required />
            </label>
          </div>

          <label>
            买入日期
            <input type="date" value={holding.buyDate} onChange={(event) => setHolding({ ...holding, buyDate: event.target.value })} required />
          </label>

          <button type="submit" disabled={loading || !ready}>{loading ? "正在检查…" : "保存并立即检查"}</button>
          {error && <div className="form-error" role="alert">{error}</div>}
        </form>

        <section className={`decision-panel ${analysis?.signal.toLowerCase() ?? "empty"}`} aria-live="polite">
          <div className="panel-title">
            <span>02</span>
            <div><h2>今日判断</h2><p>{analysis ? `行情日期 ${analysis.latestDate}` : "等待持仓数据"}</p></div>
          </div>

          {analysis ? (
            <>
              <div className="stock-heading">
                <div><small>{analysis.symbol.toUpperCase()}</small><h3>{analysis.name}</h3></div>
                <div><strong>¥{analysis.price.toFixed(2)}</strong><span className={analysis.returnRate >= 0 ? "profit" : "loss"}>{analysis.returnRate >= 0 ? "+" : ""}{(analysis.returnRate * 100).toFixed(2)}%</span></div>
              </div>

              <div className="signal-box">
                <span>系统信号</span>
                <strong>{signalLabel[analysis.signal]}</strong>
                <p>{analysis.headline}</p>
              </div>

              <ul className="reason-list">
                {analysis.reasons.map((reason) => <li key={reason}>{reason}</li>)}
              </ul>

              <div className="metrics">
                <div><span>持有天数</span><b>{analysis.heldDays} 天</b></div>
                <div><span>5日均线</span><b>{analysis.ma5.toFixed(2)}</b></div>
                <div><span>20日均线</span><b>{analysis.ma20.toFixed(2)}</b></div>
                <div><span>60日均线</span><b>{analysis.ma60.toFixed(2)}</b></div>
              </div>
            </>
          ) : (
            <div className="empty-state">保存持仓后显示今日判断</div>
          )}
        </section>
      </section>

      <section className="account-strip">
        <div><span>投入成本</span><strong>¥{invested.toFixed(2)}</strong></div>
        <div><span>剩余现金</span><strong>¥{remainingCash.toFixed(2)}</strong></div>
        <div><span>当前市值</span><strong>¥{marketValue.toFixed(2)}</strong></div>
        <div><span>浮动盈亏</span><strong className={profit >= 0 ? "profit" : "loss"}>{profit >= 0 ? "+" : ""}¥{profit.toFixed(2)}</strong></div>
      </section>

      <section className="rules-section">
        <div className="panel-title">
          <span>03</span>
          <div><h2>固定判断规则</h2><p>先写规则，再看结果；不因短期盈亏临时修改。</p></div>
        </div>
        <div className="rule-grid">
          <article><b>达到 +50%</b><span>卖出</span><p>达到高风险目标线后优先锁定收益。</p></article>
          <article><b>亏损 -8%</b><span>卖出</span><p>本金保护优先，不允许无限等待反弹。</p></article>
          <article><b>持有满30天</b><span>卖出</span><p>观察期结束，不能为了目标临时延长。</p></article>
          <article><b>跌破20日趋势</b><span>卖出/复核</span><p>现价和5日线同步走弱时退出。</p></article>
        </div>
      </section>

      <section className="risk-note">
        <strong>重要说明</strong>
        <p>该判断只使用价格和时间规则，不包含公司公告、财务造假、停牌、重大监管处罚等全部风险。腾讯行情不是交易所官方源，真正卖出前必须由你核对券商行情和最新公告。</p>
        <span>{analysis?.source ?? "腾讯财经前复权日线"}</span>
      </section>

      <footer className="simple-footer">3000元持仓助手 · 研究信号，不是自动交易指令</footer>
    </main>
  );
}
