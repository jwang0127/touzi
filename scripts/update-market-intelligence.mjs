import fs from "node:fs/promises";
import path from "node:path";
import { fetchGdeltArticles, fetchGlobalAssets } from "../lib/market-data/intelligence-sources.mjs";
import { enrichNews } from "../lib/research/news-impact.mjs";

const root=process.cwd(), outputs=[path.join(root,"docs","market-intelligence.json"),path.join(root,"public","market-intelligence.json")], now=new Date().toISOString();
const TOPICS=[
  {category:"A股与政策",match:["a股","中国股市","沪深","证监会","chinese stock","china stock","shanghai stock","shenzhen stock","hong kong stock","hang seng","china economy","chinese economy"],topics:["A股","港股","政策"],industries:["A股","港股","中国经济"]},
  {category:"全球与地区",match:["geopolit","sanction","tariff","conflict","shipping","trade war"],topics:["国际局势","地区动态"],industries:["能源","航运","军工"]},
  {category:"能源与航运",match:["oil","opec","lng","energy","hormuz","crude","natural gas"],topics:["原油","能源","航运"],industries:["石油石化","煤炭","航运"]},
  {category:"金属与资源",match:["gold","silver","copper","rare earth","metal"],topics:["黄金","白银","铜","稀土"],industries:["贵金属","工业金属","有色"]},
  {category:"数字资产",match:["bitcoin","crypto","stablecoin","ethereum"],topics:["比特币","加密货币"],industries:["数字资产"]},
  {category:"科技与产业",match:["artificial intelligence","semiconductor","robot","biotech","computer chip"],topics:["AI","半导体","机器人","创新药"],industries:["科技","医药"]},
];
const readExisting=async()=>{try{return JSON.parse(await fs.readFile(outputs[0],"utf8"));}catch{return{news:[],assets:[]};}};
const existing=await readExisting(), sourceErrors=[]; let fresh=[];
const combinedQuery='("Chinese stock market" OR "Hong Kong stocks" OR "Hang Seng" OR "China economy" OR geopolitics OR sanctions OR oil OR OPEC OR gold OR copper OR bitcoin OR cryptocurrency OR semiconductor OR robotics)';
const sourceQueries=[combinedQuery,'("China industry" OR tariffs OR shipping OR LNG OR rare earth OR silver OR ethereum OR "artificial intelligence" OR biotech)'];
try{
  for(const query of sourceQueries){const articles=await fetchGdeltArticles(query,75);for(const article of articles){const title=String(article.title||"").toLowerCase();const ranked=TOPICS.map(topic=>({topic,score:topic.match.filter(term=>title.includes(term)).length})).sort((a,b)=>b.score-a.score);if(ranked[0]?.score>0)fresh.push(enrichNews(article,ranked[0].topic,now));}}
}catch(error){sourceErrors.push(`GDELT：${error.message}`);}
const seen=new Set(); const news=[...fresh,...(existing.news||[])].filter(item=>{const key=String(item.title||"").replace(/\s+/g,"").toLowerCase();if(!item.title||!item.url||seen.has(key))return false;seen.add(key);return true;}).sort((a,b)=>String(b.publishedAt).localeCompare(String(a.publishedAt))).slice(0,48);
const assetResult=await fetchGlobalAssets(existing.assets,now);sourceErrors.push(...assetResult.errors);
const payload={schemaVersion:"market-intelligence.v1",generatedAt:now,newsUpdatedAt:fresh.length?now:(existing.newsUpdatedAt||null),assetsUpdatedAt:assetResult.assets.length?now:(existing.assetsUpdatedAt||null),sourceStatus:{state:sourceErrors.length?"REVIEW":"PASS",errors:sourceErrors,newsProvider:"GDELT DOC 2.0（单次查询 + 本地相关性复核）",assetProviders:["腾讯财经全球行情","CoinGecko","Coinbase fallback"]},assets:assetResult.assets,news};
for(const output of outputs){await fs.mkdir(path.dirname(output),{recursive:true});await fs.writeFile(output,JSON.stringify(payload,null,2)+"\n","utf8");}
console.log(`market intelligence: ${payload.news.length} news, ${payload.assets.length} assets, ${sourceErrors.length} source warnings`);
