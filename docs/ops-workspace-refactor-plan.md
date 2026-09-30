# OPS 工作空间重构计划与设计决策

基线：`60389759ede9f8c4f14b2f7e70da614dfe574ece`（main，2026-09-23）。
范围：OPS 工作流、兼容入口、任务编排、服务器检查、资产视图及相关测试；不发布 npm，不合并 main，不连接真实服务器。

## 已确认的问题

1. README 要求每个精确计划重新确认，缺少跨阶段任务授权协议；底层 approve/apply 本身已经具备摘要和漂移检查，不应删除。
2. H 同时接收本地和 SSH 主机，I/H/D 的中文描述及 keywords 都包含“主机”，控制端与部署目标容易混用。
3. README 仍要求 Python >=3.10，而 CLI、POSIX bootstrap、包运行时已经使用 Node。I/D 的明文交付措辞与 plaintext_documentation=false 冲突。
4. status.json 已有 hosts/projects/deployments 的关联，无需再建第二份可编辑 CMDB；缺少面向用户的双向查询和检查新鲜度。
5. 不可覆盖执行证据已有固定目录。直接搬移会损坏 locatePlan、历史回执和恢复；优先统一新记录及索引，保留原证据。

## 实施顺序

| 阶段 | 改造 | 验收 |
| --- | --- | --- |
| 1 | 明确 controller/server/project/deployment，I/S/H/D/V 五个入口 | controller 不隐式成为 host，D 必须显式选服务器及项目，保留旧 I/H/D ID |
| 2 | 一次授权的精确任务规格与连续执行 | 规格、目标、执行器、连接、有效期绑定；越界/漂移拒绝；unknown 不重跑 |
| 3 | SSH 公钥认证与 Linux 基线检查 | 严格 host-key，禁用密码回退，未测即 unknown；不安装、不改防火墙 |
| 4 | records/ 下任务、检查、视图与统一索引 | 不动 private、旧 Run/Release、CLI-owned back/；更新保留不透明 runtime |
| 5 | schema 约束的脱敏 JSON、MD 和离线 HTML | 双向查询，主机级服务独立，版本区分，时间戳，无外部依赖，无凭据投影 |
| 6 | 更新 Work、规则、用法、生成索引及测试 | 正/负向测试、重复生成一致性、项目 CI；结果按实际执行报告 |

## 架构和归属

- controller 是运行 Speculo/SSH 的本机，不自动创建 local Host。
- server 是部署目标的用户术语，继续映射 v3 status 的 Host / host_id；不进行破坏性 schema 改名。
- project 是 APP 或公共服务的逻辑定义；deployment 把项目、服务器、environment、instance 连接起来。
- I 准备控制端；S 登记/接入服务器；H 治理指定服务器；D 部署指定项目；V 生成只读资产视图。
- 旧 plan/approval/journal/receipt 仍由原执行器拥有；新 task 只授权固定规格的有序调用，不能变成任意 shell 授权。
- 新 task/check/view 在 records/；历史证据只引用不移动；status.json 仍是资源事实源，生成物不能反向更新它。

## 安全和可恢复性

任务确认与逐计划机械批准分离。用户已明确授权实施且已展示详细 Plan Mode 时，Agent 记录原始授权而不是再次询问；后续精确 plan 的 approval 记录必须关联任务。冻结的规格变化、换目标、连接/known_hosts/执行器漂移、过期、锁、failed/unknown 都停止相关执行。任务 runner 不自动 resume、不自动 docs-sync、不复用数据库迁移批准。

首次 SSH 密钥分发仍需要已有可信通道或用户在安全终端完成初始认证。免密是公钥/agent 认证，不等于无口令私钥。禁止从扫描结果自动信任 host key，禁止密码写入 argv、JSON、Markdown 或看板，禁止先关闭旧登录通道再测试新通道。

HTML 只接收字段白名单投影；不读取 private/credentials.json、不投影 env/connection/source URL/自由 notes，不使用 innerHTML 渲染数据，不依赖 CDN。时间过旧标 stale，已登记不代表在线，已配置不代表服务健康。

## 方法来源

- Linux 检查项分类：BagelHole/DevOps-Security-Agent-Skills，linux-administration 与 ssh-configuration（读取固定提交 0365f57a079b1332f95cf26e31dd2d5332a8399f）；linux-hardening 仅检索相关摘要。仅借鉴分类，不复制或执行其中升级全系统、格式化等操作。
- 资源清单/目标选择：ansible/ansible-documentation 的 inventory_guide/intro_inventory.rst 与 intro_patterns.rst（检索固定提交 7c56be6c083a7f76842be01d16522e7e6309d9c8）。采用显式主机范围和生成视图，不引入 Ansible 运行依赖。
- 现有 Speculo 的精确摘要、切片漂移、SSH 身份、双边回执与 fail-closed 恢复是实现安全底座，不降级为第三方通用脚本。

链接和进一步的具体采纳/拒绝记录见 OPS common/rules/research-and-decisions.md。

## 验证与回退

新增测试使用 disposable fixtures 和假执行适配器；真实 SSH/Linux/systemd/Docker 验收必须另行在用户服务器执行，不以模拟测试替代。全仓校验以 CI 实际状态为准。

回退代码不应删除 records/ 或其他 runtime。升级后旧批准因执行器摘要变化失效，应 inspect-run 核对历史事实，再为后续动作重新形成精确计划；禁止为兼容而绕过摘要检查。源文件由上述 Git commit 保留；本次不移动或覆盖用户运行数据。
