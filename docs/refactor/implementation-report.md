# Speculo 2 实施与验证记录

## 范围

基线为 `fc8721afe92829a2e66d934e564a23123716595f`（1.0.24），当前源码版本为 2.0.0。本次按用户后续确认的产品边界实施：提示词、方法和确定性业务工具；协调采用 Lead、Orca、Herdr 或用户指定 CLI 的当前工具指南。没有新增模型 runner、沙箱、编排服务或 Run 状态机。

## 已完成的结构调整

- 5 个领域入口、38 个 Work 统一为标准 Skill；10 个 Command 使用独立目录与 COMMAND.md。完整业务能力见 [能力表](../capabilities.md)。
- 标准 YAML 由共享解析器验证；领域与 Work 的投影保持原始 YAML。Command 包装分别采用 Agents 与 Claude 的显式调用政策。
- 安装根为 `.agents/speculo/`，可选择两个宿主的曝光范围。第三方冲突、投影漂移和只读节点保留原件，警告仅影响相关资产。
- workspace v2、install v4、managed/projection v2、安装事务 v3；旧安装和旧结构化版本拒绝处理，不移动或转换用户数据。
- SpecDev config/Goal Plan v7、Implementation Plan v2，Lead 自行实现计入并发；current workspace 单 writer。业务进度继续写原 Goal、Ticket、Evidence。
- 生成 12 份 canonical、5 份领域路由及便携运行库；安装后的验证器不依赖仓库脚本或开发依赖。
- 同步维护者技能、根文档、领域文档、测试与 CI。CI 覆盖 Windows/Linux/macOS × Node 22.22.3/24；发布流程增加 tarball 隔离验证。
- 删除过时迁移说明、一次性执行包/工作流与历史实现报告；保留来源清单、许可和真实业务证据。没有提交、推送或发布。

## 代码与文档落点

| 范围 | 实施内容 |
|---|---|
| `src/assets.ts`、`paths.ts`、`coordination.ts` | 严格 YAML 1.2、统一资产注册、固定 workspace roots、安全路径与项目协调选择验证 |
| `src/agent-skills.ts`、`agent-files.ts` | 两个宿主独立选择、原样 YAML 投影、显式 Command 包装、受管手册块与逐资产冲突处理 |
| `src/refresh.ts`、`structured.ts` | 当前 schema 校验、配置三方合并、用户 runtime 原字节保留、追加并保留备份 |
| `src/transaction.ts`、`doctor.ts`、CLI | staging、原子切换、外部文件回滚、精确事务 ID 恢复、只读完整性诊断 |
| `template/workflows/` | 五领域的 38 个 Work、分支引用、schema、工具及状态骨架同步；保留实际业务产物名称 |
| `template/commands/`、`template/references/` | 十个命令目录；共享协调、复盘和面向 Agent 写作方法的单一权威 |
| `scripts/`、`test/` | 统一生成与校验、投影冲突和恢复回归、真实包安装、重复生成和逐文件处置审计 |
| `docs/`、根文档、`.agents/skills/` | 当前安装及架构说明、完整能力表、恢复操作、维护者写作合同和生成物所有权 |
| `.github/`、包配置 | 2.0.0 版本边界、三平台双 Node CI、发布前真实 tarball 验证 |

完整路径和文件去向以处置清单为准，上表说明各部分的职责。

## 行为变化

1. 安装只接受新布局和当前 schema。旧安装、旧事务及不支持的状态版本停止对应操作，保留用户原件；不提供旧路径双读、自动迁移或安装兼容映射。
2. 首次非交互安装默认仅安装 core；领域和两宿主曝光分别显式选择。刷新默认保留既有选择，未选领域不会被隐式卸载。
3. 投影冲突以资产为单位报告；第三方目录、人工改动、大小写冲突、hardlink、symlink 和只读文件不会被强行接管。核心刷新和无冲突资产可以继续。
4. 协调配置可选且仅保存项目选择。Lead、Orca、Herdr、CLI 遵循同一方法与证据合同；工具不可用、权限缺失或 writer 未确认释放时只阻塞相关分支。已有 Goal/Ticket/Evidence 继续承载业务事实。
5. Lead 自行实现计入并发；在已授权 Goal 内连续实施、验证、修复和收口。工具任务完成、会话存活与写权限释放分别判断。
6. Learning 的工件所有权、路径、掌握与主题组织合同补齐条件引用；Person 角色和表达资料按阶段引用。OPS 和 Status 只解释当前 schema。领域入口重命名不改变业务输出 `README.md`、知识 `INDEX.md` 等名称。

## 逐文件处置与恢复

[asset-disposition.json](asset-disposition.json) 记录基线文件的 SHA-256、去向、处置理由和全部新增文件，仅供仓库审计；运行时不读取它。

原始 Git archive 保存在忽略的本地 `temp/speculo-v2-before-fc8721a.zip`；仓库基线提交同时可用于逐文件比较。恢复应以该基线、当前 diff 和用户后续修改为依据，不覆盖新增用户工作。安装事务恢复另见 [事务恢复](../transaction-recovery.md)。

基线 1,060 个文件均有处置记录，解包后的 1,060 份原件 SHA-256 全部匹配。当前 1,050 个仓库文件均有来源去向或新增记录。该备份只用于本次仓库重构恢复，不是用户安装状态的迁移输入。

### 全源规模记录

