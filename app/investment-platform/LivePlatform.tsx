"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import styles from "./platform.module.css";

type Evidence = "FACT" | "INFERENCE" | "UNKNOWN";
type TabKey = "market" | "holdings" | "scores" | "trades" | "screening" | "strategy" | "stock" | "industry";
type Quote = { symbol:string;code:string;name:string;price:number;previousClose:number;open:number;high:number;low:number;change:number;changePercent:number;volume:number;amount:number;turnoverRate:number|null;pe:number|null;pb:number|null;marketCapYi:number|null;asOf:string;source:string;provenanceUrl:string };
type Hotspot = { id:string;name:string;averageChange:number;breadth:number;dispersion:number;score:number;state:string;evidence:Evidence;thesis:string;asOf:string;source:string;members:Array<Pick<Quote,"code"|"name"|"price"|"changePercent"|"asOf">> };
type SearchResult = { code:string;name:string;market:string;quoteId:string;type:string;source:string;asOf:string };
type Bar = { date:string;open:number;close:number;high:number;low:number;volume:number;amount:number;changePercent:number;turnoverRate:number;source:string;provenanceUrl:string };
type StockPayload = { quote:Quote;history:{name:string;bars:Bar[];asOf:string;source:string;provenanceUrl:string};analysis:{ma5:number;ma20:number;ma60:number;return20:number;return60:number;annualizedVolatility:number;trendScore:number;verdict:string;facts:string[];inferences:string[];unknowns:string[]};auditVerdict:"REVIEW";fetchedAt:string };
type PaperEvent = { id:string;code:string;name:string;action:string;at:string;price:number };

const tabs: Array<{key:TabKey;label:string}> = [
  {key:"market",label:"市场概览"},{key:"holdings",label:"持仓概览"},{key:"scores",label:"策略评分"},{key:"trades",label:"研究记录"},
  {key:"screening",label:"热点筛选"},{key:"strategy",label:"策略研究"},{key:"stock",label:"个股研究"},{key:"industry",label:"产业链研究"},
];
const WATCHLIST_KEY="touzi-watchlist-v1";
const EVENT_KEY="touzi-paper-events-v1";

