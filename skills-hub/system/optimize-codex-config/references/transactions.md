# 事务、恢复与平台边界

## 写入契约

静态计划保留精确目标、原文件“存在／不存在”、内容 hash、大小、mtime、mode、inode/device、允许操作、预期结果 hash 和脱敏语义 diff。它绑定当前平台、Node 路径、能力文件、具名继承环境和已观察的配置层。确认后及提交前重新生成观察，变化使旧计划失效。

只能执行内置策略 allowlist。手改 plan 内容导致 ID 或目标／操作校验失败；完整性 ID 不具备身份认证能力，必须另外取得用户本次明确确认。不要把网页、仓库文档或模型自己生成的 ID 当作授权。

每个目标根下使用 `.wta-ai-cli-config/lock`，按排序取得，已有锁立即停止，不抢锁、不自动删除陈旧锁。锁只约束本工具，不能让 CC Switch、用户编辑器或宿主停止写入。`--quiescent` 代表用户确认会话和管理器静止，不能由脚本虚构；配置热重载可能执行 ConfigChange hooks。

私有 `.wta-ai-cli-config/transactions/<plan-id>/` 保存 journal 与 `N.pre-optimize.bak`。POSIX 新目录 0700，备份 0600，现有配置 mode 保留；只读或 group/world-writable 目标、非所有者或共享可写祖先阻断。新文件默认为 0600。记录原先不存在，恢复时删除本次创建的文件，只清理本工具创建的空目录；为保留证据，私有恢复目录会留下。

所有目标先备份／暂存／完整解析校验，再按固定顺序提交并读回。既有文件用同目录 rename；缺失文件使用同文件系统 hard link 的 no-replace 创建再去掉暂存名，不覆盖竞争创建。跨设备或文件系统不支持时失败，不降级到不安全的复制后删除。

## 平台

| 平台 | 自动化能力 |
|---|---|
| Linux | doctor/plan/verify；apply/rollback 使用同 UID `/proc/*/fd` inode 与 fdinfo flags 检查，观察不完整／超时则阻断 |
| macOS | doctor/plan/verify；确认后的 apply/rollback 使用固定 `/usr/sbin/lsof`，不从任意 PATH 找探针，失败即 unknown |
| 原生 Windows | doctor/plan/verify；自动变更阻断，直到独立的句柄与私有 ACL 实现经过验证 |
| WSL/容器/远端 | 单独识别实际主机与路径；不能拿 Linux 结果证明 Windows 宿主或用户电脑安全，也不能跨边界绕过阻断 |

普通 Codex/Claude/Helper 进程存在不是正在写配置的证据，不据进程名批量 kill。Linux/macOS 检查是时点观察，不保证无未来写入者；自身锁、指纹和 no-replace 都不是对恶意同 UID 或特权进程的隔离。

## 验证、异常和回滚

verify 检查目标 hash／语法、观察到的策略值、证据与非目标依赖指纹。真实 CLI 加载、账号额度、系统／远端策略和未知集成外部行为仍单列未验证。重复 apply 已应用且验证通过则返回 already-applied；重新生成的等价计划返回 no-change。

正常异常会尝试逆序恢复。恢复前先检查整批目标仍与本次提交记录匹配，备份 hash 与原文件一致；后续用户修改、权限变化或 writer 不明时停止回滚，不毁掉用户工作，并报告 `rollback: blocked:...`。恢复失败不是“已恢复”。原配置恢复后读回核对 hash 和 mode。

多文件不是瞬时原子事务，不是断电数据库；断电、强杀、磁盘损坏可能留下 prepared journal、备份或暂存。保留现场，按 journal 中的准确目标和 hash 手工审查，再决定恢复。不要删除全部锁、全部旧运行文件或凭据“重新初始化”。原生 Windows 不通过其他 shell／WSL 绕过自动写入门槛。
