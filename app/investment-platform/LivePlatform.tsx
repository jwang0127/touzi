"use client";

import { useCallback, useEffect, useState } from "react";
import styles from "./platform.module.css";

type Evidence = "FACT" | "INFERENCE" | "UNKNOWN";
type TabKey = "market" | "holdings" | "forecast" | "scores" | "trades" | "screening" | "strategy" | "stock" | "industry";
type Quote = { symbol:string;code:string;name:string;price:number;previousClose:number;open:number;high:number;low:number;change:number;changePercent:number;volume:number;amount:number;turnoverRate:number|null;pe:number|null;pb:number|null;marketCapYi:number|null;outerVolume:number;innerVolume:number;bids:Array<{price:number;volume:number}>;asks:Array<{price:number;volume:number}>;asOf:string;source:string;provenanceUrl:string };
type Hotspot = { id:string;name:string;averageChange:number;breadth:number;dispersion:number;score:number;state:string;evidence:Evidence;thesis:string;asOf:string;source:string;members:Array<Pick<Quote,"code"|"name"|"price"|"changePercent"|"asOf">> };
type SearchResult = { code:string;name:string;market:string;quoteId:string;type:string;source:string;asOf:string };
type Bar = { date:string;open:number;close:number;high:number;low:number;volume:number;amount:number;changePercent:number;turnoverRate:number;source:string;provenanceUrl:string };
type StockPayload = { quote:Quote;history:{name:string;bars:Bar[];asOf:string;source:string;provenanceUrl:string};analysis:{ma5:number;ma20:number;ma60:number;return20:number;return60:number;annualizedVolatility:number;trendScore:number;verdict:string;facts:string[];inferences:string[];unknowns:string[]};auditVerdict:"REVIEW";fetchedAt:string };
type PaperEvent = { id:string;code:string;name:string;action:string;at:string;price:number };
type CloseForecast = { label:string;direction:string;rangeLow:number;rangeHigh:number;confidence:string;reason:string };
type ResearchRating = { label:"买入"|"持有"|"卖出";reason:string;confirm:string;invalidate:string };
type DailyPick = { code:string;name:string;theme:string;price:number;changePercent:number;expected:number;rangeLow:number;rangeHigh:number;reason:string;risk:string;generatedAt:string;edition:string };

const tabs: Array<{key:TabKey;label:string}> = [
  {key:"market",label:"市场概览"},{key:"holdings",label:"持仓概览"},{key:"forecast",label:"每日三股"},{key:"scores",label:"今日决策"},{key:"trades",label:"研究记录"},
  {key:"screening",label:"热点筛选"},{key:"strategy",label:"策略研究"},{key:"stock",label:"个股研究"},{key:"industry",label:"产业链研究"},
];
const WATCHLIST_KEY="touzi-watchlist-v1";
const EVENT_KEY="touzi-paper-events-v1";

