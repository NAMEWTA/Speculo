# 集中记录、数据持久化与离线视图

本文件拥有 V 的输出与读取范围。资源事实仍由 status.json v3 与原 Run/Release 执行器维护，不建立第二份可编辑 CMDB。

```text
state_root/
  status.json                         # 唯一资源登记事实源；仅原执行网关写入
  FLEET.md                            # V 生成的简单阅读入口，最后原子更新
  records/
    tasks/task-id/
      PLAN.md                         # 已展示的任务计划，受限文件
      task.json                       # 冻结规格/输入摘要；不是授权
      specs/step-id.json
      summary.json                    # 无自由文本/命令/凭据的视图投影输入
      authorization.json              # 原始明确任务确认，只读审计，不导出看板
      started.json                    # 禁止自动重放的持久标记
      progress.json
      result.json                     # 不可覆盖终态/恢复说明
    servers/host-id/checks/
      check-id.json                   # 不可覆盖检查证据
      latest.json                     # check_id + 内容摘要
    views/view-id/
      inventory.json                  # schema_version=1 的白名单投影
      FLEET.md
      index.html                      # 离线单文件；无需 Web 服务
      manifest.json                   # 每个文件的字节 SHA256 回执
  hosts/host-id/runs/run-id/           # 保留原计划/批准/日志位置
  releases/run-id/                    # 保留跨主机/项目证据
  hosts/host-id/deployments/dep-id/    # 保留双边文档/真实配置镜像
  private/credentials.json            # 受限账本；V 不读取
```

## 生成和持久化标准

`fleet` 只读取状态、每台服务器最新完整检查、任务 summary 与必要的进度/结果白名单字段，以及 status.releases 的原 Run 索引。不读取 private、env、server-files、outbox、原 task.json/规格/授权文本。缺失任务提交标记显示 incomplete；有 started/running 而未验证终态显示 needs-inspection，不武断判断进程已中断；坏 JSON、摘要不符或链接跳转拒绝生成，不悄悄丢掉损坏记录。

投影有 schema_version、artifact、generated_at、controller_id、source_revision、source_digest、stale_hours 和 servers/projects/deployments/bindings/releases/tasks。数据字段的机器可读合同是 common/schemas/fleet-view.schema.json；输出模板是 common/templates/FLEET.html。版本或字段语义改变时升级投影 schema，不改 status v3 以迎合 UI。

Server 映射 Host.host_id；deployment 使用 server_id 作为展示字段，保留 project_id、环境、实例、计划与已验证版本。Host.host_services 单列，不伪造 Deployment。Binding 的 external provider 显示外部依赖，不猜其服务器身份。内部 IP、路径、项目名仍可能敏感，所有产物保持受限权限；白名单不是允许把秘密写进 display_name/版本/路径的理由。

同一个 data + 模板字节必须产生相同 HTML/MD；view_id 包含内容与渲染结果摘要。先写不可变快照及 manifest，读回校验，再确认资源修订未变、没有 catalog 锁，最后只更新一个 FLEET.md 入口。中断保留旧入口与不完整快照供检查，不覆盖旧批次。HTML 从内嵌 JSON 读取，不 fetch 本地/外部文件；所有动态文本通过 textContent，禁止 innerHTML/eval、外部 CDN、远端 URL 和 mutation 按钮；内联脚本/样式使用内容摘要 CSP。

只读浏览可重复执行，无需再确认部署授权。生成失败保留原执行事实，不因为看板失败而重跑 apply。多个相同 ID 的工作空间不能靠文件复制自动接管：state_root 与控制端身份必须一致。

## 时间和状态

registered 只说明入账；SSH 公钥认证通过只证明该次登录；base-ready 不代表 Compose-ready；Compose-ready 不代表 APP 健康。checklist 保留必需/可选项、状态和 checked_at，默认超过 24 小时显示 stale。身份、连接或 known_hosts 内容变化、缺失时显示 unknown。历史 pass 项仍可回看，但不得使用过期结果作为当前验收。

Node/Docker/Compose、根目录存在、磁盘/内存有自动只读检查。最小权限、时间同步、防火墙、外部依赖和备份恢复默认 unknown，需按项目要求取得真实证据；V 不将它们补写为 pass。没有探测不等于正常。现有 inventory 不验证根目录可写，也不证明备份可恢复。

## 兼容与迁移

不搬迁原 hosts/*/runs、releases、private、配置镜像或远端目录。现有 runtime-contract 的 opaque_default=preserve-byte-for-byte 继续保护 records，刷新静态 Work 不删除状态。FLEET-DEPLOYMENTS.md 仍由原双边交付生成器维护，V 只拥有 FLEET.md 和 records/views。

新增执行器模块/JSON schema 会改变 engine_digest，因此尚未执行的旧计划需要重新生成批准；unknown/运行中现场先 inspect-run，不直接重新部署。旧审批、账本与回执不复用、不篡改。卸载静态扩展也不删除 records 或业务数据。
