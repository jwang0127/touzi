import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const page = fs.readFileSync(path.join(root, "app", "investment-platform", "LivePlatform.tsx"), "utf8");
const css = fs.readFileSync(path.join(root, "app", "investment-platform", "platform.module.css"), "utf8");

test("the live investment platform is isolated on its own route", () => {
  assert.match(page, /投资看板/);
  assert.match(page, /产业链研究/);
  assert.match(page, /不连接券商/);
  assert.doesNotMatch(page, /A股中长期交易研究与审计系统_Codex最终框架/);
  assert.doesNotMatch(page, /视频画面复刻|作者评论|2026-07-03/);
});

test("all eight investment navigation sections are present", () => {
  for (const label of ["市场概览", "持仓概览", "策略评分", "研究记录", "热点筛选", "策略研究", "个股研究", "产业链研究"]) {
    assert.ok(page.includes(label), `missing ${label}`);
  }
});

test("research content carries evidence labels and responsive styles", () => {
  for (const label of ["FACT", "INFERENCE", "UNKNOWN"]) assert.ok(page.includes(label));
  assert.match(css, /@media\(max-width:580px\)/);
});

test("live data APIs are wired into the client", () => {
  for (const endpoint of ["/api/platform/market", "/api/platform/hotspots", "/api/platform/search", "/api/platform/stock", "/api/platform/watchlist"]) {
    assert.ok(page.includes(endpoint), `missing ${endpoint}`);
  }
  assert.match(page, /腾讯财经即时报价 \+ 东方财富搜索\/日线/);
});
