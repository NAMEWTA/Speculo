---
name: retrospective
description: Analyze a development session or Speculo usage feedback when asked for a retrospective; return evidence, root causes, and improvement proposals to the caller, without executing fixes or remote operations.
metadata: {"speculo-id": "retrospective", "speculo-kind": "skill", "speculo-legacy-name": "Speculo Retro"}
---

# Retrospective

## 输入

- 当前会话、开发活动及调用方明确关联的 change/commands/workflows。
- `commands/<command>/*.md` 报告、active change 状态、archive 和 `INDEX.md` 声明的知识 store。
- 可选已有 issues，用于语义去重。

## 流程

1. 按本次 scope 和来源 ID 定位相关证据，再读取 [ friction-taxonomy.md ](references/friction-taxonomy.md)；穷尽当前范围内的已定位摩擦，不全量读取 archive/知识库。完成标准：每项都有来源路径或对话节点。
2. 按 bug、friction、missing-capability、doc-gap、ergonomics 归类，合并同一根因。完成标准：每项只属于一个根因簇，合并关系可追溯。
3. 按下方修复方向分类，再评估影响与频率，过滤一次性噪声；低信号项标为丢弃或仅记教训。完成标准：每项都有优先级和处置理由。
4. 读取 [ issue-drafting-sop.md ](references/issue-drafting-sop.md)，生成 issue-ready 提案并与已有 issue 去重。完成标准：标题、证据、问题、建议、验收、影响资产和去重结论齐全。

## 输出

- 按优先级排序的 `file-issue | lesson-only | discard | duplicate | insufficient-evidence | no-findings` 结果，不强行制造 Issue。
- 合并/丢弃说明和调用方执行 `gh` 所需字段。

本 skill 不写文件、不调用外部 API；调用方 command/Work 负责持久化、授权和后续路由。

## 修复方向：先减少未来重复指令

每个根因簇保留原 issue type，同时选择一个 remediation_axis；这不是新的远程标签或状态机。

| remediation_axis | 首选提案与验收 |
|---|---|
| code-defect | 最小复现/回归测试与局部修复，证明目标症状红→绿 |
| deterministic-check-gap | lint、validator、pre-commit 或 CI 中可判定断言，至少一个通过与一个拒绝样本 |
| context-pointer | 修正触发、owner、失效路径或条件引用；验证应触发与近邻不触发 |
| judgment-rule | 仅保留不能由机械检查替代的真实判断、权衡与边界，注明反例 |
| environment-discovery | 修复命令/工具/配置的可发现性或环境反馈，避免文档缓存简单可查询事实 |

检查缺口优先提到测试/工具，不再把同一禁令复制到多个 Work。没有因果证据时标为假设并给验证方法；删除指令的提案必须附运行对照方案，不把“模型应该会”当作删除证据。

只提出建议，不直接改 AGENTS/全局提示词、永久知识或项目代码，不创建远程 Issue；调用方的报告、确认与目标仓库边界保持。
