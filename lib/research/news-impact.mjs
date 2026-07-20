import crypto from "node:crypto";

const STOCK_TERMS = {
  "300750":["宁德时代","电池","储能","新能源汽车"], "300308":["中际旭创","光模块","光通信","AI"], "300502":["新易盛","光模块","光通信","AI"],
  "600900":["长江电力","水电","电力","高股息"], "600547":["山东黄金","黄金","贵金属"], "000975":["山金国际","黄金","贵金属"],
  "601899":["紫金矿业","铜","黄金","有色"], "600030":["中信证券","券商","资本市场"], "300059":["东方财富","券商","金融科技"],
  "600118":["中国卫星","商业航天","卫星"], "300474":["景嘉微","商业航天","军工"], "601857":["中国石油","原油","石油"],
  "600028":["中国石化","原油","石化"], "601088":["中国神华","煤炭","能源"],
};
const decodeXml = value => String(value||"").replace(/<!\[CDATA\[|\]\]>/g,"").replace(/&amp;/g,"&").replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&quot;/g,'"').replace(/&#39;/g,"'");
const strip = value => decodeXml(value).replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim();
const matchCodes = text => Object.entries(STOCK_TERMS).filter(([,terms])=>terms.some(term=>text.toLowerCase().includes(term.toLowerCase()))).map(([code])=>code);

export function enrichNews(article, topic, now){
  const title=strip(article.title), text=title.toLowerCase();
  const positive=["增长","上调","回购","增持","获批","突破","record","rise","growth","approval","support"];
  const negative=["下调","处罚","制裁","冲突","风险","下跌","调查","cut","sanction","conflict","risk","fall"];
  const pos=positive.filter(x=>text.includes(x)).length, neg=negative.filter(x=>text.includes(x)).length;
  const impact=pos>neg?"偏正面":neg>pos?"偏负面":"待观察";
  const whyByCategory={"A股与政策":"可能改变市场风险偏好、资金成本或相关行业政策预期。","全球与地区":"先观察能源、航运、汇率与避险资产，再判断是否传导到A股。","能源与航运":"油气价格和运输约束可能改变上游利润、制造成本与通胀预期。","金属与资源":"金属价格会影响矿业利润、制造成本及新能源产业链估值。","数字资产":"主要反映全球流动性、风险偏好与监管变化，不直接等同A股信号。","科技与产业":"需确认事件能否转化为订单、资本开支或盈利，而非只看概念热度。"};
  return {id:crypto.createHash("sha1").update(article.url||title).digest("hex").slice(0,16),category:topic.category,title,url:article.url,source:article.domain||article.sourcecountry||"GDELT",publishedAt:article.seendate?String(article.seendate).replace(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/, "$1-$2-$3T$4:$5:$6Z"):now,fetchedAt:now,evidence:"FACT",analysisEvidence:"INFERENCE",topics:topic.topics,industries:topic.industries,regions:[article.sourcecountry].filter(Boolean),relatedCodes:matchCodes(`${title} ${topic.topics.join(" ")}`),impact,whyItMatters:whyByCategory[topic.category],nextCheck:"核对后续价格反应、官方文件或公司公告；没有二次证据时不改变评级。",provenanceUrl:article.url};
}
