# 发布预检

读取 <Path>{roots.workflows}/specdev/T-triage/triage-run-template.md</Path>，创建或恢复 T 拥有的独立操作记录。预检只读远程与项目事实，不自动修复环境。记录：

1. repo、发布分支/渠道、工作区状态、明确的目标 commit SHA、版本、tag；以项目声明为准，无法确定时停止。
2. package.json、workspace/lockfile、engines 完整版本范围、packageManager、包集合、registry、access、dist-tag；不能把所有版本限制解释为大于等于。
3. 实际 workflow 路径、trigger、复用 workflow 和调用脚本。npm_target 必须为 required/not-required/unknown；grep 仅作定位，包装脚本或表达式不明时为 unknown 并阻塞 release。
4. 每个包的目标版本与 registry 是否已有版本，tag 是否存在且指向预期 SHA。冲突先恢复/更换版本，不建议删除远程 tag。
5. gh 身份和所需的具体权限，发布认证按 <Path>{roots.workflows}/specdev/T-triage/references/release-authentication.md</Path>；不要求无关管理员权限，不保存凭据。
6. 项目声明的 test/typecheck/lint/build/bin/pack 等闸门与证据、CHANGELOG 版本内容、预期 Release 正文。缺失基础设施交 I；按需参考 <Path>{roots.workflows}/specdev/T-triage/references/workflow-yaml-reference.md</Path>，不在预检中安装。
7. 需要文档同步时，由 <Path>{roots.commands}/docs-sync.md</Path> 处理其 state、bootstrap 和范围；T 不改 sidecar。

完成条件：记录中的 targets 数组及 Targets 正文列出每个包、registry、版本、dist-tag 与发布判定，Evidence 引用固定 SHA 的检查；unknown/冲突保留 blocked。预检通过并不授权 commit/push/tag/发布。
