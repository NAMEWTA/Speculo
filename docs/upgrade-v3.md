# 从 2.x 升级到 3.x

v3 是方法层的破坏性简化。软件安装和文件保护继续工作，旧工作流协议不再维护。

## 替换的入口

| 原有入口/资产 | v3 用法 |
| --- | --- |
| SpecDev 的 16 个 Work 与 Ops 的 5 个 Work | `domain/specdev`，直接描述需求、原型、实施或部署 |
| Learning、Media、Person 的 Work | 相应领域的单个 `SKILL.md` |
| goal-plan、implementation-plan、tickets-map | 按需在当前 release 记录里写小清单 |
| `coordination-init`、固定 TASK/REPORT、Herdr/Orca 适配 | 使用当前 AI 宿主与用户选择；无 Speculo 编排层 |
| workflow manifest、runtime-contract、业务 schema/validator | 取消；代码和真实交付结果负责验证 |
| 12 份生成的 Canonical 文档 | 直接读取对应单文件技能 |
| change 内 DESIGN 与副本摘要 | 长期设计源；release 引用具体版本 |
| 多层交接报告 | 更新当前工作记录中的结果、阻塞和下一步 |

八个仍有独立用途的命令保留。旧命令脚本不是 v3 的程序 API；命令现在是可读指令。专项 Hub 工具需要确定性操作时仍可带脚本，但不包含业务阶段状态机。

## 安装升级

在安装好 v3 CLI 后，在项目中运行：

```bash
speculo init .
speculo doctor .
```

已有 2.x 安装继续使用同一个项目标识和文件保护机制。不指定新选择时，旧 `ops` 选择合并为 `specdev`；已不存在的 Work/编排投影退出有效选择。显式传入被删除的 ID 会报出替代建议，避免误执行旧方法。

使用 `--skills keep` 或默认保留时，保留当前仍存在的方法，不保留已删除入口。需要新 SpecDev 宿主入口时可明确运行：

```bash
speculo init . --workflows specdev --skill-targets agents --skills domain/specdev
```

安装器的 workspace、install、managed、projection 等元数据仍保留。它们保护文件更新，与 AI 的需求/spec/票据格式无关。

## 旧项目数据

旧 SpecDev changes、Ops 环境资料、归档、图像、设计代码、JSON 状态和不完整草稿按原始字节保留。刷新不转换、不删除、不“修好”它们，也不再验证它们的业务 schema。

继续一项旧工作时，让 AI 读取与任务有关的旧记录，确认哪些事实仍然成立，把后续有效工作放入新的简短 release 记录。保留来源路径，按需要提纯设计和部署事实。无需批量迁移历史库，也不要把过往“通过”标记当作当前版本已通过。

删除的是分发的方法和机器协议，历史证据仍在用户项目和本仓库 Git 历史里。安装器发现路径、权限、文件所有权或中断事务问题时仍会停止该安装操作。

Windows 的一个既有例外仍保留：存在旧 `.speculo/ops/private/credentials.json` 时，普通复制无法保证保留该明文凭证文件的 ACL，刷新会停止。先按原凭据管理方式处理这个文件的存储与权限，再升级；不要删除安装锁或忽略权限来强行刷新。

## 验收语义

[#105](https://github.com/NAMEWTA/Speculo/issues/105) 和 [#106](https://github.com/NAMEWTA/Speculo/issues/106) 的失效不能靠多几个字段解决。v3 直接保留批准设计本体、具体版本、实际对照与明确要求的验收决定，移除用 ID/摘要/标题匹配假装认证设计语义的工具。

这意味着没有 `validate-specdev --stage complete` 来替 AI 或用户做决定。安装验证仍可确定执行；业务完成则必须根据当前需求、真实产物和明确授权判断。更少文件不等于更低的交付要求。
