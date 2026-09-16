# OPS 2.2 操作手册

命令中的 WORKFLOW 是解压后的静态 ops 路径，STATE 是部署机永久状态绝对路径。示例用 Linux；PowerShell 传相同参数即可。所有示例密码、主机名和提交值均为演示，不可当作生产配置。

## 1. 初始化与盘点

```sh
node /path/to/ops/common/tools/ops.mjs --version
node /path/to/ops/common/tools/ops.mjs --state /path/to/.speculo/ops init --controller-id control-a
node /path/to/ops/common/tools/ops.mjs probe --output /safe/path/local-inventory.json
```

没有 Node 时运行 common/tools/bootstrap.sh probe 或 bootstrap.ps1 -Probe，只做检测。经过批准的本地安装器还需精确 SHA256 与确认字符串。完成后重新 init。SSH 目标缺 Node 不要对本机 bootstrap.sh 假装能装远端，改走下面的 `bootstrap-node`。

初次远端将 host.json 中 identity 写为 discover（仅 probe 支持），connection 包含 hostname、username、known_hosts，可选 port、identity_file、sudo、shell。known_hosts 必须已经通过可信方式核对，不能自动信任 ssh-keyscan 输出。目标还没有 Node 时不要填一个 PATH 上的 `node` 然后把盘点留在对话里：

```sh
node /path/to/ops/common/tools/ops.mjs bootstrap-node --connection-file /safe/path/host-discovery.json --probe
# 若 tools.node=missing，准备已审核的 volta/node tar（SHA256 见 common/toolchains/volta-linux.json），再：
node /path/to/ops/common/tools/ops.mjs --state /path/to/.speculo/ops bootstrap-node --apply \
  --connection-file /safe/path/host-discovery.json --host-id node-a --account ops --host-root /srv/ops \
  --volta-archive /safe/volta-2.0.2-linux.tar.gz --volta-sha256 PINNED \
  --node-archive /safe/node-v24.21.0-linux-x64.tar.gz --node-sha256 PINNED \
  --ack I-APPROVE-THIS-BOOTSTRAP
```

引导把 `VOLTA_HOME` 放在 `{host.root}/_host/toolchains/{account}/volta`，`connection.node` 指向其中的 `bin/ops-node`（导出 VOLTA_HOME 后 exec 真实 Node），不改 `.bashrc`/`.profile`，不跑官方 `install.sh`。已有 Node 则 `skipped-existing-node`，原默认不动。随后必须落盘：

```sh
node /path/to/ops/common/tools/ops.mjs --state /path/to/.speculo/ops enroll --file /safe/path/register.json
```

`enroll` 接受 `identity=discover` 与引导返回的绝对 `connection.node`，写入 `status.json` 与 `hosts/{host_id}/inventory/snapshot-*.json`。单独 `probe --connection-file` 仍只打印 JSON，下一步必须 enroll（或 register + `probe --host`）。


```sh
node /path/to/ops/common/tools/ops.mjs probe --connection-file /safe/path/host-discovery.json --output /safe/path/host-observed.json
```

核对后将真实 identity 写回 register.json，再登记。正式 register 不接受 discover。

```sh
node /path/to/ops/common/tools/ops.mjs --state /path/to/.speculo/ops register --file /safe/path/register.json
node /path/to/ops/common/tools/ops.mjs --state /path/to/.speculo/ops credential-put --file /safe/path/credential.json
```

credential-put 只持久化指定凭据，不会重置服务器账户。该导入文件也必须受限保存；不要用 shell 参数直接传密码。

## 2. 真实项目分析和固定来源

```sh
node /path/to/ops/common/tools/ops.mjs analyze --source /path/to/project
node /path/to/ops/common/tools/ops.mjs --state /path/to/.speculo/ops source-fetch --project app-a --repository https://example.org/team/app-a.git --commit FULL_40_HEX_COMMIT --allow-network
```

analyze 只列相关清单与哈希，不执行仓库程序。Agent 必须读取实际 manifests，按持久化参数、运行方式、网络、数据库迁移和验证创建 spec，不能把探测结果自动等同于完整可运行部署。

source-fetch 不自动登记新来源版本，后续 spec.resource_updates.projects 显式将对应 Project.source 更新为实际固定 commit。现存 Deployment.source 保留该次实际部署来源。

## 3. 计划、确认、执行

```sh
node /path/to/ops/common/tools/ops.mjs --state /path/to/.speculo/ops plan --file /safe/path/deploy.json
# 阅读输出 report 指向的完整 PLAN.md，核对目录、账号版本、影响和恢复。
node /path/to/ops/common/tools/ops.mjs --state /path/to/.speculo/ops approve --run RUN_ID --digest SHA256 --by administrator --statement '我确认此摘要所列的全部目标、配置、影响、明文文件和恢复限制'
node /path/to/ops/common/tools/ops.mjs --state /path/to/.speculo/ops apply --run RUN_ID
```

“继续”“按你说的做”不能在无人确认具体计划时被编造成 approval.json。一次确认只授权所示摘要；现场漂移、工具链代码升级、连接或凭据变化都要重新计划。

spec 中使用 `{{root}}`、`{{host_root}}`、`{{data}}`、`{{env}}`、`{{logs}}`、`{{artifact}}`、`{{run_id}}` 替换本部署路径；`{{binding:binding-id:endpoint}}`、`{{allocation:allocation-id:resource_name}}` 引用登记关系；`{{credential:credential-id@1:password}}` 在执行时从受限账本解析。

