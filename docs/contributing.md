# 贡献指南

## 开发与验证

使用 `package.json` 声明的 Node.js 和 pnpm：

```bash
pnpm install --frozen-lockfile
pnpm check
pnpm verify-bin
pnpm verify-package
```

`pnpm check` 编译、运行隔离测试并检查分发入口与相对链接。`verify-package` 创建真实 tarball，在独立项目安装领域、Work 和全部 Hub，验证两个宿主、刷新、移除与用户数据保留。依赖来自配置的 registry 或缓存。

修改视频渲染器时，按 [制作与验证说明](../template/workflows/media/media-v-video/references/production.md) 准备可选依赖，运行 `python template/workflows/media/media-v-video/scripts/verify_render.py`。CI 在独立 Ubuntu 任务中实际生成 PNG 和有声、无声 MP4，并独立解码检查；通常的 CLI 使用不需要这些媒体依赖。`--inputs-only` 只验证输入，不代表渲染通过。

本地试用使用可丢弃项目：

```bash
pnpm build
node dist/src/cli.js init /path/to/disposable-project --workflows specdev --skill-targets agents --skills domain/specdev,specdev/prototype
node dist/src/cli.js doctor /path/to/disposable-project
```

## 修改 Workflow、Work、Skill 与 Command

先读取 [作者入口](../.agents/skills/speculo-author/SKILL.md) 中与任务相关的指南。领域入口负责路由；Work 保留具体任务方法；Hub 可以带真实工具；命令表达一次明确请求。

重构前识别原内容提供的能力、专业判断、真实资料和执行工具。每项要么在新位置承接，要么说明明确的退役理由。不要用“文件更少”或“模型更强”代替这一步。重要参考资料按需读取，不需要为了缩短根文件把资料本身删除。

直接编辑当前权威文件；不再修改 manifest、业务 schema 或生成 Canonical。用标准 name/description 说明准确触发条件。正文按照任务组织必要方法、分支和完成结果；一份文件足够就不拆，独立或较大的资料通过明确用途的链接访问。

专业原文、历史研究快照和来源素材保持其身份。改写的是如何使用它们的说明；不要把历史结论伪装成今天的事实。复制或改编来源保留许可，更新 [第三方说明](../THIRD-PARTY-NOTICES.md)。

## 持久化和代码边界

使用者的记录属于项目，不能写回包管理的方法目录。优先更新已有事实来源，当前知识与历史归档分开。普通文字记录不需要机器状态文件。

CLI 的路径、文件归属、事务和恢复仍由确定性代码保护。重构这些机制要覆盖真实失败与恢复行为。Work 工具若发生逻辑变化，也需要运行实际输出检查；仅测试文本中有某段话不能证明其能力。

## 怎样审查方法改动

用具体任务检验关键差异。例如让原型 Work 保留批准页面结构，让交付 Work 区分技术检查与用户验收，让问答 Work 根据用户请求直接授课或探究。记录实际产物、观察与缺口；不把一次成功试用宣传为所有模型和场景都已通过。

[重构对应表](refactor-map.md) 是这次大改的人工审阅材料，不是每个未来小修改都必须填写的模板。普通修正只做与风险相关的验证。

## 提交与发布

PR 说明原问题、行为变化、能力承接、实际检查和剩余限制。公共 ID 或工具接口变化更新 [升级说明](upgrade-v3.md)。`v*` tag 触发已有暂存 npm 发布流程，维护者在 npm 完成对应确认后才公开；普通 PR 不创建 tag 或发布。
