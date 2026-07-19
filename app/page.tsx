"use client";

import { useState } from "react";

type Verdict = "PASS" | "REVIEW" | "BLOCK";
type Quote = {
  symbol: string;
  name: string;
  code: string;
  price: number;
  previousClose: number;
  open: number;
  high: number;
  low: number;
  change: number;
  changePercent: number;
  timestamp: string;
  source: string;
};

const scenarios: Record<
  Verdict,
  {
    eyebrow: string;
    title: string;
    summary: string;
    findings: number;
    gates: Array<{ name: string; status: Verdict; note: string }>;
  }
> = {
  PASS: {
    eyebrow: "合成证据包 · 2026-07-17 15:06 CST",
    title: "流程证据完整",
    summary: "五道闸门均已满足，未发现关键缺陷。可提交人工复核，但不构成任何买入建议。",
    findings: 0,
    gates: [
      { name: "数据源", status: "PASS", note: "字段、时间戳与血缘完整" },
      { name: "研究假设", status: "PASS", note: "阈值、期限与失效条件齐备" },
      { name: "风险规则", status: "PASS", note: "仓位与异常行情边界已冻结" },
      { name: "回测证据", status: "PASS", note: "成本、样本外与偏差检查通过" },
      { name: "输出边界", status: "PASS", note: "事实、推断、未知明确分离" },
    ],
  },
  REVIEW: {
    eyebrow: "缺证据演示 · 独立来源未对账",
    title: "需要补充证据",
    summary: "当前没有关键风险，但独立来源交叉验证尚未完成。证据补齐前，不进入下一阶段。",
    findings: 1,
    gates: [
      { name: "数据源", status: "REVIEW", note: "缺少独立来源抽样对账" },
      { name: "研究假设", status: "PASS", note: "阈值、期限与失效条件齐备" },
      { name: "风险规则", status: "PASS", note: "仓位与异常行情边界已冻结" },
      { name: "回测证据", status: "PASS", note: "成本、样本外与偏差检查通过" },
      { name: "输出边界", status: "PASS", note: "事实、推断、未知明确分离" },
    ],
  },
  BLOCK: {
    eyebrow: "对抗样本 · 自动下单已开启",
    title: "发现关键缺陷",
    summary: "风险规则越过人工决策边界，审计立即阻断。收益目标或策略评分不能覆盖这一结论。",
    findings: 1,
    gates: [
      { name: "数据源", status: "PASS", note: "字段、时间戳与血缘完整" },
      { name: "研究假设", status: "PASS", note: "阈值、期限与失效条件齐备" },
      { name: "风险规则", status: "BLOCK", note: "自动下单违反第一阶段边界" },
      { name: "回测证据", status: "PASS", note: "成本、样本外与偏差检查通过" },
      { name: "输出边界", status: "BLOCK", note: "研究系统不得执行交易" },
    ],
  },
};

const workflow = [
  ["01", "赛道假设", "把周期、约束与惯性写成可证伪问题"],
  ["02", "机械筛选", "同一时点、同一口径生成候选池与剔除日志"],
  ["03", "公司深挖", "财务、产业链、管理层表述与情景交叉验证"],
  ["04", "五闸门审计", "独立检查数据、假设、风险、回测与输出边界"],
];

const labels = [
  { code: "FACT", title: "事实", copy: "有来源、时间戳与原始证据，可追溯复现。" },
  { code: "INFERENCE", title: "推断", copy: "写明机制链、竞争解释、置信度与证伪条件。" },
  { code: "UNKNOWN", title: "未知", copy: "明确缺口、验证责任与下一次检查时间。" },
];

