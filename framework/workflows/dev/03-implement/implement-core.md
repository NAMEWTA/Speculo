# Implement Core — 实现规范

本阶段是把设计变成代码的执行手册。AI 在执行 `phase=plan` 与 `phase=execute` 时读本文件作为操作指引。

## 一、上下文与产物

- **输入**：同 change 下的 `design-arch.md` / `design-api.md` / `prd.md`；项目根 `../../../.speculo/.config/*`
- **产物**：
  - `plan.md`（Plan phase）— 任务拆分、关键路径、风险与依赖
  - `implement.md`（Execute phase）— 实现概要、关键改动说明、完成度检查
  - 可选 `tasks/T0N.md`（每个原子任务一份）+ `tasks/00-INDEX.md`（任务汇总）
- **角色红线**：本阶段**不修改 PRD / design 文档**；若实现中发现设计漏洞，停下回 `../02-design/` 修正后再继续

## 二、任务拆分原则

按以下顺序判断是否拆 `tasks/`：

1. 单文件、单函数级别的修改 → 不拆，直接进 Execute
2. 跨 ≥3 个文件 / 模块 → 拆，按**文件冲突**切（同文件归同任务），不按"层"切
3. 单次 fresh context 跑不完 → 必须拆，每个任务规模 ≤ 一次 verify 周期
4. 任务间存在显式依赖（数据库迁移先于业务代码）→ 拆并显式声明前置

### 任务字段（写入 `tasks/T0N.md`）

```markdown
# T0N · <任务标题>

- **状态**: pending / in-progress / completed / blocked
- **前置**: T01, T02（或"无"）
- **并行**: [P]（可与其他 [P] 任务并行）/ [S]（必须串行）
- **read_files**: src/foo/**, design-arch.md
- **write_files**: src/foo/bar.ts, src/foo/__tests__/bar.test.ts
- **verify**: <可执行命令，例如 `pnpm test src/foo/bar.test.ts`>

## 目标
<一段话说明本任务的可观察交付物>

## 步骤
1. ...
2. ...

## 验收
- [ ] verify 命令退出码 0
- [ ] 实际改动文件与 write_files 一致（`git diff --name-only HEAD`）
- [ ] 关联 AC：US-1 / EP-2 ...
```

## 三、反幻觉与反重复（写代码前必做）

- **grep 同类抽象**：写新代码前先 `grep -rn` 已有同名/同类实现；找到就 import 用，找不到才新建
- **grep 外部 API 字段名**：引用任何外部库 / 接口字段前，必须在文档或源码中验证存在
- **扫 LESSONS.md**：grep 本任务相关关键词，命中条目要在 `tasks/T0N.md` 显式声明"本次方案与历史失败的差异"

## 四、写代码红线

- 不悄悄扩大范围（写超出 `write_files` 范围的文件 = 范围蔓延）
- 不在同一次提交里混入多个无关任务
- 不通过删/弱化测试来"修复"失败
- 不声称"完成"而没跑过 verify 并贴出输出

## 五、提交节律

- 每完成一个任务一次原子提交（即使是 5 行改动）
- 重命名/移动 与 行为变更分开提交
- 测试基础设施改动 与 业务实现 分开提交
- 提交格式与可选 Trailer 字段见 `implement-checklist.md`

## 六、完成准则（机器可验证）

### Plan 阶段
- `plan.md` 含 `## 任务拆分` / `## 关键路径` / `## 风险与依赖` 三个标题
- `grep -c '\[TODO:' plan.md` = 0
- 若启用 tasks/：`tasks/00-INDEX.md` 存在，且与 `plan.md` 中任务列表一致；每个 `tasks/T0N.md` 含 `状态` / `read_files` / `write_files` / `verify` 字段

### Execute 阶段
- `implement.md` 含 `## 实现概要` / `## 关键改动说明` / `## 完成度检查` 三个标题
- `grep -c '\[TODO:' implement.md` = 0
- `verify_log` 数组写入 `.status.json`，长度 ≥ 已完成任务数
- 触发破坏性变更或 schema 变更时：`breaking_changes=true` 写入 `.status.json`，且 `implement.md` 含对应清单的勾选记录
