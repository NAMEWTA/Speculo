# 安装事务、刷新与恢复

本页处理 Speculo CLI 的安装事务。代码部署、媒体渲染和学习任务的继续工作，应读取各自记录与真实产物；安装恢复不能代替这些业务判断。

## 正常刷新

CLI 准备 staging，核对受管文件、路径与选择，再切换方法资产和外部宿主入口，最后验证结果。领域 Work 与 Hub 都随相应选择更新；用户资料保留为原始文件，不解析旧业务状态。

| 位置 | 用途 |
| --- | --- |
| `.agents/speculo/` | 当前安装的方法和项目资料根 |
| `.agents/.speculo-install.lock/` | 安装 owner 与 transaction 日志 |
| `.agents/.speculo-transactions/` | 当前事务的 staging 与备份树 |
| `.agents/speculo/.speculo/back/<uuid>/` | 配置字段调整时保留的定向备份 |

这些目录由安装器维护。普通项目整理和 Work 不应删除它们。成功安装、回滚或显式恢复会清理可验证的事务内容与空目录；非空恢复证据继续保留。`doctor` 始终只读。

## 中断后的恢复

先检查并保留输出：

```bash
speculo doctor . --json
```

核对目标项目、transaction ID、owner、journal、staging、backup 和具体 blocker。确认原安装进程已经停止，当前环境与日志记录相符。不要先删锁或重建元数据。

使用报告中的完整 ID：

```bash
speculo recover . --transaction <实际完整事务ID>
speculo doctor .
```

未提交事务在现场可证明一致时回滚；已经 committed 的事务只完成对应清理。恢复完成后，再根据实际安装状态决定是否运行 `speculo init .`。

## 需要先解决的现场问题

| 问题 | 对应处理 |
| --- | --- |
| 原 owner 仍活跃 | 由原进程正常结束，不能把锁当残留删除 |
| transaction ID 不匹配 | 使用实际报告的 ID |
| 日志版本、主机或平台不符 | 保留日志，使用能解释该日志的原环境与版本 |
| 路径越界或链接逃逸 | 查明真实目标，停止受影响的写入 |
| 文件不再匹配记录的 before/after 内容 | 保留并核对人工修改，处理具体冲突 |
| 第三方 Skill 或附加文件冲突 | 只处理冲突对象，不接管整个目录 |

事务记录覆盖文件字节、目录存在性、节点类型和链接文本；POSIX 还记录权限位。Windows 的普通复制不宣称保留所有 ACL/ownership 语义。旧 `.speculo/ops/private/credentials.json` 的既有 ACL 保护见 [升级说明](upgrade-v3.md)。

## 支持的记录与边界

安装器新写 journal schema 4，并能读取受支持的 schema 3 投影事务。不修改进行中的日志版本，不手工重算归属哈希，不把未知版本伪装成当前格式。

旧业务 JSON、change、设计和环境文件不受这些 journal schema 约束。格式不完整的业务草稿不会因为 schema 校验阻塞刷新；安装路径、身份和并发冲突仍需处理。

取消领域只移除可确认归属的方法与入口，相关项目资料继续保留。Hub 的归属由独立安装元数据记录，中断后通过同一安装事务恢复。安装健康只证明文件安装可用，不证明远端部署或项目交付完成。
