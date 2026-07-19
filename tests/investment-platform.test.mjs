import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const page = fs.readFileSync(path.join(root, "app", "investment-platform", "page.tsx"), "utf8");
const css = fs.readFileSync(path.join(root, "app", "investment-platform", "platform.module.css"), "utf8");

test("the video-based platform is isolated on its own route", () => {
  assert.match(page, /投资看板/);
  assert.match(page, /产业瓶颈研究/);
  assert.match(page, /不连接券商、不自动下单/);
  assert.doesNotMatch(page, /A股中长期交易研究与审计系统_Codex最终框架/);
});

test("all eight video navigation sections are present", () => {
  for (const label of ["市场概览", "持仓概览", "策略评分", "交易记录", "市场筛选", "策略研究", "个股研究", "产业瓶颈研究"]) {
    assert.ok(page.includes(label), `missing ${label}`);
  }
});

test("research content carries evidence labels and responsive styles", () => {
  for (const label of ["FACT", "INFERENCE", "UNKNOWN"]) assert.ok(page.includes(label));
  assert.match(css, /@media\(max-width:580px\)/);
});
