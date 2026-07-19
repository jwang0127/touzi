"use client";

import { useMemo, useState } from "react";
import styles from "./platform.module.css";

type TabKey =
  | "market"
  | "holdings"
  | "scores"
  | "trades"
  | "screening"
  | "strategy"
  | "stock"
  | "industry";

type Evidence = "FACT" | "INFERENCE" | "UNKNOWN";

const tabs: Array<{ key: TabKey; label: string }> = [
  { key: "market", label: "市场概览" },
  { key: "holdings", label: "持仓概览" },
  { key: "scores", label: "策略评分" },
  { key: "trades", label: "交易记录" },
  { key: "screening", label: "市场筛选" },
  { key: "strategy", label: "策略研究" },
  { key: "stock", label: "个股研究" },
  { key: "industry", label: "产业瓶颈研究" },
];

const markets = [
  ["上证指数", "4043.64", "+0.37%", "14.74 · 高4073.88 / 低4027.26", "up"],
  ["创业板指", "4019.93", "+0.07%", "2.66 · 高4115.63 / 低3985.36", "up"],
  ["沪深300", "4842.17", "+0.62%", "29.87 · 高4890.97 / 低4809.50", "up"],
  ["科创50", "1975.60", "-0.59%", "-11.69 · 高2039.31 / 低1948.17", "down"],
  ["中证500", "8745.26", "+0.59%", "51.08 · 高8860.42 / 低8636.15", "up"],
  ["中证2000", "3545.38", "+1.45%", "50.79", "up"],
  ["纳斯达克", "25832.67", "-0.80%", "", "down"],
  ["黄金(上海金)", "883.71元/克", "+1.62%", "", "up"],
  ["原油(WTI)", "68.58$/桶", "+0.19%", "", "up"],
  ["美元/人民币", "0.0677", "-0.35%", "", "down"],
  ["美元/离岸人民币", "6.7991", "+0.11%", "", "up"],
  ["欧元/人民币", "0.0776", "+0.32%", "", "up"],
];

const screeningRows = [
  ["科创50ETF", "588000", "持仓", "防御持有", "100.0", "2.100", "价格仍在MA20上方，MA20不弱；市场防御模式"],
  ["化工ETF", "159870", "持仓", "防御持有", "100.0", "0.868", "价格仍在MA20上方，趋势维持"],
  ["创新药AH", "159622", "持仓", "强势等回踩", "54.2", "1.093", "距MA20较远，等待回落至MA5/MA20附近"],
  ["创业板ETF东财", "159205", "持仓", "趋势回避", "21.7", "1.973", "不接，等待新的均线结构"],
  ["综指ETF", "510210", "持仓", "趋势回避", "4.6", "1.019", "中期通道被破，保持防御"],
  ["申菱环境", "301018", "自选", "强势等回踩", "87.0", "117.78", "MA5/20/30多头排列，等待回踩"],
  ["京东方A", "000725", "持仓", "强势等回踩", "74.8", "8.38", "价格仍在MA20上方，市场防御模式"],
  ["绿的谐波", "688017", "自选", "强势等回踩", "57.5", "488.00", "短期涨幅偏大，等待结构确认"],
];

const industryNodes = [
  ["高速光模块", "800G/1.6T/3.2T 连接核心", "出货结构、客户认证、毛利率趋势"],
  ["激光器 / InP 衬底", "光源与上游材料", "产能、良率、客户验证、竞争者数量"],
  ["光通信测试设备", "验证高速光链路可靠性", "设备订单、交期、客户导入"],
  ["精密光组件 / 光无源器件", "连接、耦合、隔离和封装高速光路", "客户认证、批量交付、海外产能、良率"],
  ["硅光子代工 / 封装", "把光电器件集成到可量产工艺", "工艺节点、封装路线、量产良率"],
  ["薄膜铌酸锂调制器 / 高速调制芯片", "降低高速光链路功耗并提升调制性能", "产品量产、客户导入、收入占比、良率"],
  ["AI 光互联整机", "GPU 与机柜间高带宽互联", "资本开支、部署节奏、互联架构"],
];

function Tag({ kind }: { kind: Evidence }) {
  return <span className={`${styles.evidence} ${styles[kind.toLowerCase()]}`}>{kind}</span>;
}

