import fs from "node:fs/promises";
import path from "node:path";
import { fetchGdeltArticles, fetchGlobalAssets } from "../lib/market-data/intelligence-sources.mjs";
import { enrichNews } from "../lib/research/news-impact.mjs";

const root=process.cwd(), outputs=[path.join(root,"docs","market-intelligence.json"),path.join(root,"public","market-intelligence.json")], now=new Date().toISOString();
const TOPICS=[
  {category:"A股与政策",query:"(A股 OR 中国股市 OR 沪深 OR 证监会)",topics:["A股","政策"],industries:["全市场"]},
  {category:"全球与地区",query:"(geopolitics OR sanctions OR tariff OR conflict OR shipping)",topics:["国际局势","地区动态"],industries:["能源","航运","军工"]},
  {category:"能源与航运",query:"(oil OR OPEC OR LNG OR energy OR Hormuz)",topics:["原油","能源","航运"],industries:["石油石化","煤炭","航运"]},
  {category:"金属与资源",query:"(gold OR silver OR copper OR rare earth OR metals)",topics:["黄金","白银","铜","稀土"],industries:["贵金属","工业金属","有色"]},
  {category:"数字资产",query:"(bitcoin OR cryptocurrency OR stablecoin)",topics:["比特币","加密货币"],industries:["数字资产"]},
  {category:"科技与产业",query:"(artificial intelligence OR semiconductor OR robotics OR biotech)",topics:["AI","半导体","机器人","创新药"],industries:["科技","医药"]},
];
const readExisting=async()=>{try{return JSON.parse(await fs.readFile(outputs[0],"utf8"));}catch{return{news:[],assets:[]};}};
const existing=await readExisting(), sourceErrors=[]; let news=[];
for(const topic of TOPICS){try{news.push(...(await fetchGdeltArticles(topic.query)).map(article=>enrichNews(article,topic,now)));await new Promise(resolve=>setTimeout(resolve,1200));}catch(error){sourceErrors.push(`${topic.category}：${error.message}`);}}
const seen=new Set(); news=news.filter(item=>{const key=item.title.replace(/\s+/g,"").toLowerCase();if(!item.title||!item.url||seen.has(key))return false;seen.add(key);return true;}).sort((a,b)=>String(b.publishedAt).localeCompare(String(a.publishedAt))).slice(0,48);
const assetResult=await fetchGlobalAssets(existing.assets,now);sourceErrors.push(...assetResult.errors);
const payload={schemaVersion:"market-intelligence.v1",generatedAt:now,newsUpdatedAt:news.length?now:(existing.newsUpdatedAt||null),assetsUpdatedAt:assetResult.assets.length?now:(existing.assetsUpdatedAt||null),sourceStatus:{state:sourceErrors.length?"REVIEW":"PASS",errors:sourceErrors,newsProvider:"GDELT DOC 2.0",assetProviders:["腾讯财经全球行情","CoinGecko","Coinbase fallback"]},assets:assetResult.assets,news:news.length?news:(existing.news||[])};
for(const output of outputs){await fs.mkdir(path.dirname(output),{recursive:true});await fs.writeFile(output,JSON.stringify(payload,null,2)+"\n","utf8");}
console.log(`market intelligence: ${payload.news.length} news, ${payload.assets.length} assets, ${sourceErrors.length} source warnings`);
