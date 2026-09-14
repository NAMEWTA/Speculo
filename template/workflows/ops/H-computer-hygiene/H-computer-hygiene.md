---
id: ops/computer-hygiene
type: workflow-entry
workflow: ops
name: 电脑环境治理
description: 对执行主机做默认只读卫生盘点，按确认分级隔离缓存或规划卸载/迁移，并把报告写入当前 Ops change。
keywords: [hygiene, 电脑清理, PATH, 缓存, 工具链, 卸载残留]
---

# 电脑环境治理

> 激活本 Work 后，先读取 `<Path>{roots.workflows}/ops/README.md</Path>`，再执行本入口。

H 是主机卫生盘点、Q 类缓存隔离/恢复和卫生报告的唯一 owner。它回答“这台执行主机上有哪些可清理线索、哪些必须保护、哪些动作已获逐项确认”。它不是全盘删除器、注册表优化器、自动软件裁判、管理员提权工具，也不替代 I/P/E 的部署评估与 attempt。

默认只创建报告。删除、卸载、PATH 迁移和系统清理必须分级、逐项确认。脚本仅对少数默认可识别缓存提供可选同卷隔离与恢复，**隔离不释放空间，没有 purge**。

## 读取范围

1. 先读取 `<Path>{roots.workflows}/ops/README.md</Path>` 与当前 Work 的状态入口。
2. 再读取 `<Path>{roots.workflows}/ops/common/rules/activation-and-memory.md</Path>`，按当前分支、状态和关键词定位最小相关工件。
3. 执行扫描或变更前读取 `<Path>{roots.workflows}/ops/H-computer-hygiene/references/01-safety.md</Path>`。
4. 只在本 Work 明确要求恢复、冲突、执行安全或归档证据时扩展为全量读取；缺少匹配证据或 owner/gateway 时停止受影响分支。

## 流程

### 1. 确认执行主机并选择 Change

执行环境不等于用户浏览器所在电脑。先确认当前工具运行在待检查主机；SSH、容器、WSL、虚拟机分别报告。没有本机执行能力时只交付步骤，不把远程沙箱或示例数据冒充用户检测结果。

解析 roots 并读取 status。本 Work 默认 `scope=global`。用户指定已有 hygiene change 时验证 tuple 后恢复；否则创建 `YYYY-MM-DD-computer-hygiene[-NN]`：从 `<Path>{roots.workflows}/ops/I-intake-and-assess/global-change-status-template.json</Path>` 写 `.status.json`，从 `<Path>{roots.workflows}/ops/I-intake-and-assess/request-template.md</Path>` 初始化 request、LOG、CONTEXT 和 ADR，再把 `{scope: global, project_id: null, change}` 加入全局 active。项目部署 change 不得被本 Work 改写成卫生盘点。

开始时设置 `current_work=ops/computer-hygiene`。Windows 只加载 `<Path>{roots.workflows}/ops/H-computer-hygiene/references/10-windows.md</Path>`；macOS 只加载 `<Path>{roots.workflows}/ops/H-computer-hygiene/references/11-macos.md</Path>`；Linux 仅加载 `<Path>{roots.workflows}/ops/H-computer-hygiene/references/12-linux.md</Path>` 作为保守补充分支。

### 2. 运行只读盘点

需要可信 Python 3.10+，仅标准库。不自动安装解释器，不绕过执行策略。先说明即将检查的类别及“默认不改动”边界，再执行；不必为默认只读盘点重复请求确认。用户未指定项目根时先做核心检查，把项目列为未检查；不得把 Home 或整盘当作 `--project-root`。

`--output` 必须指向当前 change 的卫生运行根，不得写回 Work 静态目录或 `{roots.workflows}`：

```text
<Path>{roots.state}/ops/changes/{change}/hygiene/runs/</Path>
```

```sh
python3 <Path>{roots.workflows}/ops/H-computer-hygiene/scripts/hygiene.py</Path> audit \
  --output <Path>{roots.state}/ops/changes/{change}/hygiene/runs/</Path>
```

```powershell
python <Path>{roots.workflows}/ops/H-computer-hygiene/scripts/hygiene.py</Path> audit `
  --output <Path>{roots.state}/ops/changes/{change}/hygiene/runs/</Path>