function MarketOverview() {
  return (
    <section>
      <div className={styles.marketGrid}>
        {markets.map(([name, value, change, detail, direction]) => (
          <article className={styles.marketCard} key={name}>
            <span>{name}</span>
            <strong className={direction === "up" ? styles.red : styles.green}>{value}</strong>
            <b className={direction === "up" ? styles.red : styles.green}>{change}</b>
            {detail && <small>{detail}</small>}
          </article>
        ))}
      </div>
      <div className={styles.sectionCard}>
        <div className={styles.sectionTitle}>
          <h2>🎯 市场情绪（第一层执行口径 + 宏观参考）</h2>
          <a href="#method">计算公式</a>
        </div>
        <div className={styles.sentimentGrid}>
          <div className={styles.gauge}>
            <span>市场模式</span><strong>DEFENSE</strong><b>防御 68</b>
          </div>
          <div>
            <p><Tag kind="FACT" /> 视频快照日期为 2026-07-03；此处数据按视频画面复刻，不代表当前行情。</p>
            <p><Tag kind="INFERENCE" /> 宽基指数多数上涨，但波动与拥挤度不支持追高。</p>
            <p><Tag kind="UNKNOWN" /> 未接入实时源前，不把任何数值用于交易执行。</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function Holdings() {
  return (
    <section className={styles.sectionCard}>
      <div className={styles.sectionTitle}><h2>持仓概览</h2><span>纸面持仓 · 不连接券商</span></div>
      <div className={styles.kpiRow}>
        {[['持仓数量','6'],['股票仓位','54.2%'],['ETF仓位','31.0%'],['现金','14.8%']].map(([a,b])=><div key={a}><span>{a}</span><strong>{b}</strong></div>)}
      </div>
      <div className={styles.tableWrap}><table><thead><tr><th>标的</th><th>类型</th><th>状态</th><th>成本</th><th>现价</th><th>研究判断</th><th>证据</th></tr></thead>
        <tbody>{screeningRows.slice(0,6).map((row,i)=><tr key={row[1]}><td><b>{row[0]}</b><small>{row[1]}</small></td><td>{row[2]}</td><td><span className={styles.pill}>{row[3]}</span></td><td>{i%2?"待录入":"2.03"}</td><td>{row[5]}</td><td>{row[6]}</td><td><Tag kind={i%3===0?"FACT":i%3===1?"INFERENCE":"UNKNOWN"}/></td></tr>)}</tbody>
      </table></div>
    </section>
  );
}

function Scores() {
  const scoreCards = [
    ["市场环境", "68", "防御模式，先判断仓位上限"], ["趋势结构", "74", "MA20 上方，但短期斜率分化"],
    ["回撤控制", "82", "止损与复盘阈值完整"], ["估值证据", "46", "部分标的缺少点时估值"],
  ];
  return <section><div className={styles.scoreGrid}>{scoreCards.map(([a,b,c],i)=><article className={styles.sectionCard} key={a}><Tag kind={i===3?"UNKNOWN":"INFERENCE"}/><h3>{a}</h3><strong className={styles.bigScore}>{b}</strong><p>{c}</p></article>)}</div>
    <div className={styles.sectionCard}><div className={styles.sectionTitle}><h2>策略评分拆解</h2><span>评分不能覆盖审计结论</span></div><div className={styles.tableWrap}><table><thead><tr><th>维度</th><th>权重</th><th>得分</th><th>点时证据</th><th>结论</th></tr></thead><tbody>{scoreCards.map(([a,b,c],i)=><tr key={a}><td>{a}</td><td>{[30,25,25,20][i]}%</td><td>{b}</td><td>{i===3?'缺少部分历史估值截面':'视频快照 2026-07-03'}</td><td><Tag kind={i===3?'UNKNOWN':'INFERENCE'}/>{c}</td></tr>)}</tbody></table></div></div>
  </section>;
}

function Trades() {
  const rows = [
    ["2026-06-24","159622 创新药AH","纸面调仓","1.093","趋势确认后建立观察仓","REVIEW"],
    ["2026-06-27","588000 科创50ETF","纸面持有","2.100","防御仓不加码","PASS"],
    ["2026-07-03","159205 创业板ETF东财","纸面复核","1.973","趋势破坏，等待结构修复","REVIEW"],
  ];
  return <section className={styles.sectionCard}><div className={styles.sectionTitle}><h2>交易记录</h2><span>仅研究日志 / 纸面交易</span></div><div className={styles.callout}><Tag kind="FACT"/> 本页不会连接券商，也没有下单入口。</div><div className={styles.tableWrap}><table><thead><tr><th>日期</th><th>标的</th><th>动作</th><th>价格</th><th>预先写下的理由</th><th>审计</th></tr></thead><tbody>{rows.map(r=><tr key={r[0]+r[1]}>{r.map((v,i)=><td key={i}>{v}</td>)}</tr>)}</tbody></table></div></section>;
}

function Screening() {
  const [mode,setMode] = useState("市场板块筛选");
  return <section>
    <div className={styles.subtabs}>{["市场板块筛选","红利低波","基金持仓跟踪","自选股"].map(x=><button className={mode===x?styles.activeSub:""} onClick={()=>setMode(x)} key={x}>{x}</button>)}</div>
    <div className={styles.sectionCard}>
      <div className={styles.sectionTitle}><div><h2>上升通道雷达</h2><p>行情日期 2026-07-03 · 市场模式 defense · 可试 0 · 强势等回踩 11</p></div><button className={styles.smallButton}>刷新雷达</button></div>
      <div className={styles.callout}>雷达会把“今日很强但可能追高”的标的降级；长线滞后或缺失的标的保留展示但不作为买入窗口。待补数据 64 个。</div>
      <h3>ETF 可执行窗口</h3>
      <div className={styles.tableWrap}><table><thead><tr><th>代码</th><th>动作</th><th>分数</th><th>位置</th><th>依据/风险</th><th>证据</th></tr></thead><tbody>{screeningRows.map((r,i)=><tr key={r[1]}><td><b>{r[0]}</b><small>{r[1]} · {r[2]}</small></td><td><span className={styles.pill}>{r[3]}</span></td><td><b>{r[4]}</b><small>通道 {Math.max(13.6,100-i*5.8).toFixed(1)}</small></td><td>{r[5]}<small>MA20 上方</small></td><td>{r[6]}</td><td><Tag kind={i<2?"FACT":"INFERENCE"}/></td></tr>)}</tbody></table></div>
    </div>
    <div className={styles.twoCols}>
      <article className={styles.sectionCard}><h3>🔴 领涨板块</h3>{[["贵金属","+6.17%"],["电机","+5.59%"],["军工装备","+4.48%"]].map(x=><div className={styles.barRow} key={x[0]}><span>{x[0]}</span><i style={{width:x[1].slice(1)}}/><b>{x[1]}</b></div>)}</article>
      <article className={styles.sectionCard}><h3>🟢 领跌板块</h3>{[["电子化学品","-5.37%"],["半导体","-2.53%"],["小金属","-2.09%"]].map(x=><div className={`${styles.barRow} ${styles.downBar}`} key={x[0]}><span>{x[0]}</span><i style={{width:x[1].slice(1)}}/><b>{x[1]}</b></div>)}</article>
    </div>
  </section>;
}

function Strategy() {
  return <section>
    <div className={styles.subtabs}><button className={styles.activeSub}>Mike 策略</button><button>Serenity 瓶颈研究</button><button>其他策略</button></div>
    <div className={styles.heroPair}><article className={styles.sectionCard}><h2>Mike 股票研究方法论</h2><p>先处理情绪和资金，再判断市场环境，最后才做个股选择。目标是形成一套能被执行、能被复盘、能被证伪的应对系统。</p><small>来源：research/mike/视频PPT · 更新：2026-05-30</small></article><article className={styles.miniGrid}>{[["优先级","情绪 > 资金 > 择时 > 选股"],["个股分类","6 类"],["研究输出","10 项模板"],["核心动作","先计划再下单"]].map(x=><div key={x[0]}><span>{x[0]}</span><strong>{x[1]}</strong></div>)}</article></div>
    <h2 className={styles.blockHeading}>核心原则</h2><div className={styles.fourCols}>{[["情绪第一","先识别自己会失控的场景，靠事前规则预防临场冲动。"],["资金第二","下单前先确定仓位、批次、止盈、加减仓条件。"],["择时第三","先看市场强弱、量能、均线生命线和估值位置。"],["选股最后","只研究自己能理解、能估值、能持续跟踪的公司。"]].map(x=><article key={x[0]}><h3>{x[0]}</h3><p>{x[1]}</p></article>)}</div>
    <h2 className={styles.blockHeading}>研究流程</h2><div className={styles.processList}>{["先定自己","判断市场","给公司分类","找有代价的钱","拆基本面","估底价/合理价/泡沫价","技术确认","写资金计划"].map((x,i)=><div key={x}><b>{i+1}. {x}</b><span>{["判断这笔研究适合左侧、右侧还是只观察；如果无法承受波动，不进入交易。","用指数、M30、M20/M30量能、估值区间和情绪判断当前仓位上限。","先确认属于六类股票中的哪一类，再选择估值方法。","优先看定增、高管增持、员工持股、产业资本、资产注入和长期机构持仓。","研究业务、行业、竞争、财务、管理层和预期差。","底价来自参与方成本，合理价来自公司类型，泡沫价提醒降低追高。","用趋势、量能、生命线、底部承接或突破确认基本面判断。","明确批次、仓位上限、加减仓触发、止错条件和复盘指标。"][i]}</span></div>)}</div>
  </section>;
}

function StockResearch() {
  const [query,setQuery]=useState("药明康德");
  const match=query.includes("药明")||query.includes("603259");
  return <section>
    <div className={styles.searchRow}><input aria-label="搜索个股" value={query} onChange={e=>setQuery(e.target.value)} placeholder="搜索公司、代码"/><span>{match?"1 / 37 只":"0 / 37 只"}</span><button onClick={()=>setQuery("")}>清空</button></div>
    {match ? <>
      <div className={styles.resultChoice}><b>药明康德 603259 · 持仓观察/等待修复 · 持仓 · 2026-05-31</b><span>4/5</span><p><Tag kind="INFERENCE"/> CRDMO 平台型龙头，基本面修复强于股价；但资金分弱、价格仍在生命线下方。</p></div>
      <div className={styles.sectionCard}><div className={styles.stockHeadline}><h2>药明康德 603259</h2><p>CRDMO 平台型龙头，基本面修复强于股价；但资金分弱、价格仍在生命线下方。</p><span className={styles.pill}>持仓观察/等待修复</span><small>最新：2026-05-31</small></div><div className={styles.kpiRow}>{[["本地状态","持仓"],["收盘价","¥124.12"],["最新评分","50.4 / HOLD"],["研究完整度","4/5"]].map(x=><div key={x[0]}><span>{x[0]}</span><strong>{x[1]}</strong></div>)}</div></div>
      <div className={styles.sectionCard}><div className={styles.sectionTitle}><h2>财务基本面数据</h2><span>点时财报口径</span></div><div className={styles.tableWrap}><table><thead><tr><th>指标</th><th>2024</th><th>2025</th><th>2026Q1</th></tr></thead><tbody>{[["营业收入","392.41 亿元","454.56 亿元","124.36 亿元"],["收入同比","-2.7%","+15.84%","+28.81%"],["归母净利","约 94.3 亿元","191.51 亿元","46.52 亿元"],["扣非净利","约 99.0 亿元","132.41 亿元","42.76 亿元"],["经营现金流","约 124 亿元","覆盖经营扩张","35.96 亿元"],["订单/指引","持续经营订单进入修复观察期","在手订单高增","在手订单 597.7 亿元"]].map(r=><tr key={r[0]}>{r.map((v,i)=><td key={i}>{v}</td>)}</tr>)}</tbody></table></div></div>
    </>:<div className={styles.empty}>没有匹配研究。<Tag kind="UNKNOWN"/> 需要先补齐点时财报与来源。</div>}
  </section>;
}

function Industry() {
  const [query,setQuery]=useState("");
  const visible=useMemo(()=>industryNodes.filter(n=>n.join(" ").toLowerCase().includes(query.toLowerCase())),[query]);
  return <section>
    <div className={styles.heroPair}><article className={styles.sectionCard}><h2>产业瓶颈研究</h2><p>AI 集群规模扩大后，GPU 间与机柜间带宽、功耗和延迟会持续压迫传统电互联；研究重点是光模块、激光器、硅光子、InP 衬底、测试设备等关键瓶颈。</p><small>主题：AI 光互联 / CPO / 硅光子 · 周期：2-5年 · 刷新：monthly</small></article><article className={styles.miniGrid}>{[["供应链节点","7"],["公司评分","4"],["证据","8"],["置信度","70"]].map(x=><div key={x[0]}><span>{x[0]}</span><strong>{x[1]}</strong></div>)}</article></div>
    <div className={styles.searchRow}><select aria-label="产业主题"><option>AI 光互联 / CPO / 硅光子</option></select><input aria-label="搜索产业节点" value={query} onChange={e=>setQuery(e.target.value)} placeholder="搜索公司、节点、证据关键词"/></div>
    <h2 className={styles.blockHeading}>供应链拆图</h2><div className={styles.nodeList}>{visible.map((n,i)=><article key={n[0]}><div><b>└ {n[0]}</b><small>node · {String(i+1).padStart(2,"0")}</small></div><p>{n[1]}</p><span>证据需求：{n[2]}</span></article>)}</div>
    <h2 className={styles.blockHeading}>公司瓶颈评分</h2><div className={styles.tableWrap}><table><thead><tr><th>公司</th><th>节点</th><th>总分</th><th>结论</th><th>核心判断</th></tr></thead><tbody>{[["源杰科技 688498","laser_inp","76.5","高优先级跟踪","更接近上游物理瓶颈，需验证客户、量产与良率"],["天孚通信 300394","precision_optical_components","70.1","重点观察","高速光互联精密组件和封装配套，关注客户认证"],["新易盛 300502","ai_optical_module","70.0","重点观察","产品线完整，但模块竞争和估值已反映部分预期"],["仕佳光子 688313","plc_awg","63.5","证据待补","需补齐订单、产能与客户结构"]].map((r,i)=><tr key={r[0]}><td><b>{r[0]}</b></td><td>{r[1]}</td><td>{r[2]}</td><td><span className={styles.pill}>{r[3]}</span></td><td><Tag kind={i===3?"UNKNOWN":"INFERENCE"}/>{r[4]}</td></tr>)}</tbody></table></div>
  </section>;
}

function PlatformContent({tab}:{tab:TabKey}) {
  if(tab==="market") return <MarketOverview/>;
  if(tab==="holdings") return <Holdings/>;
  if(tab==="scores") return <Scores/>;
  if(tab==="trades") return <Trades/>;
  if(tab==="screening") return <Screening/>;
  if(tab==="strategy") return <Strategy/>;
  if(tab==="stock") return <StockResearch/>;
  return <Industry/>;
}

export default function InvestmentPlatform() {
  const [tab,setTab]=useState<TabKey>("market");
  const [reviewedAt,setReviewedAt]=useState("未刷新");
  return <main className={styles.page}>
    <div className={styles.shell}>
      <header className={styles.header}>
        <div className={styles.brand}><span className={styles.logo}>↗</span><h1>投资看板</h1><small>数据日期：2026-07-03</small></div>
        <div className={styles.actions}><button onClick={()=>setReviewedAt(new Date().toLocaleTimeString("zh-CN",{hour:"2-digit",minute:"2-digit"}))}>🔄 刷新</button><a href="/">退出</a></div>
      </header>
      <nav className={styles.tabs} aria-label="投资看板功能">
        {tabs.map(item=><button key={item.key} className={tab===item.key?styles.activeTab:""} onClick={()=>setTab(item.key)}>{item.label}</button>)}
      </nav>
      <div className={styles.provenance}><span><Tag kind="FACT"/> 视频画面复刻</span><span>快照：2026-07-03</span><span>刷新检查：{reviewedAt}</span><span>来源说明：东方财富 API / AKShare / 腾讯财经（视频作者评论）</span></div>
      <PlatformContent tab={tab}/>
      <footer className={styles.footer} id="method"><p>这套系统把重复的信息整理工作交给 AI，把判断留给人。</p><small>仅用于研究、回测与纸面交易支持；不连接券商、不自动下单。FACT 为可追溯记录，INFERENCE 为研究判断，UNKNOWN 为缺失证据。</small></footer>
    </div>
  </main>;
}
