# 全局文档整理

仅在用户手动调用 project-maintenance 或明确要求全局文档整理时使用。调用方拥有 mode、授权、报告和 Git/state；本合同不创建独立 Skill 状态。

## 模式与输入

| Mode | 选择依据 | 允许效果 |
|---|---|---|
| audit | 检查/审查请求，或未授权修改 | 只读盘点，结果在会话返回；无文件、checkpoint、sidecar、暂存或提交 |
| update | 用户要求整理或修改文档 | 写获批文档与可选报告；不推进游标、同步计数或 workflow sidecar |
| commit | 用户明确要求提交整理结果 | 更新并提交本次目标；仅此模式读取 [Git/state 合同](git-state-contract.md) |

冻结项目身份、HEAD、可用的上次同步节点或用户指定范围；缺少基线时标记 bootstrap，不虚构 SHA。盘点 staged/unstaged/untracked 的路径、内容和归属，将未提交 overlay 与已提交事实分开。非 Git 项目仍可 audit/update，commit 需要可验证的 Git 输入。未知历史或状态只阻塞依赖它的提交/游标，不阻塞独立文档审查。

## 1. 完整盘点

枚举项目自有的 Markdown、MDX、reStructuredText、AsciiDoc、AGENTS/CLAUDE、项目 Skills/Command/Work 入口和其文档 references；包括 Git 跟踪文件及可确认归属的未跟踪文档。显式指定的其他文档格式也纳入。记录生成物、第三方原件、缓存、历史归档、机密或 owner 未明路径的排除/只读理由，不将它们静默遗漏或当作可写源。

Git diff 用于定位变化线索，不能把全局清单缩成差量文件清单。已保存的 targets 是归属和管理记录，不限制本次发现。目录列表、manifest、入口引用和现有文档互相校对；新增的明显缺口也进入清单。全局分析不激活 workflow，不默认整读运行时知识树或归档历史。涉及 workflow 的文档/知识时才读 [workflow 范围](workflow-scope-contract.md)。

<Path>{roots.state}/docs/</Path> 中存在的当前工程正文与导航纳入全局清单；按主题 owner 判断，它不属于 SpecDev 独占知识。与项目既有 docs 重复时确定唯一正文，其余导航；不把目录存在当作可写授权。缺失不创建空骨架，也不触发全面基线。

## 2. 事实与处置

对清单中的每份当前自有文档整份审查，局部事实修订直接使用 <Path>{roots.references}/writing-for-agents/references/current-facts-docs.md</Path>；同一源在摘要未变化时可复用。源码、配置、schema、测试、CI、发布元数据和已验证证据支撑结论，commit 标题仅作导航。为每个目标记录唯一处置：

- `keep`：事实、用途与边界仍有效。
- `update`：修正失效、不完整或相互冲突的陈述。
- `add`：已实现事实没有合适承载位置。
- `merge`：归并重复权威，保留独有理由、证据和来源，修复所有调用方。
- `delete`：已失效且无保留义务的候选；整文件/目录删除须有具体授权。
- `propose-only`：范围、语义、owner 或权限待确认，受保护知识交回原网关。

处置动作与执行状态分别记录；audit 的动作均为建议。update/commit 可以修剪授权文档内的过期段落、坏链接和重复说明，不只在末尾追加新事实。合并后需删除原文件时同样核对删除授权。历史 ADR、已发布记录和原始研究不按当前实现反写。

## 3. 按类型整理

- README：读 [README 合同](readme-contract.md)。
- CHANGELOG：读 [CHANGELOG 合同](changelog-contract.md)。
- AGENTS/CLAUDE：读 [手册合同](agents-contract.md)；手册缺失、作用域变化或用户要求重建时才展开重建分支。
- Skill、Command、Work 或其他 Agent 文档：结构、行为、迁移或所有权变化时读 `<Path>{roots.references}/writing-for-agents/writing-contract.md</Path>`，并读取目标资产自己的合同；普通事实修正核对局部源即可。

语言统一：README.md 为英文，README-ZH.md 为中文镜像；其他项目文档默认简体中文，CHANGELOG 沿用既有语言。用户明确的项目语言要求优先。代码实体、URL、命令、版本和固定字段不翻译；语言镜像的事实与约束保持对等。

## 4. 写入与验证

先完成可审查的具体方案；已有请求覆盖的常规编辑直接执行，不额外索要逐文件确认。执行前核对目标身份、内容摘要与 owner；漂移、路径逃逸或链接归属未知只阻塞受影响写集。保护未提交用户内容；以保留链接、模式和必要元数据的方式更新真实源，原子替换普通文件并重读结果。

验证随实际变化选择：

- 文字/事实：格式、链接及命令/路径/版本/配置键对照；可运行的示例做相关验证，无法执行时标记未验证。
- 指令/路由：元数据、引用、正常与近邻不触发、授权和完成边界。
- 状态/副作用：相关隔离夹具，覆盖漂移、冲突、失败和恢复。
- 生成依赖：由源重建并验证重复生成一致；不手改生成物。

仅在变化会影响构建、测试或发布行为时运行对应 build/test/lint；项目明确要求的适用验证仍须通过。重命名/删除时搜索旧引用，其他编辑不机械全仓搜索每个旧措辞。

## 5. 返回与完成

按 [报告模板](../assets/report-template.md) 返回覆盖清单、事实证据、唯一处置及实际状态、授权、输入与未提交限制、命令/退出码和未完成项。audit 只返回会话报告；update 标记 not-committed；commit 再按 Git/state 合同回读提交与游标。

所有纳入清单的目标均有结论且获批动作已验证，才完成相应范围。`propose-only` 候选是已完成分析，不冒充已执行；任何必需写入或验证仍 blocked 时，不推进整个同步游标。继续独立且已授权的工作，最后明确部分完成和恢复路径。
