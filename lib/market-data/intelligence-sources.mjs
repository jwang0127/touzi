const fetchText = async (url, timeout=18000) => {
  const controller=new AbortController(); const timer=setTimeout(()=>controller.abort(),timeout);
  try{const response=await fetch(url,{headers:{"user-agent":"TouziResearchDashboard/1.0 (+https://github.com/jwang0127/touzi)"},signal:controller.signal});if(!response.ok)throw new Error(`HTTP ${response.status}`);return await response.text();}
  finally{clearTimeout(timer);}
};

export async function fetchGdeltArticles(query, maxRecords=50){
  const url=`https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(query)}&mode=ArtList&maxrecords=${Math.max(1,Math.min(250,maxRecords))}&format=json&sort=datedesc`;
  const data=JSON.parse(await fetchText(url,25000));
  return data.articles||[];
}

function parseTencentAssets(text){
  const rows=[];
  for(const match of text.matchAll(/v_([A-Za-z0-9_]+)="([^"]*)"/g)){
    const symbol=match[1], raw=match[2], f=raw.split("~");
    if(symbol.startsWith("us")&&f.length>34)rows.push({id:symbol,name:f[1],price:Number(f[3]),changePercent:Number(f[32]),unit:"USD",asOf:String(f[30]).replace(" ","T")+"-04:00",source:"腾讯财经全球行情",provenanceUrl:"https://qt.gtimg.cn/",evidence:"FACT"});
    if(symbol.startsWith("hf_")){const x=raw.split(",");rows.push({id:symbol,name:x[13]||symbol,price:Number(x[0]),changePercent:Number(x[1]),unit:"USD",asOf:`${x[12]}T${x[6]}-04:00`,source:"腾讯财经国际期货",provenanceUrl:"https://qt.gtimg.cn/",evidence:"FACT"});}
  }
  return rows.filter(x=>Number.isFinite(x.price));
}

export async function fetchGlobalAssets(existing, now){
  const assets=[]; const errors=[];
  try{assets.push(...parseTencentAssets(await fetchText("https://qt.gtimg.cn/q=usDJI,usIXIC,usINX,hf_GC,hf_CL,hf_HG")));}catch(error){errors.push(`腾讯全球行情：${error.message}`);}
  try{const data=JSON.parse(await fetchText("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true&include_last_updated_at=true"));assets.push({id:"bitcoin",name:"比特币",price:Number(data.bitcoin.usd),changePercent:Number(data.bitcoin.usd_24h_change),unit:"USD",asOf:new Date(Number(data.bitcoin.last_updated_at||Date.now()/1000)*1000).toISOString(),source:"CoinGecko",provenanceUrl:"https://www.coingecko.com/en/coins/bitcoin",evidence:"FACT"});}catch(error){errors.push(`CoinGecko：${error.message}`);try{const data=JSON.parse(await fetchText("https://api.coinbase.com/v2/prices/BTC-USD/spot"));assets.push({id:"bitcoin",name:"比特币",price:Number(data.data.amount),changePercent:null,unit:"USD",asOf:now,source:"Coinbase Spot API",provenanceUrl:"https://www.coinbase.com/price/bitcoin",evidence:"FACT"});}catch(fallbackError){errors.push(`Coinbase：${fallbackError.message}`);}}
  return {assets:assets.length?assets:(existing||[]),errors};
}
