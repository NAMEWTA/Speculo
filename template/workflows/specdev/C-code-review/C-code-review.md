---
id: specdev/code-review
type: workflow-entry
workflow: specdev
name: 代码审查
description: 将 commit、branch、tag、merge-base 或 PR 解析为本地不可变固定点，执行隔离的标准轴与规范轴审查并持久化可恢复报告。
keywords: [code-review, review, diff, fixed-point, PR, 标准, 规范]
---

# 代码审查

> 激活本 Work 后，先读取 `<Path>{roots.workflows}/specdev/README.md</Path>`，再执行本入口。

C 是独立 review 入口，不实施修复。它拥有 `<Path>{roots.state}/specdev/changes/{change}/reviews/</Path>`；I 的最终审查由 I 写入 Evidence，不写本目录。

## 输入

- 用户提供的 commit、branch、tag、merge-base 或 PR locator；缺失时只询问固定点。
- 可选 source、Spec、Ticket、ADR 和 Goal Plan。
- 当前仓库代码、commit log 和编码标准。

## 流程

1. **解析固定点**：使用 `git rev-parse` 把固定点和 HEAD 固定为 SHA；PR 先通过 `<Path>{roots.skills}/github-npm-ops/SKILL.md</Path>` 的 `pr-read` 获得 base/head SHA，并确保对应对象可在本地解析。
2. **冻结输入**：记录 `git diff <fixed>...<head>` 和 `git log <fixed>..<head> --oneline`。引用无效或 diff 为空时失败，不创建报告。
3. **发现来源**：调用 `<Path>{roots.workflows}/specdev/common/skills/code-review/SKILL.md</Path>`；规范来源缺失时经确认跳过规范轴，标准轴继续。
4. **隔离审查**：平台支持时并行 reviewer，否则用两个独立完整输入包顺序执行。两轴不得读取对方 finding。
5. **持久化**：选择下一个未占用 `CR-###`，使用模板写入 `<Path>{roots.state}/specdev/changes/{change}/reviews/CR-###.md</Path>`，原子重读。
6. **验证与路由**：使用 `<Path>{roots.workflows}/specdev/common/tools/validate-specdev.mjs</Path>` 的 `--stage review` 校验当前 change。无阻塞 finding 时返回完成或 I；局部修复生成/修订 Ticket；规范冲突返回 S/G；无法确定的 blocker 保持 C 可恢复状态。

## 完成标准

- fixed point/head 是本地不可变 SHA，三点 diff 非空；
- 规范和标准来源发现顺序有记录；
- 两轴隔离、固定顺序、未合并排名；
- 每个 finding 有路径、风险、依据和满足条件；
- 报告、状态、验证结果和下一 Work 路径一致；
- C 未修改项目代码或远程状态。

## 子文件引用

- 公共审查 Skill：`<Path>{roots.workflows}/specdev/common/skills/code-review/SKILL.md</Path>`
- 报告模板：`<Path>{roots.workflows}/specdev/C-code-review/code-review-template.md</Path>`
- 报告 Schema：`<Path>{roots.workflows}/specdev/common/schemas/code-review.schema.json</Path>`
