import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";

const root=process.cwd();
const read=(...parts)=>fs.readFileSync(path.join(root,...parts),"utf8");

test("the investor homepage aggregates market, assets, events and next actions",()=>{
  const app=read("app","investment-platform","LivePlatform.tsx");
  const page=read("docs","investment-platform","index.html");
  for(const label of ["市场首页","我的持仓","机会与研究","个股详情","全球资产温度计","市场热点雷达","新闻与全球事件","投资者行动清单","下一步只看三件事"]){
    assert.ok(app.includes(label),`React homepage missing ${label}`);
    assert.ok(page.includes(label),`GitHub Pages homepage missing ${label}`);
  }
  assert.match(app,/const tabs[\s\S]*市场首页[\s\S]*我的持仓[\s\S]*机会与研究[\s\S]*个股详情/);
  assert.match(page,/id="tabs"[\s\S]{0,500}市场首页[\s\S]{0,500}个股详情/);
});

test("holdings receive explainable company and industry news matches",()=>{
  const app=read("app","investment-platform","LivePlatform.tsx");
  const page=read("docs","investment-platform","index.html");
  for(const text of ["与持仓相关的事件","按公司、行业与资产主题自动命中","暂未命中可靠新闻"]){assert.ok(app.includes(text));}
  assert.match(page,/relatedNews\(q\)/);
  assert.match(page,/公司 \/ 行业 \/ 资产主题命中/);
});

test("news and asset records retain timestamps, provenance and evidence labels",()=>{
  const docs=JSON.parse(read("docs","market-intelligence.json"));
  const publicCopy=JSON.parse(read("public","market-intelligence.json"));
  assert.deepEqual(publicCopy,docs);
  assert.ok(docs.assets.length>=5);
  assert.ok(docs.news.length>=5);
  for(const asset of docs.assets){assert.equal(asset.evidence,"FACT");assert.ok(asset.asOf);assert.ok(asset.source);assert.ok(asset.provenanceUrl);}
  for(const item of docs.news){assert.equal(item.evidence,"FACT");assert.equal(item.analysisEvidence,"INFERENCE");assert.ok(item.publishedAt);assert.ok(item.fetchedAt);assert.ok(item.url);assert.ok(item.nextCheck);}
});

test("collection adapters are separated from news impact research",()=>{
  const adapter=read("lib","market-data","intelligence-sources.mjs");
  const research=read("lib","research","news-impact.mjs");
  const generator=read("scripts","update-market-intelligence.mjs");
  const workflow=read(".github","workflows","market-intelligence.yml");
  assert.match(adapter,/fetchGdeltArticles/);assert.match(adapter,/fetchGlobalAssets/);
  assert.doesNotMatch(adapter,/whyItMatters|relatedCodes|impact:/);
  assert.match(research,/whyItMatters/);assert.match(research,/relatedCodes/);
  assert.doesNotMatch(research,/api\.gdeltproject|qt\.gtimg|api\.coingecko/);
  assert.match(generator,/intelligence-sources\.mjs/);assert.match(generator,/news-impact\.mjs/);
  assert.match(generator,/combinedQuery/);assert.match(generator,/ranked\[0\]\?\.score>0/);
  assert.doesNotMatch(generator,/for\(const topic of TOPICS\).*fetchGdeltArticles/s);
  assert.match(workflow,/cron: "17 \* \* \* \*"/);
});
