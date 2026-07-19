# 投资看板：实时智能投研平台

一个面向 A 股研究、热点跟踪和纸面交易复盘的联网投资看板。公开页面位于 `/investment-platform`。

在线访问：https://zhengheng-a-share-audit.nifty-eft-1349.chatgpt.site/investment-platform

## 已接通的数据能力

- 腾讯财经即时报价：A 股指数、个股、自选列表，交易时段分钟级刷新。
- 东方财富中文搜索：按股票名称或代码即时搜索。
- 东方财富前复权日线：最近 120 个交易日，按交易日更新。
- 商业热点雷达：用八个产业主题股票篮子的当日强度、上涨覆盖率和分化风险自动排序。
- 个股研究：MA5/20/60、20/60 日收益、近 60 日波动率、趋势评分和证据分层。
- 本地自选与研究记录：仅保存在当前浏览器，不上传个人持仓。

所有研究陈述标记为 `FACT`、`INFERENCE` 或 `UNKNOWN`。系统只支持研究、回测和纸面交易，不连接券商、不自动下单。

## 本地运行

```powershell
npm install
npm run dev
```

打开 `http://localhost:3000/investment-platform`。

## 验证

```powershell
npm test
python -m unittest discover -s tests -v
```

## 数据边界

腾讯财经与东方财富接口不是交易所法定披露源，也没有稳定性 SLA。页面会显示行情时间和数据源状态；接口失败时显示 `UNKNOWN`，不会用固定旧日期冒充最新数据。投资决策前应核对交易所公告、公司法定披露和券商行情。
