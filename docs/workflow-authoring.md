# Speculo Workflow Authoring Contract

## Prerequisites

编写 workflow 前必须读取：
- [AGENTS.md](../AGENTS.md) — 代理手册
- [persistence-contract.md](./persistence-contract.md) — 持久化边界
- [.agents/skills/_shared/authoring-quality.md](../.agents/skills/_shared/authoring-quality.md) — 质量模型

## Package Structure

```text
workflows/<workflow>/
  WORKFLOW.md          # 组合入口与 route/atomic catalog
  PERSISTENCE.md       # 唯一运行契约
  routes/              # 可选组合 route
  atomic-skills/       # 可选；一对一 SKILL wrapper
  _state/              # status.json, changes/, archive/（必需）
```

只有 workflow 存在真实 SKILL 依赖时才创建 `atomic-skills/`；不要为空 package 添加占位目录或 README。

## PERSISTENCE.md

- 独占 `<runtime-context>`、`<persistence>`、workflow 级状态字段、change 启动和副作用边界；其他文件只建立上下文指针。
- workflow/state roots 必须分别解析到 `speculo/workflows/<workflow>` 与 `speculo/.speculo/<workflow>`。
- 固定 stores 为 `status.json`、`changes/`、`archive/`；其他 namespace 声明 lazy 或 existing-only 语义。
- direct 调用与 workflow 调用使用同一 change 选择/创建协议。没有 route artifact 时只强制 current change 根，不强制统一子目录。
- 项目产物、长期 namespace、临时产物和外部副作用必须有明确分界与可恢复记录。

## WORKFLOW.md

- 保留 workflow frontmatter、组合 `<routes>`、可选 `<atomic-skills>`、依赖和流程转移。
- 唯一顶层 `<sequence>` 的第一阶段必须是 `id="load-persistence" order="1"`，且包含 `<instructions root="workflow" path="PERSISTENCE.md" activation="required" />`。
- 不得复制 `<runtime-context>` 或 `<persistence>`。
- route 组合只引用 atomic wrapper；除 `PERSISTENCE.md` 的 bootstrap 外，不直接引用 raw `<skill>`。

## Atomic Skill Wrappers

- `atomic-skills/<id>.md` frontmatter 固定为 `id/type/workflow/name/description/stability/invocation`；id 与文件名一致。
- wrapper 只有两个连续 phase：先强制加载 `PERSISTENCE.md`，再以 `activation="adapted"` 调用恰好一个现存 `SKILL.md`。
- 同一 raw target 只能有一个 wrapper；catalog 与目录必须一一对应，按 id 词法排序并使用连续 order。
- `stability` 与 vendor 分类一致；raw `disable-model-invocation` 和 experimental 能力保持 `user-only`。
- `<atomic-skills source-root="..." coverage="complete">` 要求覆盖该 root 下全部 `SKILL.md`。
- raw skill 内的后续 `/skill` 调用继续解析到同 workflow 的 wrapper；vendor 原文保持不变。

## Validation Rules

- 无绝对路径、反斜杠、`..`、裸 id、`src` 或未声明 state namespace。
- 所有静态引用使用 `root + path` 并解析到真实文件。
- runtime/persistence 只出现于 `PERSISTENCE.md`；WORKFLOW 和 wrapper 都以第一阶段强制读取它。
- `_state/` 必须包含 `status.json`、`changes/`、`archive/`。
- `docs-sync.json` 是 command 拥有的延迟 sidecar，不得放入 `_state/`。
