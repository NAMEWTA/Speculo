# OPS：控制端、服务器与项目部署

[手册首页](../README.md) · [领域目录](README.md) · [领域源入口](../../template/workflows/ops/SKILL.md)

OPS 用明确资源、计划、批准和回执管理运维。新手先分清：**控制端**是发起操作的机器，**Host/服务器**是目标机器，**Project**是要运行的应用或共享服务，**Deployment**是某个项目在某个目标上的实例。

准备控制端不等于登记本机为部署目标；接入服务器也不等于授权修改系统或部署应用。

## 安装和常用路线

```bash
speculo init . --workflows ops --skill-targets agents --skills domain/ops
```

常见顺序是 `Initialize → Server Connect → 必要的 Host Manage → Project Deploy → Inventory View`。目标已经接入、环境已就绪时复用事实，不重复初始化。所有实际操作通过领域现有 `ops.mjs` 网关和当前参考执行，而不是复制通用运维命令直接修改目标。

| Work | 工作对象 | 主要结果 |
|---|---|---|
| [Initialize](#initialize) | 控制端 | 身份、受限状态根、本机工具证据 |
| [Server Connect](#server-connect) | 一个服务器 | 可信接入、账号与持久化根确认、检查回执 |
| [Host Manage](#host-manage) | 一个主机的系统环境 | 基线、Docker、主机级入口及验证 |
| [Project Deploy](#project-deploy) | 一个项目和明确目标服务器 | 部署、健康检查、版本和双边文档 |
| [Inventory View](#inventory-view) | 已有资源账本 | 本地 Markdown、JSON 和离线 HTML 视图 |

<a id="initialize"></a>
## I · Initialize：准备控制端

**业务 ID：** `ops/initialize` · [源入口](../../template/workflows/ops/ops-i-initialize/SKILL.md)

**什么时候用：** 第一次从这台机器发起 OPS 工作。**准备什么：** 当前环境、可用权限，以及希望使用的状态位置。

AI 先只读识别 shell、SSH、Git、Node、uv、JDK 等实际工具；控制端执行器是 Node。初始化创建控制端身份与受限账本，已具备的工具复用，缺少的如实记录。

```text
使用 ops/initialize，准备当前控制端。
先检测现有工具和权限，建立需要的受限状态；这次不连接远端，也不把本机登记为部署服务器。
```

安装工具不是自动前置动作。需要引导时必须有可信安装器、SHA256 和对应确认；不能因为没有管理员权限就绕过系统授权。

<a id="server-connect"></a>
## S · Server Connect：可信接入并登记服务器

**业务 ID：** `ops/server-connect` · [源入口](../../template/workflows/ops/ops-s-server-connect/SKILL.md)

**准备什么：** 明确 server_id、地址和端口、远端账号、已验证主机指纹、私钥或 agent 来源。不要把密码/私钥正文贴进普通报告。

顺序是可信接入 → 不提权探测真实账号主目录 → 用户选定持久化根 → 必要且获准的 Node 引导 → enroll/盘点 → base 检查。目标根不能从当前项目目录或猜测的 HOME 推导。

```text
使用 ops/server-connect 接入服务器 staging-01。
我提供实际地址、端口、账号、已核验指纹和 SSH agent 来源。
连接后先报告真实主目录，使用我确认的持久化根完成登记和 base 检查。
```

**完成怎么看：** 有真实接入与检查回执、根确认和缺口清单。登记成功不代表所有项目都能部署。更换账号仍使用本入口的专门流程；系统环境交 Host Manage。

<a id="host-manage"></a>
## H · Host Manage：维护服务器环境

**业务 ID：** `ops/host-manage` · [源入口](../../template/workflows/ops/ops-h-host-manage/SKILL.md)

**什么时候用：** 服务器已接入，需要准备根内目录、系统基线、Docker 或主机级入口；也适用于明确的主机治理任务。

**准备什么：** 一个 host_id、具体目标、受影响项目/消费者和恢复要求。AI 生成包含真实写集、下载、重启、持久化与验证的计划，通过原批准/任务通道执行。

```text
使用 ops/host-manage，为已登记的 staging-01 准备运行这个项目所需的 Docker 环境。
先核对现状和受影响消费者，给出具体计划与验证，再按已确认范围执行。
```

它不会顺便清未知进程、删除旧环境或部署业务应用。成功要有主机检查和双边记录；主机环境通过不代表 APP 业务健康。失败恢复原 Run，不能换一个 task 掩盖未知动作。

<a id="project-deploy"></a>
## D · Project Deploy：部署和升级明确的应用

**业务 ID：** `ops/project-deploy` · [源入口](../../template/workflows/ops/ops-d-project-deploy/SKILL.md)

**准备什么：** project_id、明确 server_ids、环境/实例、真实本地源码或固定 commit、构件、配置与密钥来源、启动方式、健康检查、数据和迁移要求。

AI 读取真实项目清单，识别构建、持久化、环境变量、依赖、迁移和恢复能力，形成项目专用计划。公共 MySQL、Redis、MinIO 按共享服务项目管理，通过 allocation/binding 关联应用，不把共享数据复制成 APP 的私有物理目录。

```text
使用 ops/project-deploy，将我指定固定提交的 todo-api 部署到 staging-01 的测试环境。
先分析真实启动、数据库迁移、持久化和健康检查，列出版本、依赖、执行顺序与恢复限制。
```

确认后的执行需要真实服务健康、版本证据，以及服务端 README 和控制端部署记录的双边摘要回执。`docs_pending` 不能报告全部完成。升级/回滚使用新的明确版本和计划，数据回滚能力不能凭模板假设。

卸载默认停止自身、退役实例与绑定，保留数据、账号、共享网络和公共服务。若来源是 SpecDev，接收原版本与 Evidence，但部署权限仍单独核对。

<a id="inventory-view"></a>
## V · Inventory View：查看服务器和部署关系

**业务 ID：** `ops/inventory-view` · [源入口](../../template/workflows/ops/ops-v-inventory-view/SKILL.md)

**什么时候用：** 想知道哪些服务器运行哪些项目，或某个项目部署在哪里。只需要已初始化状态根和已有检查证据，可指定过期阈值。

```text
使用 ops/inventory-view，生成当前资产的离线视图。
同时按服务器和项目展示部署关系，区分期望版本、观察版本及过期或未知检查。
```

产物是状态根的 `FLEET.md` 和 `records/views/<view-id>/` 下的 Markdown、JSON、HTML、manifest。可以直接本地打开，不启动服务、不访问 CDN、不连接目标机器。

视图不会读取私密配置用于展示，也不会刷新远端真实健康。要重新检查用 S/H，要修改部署用 D。视图生成失败只处理视图，不重跑业务操作。

## 新手如何确认一次部署真的完成

1. 目标身份、账号、持久化根和版本都明确。
2. 计划覆盖构件、配置、数据、依赖与健康检查。
3. 授权对应真实目标和动作；已有授权直接复用。
4. 执行回执说明实际落地结果，不只说“命令运行过”。
5. 双边文档核验完成，Inventory View 能导航本次真实记录。

配置文档默认使用 `secret_ref`，受限真实配置镜像另行保存。明文导出需要明确 opt-in。遇到 started-only、unknown、failed 或 docs_pending，先沿原运行记录恢复；不要删锁或换新任务直接重试。
