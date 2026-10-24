# Workflow 文档范围与所有权

仅在全局盘点涉及 workflow 管理的项目文档、运行记录或知识时读取。发现入口为 `<Path>{roots.workflows}/{workflow}/SKILL.md</Path>` 与 manifest；需要确认写入 owner 时读取入口指向的相关运行合同，不激活整个 workflow。

## 发现与边界

包存在但 runtime 尚未初始化，或 state 孤立存在时，报告事实；只阻塞需要该状态的操作，继续项目文档整理。全局盘点不要求每个已安装 workflow 都有状态根或 sidecar。

项目文档可归全局或一个 workflow；路径重叠、父子目录交叉或 owner 冲突只阻塞重叠目标。范围从本次请求、实际文档归属与原网关确定，不依赖假定存在的 consumers 字段。

状态、changes 与 archive 保持原 workflow owner。历史归档只作证据，按主题/ID 定位相关产物；不重写归档或把当前事实反写历史。永久 RULES/policy、ADR、CONTEXT、DESIGN、research、synthesis 及其删除/冲突进入 propose-only，由原 workflow 网关取得相应批准并执行；project-maintenance 不因发现路径就取得知识写权限。明确 existing-only 的 store 始终只读。

OPS 资源运行记录按 OPS 文档交付合同处理；本命令不调用同名 OPS 恢复操作、不连接服务器或重跑业务，远端文档补交交给原 owning 入口。

## 跨领域当前 docs

<Path>{roots.state}/docs/</Path> 是面向 Agent 的当前工程事实，按实际主题归属维护，不注册为 SpecDev 永久知识 store。命令全局盘点包含其正文/导航与有独立历史价值的 archive（后者只读）；实际获批写入作为 project_targets 的项目相对精确路径管理，不为它创建虚假 workflow 或 sidecar。A/I 的局部维护与基线说明不写本命令游标。

## 可纳管目标

- project_targets：已确认由该 workflow 管理的项目相对文档路径。
- state_targets：仅原 workflow 明确允许 project-maintenance 维护的非知识文档，使用 workflow state 根相对路径；没有明确网关时只提建议。
- 每项为 `{ "path": "...", "kind": "file | directory" }`。directory 递归覆盖已跟踪的 Markdown/MDX/reStructuredText/AsciiDoc；其他格式或未跟踪文件单独列 file。
- 路径须规范化、真实包含于已解析根；拒绝绝对路径、反斜杠、`..`、无界 glob、项目根、`.git`、固定 status/changes/archive、sidecar 自身及 CLI-owned 状态。

## 延迟 sidecar v1

仅 commit 且确有已纳管目标时，按 [sidecar 模板](../assets/workflow-scope-template.json) 创建 `<Path>{roots.state}/{workflow}/project-maintenance-docs.json</Path>`。audit/update 不创建或更新。没有目标的 workflow 不为凑齐清单创建空文件；既有空 sidecar 原样保留，移除最后一个目标时允许将原文件清单清空，不自动删文件。

全局目标保存在 `<Path>{roots.state}/commands/project-maintenance/state.json</Path>`。新增、扩大或转移目标时展示实际范围变化并核对现有授权；只有未覆盖的范围或副作用补充确认，不逐次重新确认相同清单。合法变更增加 scope_revision 和 scope_confirmed_at；整个同步完成并提交后才生效。

完成标准：每个目标有唯一 owner 与合法写入边界；只有实际管理的 workflow 使用 sidecar；受保护候选已交回网关；局部缺失不阻塞无关整理。
