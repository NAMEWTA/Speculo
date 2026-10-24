---
id: project-maintenance
description: 用户手动触发的项目文档维护、知识沉淀与归档入口；按 docs、knowledge、archive 或明确组合任务形成一份计划，由原 owner 执行并返回回执。
---

# Project Maintenance

一次请求、一份计划和总报告。范围为 docs / knowledge / archive；根据用户明确目标选中，可组合。未指定范围时默认 docs 审计，不自动归档、更新永久知识或执行 Git 操作。

## 模式与范围

- `audit`（默认）：只读盘点，返回会话结果；零文件、Git 和 state 写入。
- `update`：执行用户要求且授权覆盖的维护；归档移动和永久知识更新须核对具体计划的批准。可保存新报告，不推进文档基线。
- `commit`：用户明确要求提交文档整理；只有 docs 分支可以提交获批目标并推进文档基线，不把知识或归档动作自动纳入 Git 提交。

同一具体批准由各层核对复用。全局分析范围不等于全局写权限；未知 owner、漂移或未闭合事务只阻塞重叠写集。普通开发任务不自动触发本命令。

## 执行

1. 从项目入口定位字面路径 `.agents/speculo/.speculo/workspace.json`，验证 roots 与项目身份。需要时读取 <Path>{roots.config}</Path>。缺 workspace 仅阻塞依赖它的 runtime 写入，独立审计与获批项目文档编辑继续；SpecDev 允许明确 projectRoot/methodRoot/stateRoot 的直接调用。
2. 固定请求范围、对象、输入节点和批准。docs 读取 <Path>{roots.commands}/project-maintenance/references/operation-contract.md</Path>；knowledge/archive 读取 <Path>{roots.commands}/project-maintenance/references/workflow-maintenance.md</Path>。组合任务完整取得各分支计划后，以实际目标路径合并重复动作，保留各项来源和唯一 writer；内容冲突先交原 owner 裁决。
3. SpecDev 知识和归档交 <Path>{roots.workflows}/specdev/specdev-a-archive-and-consolidate/SKILL.md</Path>；Learning 分别交 <Path>{roots.workflows}/learning/learning-c-consolidate/SKILL.md</Path> 与 <Path>{roots.workflows}/learning/learning-a-archive/SKILL.md</Path>。OPS、Person、Media 的通用归档返回 unsupported，不创建伪造归档流程。
4. 先执行获批当前文档和知识维护，逐项回读验证；然后执行相关对象的归档。必需维护失败时不移动依赖它的对象，独立授权分支继续。Command 不代写领域状态；Work 不再自行重复执行总计划中已由其他 owner 完成的相同目标，须核对原证据。
5. 非 audit 且需要保存时，唯一总报告为 <Path>{roots.state}/commands/project-maintenance/{date}-{scope}-{topic}[-NN].md</Path>；从 -01 选最小未用编号，原子写入、不覆盖。Work 返回逐项回执，总报告保留其 owner、来源、动作、结果与恢复 locator。无需持久化时不制造报告。
6. 仅 docs commit 使用 <Path>{roots.state}/commands/project-maintenance/state.json</Path> 和实际纳管领域的 <Path>{roots.state}/{workflow}/project-maintenance-docs.json</Path>。sidecar 由本命令拥有，不进入 workflow `_state`；仅完整完成的文档同步范围可推进基线。update 标记 not-committed；无实质变化返回 no-op，不制造提交。

## 完成与恢复

每个范围和目标都有结论，已授权动作完成并回读，未执行项有 owner 和恢复点，才返回 verified；否则返回 partial/blocked。不为知识或归档分支创建文档游标。恢复沿原总报告与实际领域回执，不因重复调用重新移动或发布。没有候选返回 no-candidates。

仅接受当前命令与状态协议；旧命令、旧 sidecar 或旧基线不自动读取、转换或移动。报告和状态路径不能落入方法资源目录。Git 提交不授权 push、tag、stash、历史改写或清理用户工作区。
