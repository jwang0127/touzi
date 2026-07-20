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

test("all investment navigation sections are present", () => {
  for (const label of ["市场概览", "持仓概览", "每日三股", "今日决策", "研究记录", "热点筛选", "策略研究", "个股研究", "产业链研究"]) {
    assert.ok(page.includes(label), `missing ${label}`);
  }
});

test("research content carries evidence labels and responsive styles", () => {
  for (const label of ["FACT", "INFERENCE", "UNKNOWN"]) assert.ok(page.includes(label));
  assert.match(css, /@media\(max-width:580px\)/);
});

test("live data APIs are wired into the client", () => {
  for (const endpoint of ["/api/platform/market", "/api/platform/hotspots", "/api/platform/search", "/api/platform/stock"]) {
    assert.ok(page.includes(endpoint), `missing ${endpoint}`);
  }
  assert.match(page, /腾讯财经即时报价\/五档盘口 \+ 东方财富搜索/);
  assert.match(page, /countdown.*自动刷新/);
});

test("ratings and decisions are actionable instead of abstract scores", () => {
  for (const label of ["买入", "持有", "卖出", "评级依据", "确认条件", "改判条件", "今日优先研究清单", "收盘复盘"]) {
    assert.ok(page.includes(label), `missing ${label}`);
  }
  assert.doesNotMatch(page, /市场广度.*bigScore|趋势评分/);
  assert.match(page, /实时五档盘口/);
});

test("daily picks refresh at nine and exclude STAR and Beijing markets", () => {
  for (const label of ["明日三股预测", "明日预测涨幅", "涨幅理由", "取消条件", "每天 09:00 更新一次"]) {
    assert.ok(page.includes(label), `missing ${label}`);
  }
  assert.match(page, /!\/\^688\//);
  assert.match(page, /!\/\^\[489\]\//);
});
