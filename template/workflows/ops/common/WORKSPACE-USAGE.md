# OPS 工作空间操作手册

本手册是推荐的新入口；原 init/register/enroll/bootstrap-node、plan/approve/apply、inspect-run/resume/docs-sync 的精确参数仍见 USAGE.md。以下变量必须替换为实际绝对路径；示例 ID 不构成生产配置。新增 CLI 不从 cwd 推断 state 或服务器。

```sh
OPS=/absolute/ops-console/speculo/workflows/ops/common/tools/ops.mjs
STATE=/absolute/ops-console/speculo/.speculo/ops
node "$OPS" workspace-help
```

## 1. 控制端与服务器接入

控制端只初始化一次，不自动登记为部署目标：

```sh
node "$OPS" --state "$STATE" init --controller-id control-a
node "$OPS" --state "$STATE" route --scope access --server node-a
```

按 S 的 server-onboarding.md 完成可信指纹与 key/agent，再读取 <Path>{roots.workflows}/ops/common/rules/host-root-and-onboarding.md</Path>。route 只路由；首次密码登录和公钥分发仍需既有可信交互通道。

连接文件提供 platform、transport、connection，结构见 <Path>{roots.workflows}/ops/common/examples/server-connection.example.json</Path>。Linux 无需预装 Node 或预填 root：

~~~sh
node "$OPS" --state "$STATE" server-discover --server node-a --connection-file /safe/connection.json
# Agent 展示实际账号、主目录和建议根，记录用户指定或接受路径的原话。
node "$OPS" --state "$STATE" server-root-confirm --server node-a --discovery RETURNED_DISCOVERY_ID --root /home/wta/ops --by actual-user --statement '用户实际给出的路径确认语句及来源'
~~~

将返回的 identity/root/root_confirmation 原样写入 Host 连接/登记文件。默认建议为真实登录主目录下 ops，root 通常 /root/ops、wta 通常 /home/wta/ops，自定义主目录以实际探测为准。已有明确指定不重复询问；建议本身不是确认，取消或未确认不写目标。根确认不代替安装授权。

已有 Node 时 enroll；缺 Node 时按 USAGE 的固定 bootstrap-node 网关执行，连接文件须携带确认回执，--account 使用实际登录账号，--host-root 与确认一致。登记后最小初始化：

~~~sh
node "$OPS" --state "$STATE" server-initialize-spec --server node-a --output /safe/host-initialize.json
node "$OPS" --state "$STATE" plan --file /safe/host-initialize.json
# 走原 approve/apply，或把规格放入已授权 H/D task。
~~~

最小初始化只准备受管目录和双边文档；Docker/Compose、语言环境及入口服务按项目需要经 H 准备。登记、目录准备、文档交付和项目运行基线分别验证。

同机换账号先准备新连接文件并保留原 root：

~~~sh
node "$OPS" --state "$STATE" server-connection-spec --server node-a --connection-file /safe/new-connection.json --output /safe/connection-update.json
# S 拥有的精确 plan/approve/apply；不通过 H/D task 更换连接，不撤销旧通道。
~~~

已有真实服务器登记后：

```sh
node "$OPS" --state "$STATE" server-check --server node-a --profile base
node "$OPS" --state "$STATE" fleet
```

base 验证接入身份；compose/native 追加相应基线。默认磁盘剩余至少 1024 MiB、可用内存至少 256 MiB，仅为可调整基线，不是项目容量设计。可用 --min-free-mib / --min-memory-mib 显式调整正整数阈值。新版 server-check 暂仅 Linux，其他平台保持原 probe/执行支持。

## 2. 明确系统环境与项目范围

```sh
node "$OPS" --state "$STATE" route --scope server --server node-a
node "$OPS" --state "$STATE" route --scope project --server node-a,node-b --project app-a
```

server scope 不接受 project；project scope 要求一个已登记项目和明确服务器集合；Controller 不能混入目标。实际项目配置仍遵循原 Compose/native/shared-service spec。D 需要先完成 S/H，不把主机级 Nginx 配置误做成 APP 环境。

## 3. 一次确认后连续执行

用户已经明确实施时，Agent 先展示详细 Plan Mode，再把确定的规格写成 task request（schema 见 common/schemas/task-request.schema.json，示例见 common/examples/task-host.example.json）。示例只说明结构，必须结合真实服务器与原 spec schema 填写；未知安装命令、版本、密码、恢复步骤不能靠占位值执行。

```sh
node "$OPS" --state "$STATE" task-plan --file /safe/task-request.json
# Agent 向用户展示返回 PLAN.md 的内容，记录已存在的原始明确实施请求；不是再问一轮。
node "$OPS" --state "$STATE" task-authorize --task task-id --digest RETURNED_TASK_DIGEST \
  --by actual-confirming-user --statement '实际已给出的任务确认语句及其来源'
node "$OPS" --state "$STATE" task-run --task task-id
node "$OPS" --state "$STATE" fleet
```

CLI 故意不把 task-plan 等同授权；入口替用户完成后续命令，不要求用户逐条手动执行或反复确认。每个任务步骤仍产生原 plan.json / approval.json / journal / 双边回执。若用户只要求计划，执行 task-plan 后停止，不能写 authorization。

项目任务：scope.scope=project，project_ids=[主项目]，server_ids=[所有获准目标]；必要的 H 准备与 D 部署按 steps 排序。受影响/共享依赖项目放 related_project_ids；新建资源先通过原 register 记录。未声明的 provider/consumer 所在机器会在规划前被阻止访问；编译后再次核对实际修改范围。任务开始前资源修订不得漂移；任务内受控 H/D 变更不重复询问。

任务不续跑、不重放。失败、未知或 docs_pending 停止后续步骤，查 records/tasks/task-id/progress.json 和原 inspect-run；新 task_id 不能掩盖同一未知操作。普通部署不能默认把 allow_destructive 打开；明确迁移/退役范围还需要 --ack-destructive I-APPROVE-THIS-EXACT-DESTRUCTIVE-TASK。执行器、连接、输入、凭据漂移都停止，不能自动替用户生成扩大授权。

## 4. 一份清单，多种视图

```sh
node "$OPS" --state "$STATE" fleet --stale-hours 24
```

直接打开输出的 FLEET.md，点击离线看板；也可直接打开命令返回的 HTML 绝对路径。无需启动 Web 服务。服务器、项目、部署记录状态和关键词可筛选；新增连接账号、已确认根、目录/文档/运行基线分别验证状态，旧根标为 legacy-registered，不导出确认原话；点击项目/服务器可反向查询。看板只读，不提供远程连接、部署、重试按钮，不拉取实时健康数据。

MD/HTML/JSON 同批次持久化在 records/views，根 FLEET.md 最后更新。新看板不覆盖原 FLEET-DEPLOYMENTS.md。输出虽无凭据字段，仍包含内部拓扑，不能直接公开上传。

## 5. 验证与升级

```sh
node --test /path/to/ops/common/tests/test_ops_workspace.mjs
node /path/to/ops/common/tools/validate-ops.mjs --self-check
```

定向测试使用临时本地状态和注入的执行/SSH 适配器，不构成真实 Linux、SSH 或 APP 验收。原 tests/test_ops.mjs、test_ops_bootstrap.mjs 与仓库完整 check 仍需通过。

静态升级不迁移任何业务目录或旧证据，所有新记录由原 opaque preserve 合同保留。新增模块/schema 改变 engine_digest，旧未执行计划须重新生成；未知现场先恢复。仅改 Markdown 而不升级入口、manifest、schema 与验证器不是完整安装。
