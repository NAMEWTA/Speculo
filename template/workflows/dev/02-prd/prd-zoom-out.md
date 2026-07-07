# Zoom Out Phase

## 输入

- 用户目标、已有 `context-map.md` 或 `decision-log.md`
- 相关代码区域、架构文档、ADR 和配置
- `02-prd.md` 中的 Zoom Out 内置指引

## 产物

- `speculo/.speculo/dev/<change>/overview.md`，由 `../_templates/overview-template.md` 填写

## 填写引导

1. 遵循 `02-prd.md` 的 Zoom Out 内置指引。
2. 用项目领域术语说明相关模块和调用者。
3. 标明现有行为、缺失能力、接口边界、上下游依赖和风险。
4. 输出服务于 PRD 综合的事实，不提前写实现步骤。

## 边界

- 不发布 issue。
- 不修改代码。
- 不创建 PRD；PRD 留到下一阶段。

## 完成准则

- `overview.md` 无残留 `[TODO:]`
- `.status.json` 已记录 `module_candidates`
