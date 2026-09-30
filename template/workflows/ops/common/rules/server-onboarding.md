# S：服务器接入与 SSH 公钥认证

本文件只在新增/修复服务器接入时读取。Server 是目标机器，不是发起操作的控制端；host_id 保持既有内部身份。

## 接入顺序

确认用户已经提供的 server_id、地址/端口、远端账号、专用 host.root、可信主机指纹、控制端 SSH 客户端与认证来源；不重复索取已有输入，不把别名相似当作同一服务器。首次指纹必须经云控制台/控制台/既有可信渠道核对，ssh-keyscan 只能收集候选值，不能完成信任。

优先复用受限私钥与 ssh-agent。免密登录指无需重复输入服务器账号密码，不等于私钥必须无口令；不得默认 ssh-keygen -N ""，不得复制私钥到服务器、项目或看板，也不把密码放在 JSON/argv/日志。只登记 identity_file 的本地受限路径；使用 agent 时不能自动清空用户已有 agent。

已有可信登录通道时，仅在原明确授权范围内分发指定公钥，保持旧登录通道，核验新会话成功后才讨论轮换撤销。公钥分发/sshd 修改不是 task-run 的隐式能力；当前执行器不提供首次密码登录或 authorized_keys 写入适配。缺少已验证 key/agent 时，给出待用户在可信交互终端/云控制台完成的最小公钥分发步骤与精确目标，记录“接入阻塞”，不要宣称自动完成，也不要绕过 ops 的写入网关用 sshpass 或任意 shell 写服务器。禁止为方便部署自动关闭密码登录、改 SSH 端口或重启 sshd；这些需要专用可恢复方案。

信任和公钥认证具备后，用 USAGE 中的 discovery/probe 读取身份；Linux SSH 缺 Node 时走原 bootstrap-node 的固定 Volta/Node、已审核 tar SHA256 与独立 ack。复用已有 Node，不改 shell profile。随后 enroll（或 register + probe --host）把真实身份与盘点持久化；identity=discover 不可用于 apply。

最后运行 `server-check --server ID --profile base`。只有成功验证严格主机密钥、公钥认证和实际机器身份后，才写“接入检查通过”；未通过项与证据文件必须列出。需要 Docker 的项目再走 H 的 compose profile，不能把 base-ready 等同完整部署基线。

## 基础环境清单

清单固定包括登记、SSH 公钥、机器身份、Linux、Node、根目录、磁盘、内存、Docker、Compose、Docker data-root、最小权限、时间同步、防火墙、外部依赖、备份恢复。后五项没有自动证据时保持 unknown；不抄一套 Linux 加固命令盲目关闭端口/清缓存/升级全机。

完成输出：status.hosts 的明确资源、原 hosts/ID/inventory 盘点、records/servers/ID/checks 的检查回执、剩余缺口和下一 Work。执行 V 刷新本地列表，使用户直接从 FLEET.md 进入对应服务器及项目视图。连接失效/指纹改变先停止，不自动替换 known_hosts 或注册另一台机器为同一身份。
