# 从 2.x 升级到 3.x

v3 重写工作流、Work、Skill 和相关手册，保留原任务能力与必要资源，取消业务格式和编排协议。它是方法及协议层的破坏性升级；安装器的文件保护和用户资料保留继续有效。

## 保留的能力与入口

34 个原 Work 的短 ID 保持不变，包含 `specdev/prototype`、`specdev/spec`、`specdev/goal-plan`、`specdev/tickets`、`specdev/implement` 以及 Learning、Media、Person 各项能力。Work 现在是独立可读的任务方法，不再携带阶段注册和强制状态文件。

Ops 合并进 SpecDev 后，五项能力仍有具体入口：

| 原 ID | 新 ID |
| --- | --- |
| `domain/ops` | `domain/specdev` |
| `ops/initialize` | `specdev/environment-setup` |
| `ops/server-connect` | `specdev/server-connect` |
| `ops/inventory-view` | `specdev/inventory-view` |
| `ops/host-manage` | `specdev/host-manage` |
| `ops/project-deploy` | `specdev/project-deploy` |

默认刷新和 `--skills keep` 会保留当前仍存在的 Work 选择，并迁移已有 Ops 选择。显式传入旧 Ops ID 时会提示新入口，避免把用户的新请求默默解释成另一选择。使用 `--workflows specdev` 安装合并后的领域。

## 退出支持的机制

| 旧机制 | 新用法 |
| --- | --- |
| Work manifest / stage 登记 / runtime-contract | 从真实目录与标准 SKILL.md 发现领域和 Work |
| goal-plan 的 Lead、DAG、派单、循环执行与 TASK/REPORT | goal-plan 负责目标与里程碑，tickets 负责必要切片；执行由当前宿主和用户请求决定 |
| `coordination-init`、内置 Herdr/Orca 适配 | 移除 Speculo 编排层 |
| 必填模板、业务 JSON Schema 与状态 validator | 按内容需要写一份记录，使用实际产物和证据判断结果 |
| Canonical 与生成的业务运行库 | 直接读取当前技能及其按需资料 |
| change 内强制 DESIGN 与摘要 | 长期设计源，交付记录引用固定版本 |
| 固定交接包 | 更新当前记录的结果、阻塞和下一步 |

确定性工具继续保留；解耦后的媒体渲染使用普通技术参数，不再要求旧 brief/shot/review 业务表单。具体工具用法以所属 Work 为准。旧业务脚本接口不作为 v3 的程序 API 兼容。

## 实际升级

安装 v3 CLI 后，在项目中运行：

```bash
speculo init .
speculo doctor .
```

只暴露 SpecDev 领域和一个部署入口的例子：

```bash
speculo init . --workflows specdev --skill-targets agents --skills domain/specdev,specdev/project-deploy
```

`--skills all` 是全部公开入口，不是最小安装所需。新领域有完整 Work 来源，宿主只暴露领域入口也能按需读取具体方法。

## 旧项目数据

旧 changes、DESIGN、原型代码、环境记录、二进制文件、不完整草稿与业务 JSON 都按原始字节保留。刷新不批量转换、不删除，也不再验证这些文件的业务 schema。

继续旧工作时，读取与任务有关的记录并核对真实代码、产物或环境。后续更新可以进入一份简短 release 记录，保留旧来源引用；长期设计和环境事实按需要提纯，无需一次性迁移整个历史库。

安装器自己的 workspace、install、managed、projection、Hub 和 transaction 元数据仍存在。它们决定文件归属和恢复，不是要求 AI 填写的业务表单。

路径、权限、归属和中断事务问题仍会阻塞相应安装。Windows 的既有例外保留：旧 `.speculo/ops/private/credentials.json` 存在时，普通复制不能保证保留其 ACL，刷新会停止。按原凭据管理方式处理它的存储和权限后再升级，不通过删除锁绕过。

## 设计与验收

[#105](https://github.com/NAMEWTA/Speculo/issues/105) 对应实际页面与批准设计的结构对照；[#106](https://github.com/NAMEWTA/Speculo/issues/106) 对应技术检查与明确要求的用户验收分开记录。没有人工验收要求的任务不增加门禁；已有要求不因测试通过而消失。

完整能力承接见 [重构对应表](refactor-map.md)，日常使用见 [能力总览](capabilities.md)。