function Tag({kind}:{kind:Evidence}) { return <span className={`${styles.evidence} ${styles[kind.toLowerCase()]}`}>{kind}</span>; }
function formatTime(value?:string) { if(!value)return "等待数据"; try{return new Date(value).toLocaleString("zh-CN",{timeZone:"Asia/Shanghai",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit"});}catch{return value;} }
function signed(value:number,digits=2){return `${value>=0?"+":""}${value.toFixed(digits)}%`;}
function shanghaiDate(){return new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Shanghai",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());}
function closeForecast(payload:StockPayload):CloseForecast{
  const {quote,history,analysis}=payload;
  const dailyVol=Math.max(.45,analysis.annualizedVolatility*100/Math.sqrt(252));
  const momentum=quote.changePercent*.32+analysis.return20*100*.09+(quote.price >= analysis.ma20 ? .35 : -.35)+(analysis.ma5 >= analysis.ma20 ? .2 : -.2);
  const expected=Math.max(-3.5,Math.min(3.5,momentum));
  const width=Math.max(.55,Math.min(3.2,dailyVol*.72));
  const direction=expected>.38?"偏强":expected<-.38?"偏弱":"震荡";
  const agreement=(Math.sign(quote.changePercent)===Math.sign(analysis.return20)?1:0)+(Math.sign(analysis.ma5-analysis.ma20)===Math.sign(expected)?1:0);
  return {label:history.asOf===shanghaiDate()?"今日收盘推演":`今日收盘推演（基于 ${history.asOf}）`,direction,rangeLow:quote.price*(1+(expected-width)/100),rangeHigh:quote.price*(1+(expected+width)/100),confidence:agreement===2?"中等":"较低",reason:`当日涨跌 ${signed(quote.changePercent)}、20日价格成长 ${signed(analysis.return20*100)}、MA5 ${analysis.ma5.toFixed(2)} / MA20 ${analysis.ma20.toFixed(2)}`};
}
function researchRating(payload:StockPayload):ResearchRating{
  const {quote:q,analysis:a}=payload;
  const bullish=q.price>=a.ma20&&a.ma5>=a.ma20&&a.return20>0;
  const bearish=q.price<a.ma20&&a.ma5<a.ma20&&a.return20<0;
  if(bullish&&a.trendScore>=65)return{label:"买入",reason:"价格站上 MA20、MA5 不低于 MA20，且 20 日动量为正。",confirm:`收盘继续站稳 MA20 ${a.ma20.toFixed(2)}`,invalidate:`跌破 MA20 ${a.ma20.toFixed(2)} 或 20 日动量转负`};
  if(bearish&&a.trendScore<=45)return{label:"卖出",reason:"价格低于 MA20、短期均线弱于中期均线，且 20 日动量为负。",confirm:`反弹仍无法站回 MA20 ${a.ma20.toFixed(2)}`,invalidate:`重新站上 MA20 ${a.ma20.toFixed(2)} 且 MA5 转强`};
  return{label:"持有",reason:"趋势信号没有形成一致方向，暂不扩大暴露。",confirm:`收盘站稳 MA20 ${a.ma20.toFixed(2)} 且 20 日动量为正`,invalidate:`跌破当日低点 ${q.low.toFixed(2)}`};
}
function shanghaiEdition(){
  const now=new Date();const dateFmt=new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Shanghai",year:"numeric",month:"2-digit",day:"2-digit"});
  const hour=Number(new Intl.DateTimeFormat("en-GB",{timeZone:"Asia/Shanghai",hour:"2-digit",hour12:false}).format(now));
  return hour>=9?dateFmt.format(now):dateFmt.format(new Date(now.getTime()-86400000));
}
function nextNineText(){
  const now=new Date();const parts=new Intl.DateTimeFormat("zh-CN",{timeZone:"Asia/Shanghai",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hour12:false}).formatToParts(now);const hour=Number(parts.find(p=>p.type==="hour")?.value||0);
  return hour<9?"今天 09:00": "明天 09:00";
}
function buildDailyPicks(hotspots:Hotspot[],edition:string):DailyPick[]{
  const generatedAt=new Date().toISOString();const seen=new Set<string>();
  return hotspots.flatMap(h=>h.members.map(m=>({h,m}))).filter(({m})=>!/^688/.test(m.code)&&!/^[489]/.test(m.code)&&!/ST/i.test(m.name)&&m.price>0).filter(({m})=>{if(seen.has(m.code))return false;seen.add(m.code);return true;}).map(({h,m})=>{const chasePenalty=Math.max(0,m.changePercent-6)*1.4;const rank=h.score+m.changePercent*1.6+h.breadth*14-h.dispersion*2.2-chasePenalty;const expected=Math.max(.2,Math.min(4.8,.65+h.averageChange*.28+m.changePercent*.1+(h.breadth-.5)*1.25-h.dispersion*.08));const band=.65+Math.min(1.2,h.dispersion*.14);return{code:m.code,name:m.name,theme:h.name,price:m.price,changePercent:m.changePercent,expected,rangeLow:Math.max(-1.5,expected-band),rangeHigh:Math.min(7.5,expected+band),reason:`${h.name}主题覆盖率 ${(h.breadth*100).toFixed(0)}%，主题平均 ${signed(h.averageChange)}，个股当日 ${signed(m.changePercent)}。`,risk:`若次日高开超过预测上沿，或主题覆盖率降至 50% 以下，则取消观察。`,generatedAt,edition,rank};}).sort((a,b)=>b.rank-a.rank).slice(0,3).map(({rank:_,...pick})=>pick);
}

function useJson<T>(url:string,refreshKey:number){
  const [data,setData]=useState<T|null>(null); const [error,setError]=useState(""); const [loading,setLoading]=useState(true);
  useEffect(()=>{const controller=new AbortController();setLoading(true);setError("");fetch(url,{cache:"no-store",signal:controller.signal}).then(async r=>{const body=await r.json();if(!r.ok)throw new Error(body.error||"数据暂不可用");setData(body);}).catch(e=>{if(e.name!=="AbortError")setError(e.message||"数据暂不可用");}).finally(()=>setLoading(false));return()=>controller.abort();},[url,refreshKey]);
  return {data,error,loading};
}

function Status({loading,error}:{loading:boolean;error:string}){
  if(loading)return <div className={styles.liveStatus}><span className={styles.pulse}/>正在连接实时数据源…</div>;
  if(error)return <div className={`${styles.liveStatus} ${styles.statusError}`}><Tag kind="UNKNOWN"/>{error}</div>;
  return null;
}

function MarketView({quotes,hotspots,loading,error,onStock}:{quotes:Quote[];hotspots:Hotspot[];loading:boolean;error:string;onStock:(code:string)=>void}){
  return <section>
    <Status loading={loading} error={error}/>
    <div className={styles.marketGrid}>{quotes.map(q=><article className={styles.marketCard} key={q.symbol}><span>{q.name}</span><strong className={q.changePercent>=0?styles.red:styles.green}>{q.price.toFixed(2)}</strong><b className={q.changePercent>=0?styles.red:styles.green}>{signed(q.changePercent)}</b><small>高 {q.high.toFixed(2)} / 低 {q.low.toFixed(2)}<br/>{formatTime(q.asOf)}</small></article>)}</div>
    <div className={styles.sectionTitle}><div><h2>今日商业热点雷达</h2><p>主题篮子当日强度 × 上涨覆盖率 × 分化风险，自动排序</p></div><span><Tag kind="INFERENCE"/>仅研究线索</span></div>
    <div className={styles.hotspotGrid}>{hotspots.slice(0,6).map((h,i)=><article className={styles.hotspotCard} key={h.id}><div><span className={styles.rank}>0{i+1}</span><Tag kind={h.evidence}/></div><h3>{h.name}</h3><strong>{h.score.toFixed(0)}</strong><b className={h.averageChange>=0?styles.red:styles.green}>{signed(h.averageChange)} · 覆盖率 {(h.breadth*100).toFixed(0)}%</b><p>{h.thesis}</p><div className={styles.memberRow}>{h.members.map(m=><button key={m.code} onClick={()=>onStock(m.code)}>{m.name} {signed(m.changePercent,1)}</button>)}</div></article>)}</div>
  </section>;
}

function HoldingsView({codes,setCodes,refreshKey,onStock}:{codes:string[];setCodes:(codes:string[])=>void;refreshKey:number;onStock:(code:string)=>void}){
  const [rows,setRows]=useState<StockPayload[]>([]);const [error,setError]=useState("");const [loading,setLoading]=useState(false);
  useEffect(()=>{if(!codes.length){setRows([]);return;}const controller=new AbortController();setLoading(true);setError("");Promise.all(codes.map(code=>fetch(`/api/platform/stock?code=${code}`,{cache:"no-store",signal:controller.signal}).then(async r=>{const body=await r.json();if(!r.ok)throw new Error(body.error||"持仓研究数据暂不可用");return body as StockPayload;}))).then(setRows).catch(e=>{if(e.name!=="AbortError")setError(e.message||"持仓研究数据暂不可用");}).finally(()=>setLoading(false));return()=>controller.abort();},[codes,refreshKey]);
  if(!codes.length)return <div className={styles.empty}><h2>还没有自选研究标的</h2><p>在“个股研究”中搜索公司并加入观察，这里会按腾讯财经行情实时刷新。</p></div>;
  return <section><Status loading={loading} error={error}/><div className={styles.holdingList}>{rows.map(row=>{const q=row.quote,a=row.analysis,f=closeForecast(row),rating=researchRating(row);return <article className={styles.holdingRow} key={q.code}><div className={styles.holdingIdentity}><div><h3>{q.name}</h3><small>{q.code} · {formatTime(q.asOf)}</small></div><strong className={q.changePercent>=0?styles.red:styles.green}>{q.price.toFixed(2)}</strong><b className={q.changePercent>=0?styles.red:styles.green}>{signed(q.changePercent)}</b><span><Tag kind="FACT"/>{q.source}</span></div><div className={styles.holdingGrowth}><span>价格成长率</span><b className={a.return20>=0?styles.red:styles.green}>20日 {signed(a.return20*100)}</b><b className={a.return60>=0?styles.red:styles.green}>60日 {signed(a.return60*100)}</b><small>这是价格变化，不代表营收或利润成长</small></div><div className={styles.holdingBasics}><span>基础行情</span><small>PE {q.pe?.toFixed(1)??"—"} · PB {q.pb?.toFixed(2)??"—"}</small><small>换手 {q.turnoverRate?.toFixed(2)??"—"}% · 市值 {q.marketCapYi?.toFixed(0)??"—"}亿</small><small>高/低 {q.high.toFixed(2)} / {q.low.toFixed(2)} · 波动 {(a.annualizedVolatility*100).toFixed(1)}%</small></div><div className={styles.holdingTrend}><span><Tag kind="INFERENCE"/>技术评级</span><strong className={styles[`rating${rating.label}`]}>{rating.label}</strong><small>{rating.reason}</small><small>改判：{rating.invalidate}</small></div><div className={styles.holdingForecast}><span><Tag kind="INFERENCE"/>{f.label}</span><strong>{f.direction} · {f.rangeLow.toFixed(2)}–{f.rangeHigh.toFixed(2)}</strong><small>置信度：{f.confidence}</small><small>{f.reason}</small></div><div className={styles.holdingActions}><button className={styles.primaryButton} onClick={()=>onStock(q.code)}>详细研究</button><button className={styles.removeButton} onClick={()=>setCodes(codes.filter(code=>code!==q.code))}>移除</button></div></article>;})}</div><div className={styles.callout}><Tag kind="UNKNOWN"/>买入/持有/卖出是只基于价格趋势的研究评级，不是交易指令；财报、公告和突发事件未补齐时必须人工 REVIEW。</div></section>;
}

function ScoresView({quotes,hotspots}:{quotes:Quote[];hotspots:Hotspot[]}){
  const breadth=quotes.length?quotes.filter(q=>q.changePercent>0).length/quotes.length:0;
  const marketAvg=quotes.length?quotes.reduce((s,q)=>s+q.changePercent,0)/quotes.length:0;
  const leader=hotspots[0];
  const regime=breadth>=.7&&marketAvg>.7?"积极观察":breadth>=.45&&marketAvg>-.5?"轻仓验证":"防守观察";
  const cap=regime==="积极观察"?"40%–60%":regime==="轻仓验证"?"20%–40%":"0%–20%";
  const candidates=hotspots.slice(0,3).flatMap(h=>h.members.map(m=>({...m,theme:h.name,breadth:h.breadth}))).sort((a,b)=>b.changePercent-a.changePercent).slice(0,6);
  return <section>
    <div className={styles.decisionHero}><div><Tag kind="INFERENCE"/><span>今日研究姿态</span><h2>{regime}</h2><p>指数平均 {signed(marketAvg)}，{quotes.filter(q=>q.changePercent>0).length}/{quotes.length} 个指数上涨；{leader?`主线候选为 ${leader.name}`:"热点证据仍不完整"}。</p></div><div className={styles.actionGrid}><article><span>纸面研究仓位上限</span><strong>{cap}</strong><small>不是实盘仓位建议</small></article><article><span>单标的风险预算</span><strong>≤ 1%</strong><small>按假设失效点倒推</small></article><article><span>今日候选</span><strong>{candidates.length} 家</strong><small>只进入验证队列</small></article></div></div>
    <div className={styles.sectionTitle}><div><h2>今日优先研究清单</h2><p>每个候选都必须同时写明触发条件与失效条件；未触发就不行动。</p></div><Tag kind="INFERENCE"/></div>
    <div className={styles.tableWrap}><table><thead><tr><th>公司</th><th>为什么现在看</th><th>触发条件</th><th>失效条件</th><th>当前动作</th></tr></thead><tbody>{candidates.map(c=>{const q=quotes.find(x=>x.code===c.code);const open=q?.open||c.price;const low=q?.low||c.price*.98;const action=c.changePercent>7?"涨幅过大，仅等回踩":c.changePercent>0?"等待回踩确认":"等待重新转强";return <tr key={c.code}><td><b>{c.name}</b><small>{c.code} · {c.theme}</small></td><td>{c.theme}覆盖率 {(c.breadth*100).toFixed(0)}%，个股当日 {signed(c.changePercent)}</td><td>回踩不破开盘价 {open.toFixed(2)}，随后重新走强</td><td>跌破当日低点 {low.toFixed(2)} 或主题覆盖率降至 50% 以下</td><td><span className={styles.pill}>{action}</span></td></tr>;})}</tbody></table></div>
    <div className={styles.reviewGrid}><article><h3>今天不做什么</h3><p>不追涨幅超过 7% 的标的；市场转弱时不扩大研究仓位；财报与公告未核验前不下确定结论。</p></article><article><h3>收盘复盘</h3><p>核对主线是否仍在前三、候选是否收在开盘价上方、触发与失效是否真实发生，并记录未执行原因。</p></article></div>
    <div className={styles.callout}><Tag kind="UNKNOWN"/>行情只能回答“价格正在发生什么”。订单、现金流、公告与估值口径尚未补齐的候选，审计结论保持 REVIEW。</div>
  </section>;
}

function ForecastView({hotspots,onStock}:{hotspots:Hotspot[];onStock:(code:string)=>void}){
  const edition=shanghaiEdition();
  const [picks,setPicks]=useState<DailyPick[]>([]);
  useEffect(()=>{if(!hotspots.length)return;const key=`touzi-daily-picks-${edition}`;try{const cached=JSON.parse(localStorage.getItem(key)||"[]") as DailyPick[];if(cached.length===3){setPicks(cached);return;}}catch{}const next=buildDailyPicks(hotspots,edition);setPicks(next);if(next.length===3)localStorage.setItem(key,JSON.stringify(next));},[hotspots,edition]);
  return <section><div className={styles.forecastHero}><div><Tag kind="INFERENCE"/><span>{edition} · 09:00 版</span><h2>明日三股预测</h2><p>从当前商业热点样本池中筛出三只普通 A 股或创业板股票，科创板与北交所已在进入模型前排除。</p></div><div><span>下次固定刷新</span><strong>{nextNineText()}</strong><small>行情仍按 15 秒更新，但当日名单不追涨换股</small></div></div>{!picks.length?<Status loading error=""/>:<div className={styles.pickGrid}>{picks.map((p,i)=><article className={styles.pickCard} key={p.code}><div className={styles.pickTop}><span>0{i+1}</span><Tag kind="INFERENCE"/></div><h3>{p.name}<small>{p.code} · {p.theme}</small></h3><div className={styles.pickPrice}><span>参考价 {p.price.toFixed(2)}</span><b className={p.changePercent>=0?styles.red:styles.green}>{signed(p.changePercent)}</b></div><div className={styles.expectedMove}><span>明日预测涨幅</span><strong>+{p.expected.toFixed(2)}%</strong><small>推演区间 {signed(p.rangeLow)} 至 {signed(p.rangeHigh)}</small></div><div className={styles.pickReason}><b>涨幅理由</b><p>{p.reason}</p><b>取消条件</b><p>{p.risk}</p></div><button className={styles.primaryButton} onClick={()=>onStock(p.code)}>查看实时盘口与评级</button></article>)}</div>}<div className={styles.forecastRules}><article><b>入选规则</b><span>主题强度、上涨覆盖率、个股动量与分化风险综合排序</span></article><article><b>明确排除</b><span>科创板 688 开头、北交所 4/8/9 开头及 ST 股票</span></article><article><b>名单纪律</b><span>每天 09:00 更新一次，盘中不因短时上涨更换名单</span></article></div><div className={styles.callout}><Tag kind="UNKNOWN"/>预测涨幅是基于点时行情的统计推演，不等于实际收益；公告、停复牌、业绩突变和市场跳空可能使预测失效。</div></section>;
}

function EventsView({events}:{events:PaperEvent[]}){
  if(!events.length)return <div className={styles.empty}><h2>暂无研究记录</h2><p>把股票加入自选后，这里会保留当前设备上的纸面研究轨迹。</p></div>;
  return <section className={styles.sectionCard}><div className={styles.sectionTitle}><h2>研究记录</h2><span>仅保存在当前浏览器</span></div><div className={styles.tableWrap}><table><thead><tr><th>时间</th><th>公司</th><th>动作</th><th>参考价</th><th>性质</th></tr></thead><tbody>{events.map(e=><tr key={e.id}><td>{formatTime(e.at)}</td><td><b>{e.name}</b><small>{e.code}</small></td><td>{e.action}</td><td>{e.price.toFixed(2)}</td><td><Tag kind="FACT"/>纸面记录</td></tr>)}</tbody></table></div></section>;
}

function ScreeningView({hotspots,onStock}:{hotspots:Hotspot[];onStock:(code:string)=>void}){
  return <section className={styles.sectionCard}><div className={styles.sectionTitle}><div><h2>商业热点筛选</h2><p>按最新主题篮子表现自动重排；分数高不等于适合买入</p></div><span>{hotspots.length} 个主题</span></div><div className={styles.tableWrap}><table><thead><tr><th>排名</th><th>主题</th><th>状态</th><th>强度</th><th>广度</th><th>分化</th><th>代表公司</th><th>证据</th></tr></thead><tbody>{hotspots.map((h,i)=><tr key={h.id}><td>0{i+1}</td><td><b>{h.name}</b><small>{h.thesis}</small></td><td><span className={styles.pill}>{h.state}</span></td><td className={h.averageChange>=0?styles.red:styles.green}>{signed(h.averageChange)}</td><td>{(h.breadth*100).toFixed(0)}%</td><td>{h.dispersion.toFixed(2)}%</td><td>{h.members.map(m=><button className={styles.tableLink} key={m.code} onClick={()=>onStock(m.code)}>{m.name}</button>)}</td><td><Tag kind={h.evidence}/></td></tr>)}</tbody></table></div></section>;
}

function StrategyView({quotes,hotspots}:{quotes:Quote[];hotspots:Hotspot[]}){
  const leader=hotspots[0];
  const marketAvg=quotes.length?quotes.reduce((s,q)=>s+q.changePercent,0)/quotes.length:0;
  const candidates=leader?.members||[];
  const themeReady=!!leader&&leader.breadth>=.67&&leader.averageChange>=1;
  return <section>
    <article className={styles.strategyWorkbench}><div><Tag kind="INFERENCE"/><span>今日可证伪假设</span><h2>{leader?`${leader.name} 强势延续验证`:`等待实时热点形成假设`}</h2><p>{leader?`如果主题上涨覆盖率保持在 67% 以上、平均涨幅保持在 1% 以上，且代表公司收盘不弱于开盘，则把该主题保留在下一交易日研究队列；任一核心条件失效就撤销假设。`:"数据不足时不生成策略结论。"}</p></div><div className={styles.hypothesisStatus}><span>当前状态</span><strong>{themeReady?"满足市场前提":"等待条件成立"}</strong><small><Tag kind="FACT"/>指数平均 {signed(marketAvg)} · 主题覆盖率 {leader?(leader.breadth*100).toFixed(0):"—"}%</small></div></article>
    <div className={styles.ruleGrid}>{[["观察窗口","今日开盘至 15:00；收盘后只复盘，不追溯改规则"],["进入研究队列",leader?`${leader.name} 覆盖率 ≥ 67%，平均涨幅 ≥ 1%`:"等待主题数据"],["个股触发","收盘价不低于开盘价，且未出现冲高回落失效"],["撤销假设","主题覆盖率 < 50%，或代表公司跌破当日低点"],["纸面风险预算","主题最多 25 单位；单标的最多 10 单位；假设损失 ≤ 1 单位"],["必须补证","最新公告、业绩口径、订单与现金流；缺一项保持 REVIEW"]].map((r,i)=><article key={r[0]}><span>{i<2?<Tag kind="FACT"/>:<Tag kind={i===5?"UNKNOWN":"INFERENCE"}/>}</span><h3>{r[0]}</h3><p>{r[1]}</p></article>)}</div>
    <div className={styles.sectionTitle}><div><h2>候选逐项验证</h2><p>不再只展示原则，而是把规则套到今天的真实候选上。</p></div><span>{candidates.length} 个样本</span></div>
    <div className={styles.tableWrap}><table><thead><tr><th>候选</th><th>当日表现</th><th>条件检查</th><th>下一步</th></tr></thead><tbody>{candidates.map(c=>{const q=quotes.find(x=>x.code===c.code);const holdsOpen=q?q.price>=q.open:c.changePercent>=0;return <tr key={c.code}><td><b>{c.name}</b><small>{c.code}</small></td><td className={c.changePercent>=0?styles.red:styles.green}>{signed(c.changePercent)}</td><td>{holdsOpen?"价格不低于开盘价":"尚未站回开盘价"}；主题覆盖率 {leader?(leader.breadth*100).toFixed(0):"—"}%</td><td><span className={styles.pill}>{themeReady&&holdsOpen?"保留至收盘验证":"继续观察，不执行"}</span></td></tr>;})}</tbody></table></div>
    <div className={styles.reviewGrid}><article><h3>收盘后记录四件事</h3><p>实际收盘位置、主题最终覆盖率、触发/失效发生时间、未执行原因。下一次研究必须引用这条记录。</p></article><article><h3>策略何时算失败</h3><p>连续 20 个可观察样本后，若触发组相对未触发组没有正向差异，停止使用并重新设计规则。</p></article></div>
    <div className={styles.callout}><Tag kind="UNKNOWN"/>最新公告、业绩口径、订单与现金流尚未补齐时，策略结论保持 REVIEW，且不能覆盖审计 verdict。</div>
  </section>;
}

function StockView({payload,loading,error,onAdd,isAdded}:{payload:StockPayload|null;loading:boolean;error:string;onAdd:()=>void;isAdded:boolean}){
  if(loading)return <Status loading error=""/>; if(error)return <Status loading={false} error={error}/>; if(!payload)return <div className={styles.empty}>请在顶部搜索股票。</div>;
  const {quote,history,analysis}=payload; const rating=researchRating(payload); const bars=history.bars.slice(-42); const min=Math.min(...bars.map(b=>b.close)); const max=Math.max(...bars.map(b=>b.close));
  return <section><div className={styles.sectionCard}><div className={styles.stockHeadline}><div><h2>{quote.name} {quote.code}</h2><small><Tag kind="FACT"/>{formatTime(quote.asOf)} · {quote.source}</small></div><div><strong className={styles.quotePrice}>{quote.price.toFixed(2)}</strong><b className={quote.changePercent>=0?styles.red:styles.green}>{signed(quote.changePercent)}</b></div><span className={`${styles.ratingBadge} ${styles[`rating${rating.label}`]}`}><Tag kind="INFERENCE"/>{rating.label}</span><button className={styles.primaryButton} onClick={onAdd} disabled={isAdded}>{isAdded?"已在自选":"加入自选研究"}</button></div><div className={styles.ratingReason}><b>评级依据：{rating.reason}</b><span>确认条件：{rating.confirm}</span><span>改判条件：{rating.invalidate}</span></div><div className={styles.kpiRow}>{[["技术评级",rating.label],["20日价格成长",signed(analysis.return20*100)],["60日价格成长",signed(analysis.return60*100)],["年化波动",`${(analysis.annualizedVolatility*100).toFixed(1)}%`]].map(x=><div key={x[0]}><span>{x[0]}</span><strong>{x[1]}</strong></div>)}</div></div>
    <div className={styles.liveTradingGrid}><article className={styles.sectionCard}><div className={styles.sectionTitle}><div><h2>实时五档盘口</h2><p>随页面自动刷新；成交量为接口原始口径</p></div><span><Tag kind="FACT"/>{formatTime(quote.asOf)}</span></div><div className={styles.orderBook}><div>{[...quote.asks].reverse().map((x,i)=><p key={`ask-${i}`}><span>卖 {5-i}</span><b className={styles.green}>{x.price.toFixed(2)}</b><em>{x.volume.toLocaleString()}</em></p>)}</div><div>{quote.bids.map((x,i)=><p key={`bid-${i}`}><span>买 {i+1}</span><b className={styles.red}>{x.price.toFixed(2)}</b><em>{x.volume.toLocaleString()}</em></p>)}</div></div><div className={styles.flowStats}><span>外盘 <b>{quote.outerVolume.toLocaleString()}</b></span><span>内盘 <b>{quote.innerVolume.toLocaleString()}</b></span><span>委比 <b>{quote.outerVolume+quote.innerVolume?`${(((quote.outerVolume-quote.innerVolume)/(quote.outerVolume+quote.innerVolume))*100).toFixed(1)}%`:"—"}</b></span></div></article><article className={styles.sectionCard}><div className={styles.sectionTitle}><h2>近42个交易日收盘结构</h2><span>腾讯财经日线 · 更新至 {history.asOf}</span></div><div className={styles.priceChart}>{bars.map(b=><i key={b.date} title={`${b.date} ${b.close}`} style={{height:`${18+((b.close-min)/Math.max(.01,max-min))*82}%`}} className={b.changePercent>=0?styles.upBar:styles.downPriceBar}/>)}</div><div className={styles.chartAxis}><span>{bars[0]?.date}</span><span>MA5 {analysis.ma5.toFixed(2)} · MA20 {analysis.ma20.toFixed(2)} · MA60 {analysis.ma60.toFixed(2)}</span><span>{bars.at(-1)?.date}</span></div></article></div>
    <div className={styles.threeEvidence}><article><h3><Tag kind="FACT"/>可核验事实</h3>{analysis.facts.map(x=><p key={x}>{x}</p>)}</article><article><h3><Tag kind="INFERENCE"/>模型推断</h3>{analysis.inferences.map(x=><p key={x}>{x}</p>)}</article><article><h3><Tag kind="UNKNOWN"/>仍需补证</h3>{analysis.unknowns.map(x=><p key={x}>{x}</p>)}</article></div>
  </section>;
}

function IndustryView({hotspots,onStock}:{hotspots:Hotspot[];onStock:(code:string)=>void}){
  return <section><div className={styles.sectionTitle}><div><h2>产业链研究队列</h2><p>从当日商业热点向订单、产能、技术、现金流四类证据下钻</p></div><Tag kind="INFERENCE"/></div><div className={styles.nodeList}>{hotspots.slice(0,8).map((h,i)=><article key={h.id}><div><b>0{i+1} · {h.name}</b><small>{h.state} · 得分 {h.score.toFixed(0)}</small></div><p>{h.thesis}</p><span>{h.members.map(m=><button className={styles.tableLink} key={m.code} onClick={()=>onStock(m.code)}>{m.name} {signed(m.changePercent,1)}</button>)}</span></article>)}</div><div className={styles.callout}><Tag kind="UNKNOWN"/>热点只能告诉我们资金正在关注什么；是否形成长期商业价值，仍需核对订单质量、产能利用率、客户集中度、现金流和竞争格局。</div></section>;
}

export default function LivePlatform(){
  const [tab,setTab]=useState<TabKey>("market"); const [refreshKey,setRefreshKey]=useState(0); const [autoRefresh,setAutoRefresh]=useState(true); const [countdown,setCountdown]=useState(15); const [query,setQuery]=useState(""); const [results,setResults]=useState<SearchResult[]>([]); const [searching,setSearching]=useState(false); const [selectedCode,setSelectedCode]=useState("300750");
  const [watchlist,setWatchlistState]=useState<string[]>([]); const [events,setEventsState]=useState<PaperEvent[]>([]);
  const market=useJson<{quotes:Quote[];asOf:string;fetchedAt:string;source:string}>("/api/platform/market",refreshKey); const hotspot=useJson<{hotspots:Hotspot[];asOf:string;fetchedAt:string}>("/api/platform/hotspots",refreshKey); const stock=useJson<StockPayload>(`/api/platform/stock?code=${selectedCode}`,refreshKey);
  useEffect(()=>{try{setWatchlistState(JSON.parse(localStorage.getItem(WATCHLIST_KEY)||"[]"));setEventsState(JSON.parse(localStorage.getItem(EVENT_KEY)||"[]"));}catch{}},[]);
  useEffect(()=>{if(!autoRefresh)return;const timer=window.setInterval(()=>setCountdown(value=>{if(value<=1){if(!document.hidden)setRefreshKey(key=>key+1);return 15;}return value-1;}),1000);return()=>window.clearInterval(timer);},[autoRefresh]);
  const setWatchlist=useCallback((codes:string[])=>{setWatchlistState(codes);localStorage.setItem(WATCHLIST_KEY,JSON.stringify(codes));},[]);
  useEffect(()=>{if(!query.trim()){setResults([]);return;} const c=new AbortController();const timer=setTimeout(()=>{setSearching(true);fetch(`/api/platform/search?q=${encodeURIComponent(query)}`,{signal:c.signal}).then(r=>r.json()).then(body=>setResults(body.results||[])).catch(()=>setResults([])).finally(()=>setSearching(false));},260);return()=>{clearTimeout(timer);c.abort();};},[query]);
  const openStock=(code:string)=>{setSelectedCode(code);setTab("stock");setQuery("");setResults([]);window.scrollTo({top:0,behavior:"smooth"});};
  const addWatch=()=>{if(!stock.data||watchlist.includes(stock.data.quote.code))return;const codes=[stock.data.quote.code,...watchlist].slice(0,30);setWatchlist(codes);const event:PaperEvent={id:crypto.randomUUID(),code:stock.data.quote.code,name:stock.data.quote.name,action:"加入自选研究",price:stock.data.quote.price,at:new Date().toISOString()};const next=[event,...events].slice(0,100);setEventsState(next);localStorage.setItem(EVENT_KEY,JSON.stringify(next));};
  const quotes=market.data?.quotes||[];const hotspots=hotspot.data?.hotspots||[];const dataAsOf=market.data?.asOf;
  return <main className={styles.page}><div className={styles.shell}>
    <header className={styles.header}><div className={styles.brand}><span className={styles.logo}>↗</span><h1>投资看板</h1><small>最新行情：{formatTime(dataAsOf)}</small></div><div className={styles.actions}><button onClick={()=>{setRefreshKey(k=>k+1);setCountdown(15)}}>↻ 立即刷新</button><button className={autoRefresh?styles.autoOn:""} onClick={()=>setAutoRefresh(value=>!value)}>{autoRefresh?`● ${countdown}s 自动刷新`:`▶ 恢复自动刷新`}</button><a href="/">返回</a></div></header>
    <div className={styles.globalSearch}><div><span>⌕</span><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="搜索股票名称或代码，例如：宁德时代 / 300750" aria-label="搜索股票"/>{searching&&<small>搜索中…</small>}</div>{results.length>0&&<div className={styles.searchResults}>{results.map(r=><button key={r.quoteId} onClick={()=>openStock(r.code)}><b>{r.name}</b><span>{r.code} · {r.market} · {r.type}</span></button>)}</div>}</div>
    <nav className={styles.tabs}>{tabs.map(item=><button key={item.key} className={tab===item.key?styles.activeTab:""} onClick={()=>setTab(item.key)}>{item.label}</button>)}</nav>
    <div className={styles.provenance}><span className={market.error||hotspot.error?styles.offlineDot:styles.liveDot}/>{market.error||hotspot.error?"部分数据源异常":"实时轮询中"}：腾讯财经即时报价/五档盘口 + 东方财富搜索<span>行情时间 {formatTime(dataAsOf)}</span><span>页面获取 {formatTime(market.data?.fetchedAt)}</span></div>
    {tab==="market"&&<MarketView quotes={quotes} hotspots={hotspots} loading={market.loading||hotspot.loading} error={market.error||hotspot.error} onStock={openStock}/>} 
    {tab==="holdings"&&<HoldingsView codes={watchlist} setCodes={setWatchlist} refreshKey={refreshKey} onStock={openStock}/>} 
    {tab==="forecast"&&<ForecastView hotspots={hotspots} onStock={openStock}/>}
    {tab==="scores"&&<ScoresView quotes={quotes} hotspots={hotspots}/>} 
    {tab==="trades"&&<EventsView events={events}/>} 
    {tab==="screening"&&<ScreeningView hotspots={hotspots} onStock={openStock}/>} 
    {tab==="strategy"&&<StrategyView quotes={quotes} hotspots={hotspots}/>}
    {tab==="stock"&&<StockView payload={stock.data} loading={stock.loading} error={stock.error} onAdd={addWatch} isAdded={!!stock.data&&watchlist.includes(stock.data.quote.code)}/>} 
    {tab==="industry"&&<IndustryView hotspots={hotspots} onStock={openStock}/>} 
    <footer className={styles.footer}><p>把重复的信息整理交给系统，把判断和责任留给人。</p><small>研究、回测与纸面交易支持；不连接券商，不自动下单。行情来自第三方公开页面接口，交易前请核对交易所、券商行情与公司公告。</small></footer>
  </div></main>;
}
