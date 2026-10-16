---
name: vscode-fullstack
description: 整理 VS Code 本机与 Remote SSH/WSL/Container 的 Profile、扩展和 JSONC 设置，复用已有 Java/Maven、Go、Node、Python 与 Vue/React 开发环境。用于工具找不到、重复下载或本地远程配置不一致；保留项目版本与用户定制，不接管应用开发或系统运行时安装。
license: MIT
compatibility: Requires access to the actual VS Code/Insiders/Remote host and its supported CLI or UI; extension installation needs approved network access.
metadata:
  author: NAMEWTA
  wta-format-reviewed: '2026-10-14'
---
# VS Code 全栈 Profile

## 输入与输出契约

先确定实际可访问的机器、产品、活动 Profile、扩展主机、所需语言和只读/修改模式。仅配置一个 Profile 时不扩大到全部；用户要求整体统一时，盘点相关 Profile，选主用基线并保留旧项和项目特例，不把“整理”解释成批量删除。

沿用本次会话已确认的目标和授权，不重复询问已决定的事项。仅对影响结果而无法推断的选择补问，例如主用 Profile 或是否改变项目的 Wrapper 策略；等待期间继续只读盘点。未使用的语言不整套安装。

交付主机/Profile/设置作用域清单、实际变更及保留冲突、工具入口与版本、备份/回滚方法和逐层验收结果。无法访问的客户端给出具体步骤和待验收项，不宣称已配置成功。

“Ubuntu 本地和 Windows Remote SSH 都使用现有 Java、Go、Node”或“给当前 Profile 补 Python/Vue，保留 formatter”应进入本技能；“给 React 页面添加登录表单”不应进入。

## 先盘点，再形成差异

1. 确认 Stable/Insiders/便携版、系统/架构、实际 CLI 和 Server 版本；用 `--version`、`--help` 及活动窗口验证能力。区分客户端与执行代码的主机，不将容器当用户电脑，不因两个目录的 Profile 同名就认定已同步。
2. 读取目标设置、工作区覆盖、扩展 ID/版本/启用状态及已有项目版本选择机制。多端统一或调整默认 Profile 时先读 [Profile、作用域与验收](references/profiles-and-validation.md)。
3. 涉及已有工具发现、重复下载或项目版本时，读 [运行时复用](references/runtime-reuse.md)，比较 shell、扩展宿主、集成终端和调试器实际入口，不能只凭路径存在判断可用。
4. 按 [扩展与设置](references/extensions-and-settings.md) 选择缺失能力，列出每项新增/修改/删除、目标作用域和理由；用户的 formatter、解释器、片段和禁用选择优先。

扩展、工具下载及联网文档核对须在宿主允许及用户任务授权范围内；说明目标服务可见的请求信息，不上传配置、凭据或项目内容。离线任务使用本地清单和已核验缓存，缺少能力时明确报告。

## 备份后最小修改

使用每轮独立的私有备份目录，记录原文件内容、原先不存在、权限、摘要，以及扩展版本/启用状态、Profile 和工作区关联。先预览差异；写前比较基线，发现并发编辑先重新合并。具体回滚边界见 [备份与回滚](references/profiles-and-validation.md#备份与回滚)。

`settings.json` 按 JSONC 处理：用可靠解析器的增量编辑或精确补丁加解析校验，保留注释、尾逗号和无关键，拒绝无效输入，不自制正则解析器或严格 JSON 整文件重排。对象按键合并；仅对集合型数组去重合并，保留 PATH 等有序配置的语义。已有冲突默认保留并报告；明确属于用户授权的统一目标时才定向修正。

通过受支持的 CLI/UI 创建、选择、关联 Profile 和安装扩展。不得手写内部数据库、扩展注册表或复制/共享扩展目录模拟安装。安装前检查扩展包成员和必要依赖，安装后重新比对清单；锁定扩展包版本不等于锁定依赖。

复用现有语言运行时与项目选择入口；必要的缺失辅助工具（如 gopls、Delve）按兼容性和已授权下载范围补齐，不隐式升级语言运行时。不重写项目规范或系统全局环境，不为通过测试关闭 Workspace Trust、TLS 或签名验证。

目标不明、权限拒绝、配置损坏、版本不兼容或来源无法验证时停止相关写入，保留可完成的独立工作及具体阻碍；安装失败按有限次数重试，只终止本任务启动的进程树。没有新证据不反复重装、清缓存或扩大权限。

## 验收

按改动范围逐层检查：配置读回及重复执行无差异 → 运行时版本/最小样例 → 实际扩展宿主的补全、诊断、格式化或调试 → 各客户端连接。完整环境统一按 [验收分层](references/profiles-and-validation.md#验收分层) 执行；小范围设置变更只运行相关检查。

报告明确区分静态读回、命令行运行、隔离编辑器验证、真实业务项目与真实 Remote 会话。旧日志、目录里存在扩展、设置写入或 Settings Sync 成功都不能代替激活与功能证据。保留失败与复测记录；缺少 GUI/客户端时标为待验证。