files 的 artifact/ 自动进入新 releases/run-id/artifact；compose/、config/、scripts/、service/、data/ 按批准映射。每个输入文件 <=16MiB，计划 <=64MiB/2000动作；更大构件应使用用户批准的固定摘要下载/传输脚本，不将大二进制塞进 JSON。

所有部署至少一个实际 health。file 只能证明指定文件，不证明长驻服务健康；生产服务使用端口/HTTP/业务命令与数据验证组合。native oneshot 是有限任务，不冒充守护进程。

## 4. 环境、Docker、镜像和清理

```sh
node /path/to/ops/common/tools/ops.mjs --state /path/to/.speculo/ops environment-spec --host node-a --file /safe/path/environment-request.json --output /safe/path/host-prepare.json
# 然后对 host-prepare.json 执行 plan / approve / apply。
node /path/to/ops/common/tools/ops.mjs --state /path/to/.speculo/ops mirror-probe --host node-a --file /safe/path/mirror-candidates.json --allow-network
```

环境配方不抓 latest；管理器缺失先明确准备安装器。Linux SSH 上 Volta 本体与固定 Node 镜像用 `bootstrap-node`，不要指望 environment-spec 自己装 Volta。来源测速不修改配置，证书/哈希失败候选不使用，真实配置更换通过 H 的精确 write-file/write-control/命令计划。不能将 Python/npm/Docker/Maven 镜像混为一套规则。

H.host_actions 支持 mkdir、write-file（host.root 内相对路径；不得写生成器负责的 README/DEPLOYMENTS/knowledge 账本）、write-control（精确系统控制文件：内置 docker daemon.json 与 ops-*.service，以及经理由/回滚/验证声明的 nginx、wireguard、非 ops- 前缀单元）、install-toolchain（明确写集/原默认/验证）、command（明确写集/验证）、defaults、quarantine、purge-quarantine。系统软件包安装使用明确批准的可信安装脚本，不自动猜当前发行版安装命令；Docker 示例见 service-profiles/docker-engine.md。主机级入口用 resource_updates.hosts[].host_services 与 spec.public_ingress 入账，不要为 Nginx/WireGuard 伪造 APP 部署。

隔离仅移动登记 cache/log，返回 released_bytes=0。确需释放空间，再为 `_host/quarantine/旧run/精确item` 生成 purge-quarantine 计划。没有回执、内容变化、超出有限清单或试图删除业务数据时阻塞。

## 5. 升级、共享与迁移

upgrade/rollback 与 deploy 使用相同完整 Deployment 输入，但 version、构件、环境变更都必须显式。Project.source 或 Host.connection 更新通过 spec.resource_updates（固定身份/root/kind 不可改），再探测和批准。

公共服务先作为 shared-service 登记并部署。Allocation 带逻辑资源 owner 与 app credential，Binding 将 APP 指向 provider。创建 allocation 必须配 provision/mysql|redis|minio|existing；existing 必须实际验证。示例见 common/examples 与 service-profiles。

uninstall 输入 retire_deployments，只停止并保留数据；不会删除共享提供者。迁移到新主机创建新 deployment，备份/复制/追平/切换用项目专用显式动作，旧目标保留到恢复窗口结束。数据库备份与恢复不靠一条通用 cp 命令代替。

## 6. 验证和恢复

```sh
node /path/to/ops/common/tools/ops.mjs --state /path/to/.speculo/ops status
node /path/to/ops/common/tools/ops.mjs --state /path/to/.speculo/ops validate
node /path/to/ops/common/tools/ops.mjs --state /path/to/.speculo/ops inspect-run --run RUN_ID
node /path/to/ops/common/tools/ops.mjs --state /path/to/.speculo/ops resume --run RUN_ID
node /path/to/ops/common/tools/ops.mjs --state /path/to/.speculo/ops docs-sync --run RUN_ID
```

resume 不重放 failed/started-only；docs-sync 仅重试文档，不能修复真正失败的业务动作。真实文档终态失败需新维护计划；只因网络中断但目标已有成功回执的情况可继续校验交付。具体说明见 rules/recovery.md。

完成后检查服务端项目 README 中实际 observed_version、UTC 时间、data/env/compose路径；再检查部署机 hosts/id/deployments/id/README、server-files、docs-receipt 和 FLEET-DEPLOYMENTS.md。只有 both-sides-verified 算完整交付。

## 7. 从旧 OPS 切换

只清理旧静态 workflows/ops，绝不清理 .speculo/ops 或服务器部署根。非空 v2 保持原文，用新空 STATE 执行 import-legacy；不自动推断主机、密码或共享关系。

```sh
node /path/to/ops/common/tools/ops.mjs --state /path/to/new-ops-state import-legacy --source /path/to/old-state --controller-id control-a
```

已有服务器目录先探测、备份并确认接管/迁移；仅替换静态 workflow 不会自动迁移服务器数据。Speculo 旧 CLI 需要交付包的外围兼容补丁，不能只换 Markdown 还继续用硬编码旧五入口校验器。

## 8. 本地演练和测试

```sh
node /path/to/ops/common/tools/demo-local.mjs --output /absolute/empty/demo-root
node --test /path/to/ops/common/tests/test_ops.mjs /path/to/ops/common/tests/test_ops_bootstrap.mjs
node /path/to/ops/common/tools/validate-ops.mjs --self-check
```

演练只使用指定新空目录，创建演示 APP 与演示明文凭据，运行真实有限 Node 程序，完成双边文档；不连接其他主机、不安装软件。它不是生产系统验收。
