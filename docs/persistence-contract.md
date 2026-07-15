# Speculo Persistence Contract

## Root Resolution

1. 从当前工作目录向上寻找 `speculo/.speculo/workspace.json`。
2. 第一个命中的目录是 `project_root`；同时命中多个候选或用户指定目录不一致时停止并澄清。
3. `workspace.json#path_base` 必须为 `project-root`；所有 root aliases 使用 POSIX 项目相对路径。

## Workflow Runtime Contract

- 每个 workflow 以同级 `PERSISTENCE.md` 作为唯一运行契约，声明 `<runtime-context>`、`<persistence>`、change 启动、workflow 级状态和副作用边界。
- `WORKFLOW.md` 与每个 atomic wrapper 的第一阶段必须强制读取该文件；不得复制契约。
- 固定 stores：`status.json`（index）、`changes/`（active）、`archive/`（archive）。
- Lazy stores（knowledge、policy、integrations、backlog）只在内容产生并确认归属时创建；existing-only store 永远只读。
- Atomic wrapper 可从自身路径与 `workspace.json` 独立启动，不依赖先运行 `WORKFLOW.md`。

## Change And Artifact Boundaries

- workflow 与 direct atomic 调用使用相同的 change 选择/创建协议；多个 active 候选或多个 workspace 候选必须先消歧。
- route artifact 指针优先。direct 调用没有 route 指针时，目标 skill 可在 current change 内自行新建路径，不添加强制的 atomic 子目录。
- Skill 只使用调用方提供且已完成边界校验的路径，不自行选择持久化根。
- 项目代码、测试和用户要求的项目文档不是 Speculo 运行状态；运行证据保存项目相对指针。
- 长期知识先在 change 中形成，经确认后写入声明 namespace；临时原型、脚本和报告删除或吸收后只保留结论。
- Direct atomic 调用只更新 `skill_history` 与必要的 `external_refs`，不伪造 route 状态。
- Raw vendor SKILL 只由其一对一 atomic wrapper 激活；嵌套 skill 名称继续解析到 wrapper，因而继承相同运行契约。

## Commands And Sidecars

- Command 报告：`speculo/.speculo/commands/<command>/<YYYY-MM-DD>-<scope>-<topic>[-NN].md`。
- Command state：`speculo/.speculo/commands/<command>/state.json`。
- `docs-sync.json` 由 docs-sync command 延迟创建于 `speculo/.speculo/<workflow>/docs-sync.json`，不属于 `_state/` 骨架。

## Compatibility And Migration

- 已有 schema version 1 change 缺失可选 history 数组时按空数组读取，并在真实更新时补齐；不为本契约变更运行 state migration。
- v2/transitional-v3 migration 仍采用 plan → dry-run → staged apply → rollback-safe rename。
