# 持久化、明文与双边交付规则

## 硬性路径

Host 登记后 root 固定；Project 使用 kebab ID；Deployment 默认 root/project，同级 APP 与公共服务。多实例显式用 root/project/instances/env/instance。不能通过 symlink、junction、UNC、ADS、相对路径越界或双重登记绕过。

业务持久化目录为 data/component/purpose；日志 logs/component；环境 env/；生成配置 config/。Dockerfile 与 Compose 同在 compose/。原生服务配置在 service/，其文件不自动改变业务数据归属。系统服务文件是单独审批的控制文件例外，不是数据存储例外。

Docker 要求明确映射镜像声明的全部 VOLUME，实际启动后再次检查 Mounts；禁止命名/匿名卷与跨 APP bind。Docker runtime 本身放 host_root/_runtime/docker，迁移旧 Engine 不自动执行。Build context 固定为项目 compose/build，不能包含 env、数据和明文文档；项目依赖的构建文件必须明确放入该上下文。

原生环境设置 OPS_*、HOME、XDG、UV/PIP/npm 缓存和临时根。systemd 将写权限限到 data/logs/run/backups。应用可能具有不遵循环境变量的内部存储逻辑，必须从实际清单和业务验证确认，不能把环境变量设置当作万能沙箱。

## 明文真实值

private/credentials.json 是版本化明文账本；credential-put 不会修改服务器密码。相同版本不可覆盖，轮换先增加新版本，再通过独立部署/迁移计划应用与验证。引用形如 app-a-db@1，值占位形如 {{credential:app-a-db@1:password}}。

控制端项目 README、OPERATIONS 与全域总册保存真实值，特殊字符逐字保留。服务端 README 默认无密码但不能缺路径、版本、时间、启动停止、依赖和备份恢复；OPERATIONS 与 DEPLOYMENTS 默认是受限明文。未知旧密码不能编造；密钥认证没有密码，记录实际密钥认证而不是虚构一个口令。

POSIX 账本、env 与明文文档 0600、控制端目录 0700。`config/` 与 `*.conf`/`*.acl` 默认 0644，供非 root 容器用户读取只读挂载；Windows 使用受限 ACL，不以 chmod 代替 DACL。明文不进入 Git、Web 目录、构建上下文、普通日志；env 是指定的本地配置文件例外，不能再进入镜像层。示例凭据全为演示，不可用于生产。

## 双边完成门

服务端 root/project/README 与部署机 hosts/id/deployments/id/README、OPERATIONS、deployment.json、server-files、server/README 要同时存在。运行版本 observed_version 只由成功验证记录。服务端文件写入前核对旧哈希，写入后远端回读；本地原子写后回读，最终生成 both-sides-verified 回执。

docs_pending：业务步骤已成功但文档未完全交付。docs-sync 只补文档，不重跑数据库。unknown：目标动作结果不确定。completed：完整回执确认，不只是一张标题写着“成功”的 README。

双边保存的是管理事实、配置、凭据与证据；不暗示把服务器业务 data 全量复制到控制端。真正数据备份必须另有一致性方法、目标、时间、哈希/校验与恢复演练。
