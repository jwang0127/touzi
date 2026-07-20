import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const baskets = [
  ["AI算力与光通信",["sz300308","sz300502","sh688256"]],
  ["创新药与CRO",["sh603259","sz300760","sh688180"]],
  ["半导体与存储",["sh688041","sh688981","sz300223"]],
  ["商业航天",["sh600118","sz300474","sh688066"]],
  ["人形机器人",["sz300124","sh688017","sz002747"]],
  ["高股息与电力",["sh600900","sh601088","sh600025"]],
  ["券商与金融科技",["sh600030","sz300059","sh601688"]],
  ["黄金与资源",["sh600547","sz000975","sh601899"]],
];

const symbols=[...new Set(baskets.flatMap(([,codes])=>codes))];
const response=await fetch(`https://qt.gtimg.cn/q=${symbols.join(",")}`,{headers:{"User-Agent":"Mozilla/5.0",Referer:"https://stockapp.finance.qq.com/"}});
if(!response.ok)throw new Error(`Tencent quote HTTP ${response.status}`);
const body=new TextDecoder("gb18030").decode(await response.arrayBuffer());
const quotes=[...body.matchAll(/v_([a-zA-Z0-9_]+)="([^"]*)"/g)].map(match=>{const f=match[2].split("~");return{symbol:match[1],name:f[1],code:f[2],price:+f[3],changePercent:+f[32]};}).filter(q=>q.code&&q.price>0);
const bySymbol=new Map(quotes.map(q=>[q.symbol,q]));
const themes=baskets.map(([name,codes])=>{const members=codes.map(code=>bySymbol.get(code)).filter(Boolean);const averageChange=members.reduce((sum,q)=>sum+q.changePercent,0)/Math.max(1,members.length);const breadth=members.filter(q=>q.changePercent>0).length/Math.max(1,members.length);const dispersion=Math.max(...members.map(q=>q.changePercent))-Math.min(...members.map(q=>q.changePercent));const score=Math.max(0,Math.min(100,50+averageChange*8+breadth*28-dispersion*4));return{name,members,averageChange,breadth,dispersion,score};}).sort((a,b)=>b.score-a.score);
const seen=new Set();
const picks=themes.flatMap(theme=>theme.members.map(stock=>({theme,stock}))).filter(({stock})=>!/^688/.test(stock.code)&&!/^[489]/.test(stock.code)&&!/ST/i.test(stock.name)).filter(({stock})=>{if(seen.has(stock.code))return false;seen.add(stock.code);return true;}).map(({theme,stock})=>{const chasePenalty=Math.max(0,stock.changePercent-6)*1.4;const rank=theme.score+stock.changePercent*1.6+theme.breadth*14-theme.dispersion*2.2-chasePenalty;const expected=Math.max(.2,Math.min(4.8,.65+theme.averageChange*.28+stock.changePercent*.1+(theme.breadth-.5)*1.25-theme.dispersion*.08));const band=.65+Math.min(1.2,theme.dispersion*.14);return{code:stock.code,name:stock.name,theme:theme.name,price:stock.price,changePercent:stock.changePercent,expected,rangeLow:Math.max(-1.5,expected-band),rangeHigh:Math.min(7.5,expected+band),reason:`${theme.name}主题覆盖率 ${(theme.breadth*100).toFixed(0)}%，主题平均 ${theme.averageChange>=0?"+":""}${theme.averageChange.toFixed(2)}%，个股当日 ${stock.changePercent>=0?"+":""}${stock.changePercent.toFixed(2)}%。`,risk:"若次日高开超过预测上沿，或主题覆盖率降至 50% 以下，则取消观察。",rank};}).sort((a,b)=>b.rank-a.rank).slice(0,3).map(({rank,...pick})=>pick);
if(picks.length!==3)throw new Error(`Expected 3 picks, received ${picks.length}`);
const edition=new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Shanghai",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
const output={edition,generatedAt:new Date().toISOString(),scheduledFor:"09:00 Asia/Shanghai",source:"腾讯财经公开行情",evidence:"INFERENCE",exclusions:["科创板 688","北交所 4/8/9","ST"],picks};
const json=`${JSON.stringify(output,null,2)}\n`;
for(const directory of ["docs","public"]){await mkdir(path.resolve(directory),{recursive:true});await writeFile(path.resolve(directory,"daily-picks.json"),json,"utf8");}
console.log(`${edition}: ${picks.map(p=>`${p.name}(${p.code})`).join(", ")}`);