export default function Home() {
  const [verdict, setVerdict] = useState<Verdict>("PASS");
  const [code, setCode] = useState("600000");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteError, setQuoteError] = useState("");
  const [loading, setLoading] = useState(false);
  const scenario = scenarios[verdict];
  const reserve = 10;
  const budget = 1000;
  const lots = quote ? Math.floor((budget - reserve) / quote.price / 100) : 0;
  const shares = lots * 100;
  const used = quote ? shares * quote.price : 0;

  async function lookupQuote(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setQuoteError("");
    try {
      const response = await fetch(`/api/quote?code=${encodeURIComponent(code)}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "查询失败");
      setQuote(data);
    } catch (error) {
      setQuote(null);
      setQuoteError(error instanceof Error ? error.message : "查询失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main>
      <header className="topbar">
        <a className="brand" href="#top" aria-label="证衡研究台首页">
          <span className="brand-mark">衡</span>
          <span>证衡研究台</span>
        </a>
        <nav aria-label="主导航">
          <a href="#audit">审计台</a>
          <a href="#quote">行情试算</a>
          <a href="#workflow">研究流程</a>
          <a href="#boundary">边界</a>
        </nav>
        <a className="repo-link" href="https://github.com/jwang0127/stock" target="_blank" rel="noreferrer">
          GitHub 仓库 <span aria-hidden="true">↗</span>
        </a>
      </header>

      <section className="hero" id="top">
        <div className="hero-copy">
          <div className="kicker"><span /> A-SHARE RESEARCH AUDIT / PHASE 01</div>
          <h1>先验证研究，<br /><em>再讨论判断。</em></h1>
          <p>
            面向 A 股中长期研究的证据与独立审计底座。它不预测“必涨”，不替人下单；
            它让每一个事实、推断、未知和失效条件都有迹可循。
          </p>
          <div className="hero-actions">
            <a className="primary-action" href="#audit">查看审计演示 <span>↓</span></a>
            <span className="safety-chip"><i /> 仅研究 / 回测 / 模拟盘</span>
          </div>
        </div>
        <div className="hero-aside" aria-label="项目状态摘要">
          <div className="aside-head"><span>当前交付</span><b>01 / 06</b></div>
          <div className="phase-number">PHASE<br /><strong>01</strong></div>
          <div className="aside-grid">
            <div><span>数据模式</span><b>合成数据</b></div>
            <div><span>外部密钥</span><b>0</b></div>
            <div><span>审计闸门</span><b>5</b></div>
            <div><span>自动下单</span><b>关闭</b></div>
          </div>
          <div className="aside-foot"><span className="pulse" /> 核心测试已覆盖三种裁决</div>
        </div>
      </section>

      <section className="manifesto">
        <p>研究质量不是一个“聪明分数”，而是一条可以复现、可以证伪、无法绕过审计的证据链。</p>
        <span>PASS ≠ 买入</span>
      </section>

      <section className="audit-section" id="audit">
        <div className="section-heading">
          <div><span className="section-index">01</span><h2>独立审计台</h2></div>
          <p>切换三种内置场景，查看同一套五闸门规则如何裁决。</p>
        </div>

        <div className="audit-shell">
          <div className="audit-nav" role="tablist" aria-label="审计场景">
            {(["PASS", "REVIEW", "BLOCK"] as Verdict[]).map((item) => (
              <button
                key={item}
                role="tab"
                aria-selected={verdict === item}
                className={verdict === item ? "active" : ""}
                onClick={() => setVerdict(item)}
              >
                <span className={`tiny-dot ${item.toLowerCase()}`} />
                {item}
                <small>{item === "PASS" ? "完整样本" : item === "REVIEW" ? "缺证据" : "关键缺陷"}</small>
              </button>
            ))}
          </div>

          <div className="audit-result">
            <div className="verdict-panel">
              <div className="verdict-top">
                <span className={`verdict-badge ${verdict.toLowerCase()}`}>{verdict}</span>
                <span className="finding-count">{scenario.findings} 项发现</span>
              </div>
              <p className="mono eyebrow">{scenario.eyebrow}</p>
              <h3>{scenario.title}</h3>
              <p className="result-summary">{scenario.summary}</p>
              <div className="code-output">
                <span>CLI STANDARD OUTPUT</span>
                <code>{verdict}</code>
              </div>
            </div>
            <div className="gate-list">
              <div className="gate-list-head"><span>五道闸门</span><span>状态 / 证据</span></div>
              {scenario.gates.map((gate, index) => (
                <div className="gate-row" key={gate.name}>
                  <span className="gate-number">0{index + 1}</span>
                  <div><b>{gate.name}</b><p>{gate.note}</p></div>
                  <span className={`gate-status ${gate.status.toLowerCase()}`}>{gate.status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="quote-section" id="quote">
        <div className="section-heading">
          <div><span className="section-index">02</span><h2>1000 元行情试算</h2></div>
          <p>腾讯财经只读行情；自动识别沪深前缀，排除北交所与科创板。报价不作为下单依据。</p>
        </div>
        <div className="quote-grid">
          <div className="quote-console">
            <span className="console-label mono">READ-ONLY QUOTE / TENCENT</span>
            <h3>输入股票代码</h3>
            <form onSubmit={lookupQuote}>
              <label htmlFor="stock-code">6 位 A 股代码</label>
              <div className="input-row">
                <input
                  id="stock-code"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  value={code}
                  onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
                  aria-describedby="code-help"
                />
                <button type="submit" disabled={loading}>{loading ? "查询中" : "查询行情"}</button>
              </div>
              <p id="code-help">沪市自动加 sh，深市自动加 sz；68、4、8、92 开头代码会被拒绝。</p>
            </form>
            {quoteError && <div className="quote-error" role="alert">{quoteError}</div>}
            {quote && (
              <div className="quote-card">
                <div>
                  <span>{quote.symbol.toUpperCase()}</span>
                  <h4>{quote.name}</h4>
                </div>
                <div className="quote-price">
                  <strong>{quote.price.toFixed(2)}</strong>
                  <span className={quote.change >= 0 ? "up" : "down"}>
                    {quote.change >= 0 ? "+" : ""}{quote.change.toFixed(2)} / {quote.changePercent.toFixed(2)}%
                  </span>
                </div>
                <dl>
                  <div><dt>今开</dt><dd>{quote.open.toFixed(2)}</dd></div>
                  <div><dt>最高</dt><dd>{quote.high.toFixed(2)}</dd></div>
                  <div><dt>最低</dt><dd>{quote.low.toFixed(2)}</dd></div>
                  <div><dt>昨收</dt><dd>{quote.previousClose.toFixed(2)}</dd></div>
                </dl>
                <small>{quote.source} · {quote.timestamp}</small>
              </div>
            )}
          </div>
          <div className="capital-panel">
            <span className="console-label mono">CAPITAL CONSTRAINT</span>
            <h3>这笔资金的现实边界</h3>
            <div className="capital-number"><span>本金</span><strong>¥1,000</strong></div>
            <div className="capital-bars">
              <div><span style={{ width: "70%" }} /><b>70% 现金缓冲</b></div>
              <div><span style={{ width: "30%" }} /><b>30% 风险实验上限</b></div>
            </div>
            {quote ? (
              <div className="lot-result">
                <div><span>按 100 股一手、预留 ¥{reserve}</span><b>{lots > 0 ? `${lots} 手 / ${shares} 股` : "买不了 1 手"}</b></div>
                <div><span>预计占用</span><b>¥{used.toFixed(2)}</b></div>
                <div><span>剩余现金</span><b>¥{(budget - used).toFixed(2)}</b></div>
              </div>
            ) : (
              <p className="lot-placeholder">查询一只股票后，这里会按当前价计算最多可买手数。</p>
            )}
            <div className="target-warning">
              <b>“一个月翻倍”不可作为可审计目标</b>
              <p>月收益 100% 需要极端风险，可能快速损失大部分本金。1000 元又受 100 股一手约束，难以分散。更稳妥的安排是先模拟一个月、不开杠杆、不碰 ST/退市整理，并把真实亏损上限写在收益目标之前。</p>
            </div>
          </div>
        </div>
      </section>

      <section className="workflow-section" id="workflow">
        <div className="section-heading light">
          <div><span className="section-index">03</span><h2>证据先行的研究流程</h2></div>
          <p>策略与审计相互独立；审计规则不能被策略评分修改。</p>
        </div>
        <div className="workflow-grid">
          {workflow.map(([number, title, copy]) => (
            <article key={number}>
              <span>{number}</span>
              <div className="flow-line" />
              <h3>{title}</h3>
              <p>{copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="evidence-section">
        <div className="section-heading">
          <div><span className="section-index">04</span><h2>三类信息，绝不混写</h2></div>
          <p>结论强度永远不能高于证据强度。</p>
        </div>
        <div className="label-grid">
          {labels.map((item, index) => (
            <article key={item.code}>
              <div className="label-head"><span>{item.code}</span><small>0{index + 1}</small></div>
              <h3>{item.title}</h3>
              <p>{item.copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="boundary" id="boundary">
        <div>
          <span className="boundary-label">HUMAN IN THE LOOP</span>
          <h2>系统审计流程，<br />人做最终决策。</h2>
        </div>
        <div className="boundary-copy">
          <p>本项目只提高研究的可复现性、可证伪性与风险纪律，不承诺收益，不连接券商，不自动执行交易。</p>
          <ul>
            <li><span>PASS</span> 证据流程通过审计，不代表建议买入</li>
            <li><span>REVIEW</span> 证据或口径需要补充，不代表看空</li>
            <li><span>BLOCK</span> 流程存在关键缺陷，不代表股票必跌</li>
          </ul>
        </div>
      </section>

      <footer>
        <div className="brand"><span className="brand-mark">衡</span><span>证衡研究台</span></div>
        <p>可复现 · 可证伪 · 可审计</p>
        <span className="mono">SYNTHETIC DATA ONLY / v0.1.0</span>
      </footer>
    </main>
  );
}
