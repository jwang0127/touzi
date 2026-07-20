import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");

test("market adapters are separated from research scoring", () => {
  const tencent = read("lib", "market-data", "tencent.ts");
  const tencentHistory = read("lib", "market-data", "tencent-history.ts");
  const eastmoney = read("lib", "market-data", "eastmoney.ts");
  const hotspots = read("lib", "research", "hotspots.ts");
  assert.match(tencent, /qt\.gtimg\.cn/);
  assert.match(tencentHistory, /web\.ifzq\.gtimg\.cn/);
  assert.match(eastmoney, /searchapi\.eastmoney\.com/);
  assert.match(eastmoney, /push2his\.eastmoney\.com/);
  assert.match(hotspots, /rankHotspots/);
  assert.doesNotMatch(tencent, /score|verdict|auditVerdict/);
  assert.doesNotMatch(tencentHistory, /score|verdict|auditVerdict/);
  assert.doesNotMatch(eastmoney, /score|verdict|auditVerdict/);
});

test("every live endpoint carries provenance or an evidence state", () => {
  for (const route of ["market", "hotspots", "search", "stock", "watchlist"]) {
    const source = read("app", "api", "platform", route, "route.ts");
    assert.match(source, /source|evidence|auditVerdict/);
    assert.doesNotMatch(source, /2026-07-03|07-03/);
  }
});

test("stock research cannot emit an automatic order verdict", () => {
  const route = read("app", "api", "platform", "stock", "route.ts");
  assert.match(route, /auditVerdict: "REVIEW"/);
  assert.doesNotMatch(route, /auditVerdict: "PASS"|placeOrder|broker/i);
});

test("GitHub Pages build is anonymous and uses public market data directly", () => {
  const page = read("docs", "investment-platform", "index.html");
  assert.match(page, /qt\.gtimg\.cn/);
  assert.match(page, /web\.ifzq\.gtimg\.cn/);
  assert.match(page, /searchapi\.eastmoney\.com/);
  assert.doesNotMatch(page, /chatgpt\.site|\/api\/platform\//);
  for (const label of ["每日三股", "明日预测涨幅", "09:00", "科创板 688", "北交所 4/8/9", "今日决策", "买入", "持有", "卖出", "今日收盘推演", "实时五档盘口", "自动刷新", "触发条件", "失效条件"]) {
    assert.ok(page.includes(label), `missing ${label}`);
  }
});