```

可用 `<Path>{roots.workflows}/ops/H-computer-hygiene/templates/config.example.json</Path>` 提供目标 DevRoot、排除目录和扫描预算。目标路径只生成建议。脚本在 output 下创建 `YYYY-MM-DD/HHMMSS-<run-id>/`，同日多次不覆盖。退出码 2 不得报告成功。保存脚本返回的确切报告路径。

### 3. 补全实际生效证据

读取主报告，先处理已证实的路径重复、失效项、多工具命中和配置来源。默认脚本只检测路径，不宣称已知版本。需要版本/实际路径时，按 `<Path>{roots.workflows}/ops/H-computer-hygiene/references/20-toolchains.md</Path>` 的核验矩阵，在确认二进制来源可信且用户同意后做最小查询。原生结果写入同次运行目录的 `YYYY-MM-DD.native-evidence.json`，字段采用 `<Path>{roots.workflows}/ops/H-computer-hygiene/templates/native-evidence.example.json</Path>`。资料入口见 `<Path>{roots.workflows}/ops/H-computer-hygiene/references/00-sources.md</Path>`；交付时未在线访问的来源不得冒充已完成搜索。

### 4. 形成报告与分级计划

报告必须覆盖 `<Path>{roots.workflows}/ops/H-computer-hygiene/references/40-report-spec.md</Path>`。动作类别不得共用授权：

| 类别 | 允许程度 | 执行方式 |
| --- | --- | --- |
| Q：少数缓存隔离 | 逐项确认后可选 | 脚本只重命名、不释放空间 |
| C：原生缓存/系统清理 | 需确认实际命令与影响 | 按系统/工具参考执行或列出人工步骤 |
| M：环境归一化迁移 | 独立方案与确认 | 先备份再逐生态验证；脚本不改 PATH |
| U：精确软件卸载 | 应用身份和数据选择分别确认 | 官方卸载器；残留另行确认 |
| P：源码/配置/凭据/系统组件 | 默认保护 | 不得由“全面清理”推导为可删 |

环境方案按 `<Path>{roots.workflows}/ops/H-computer-hygiene/references/21-path-migration.md</Path>`。仓库治理按 `<Path>{roots.workflows}/ops/H-computer-hygiene/references/22-repositories.md</Path>`。卸载按 `<Path>{roots.workflows}/ops/H-computer-hygiene/references/30-software-removal.md</Path>`。

### 5. 用户逐项授权后才变更

报告先交给用户。禁止代理自行 approve，也不得把“安装/编写本 Work”视为同意清理当前机器。Q 类审批与 apply 使用脚本 `review` / `approve` / `apply`；approval 写入 `<Path>{roots.state}/ops/changes/{change}/hygiene/approvals/</Path>`，不得覆盖已有 approval。隔离目录为本机 `~/.speculo-hygiene/quarantine/<运行ID>/`，属主机 external mutation，不是 Ops state。没有 purge。C/M/U 永久动作必须重新说明不可逆影响并单独授权。

### 6. 验证、完成与路由

任何错误立即停止后续变更。恢复默认只预览，确认 token 后才 rename 回去。验收可运行：

```sh
python3 -m unittest discover -s <Path>{roots.workflows}/ops/H-computer-hygiene/tests</Path> -v
```

模拟测试不能替代真机验收。重读卫生报告后：成功盘点将 `ops/computer-hygiene` 去重写入 `works_run` 并清空 `current_work`。用户确认无需 P/E 部署闭环时，H 可将 **hygiene-only** global change 设为 `completed` / `ready_to_archive` / `outcome=succeeded`，且 `latest_attempt_id` 保持 null；然后路由 `<Path>{roots.workflows}/ops/A-archive-and-learn/A-archive-and-learn.md</Path>`。仍有待确认 C/M/U 或 Q apply 时保持 active/blocked，并返回本 Work。混入 plan/attempt 的部署 change 不得由 H 标记 completed。

## 完成标准

- 执行主机边界已记录，报告只代表该环境；
- 只读盘点产物位于当前 change 的 `hygiene/runs/`，未写入 Work 静态目录；
- 默认运行未安装工具、未启动扫描到的程序、未执行 profile/卸载字符串；
- Q/C/M/U/P 未共用授权；未确认路径无文件系统变更；
- hygiene-only 完成后 `latest_attempt_id` 仍为 null，且至少有一份日期主报告；
- validator 通过并返回唯一下一路由。

## 子文件引用

- 安全与来源：`<Path>{roots.workflows}/ops/H-computer-hygiene/references/01-safety.md</Path>`、`<Path>{roots.workflows}/ops/H-computer-hygiene/references/00-sources.md</Path>`
- 系统分支：`<Path>{roots.workflows}/ops/H-computer-hygiene/references/10-windows.md</Path>`、`<Path>{roots.workflows}/ops/H-computer-hygiene/references/11-macos.md</Path>`、`<Path>{roots.workflows}/ops/H-computer-hygiene/references/12-linux.md</Path>`
- 工具链/仓库/卸载：`<Path>{roots.workflows}/ops/H-computer-hygiene/references/20-toolchains.md</Path>`、`<Path>{roots.workflows}/ops/H-computer-hygiene/references/21-path-migration.md</Path>`、`<Path>{roots.workflows}/ops/H-computer-hygiene/references/22-repositories.md</Path>`、`<Path>{roots.workflows}/ops/H-computer-hygiene/references/30-software-removal.md</Path>`
- 报告与持久化：`<Path>{roots.workflows}/ops/H-computer-hygiene/references/40-report-spec.md</Path>`、`<Path>{roots.workflows}/ops/H-computer-hygiene/references/50-speculo-integration.md</Path>`
- 机械脚本：`<Path>{roots.workflows}/ops/H-computer-hygiene/scripts/hygiene.py</Path>`
- 规则与模板：`<Path>{roots.workflows}/ops/H-computer-hygiene/rules/catalog.json</Path>`、`<Path>{roots.workflows}/ops/H-computer-hygiene/templates/config.example.json</Path>`、`<Path>{roots.workflows}/ops/H-computer-hygiene/templates/native-evidence.example.json</Path>`
