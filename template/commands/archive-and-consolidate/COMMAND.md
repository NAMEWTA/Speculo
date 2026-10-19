---
id: archive-and-consolidate
description: 将用户选择的归档或知识整理请求交给 owning workflow Work，并返回其计划与执行回执。
---

# Archive and Consolidate

本命令只拥有目标选择、授权核对与调用报告；归档、知识和领域状态由对应 Work 拥有。不以一个通用移动流程代替领域合同。

## 定位与路由

1. 从当前目录向上定位字面路径 `.agents/speculo/.speculo/workspace.json`，唯一确定 project_root，验证当前 schema、path_base 与 roots；之后才通过现有 resolver 将 alias 解析为绝对路径。用户明确项目根与发现结果不一致时先消歧；无效 workspace 不猜测或初始化。SpecDev 无安装时可传明确 projectRoot/methodRoot/stateRoot，由其根合同验证；其他领域保持原安装/状态语义，缺失仅阻塞依赖的操作。配置 `<Path>{roots.config}</Path>` 缺失可使用领域默认值，并在回执说明，不降低授权要求。
2. 从用户请求和领域 `<Path>{roots.workflows}/{workflow}/SKILL.md</Path>`、manifest 定位真实 Work。已明确的目标和模式直接复用；只有多个合理候选或意图冲突才消歧。
3. SpecDev 交给 `<Path>{roots.workflows}/specdev/specdev-a-archive-and-consolidate/SKILL.md</Path>`，传入经验证的新根上下文、指定 change/知识主题、dry-run/confirmed 和已批准动作；Work 自己维护完成门、知识网关及恢复。
4. Learning 按请求交给 `<Path>{roots.workflows}/learning/learning-c-consolidate/SKILL.md</Path>` 或 `<Path>{roots.workflows}/learning/learning-a-archive/SKILL.md</Path>`。C 拥有递归 source/parent lock、relocation 与 synthesis；A 只归档用户 close/confirm 的 root 树，按最新源更新时间选月份，不要求 Homework、R 或 mastery。冷归档树要先经明确恢复才能移动。
5. OPS、Person、Media 当前没有归档 Work，返回 `unsupported` 和真实入口，不创建或移动通用 change archive。无候选返回 `no-candidates`，不自动启动代码访谈。

## OPS 资源运行记录

OPS 的 host/project/deployment/run 是资源账本，不套用 change 归档。读取 `<Path>{roots.workflows}/ops/SKILL.md</Path>` 定位原资源入口；冷备份证据需独立明确范围并保留哈希和引用，本命令不删除账本、不移动主机/APP 数据、不代写 OPS 状态。

## 授权与报告

先取得 Work 具体计划，统一展示目标、移动/提升/清理动作、输入摘要和恢复边界。同一具体批准由本命令与 Work 核对并复用，不逐层重复确认；新增动作、范围或摘要漂移只阻塞受影响执行。笼统“完成后整理”不替代尚未确定的删除/永久知识计划。

规范报告是 `<Path>{roots.state}/commands/archive-and-consolidate/{date}-{scope}-{topic}[-NN].md</Path>`：scope 为 workflow，topic 为 change 或 batch；从 -01 选最小未用编号，原子写入，不覆盖旧报告。`path_context.commands_root` 必须等于解析后的 `{roots.state}/commands`；报告不写 `{roots.commands}` 或 workflow 私有目录。错误报告路径只阻塞该持久化，不把历史误落盘文件搬迁作为本次无关操作的前置门。

纯 dry-run 在会话返回，零文件写入；用户要求保存计划或已授权执行时，由 Command 保存调用报告，Work 返回结构化回执。报告包括选择、具体授权、输入摘要、relocation/archive locator、知识结果、验证和部分失败恢复点。涉及 DESIGN 时保留 plan/current/candidate 摘要、批准来源、revision 与发布检查点。Command 不成为知识 writer。

完成标准：选定 Work 或明确无候选/不支持；结果符合授权；应执行的领域动作与回读已完成，部分失败如实列出；文件报告只有规范路径。直接调用 Work 不要求创建 Command 报告。