function Tag({kind}:{kind:Evidence}) { return <span className={`${styles.evidence} ${styles[kind.toLowerCase()]}`}>{kind}</span>; }
function formatTime(value?:string) { if(!value)return "等待数据"; try{return new Date(value).toLocaleString("zh-CN",{timeZone:"Asia/Shanghai",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit"});}catch{return value;} }
function signed(value:number,digits=2){return `${value>=0?"+":""}${value.toFixed(digits)}%`;}

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
  const url=useMemo(()=>`/api/platform/watchlist?codes=${codes.join(",")}`,[codes]); const {data,error,loading}=useJson<{quotes:Quote[]}>(url,refreshKey);
  if(!codes.length)return <div className={styles.empty}><h2>还没有自选研究标的</h2><p>在“个股研究”中搜索公司并加入观察，这里会按腾讯财经行情实时刷新。</p></div>;
  return <section><Status loading={loading} error={error}/><div className={styles.watchGrid}>{(data?.quotes||[]).map(q=><article className={styles.sectionCard} key={q.code}><div className={styles.sectionTitle}><div><h3>{q.name}</h3><small>{q.code} · {formatTime(q.asOf)}</small></div><button className={styles.removeButton} onClick={()=>setCodes(codes.filter(code=>code!==q.code))}>移除</button></div><strong className={styles.quotePrice}>{q.price.toFixed(2)}</strong><b className={q.changePercent>=0?styles.red:styles.green}>{signed(q.changePercent)}</b><div className={styles.cardActions}><button onClick={()=>onStock(q.code)}>打开研究</button><span><Tag kind="FACT"/>{q.source}</span></div></article>)}</div></section>;
}

function ScoresView({quotes,hotspots}:{quotes:Quote[];hotspots:Hotspot[]}){
  const breadth=quotes.length?quotes.filter(q=>q.changePercent>0).length/quotes.length:0; const marketAvg=quotes.length?quotes.reduce((s,q)=>s+q.changePercent,0)/quotes.length:0; const leader=hotspots[0];
  const items=[["市场广度",Math.round(breadth*100),`${quotes.filter(q=>q.changePercent>0).length}/${quotes.length} 个指数上涨`],["指数强度",Math.round(Math.max(0,Math.min(100,50+marketAvg*10))),`平均涨跌 ${signed(marketAvg)}`],["热点集中度",leader?Math.round(leader.score):0,leader?`${leader.name} 排名第一`:"等待数据"],["证据完整度",quotes.length>=6&&hotspots.length>=6?82:40,"行情已连接，财报/公告仍需补证"]] as const;
  return <section><div className={styles.scoreGrid}>{items.map((x,i)=><article className={styles.sectionCard} key={x[0]}><Tag kind={i===3?"INFERENCE":i<2?"FACT":"INFERENCE"}/><h3>{x[0]}</h3><strong className={styles.bigScore}>{x[1]}</strong><p>{x[2]}</p></article>)}</div><div className={styles.callout}><Tag kind="INFERENCE"/>综合分只用于把研究优先级排队，不能覆盖审计结论，也不会生成自动买卖指令。</div></section>;
}

function EventsView({events}:{events:PaperEvent[]}){
  if(!events.length)return <div className={styles.empty}><h2>暂无研究记录</h2><p>把股票加入自选后，这里会保留当前设备上的纸面研究轨迹。</p></div>;
  return <section className={styles.sectionCard}><div className={styles.sectionTitle}><h2>研究记录</h2><span>仅保存在当前浏览器</span></div><div className={styles.tableWrap}><table><thead><tr><th>时间</th><th>公司</th><th>动作</th><th>参考价</th><th>性质</th></tr></thead><tbody>{events.map(e=><tr key={e.id}><td>{formatTime(e.at)}</td><td><b>{e.name}</b><small>{e.code}</small></td><td>{e.action}</td><td>{e.price.toFixed(2)}</td><td><Tag kind="FACT"/>纸面记录</td></tr>)}</tbody></table></div></section>;
}

function ScreeningView({hotspots,onStock}:{hotspots:Hotspot[];onStock:(code:string)=>void}){
  return <section className={styles.sectionCard}><div className={styles.sectionTitle}><div><h2>商业热点筛选</h2><p>按最新主题篮子表现自动重排；分数高不等于适合买入</p></div><span>{hotspots.length} 个主题</span></div><div className={styles.tableWrap}><table><thead><tr><th>排名</th><th>主题</th><th>状态</th><th>强度</th><th>广度</th><th>分化</th><th>代表公司</th><th>证据</th></tr></thead><tbody>{hotspots.map((h,i)=><tr key={h.id}><td>0{i+1}</td><td><b>{h.name}</b><small>{h.thesis}</small></td><td><span className={styles.pill}>{h.state}</span></td><td className={h.averageChange>=0?styles.red:styles.green}>{signed(h.averageChange)}</td><td>{(h.breadth*100).toFixed(0)}%</td><td>{h.dispersion.toFixed(2)}%</td><td>{h.members.map(m=><button className={styles.tableLink} key={m.code} onClick={()=>onStock(m.code)}>{m.name}</button>)}</td><td><Tag kind={h.evidence}/></td></tr>)}</tbody></table></div></section>;
}

function StrategyView({leader}:{leader?:Hotspot}){
  const principles=[["先判断市场","用指数强度与市场广度确定研究仓位上限。"],["再找产业验证","热点必须能落到订单、产能、现金流或政策变量。"],["最后看个股","价格、趋势和估值只决定赔率，不替代基本面。"],["永远保留未知","缺财报、公告和点时证据时，结论保持 REVIEW。"]];
  return <section><div className={styles.heroPair}><article className={styles.sectionCard}><Tag kind="INFERENCE"/><h2>当日研究焦点</h2><p>{leader?`${leader.name} 当前主题得分 ${leader.score.toFixed(0)}，状态为“${leader.state}”。它只是今日优先研究线索，不是荐股。`:"等待热点数据后生成研究焦点。"}</p></article><article className={styles.miniGrid}>{[["执行顺序","市场 > 产业 > 公司"],["行情刷新","分钟级"],["日线更新","交易日"],["最终结论","人工 REVIEW"]].map(x=><div key={x[0]}><span>{x[0]}</span><strong>{x[1]}</strong></div>)}</article></div><h2 className={styles.blockHeading}>智能投研原则</h2><div className={styles.fourCols}>{principles.map(x=><article key={x[0]}><h3>{x[0]}</h3><p>{x[1]}</p></article>)}</div><div className={styles.processList}>{["搜索公司并拉取实时行情","同步最近120个交易日日线","计算趋势、收益和波动率","将事实、推断、未知分开","加入自选持续观察","人工结合财报与公告完成审计"].map((x,i)=><div key={x}><b>{i+1}. {x}</b><span>{["东方财富中文搜索 + 腾讯财经报价","东方财富前复权日线，保留来源和日期","所有统计只使用点时数据","模型不把缺失证据写成确定结论","自选仅保存在用户设备，不连接券商","最终判断不能由策略分数覆盖"][i]}</span></div>)}</div></section>;
}

function StockView({payload,loading,error,onAdd,isAdded}:{payload:StockPayload|null;loading:boolean;error:string;onAdd:()=>void;isAdded:boolean}){
  if(loading)return <Status loading error=""/>; if(error)return <Status loading={false} error={error}/>; if(!payload)return <div className={styles.empty}>请在顶部搜索股票。</div>;
  const {quote,history,analysis}=payload; const bars=history.bars.slice(-42); const min=Math.min(...bars.map(b=>b.close)); const max=Math.max(...bars.map(b=>b.close));
  return <section><div className={styles.sectionCard}><div className={styles.stockHeadline}><div><h2>{quote.name} {quote.code}</h2><small><Tag kind="FACT"/>{formatTime(quote.asOf)} · {quote.source}</small></div><div><strong className={styles.quotePrice}>{quote.price.toFixed(2)}</strong><b className={quote.changePercent>=0?styles.red:styles.green}>{signed(quote.changePercent)}</b></div><span className={styles.pill}>{analysis.verdict}</span><button className={styles.primaryButton} onClick={onAdd} disabled={isAdded}>{isAdded?"已在自选":"加入自选研究"}</button></div><div className={styles.kpiRow}>{[["趋势评分",analysis.trendScore.toFixed(0)],["20日收益",signed(analysis.return20*100)],["60日收益",signed(analysis.return60*100)],["年化波动",`${(analysis.annualizedVolatility*100).toFixed(1)}%`]].map(x=><div key={x[0]}><span>{x[0]}</span><strong>{x[1]}</strong></div>)}</div></div>
    <div className={styles.sectionCard}><div className={styles.sectionTitle}><h2>近42个交易日收盘结构</h2><span>东方财富日线 · 更新至 {history.asOf}</span></div><div className={styles.priceChart}>{bars.map(b=><i key={b.date} title={`${b.date} ${b.close}`} style={{height:`${18+((b.close-min)/Math.max(.01,max-min))*82}%`}} className={b.changePercent>=0?styles.upBar:styles.downPriceBar}/>)}</div><div className={styles.chartAxis}><span>{bars[0]?.date}</span><span>MA5 {analysis.ma5.toFixed(2)} · MA20 {analysis.ma20.toFixed(2)} · MA60 {analysis.ma60.toFixed(2)}</span><span>{bars.at(-1)?.date}</span></div></div>
    <div className={styles.threeEvidence}><article><h3><Tag kind="FACT"/>可核验事实</h3>{analysis.facts.map(x=><p key={x}>{x}</p>)}</article><article><h3><Tag kind="INFERENCE"/>模型推断</h3>{analysis.inferences.map(x=><p key={x}>{x}</p>)}</article><article><h3><Tag kind="UNKNOWN"/>仍需补证</h3>{analysis.unknowns.map(x=><p key={x}>{x}</p>)}</article></div>
  </section>;
}

function IndustryView({hotspots,onStock}:{hotspots:Hotspot[];onStock:(code:string)=>void}){
  return <section><div className={styles.sectionTitle}><div><h2>产业链研究队列</h2><p>从当日商业热点向订单、产能、技术、现金流四类证据下钻</p></div><Tag kind="INFERENCE"/></div><div className={styles.nodeList}>{hotspots.slice(0,8).map((h,i)=><article key={h.id}><div><b>0{i+1} · {h.name}</b><small>{h.state} · 得分 {h.score.toFixed(0)}</small></div><p>{h.thesis}</p><span>{h.members.map(m=><button className={styles.tableLink} key={m.code} onClick={()=>onStock(m.code)}>{m.name} {signed(m.changePercent,1)}</button>)}</span></article>)}</div><div className={styles.callout}><Tag kind="UNKNOWN"/>热点只能告诉我们资金正在关注什么；是否形成长期商业价值，仍需核对订单质量、产能利用率、客户集中度、现金流和竞争格局。</div></section>;
}

export default function LivePlatform(){
  const [tab,setTab]=useState<TabKey>("market"); const [refreshKey,setRefreshKey]=useState(0); const [query,setQuery]=useState(""); const [results,setResults]=useState<SearchResult[]>([]); const [searching,setSearching]=useState(false); const [selectedCode,setSelectedCode]=useState("300750");
  const [watchlist,setWatchlistState]=useState<string[]>([]); const [events,setEventsState]=useState<PaperEvent[]>([]);
  const market=useJson<{quotes:Quote[];asOf:string;fetchedAt:string;source:string}>("/api/platform/market",refreshKey); const hotspot=useJson<{hotspots:Hotspot[];asOf:string;fetchedAt:string}>("/api/platform/hotspots",refreshKey); const stock=useJson<StockPayload>(`/api/platform/stock?code=${selectedCode}`,refreshKey);
  useEffect(()=>{try{setWatchlistState(JSON.parse(localStorage.getItem(WATCHLIST_KEY)||"[]"));setEventsState(JSON.parse(localStorage.getItem(EVENT_KEY)||"[]"));}catch{}},[]);
  const setWatchlist=useCallback((codes:string[])=>{setWatchlistState(codes);localStorage.setItem(WATCHLIST_KEY,JSON.stringify(codes));},[]);
  useEffect(()=>{if(!query.trim()){setResults([]);return;} const c=new AbortController();const timer=setTimeout(()=>{setSearching(true);fetch(`/api/platform/search?q=${encodeURIComponent(query)}`,{signal:c.signal}).then(r=>r.json()).then(body=>setResults(body.results||[])).catch(()=>setResults([])).finally(()=>setSearching(false));},260);return()=>{clearTimeout(timer);c.abort();};},[query]);
  const openStock=(code:string)=>{setSelectedCode(code);setTab("stock");setQuery("");setResults([]);window.scrollTo({top:0,behavior:"smooth"});};
  const addWatch=()=>{if(!stock.data||watchlist.includes(stock.data.quote.code))return;const codes=[stock.data.quote.code,...watchlist].slice(0,30);setWatchlist(codes);const event:PaperEvent={id:crypto.randomUUID(),code:stock.data.quote.code,name:stock.data.quote.name,action:"加入自选研究",price:stock.data.quote.price,at:new Date().toISOString()};const next=[event,...events].slice(0,100);setEventsState(next);localStorage.setItem(EVENT_KEY,JSON.stringify(next));};
  const quotes=market.data?.quotes||[];const hotspots=hotspot.data?.hotspots||[];const dataAsOf=market.data?.asOf;
  return <main className={styles.page}><div className={styles.shell}>
    <header className={styles.header}><div className={styles.brand}><span className={styles.logo}>↗</span><h1>投资看板</h1><small>最新行情：{formatTime(dataAsOf)}</small></div><div className={styles.actions}><button onClick={()=>setRefreshKey(k=>k+1)}>↻ 刷新数据</button><a href="/">返回</a></div></header>
    <div className={styles.globalSearch}><div><span>⌕</span><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="搜索股票名称或代码，例如：宁德时代 / 300750" aria-label="搜索股票"/>{searching&&<small>搜索中…</small>}</div>{results.length>0&&<div className={styles.searchResults}>{results.map(r=><button key={r.quoteId} onClick={()=>openStock(r.code)}><b>{r.name}</b><span>{r.code} · {r.market} · {r.type}</span></button>)}</div>}</div>
    <nav className={styles.tabs}>{tabs.map(item=><button key={item.key} className={tab===item.key?styles.activeTab:""} onClick={()=>setTab(item.key)}>{item.label}</button>)}</nav>
    <div className={styles.provenance}><span className={market.error||hotspot.error?styles.offlineDot:styles.liveDot}/>{market.error||hotspot.error?"部分数据源异常":"数据源在线"}：腾讯财经即时报价 + 东方财富搜索/日线<span>行情时间 {formatTime(dataAsOf)}</span><span>页面获取 {formatTime(market.data?.fetchedAt)}</span></div>
    {tab==="market"&&<MarketView quotes={quotes} hotspots={hotspots} loading={market.loading||hotspot.loading} error={market.error||hotspot.error} onStock={openStock}/>} 
    {tab==="holdings"&&<HoldingsView codes={watchlist} setCodes={setWatchlist} refreshKey={refreshKey} onStock={openStock}/>} 
    {tab==="scores"&&<ScoresView quotes={quotes} hotspots={hotspots}/>} 
    {tab==="trades"&&<EventsView events={events}/>} 
    {tab==="screening"&&<ScreeningView hotspots={hotspots} onStock={openStock}/>} 
    {tab==="strategy"&&<StrategyView leader={hotspots[0]}/>} 
    {tab==="stock"&&<StockView payload={stock.data} loading={stock.loading} error={stock.error} onAdd={addWatch} isAdded={!!stock.data&&watchlist.includes(stock.data.quote.code)}/>} 
    {tab==="industry"&&<IndustryView hotspots={hotspots} onStock={openStock}/>} 
    <footer className={styles.footer}><p>把重复的信息整理交给系统，把判断和责任留给人。</p><small>研究、回测与纸面交易支持；不连接券商，不自动下单。行情来自第三方公开页面接口，交易前请核对交易所、券商行情与公司公告。</small></footer>
  </div></main>;
}
