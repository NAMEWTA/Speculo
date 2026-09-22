# AI 代理手册同步契约

本契约用于差量维护或重建已确认范围内的 `AGENTS.md`、`CLAUDE.md` 和工具专属入口。调用方传入 `handbook_mode=incremental|rebuild`；默认使用 `incremental`，仅在用户显式要求、手册缺失或 manifest 拓扑变化时进入 `rebuild`。

调用方的 `mode=audit|update|commit` 控制实际效果；以下“生成/修改/修复”在 audit 中只表示候选报告，不产生写入。在 update 中不写游标、不提交。handbook_mode 仅控制分析/构建方式，不升级动作授权。

## 分支路由

### Incremental

读取当前手册、Git 输入区间和直接事实源，逐段执行下方内容优先级、生命周期和验证规则。不重新分类未受影响目录，也不加载重建模板。

**完成标准**：所有被 Git 区间或当前事实命中的手册均已整份审计，未命中手册保持不变。

### Rebuild

按顺序读取：

1. `agents/manifest-discovery.md`，发现 manifest、忽略目录、父子树和孤立手册；
2. `agents/role-classification.md`，为每个目录判定唯一角色；
3. `agents/evidence-collection.md`，为每个输出结论收集真实文件证据；
4. `agents/content-contract.md`、`agents/writing-style.md` 和对应 `agents/templates/*`，自底向上生成 AGENTS.md；
5. `agents/claude-redirect.md`，生成或修复同层 CLAUDE.md。

展示创建、更新和删除候选；整文件删除或把多行 CLAUDE.md 改成重定向前取得明确确认。

**完成标准**：扫描范围内每个合法目录恰好一个 AGENTS.md，需该适配的目录有唯一 CLAUDE.md 重定向（不强迫所有宿主增加无用手册），父子 routing 完整，所有处置均有证据和确认状态。

## 内容优先级

1. 代理无法可靠推导的事实：精确命令、目录职责、运行时版本、架构边界和权威文档入口。
2. 基于真实失败的回归约束：危险目录、持久化规则、发布门禁和已验证陷阱。
3. 项目独有行为规范：只有默认模型或工具无法给出时保留。

删除角色扮演、营销语、linter 已强制的规则、README 教程、完整 API 文档、无证据理想规范和“注意代码质量”类空话。

## 生命周期

- 命令、版本、目录、入口、测试、发布或持久化事实变化时，修改或删除对应陈述。
- 陷阱已被代码或工具消除时删除；同一错误尚未真实发生时不预先堆规则。
- 每行执行删除测试：“删除后是否会使代理更可能犯错？”答案为否就删除或改为权威链接。
- 根手册以紧凑项目事实为目标，行数仅作诊断信号，不是强制删改门。每次必读的简短规则保留，分支细则按明确条件下沉；用实际读取与行为验证决定拆分，不以行数牺牲安全或必要上下文。
- 使用明确条件和祈使句；安全边界可使用“禁止/不得”，不要把所有偏好写成铁律。

## AGENTS 与 CLAUDE

- `AGENTS.md` 是唯一的权威代理手册；`CLAUDE.md` 只能是轻量重定向，内容固定为：

  ```
  # CLAUDE.md

  Speculo agent handbook: see [AGENTS.md](./AGENTS.md).
  ```

- 所有代理指令、事实和规则写入 `AGENTS.md`，不把 `CLAUDE.md` 当作权威内容载体。
- 现有多行 `CLAUDE.md` 只在用户确认迁移后改写为重定向，原内容全量迁移到 `AGENTS.md`；普通同步默认保留。宿主专属语法由适配层承担，不宣称普通 Markdown 链接自动导入适用于全部宿主。
- `AGENTS.md` 不应被缩减为指向 `CLAUDE.md` 的重定向；audit 报告问题，只有获准 update/commit 才修复。
- Monorepo 使用就近手册覆盖；父级只导航，不复制子模块细节。

## 验证

- 命令可执行，路径和版本来自当前 manifest/源码，目录树与实际结构一致。
- 每项禁止或必须都能指向代码无法表达的边界或真实回归。
- README、CONTRIBUTING、AGENTS 和工具入口之间没有互相复制或冲突。
- 工具专属入口可以到达唯一权威事实源，站内链接无断链。

完成标准：代理手册保持高密度、可执行和当前；共享事实只有一个权威位置，工具专属差异没有丢失。