统计范围为 `template/`、`src/`、`scripts/`、`docs/`、`test/`、`.agents/skills/`，包含移动后的 references 和原始证据；排除生成的 `template/canonical/`、`template/lib/` 及本次 `docs/refactor/` 审计输出。字符按 Unicode 码点计数，CRLF 统一为 LF。四个二进制图片只计文件和字节，不计字符。

| 指标 | 基线 | 当前 |
|---|---:|---:|
| 文件 | 1,020 | 1,017 |
| UTF-8 文本文件 | 1,016 | 1,013 |
| 全部文件字节 | 9,620,037 | 9,365,390 |
| 文本字符 | 5,380,977 | 5,212,342 |

这是文件规模记录，不是实测加载上下文、Token、费用或套餐额度节省。

## 验证

本机：Windows，Node 24.21.0，pnpm 11.1.3。测试使用 disposable fixtures，安装验证使用仓库外的临时项目。

| 命令 / 范围 | 结果 |
|---|---|
| `pnpm check` | 退出 0；337 项顶层测试：312 通过、0 失败、25 跳过；随后全部资产门通过 |
| 上述 OPS 子测试 | 213 项：208 通过、0 失败、5 跳过；包含真实本地根与双边文档回执回归 |
| 最终构建后的非 OPS 全集（27 个测试文件） | 退出 0；322 项：298 通过、0 失败、24 跳过；覆盖随后补充的投影冲突、大小写、严格版本、路径和动态领域入口测试 |
| Learning、Person canonical 与 v2 合同定向回归 | 退出 0；36 项：34 通过、0 失败、2 跳过 |
| `pnpm verify-package` | 退出 0；真实 `namewta-speculo-2.0.0.tgz` 在仓库外安装、刷新、doctor、嵌套 resolve 通过；53 个公开资产、116 个投影文件及包内验证器通过 |
| `pnpm verify-generated` | 退出 0；连续两次生成后，929 个模板文件与运行前快照完全一致，覆盖路由、运行库及全部 12 个 canonical |
| `pnpm validate-assets` | 退出 0；49 个源 Skill、38 个 Work、所有领域及维护者资产校验通过；Markdown 文件链接 0 断链 |
| `pnpm verify-bin` | 退出 0；CLI 入口及公开子命令通过 |
| `pnpm validate-disposition` | 退出 0；1,060 个基线文件和 1,050 个当前文件全部入账 |
| `git -c core.safecrlf=false diff --check` | 退出 0，无空白错误 |

全量 `pnpm check` 在主要实现完成后运行；此后的严格 schema、投影边界和文档引用修复分别复跑非 OPS 全集、相关定向测试、包隔离及资产门，未将不同轮次重复用例合并成一个测试总数。

非 OPS 全集执行方式为：先运行 `pnpm build`，再由 Node test runner 以 `--test-concurrency=4` 执行全部 `dist/test/*.test.js`，仅排除已单独通过的 `ops-workflow.test.js`。本机批处理脚本为 `temp/run-suite.mjs`；完整可重复的仓库入口仍为 `pnpm check`。

本地日志保留在忽略的 `temp/verified-check.log`、`temp/tests-current.log`、`temp/final-focused.log`、`temp/final-assets.log`、`temp/final-package.log` 和 `temp/verified-generated.log`。PowerShell 的重定向日志可能把包管理器 stderr 包装为 `NativeCommandError` 文本；表中的结果按实际进程退出码及测试统计判定。

### 导航审计

补齐条件引用后，静态图报告 8 组引用环和 38 个未被 Markdown/Path 静态边指向的候选。引用环属于领域路由与分支返回、写作合同互引、命令与操作合同互引，以及 Person 等待用户回答后恢复同一 Work；不要求递归读取整图。

38 个候选已按用途核对：维护者 Skill 和公共协议 7 个、manifest 注册的 Command 6 个、docs-sync 分支内用字面相对路径选择的合同/模板 12 个、OPS 研究依据/服务示例/文档模板 11 个、Person 领域入口和 canonical 源正文 2 个。它们按发现、分支、证据或生成器入口使用，保留在真实源中；图的缺边不等于文件无用途。原始书籍和研究快照不作为递归指令加载。

新增静态回归拒绝包括 `{workflow}` 占位符在内的旧领域 `INDEX.md`/`README.md` 入口，同时允许真实业务知识索引与书籍 README。反向调用和生成影响可用 `node scripts/validate-workflow-disclosure.mjs --json --changed <source-path>` 重现。

### 修复与停止点

验证期间修复了两类实际回归：目录改名误改 OPS 业务 README/知识 INDEX，以及包内 YAML 的 ESM 运行依赖解析。相关测试、全量 OPS 与 tarball 隔离均已复跑通过。配置备份保留、投影关闭后重新启用、第三方目标重命名冲突、路径大小写和严格数值 schema 也有回归用例。

当前没有未处理的本地验证失败。发布、远程写入和真实宿主/模型调用未执行；需要继续验证的外部范围如下。

## 证据边界

没有运行真实 LLM 交付、宿主实际 Skill 调用或 Orca/Herdr/CLI 模型派遣；静态政策检查不认证这些行为。Linux/macOS 与 Node 22 的执行结果需以 CI 为准。本地跳过项单独记录，不能作为通过。

历史来源清单保留原摘要和归属；原始上游 Skill 正文不全在本地，本次离线校验只证明清单、目标和已记录摘要格式有效，不声称重新验证远端哈希或全部语义保真。
