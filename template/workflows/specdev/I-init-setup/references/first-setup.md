# 首次配置与缺失骨架

只在配置或状态尚不存在时读取；已有文件先按入口验证，不重新初始化。

### 3. 询问不可发现偏好

仅在上下文未提供时询问：

- 交互语言与持久化工件语言；
- implementation subagent、集成尝试次数和 UI 设计候选上限（初始化时写入 config，Lead 不计入）；
- Deep Ticket 的迁移、发布和不可逆操作是否必须人工批准；

不询问可由仓库事实回答的文件位置、脚本名或默认分支。

### 4. 写入配置

以 `<Path>{roots.workflows}/specdev/I-init-setup/config-template.json</Path>` 为模板写入 `<Path>{roots.state}/specdev/config.json</Path>`。

要求：

- 字段满足 `<Path>{roots.workflows}/specdev/common/schemas/config.schema.json</Path>`；
- 验证命令来自仓库事实或显式用户决定；
- 未确认命令写 `null`，不得虚构；
- 不写入令牌、凭据、Cookie、个人隐私或敏感环境变量值；
- Ticket 的实现 commit 与本地 candidate integration 仍由具体 Goal Plan/I-implement 取得授权，不存为全局自动副作用开关。

### 5. 初始化目录与状态

创建或确认以下目录和文件：

- 以 `<Path>{roots.workflows}/specdev/I-init-setup/status-template.json</Path>` 生成 `<Path>{roots.state}/specdev/status.json</Path>`
- `<Path>{roots.state}/specdev/.config/</Path>`
- `<Path>{roots.state}/specdev/changes/</Path>`
- `<Path>{roots.state}/specdev/adr/</Path>`
- `<Path>{roots.state}/specdev/context/</Path>`
- `<Path>{roots.state}/specdev/research/</Path>`
- `<Path>{roots.state}/specdev/archive/</Path>`

若全局状态或 config 已存在，先检查各自 `schema_version`。版本未知、JSON 不可解析或状态与当前 workflow 契约不一致时，停止当前 Work；不得在 Work 内迁移、兼容或猜测旧状态。`speculo init` 只会对 `<Path>{roots.workflows}/specdev/runtime-contract.json</Path>` 已登记且存在显式 migrator 的旧版本升级，其他冲突会保留当前安装并报告具体 blocker。只有状态不存在时才从当前 schema 模板创建。

从模板生成：

- `<Path>{roots.workflows}/specdev/I-init-setup/tracking-template.md</Path>` → `<Path>{roots.state}/specdev/.config/tracking.md</Path>`
- `<Path>{roots.workflows}/specdev/I-init-setup/domain-layout-template.md</Path>` → `<Path>{roots.state}/specdev/.config/domain-layout.md</Path>`

已有永久知识不得被初始化过程清空。已有配置应先验证和展示差异，再按用户授权更新。
