import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the investment research dashboard", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /<title>证衡研究台/);
  assert.match(html, /市场概览/);
  assert.match(html, /持仓台账/);
  assert.match(html, /研究工作台/);
  assert.match(html, /回测实验/);
  assert.match(html, /审计记录/);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton|Your site is taking shape/);
});

test("dashboard preserves evidence labels and execution boundary", async () => {
  const source = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.match(source, /FACT/);
  assert.match(source, /INFERENCE/);
  assert.match(source, /UNKNOWN/);
  assert.match(source, /建议股数/);
  assert.match(source, /计划最大亏损/);
  assert.match(source, /不连接券商/);
  assert.match(source, /禁止自动下单/);
});
