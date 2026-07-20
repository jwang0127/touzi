const fetchText = async (url, timeout=18000) => {
  let lastError;
  for(let attempt=0;attempt<3;attempt++){
    const controller=new AbortController(); const timer=setTimeout(()=>controller.abort(),timeout);
    try{
      const response=await fetch(url,{headers:{"user-agent":"TouziResearchDashboard/1.0 (+https://github.com/jwang0127/touzi)"},signal:controller.signal});
      if(response.ok)return await response.text();
      lastError=new Error(`HTTP ${response.status}`);
      if(response.status!==429&&response.status<500)throw lastError;
      if(attempt<2){const retryAfter=Number(response.headers.get("retry-after")||0)*1000;await new Promise(resolve=>setTimeout(resolve,retryAfter||5000*(attempt+1)));}
    }catch(error){lastError=error;if(attempt<2&&error?.name!=="AbortError")await new Promise(resolve=>setTimeout(resolve,2500*(attempt+1)));else if(attempt===2)throw error;}
    finally{clearTimeout(timer);}
  }
  throw lastError||new Error("fetch failed");
};

export async function fetchGdeltArticles(query, maxRecords=50){
  const url=`https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(query)}&mode=ArtList&maxrecords=${Math.max(1,Math.min(250,maxRecords))}&format=json&sort=datedesc`;
  const data=JSON.parse(await fetchText(url,25000));
  return data.articles||[];
}

function parseTencentAssets(text){
  const rows=[];const names={sh000001:"上证指数",sz399001:"深证成指",hkHSI:"恒生指数",hkHSCEI:"恒生国企指数",usDJI:"道琼斯",usIXIC:"纳斯达克",usINX:"标普500",hf_GC:"纽约黄金",hf_CL:"纽约原油",hf_HG:"纽约铜"};
  for(const match of text.matchAll(/v_([A-Za-z0-9_]+)="([^"]*)"/g)){
    const symbol=match[1], raw=match[2], f=raw.split("~");
    if(symbol.startsWith("us")&&f.length>34)rows.push({id:symbol,name:names[symbol]||f[1],price:Number(f[3]),changePercent:Number(f[32]),unit:"USD",asOf:String(f[30]).replace(" ","T")+"-04:00",source:"腾讯财经全球行情",provenanceUrl:"https://qt.gtimg.cn/",evidence:"FACT"});
    if(/^(sh|sz)/.test(symbol)&&f.length>34)rows.push({id:symbol,name:names[symbol]||f[1],price:Number(f[3]),changePercent:Number(f[32]),unit:"CNY",asOf:String(f[30]).replace(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$/,"$1-$2-$3T$4:$5:$6+08:00"),source:"腾讯财经A股指数",provenanceUrl:"https://qt.gtimg.cn/",evidence:"FACT"});
    if(symbol.startsWith("hk")&&f.length>34)rows.push({id:symbol,name:names[symbol]||f[1],price:Number(f[3]),changePercent:Number(f[32]),unit:"HKD",asOf:String(f[30]).replace(" ","T").replaceAll("/","-")+"+08:00",source:"腾讯财经港股指数",provenanceUrl:"https://qt.gtimg.cn/",evidence:"FACT"});
    if(symbol.startsWith("hf_")){const x=raw.split(",");rows.push({id:symbol,name:names[symbol]||x[13]||symbol,price:Number(x[0]),changePercent:Number(x[1]),unit:"USD",asOf:`${x[12]}T${x[6]}-04:00`,source:"腾讯财经国际期货",provenanceUrl:"https://qt.gtimg.cn/",evidence:"FACT"});}
  }
  return rows.filter(x=>Number.isFinite(x.price));
}

export async function fetchGlobalAssets(existing, now){
  const assets=[]; const errors=[];
  try{assets.push(...parseTencentAssets(await fetchText("https://qt.gtimg.cn/q=sh000001,sz399001,hkHSI,hkHSCEI,usDJI,usIXIC,usINX,hf_GC,hf_CL,hf_HG")));}catch(error){errors.push(`腾讯全球行情：${error.message}`);}
  try{const data=JSON.parse(await fetchText("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true&include_last_updated_at=true"));assets.push({id:"bitcoin",name:"比特币",price:Number(data.bitcoin.usd),changePercent:Number(data.bitcoin.usd_24h_change),unit:"USD",asOf:new Date(Number(data.bitcoin.last_updated_at||Date.now()/1000)*1000).toISOString(),source:"CoinGecko",provenanceUrl:"https://www.coingecko.com/en/coins/bitcoin",evidence:"FACT"});}catch(error){errors.push(`CoinGecko：${error.message}`);try{const data=JSON.parse(await fetchText("https://api.coinbase.com/v2/prices/BTC-USD/spot"));assets.push({id:"bitcoin",name:"比特币",price:Number(data.data.amount),changePercent:null,unit:"USD",asOf:now,source:"Coinbase Spot API",provenanceUrl:"https://www.coinbase.com/price/bitcoin",evidence:"FACT"});}catch(fallbackError){errors.push(`Coinbase：${fallbackError.message}`);}}
  if(!assets.some(x=>x.id==="bitcoin"))try{const data=JSON.parse(await fetchText("https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT"));assets.push({id:"bitcoin",name:"比特币",price:Number(data.lastPrice),changePercent:Number(data.priceChangePercent),unit:"USDT",asOf:new Date(Number(data.closeTime||Date.now())).toISOString(),source:"Binance Public Market Data",provenanceUrl:"https://www.binance.com/en/price/bitcoin",evidence:"FACT"});}catch(error){errors.push(`Binance：${error.message}`);}
  const merged=[...assets];for(const item of existing||[])if(!merged.some(x=>x.id===item.id))merged.push(item);
  return {assets:merged.length?merged:(existing||[]),errors};
}
