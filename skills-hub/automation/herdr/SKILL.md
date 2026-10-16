---
name: herdr
description: 控制 Herdr（面向编程智能体的终端复用器）。仅当用户明确提到 Herdr，或要求用 Herdr 查看/控制窗格、标签页、工作区、命令或另一个智能体时使用。不要只因为任务适合后台终端、委派或并行就启用。需要 HERDR_ENV=1。
license: MIT
compatibility: Requires HERDR_ENV=1 and a working Herdr CLI (checked against herdr 0.9.4) in the actual managed host/session; commands must match local --help.
metadata:
  author: NAMEWTA
  wta-format-reviewed: '2026-10-14'
  wta-explicit-only: 'true'
  wta-single-file: 'true'
---
# Herdr

Herdr 把终端组织成 workspace、tab 和 pane，识别窗格里运行的编程智能体，并通过 `herdr` CLI 暴露当前会话。

发出任何控制命令之前，先确认本智能体运行在 Herdr 托管的窗格中：

```bash
test "${HERDR_ENV:-}" = 1
```

检查失败就说明当前不在 Herdr 中，然后停止。不要从 Herdr 外部查看或控制聚焦中的 Herdr 会话。

检查通过后，`PATH` 中的 `herdr` 会连到当前会话。用它查看相邻工作、创建终端布局、启动智能体和命令、读取输出、等待状态变化。

## 学习当前 CLI

已安装的二进制是命令语法的权威。先运行：

```bash
herdr --help
```

然后对需要的命令组不带子命令运行，打印该组帮助：

```bash
herdr agent
herdr pane
herdr workspace
herdr tab
herdr worktree
herdr terminal
herdr notification
herdr integration
herdr session
herdr machine
```

不要运行裸 `herdr` 做发现；它会启动或附着 TUI。不要通过省略参数去试探会改状态的嵌套命令。像 `herdr workspace create` 这类命令在默认参数下就是有效的，会直接执行。

多数控制命令返回 JSON。从响应里读取标识符和状态，不要自己预测。

## 理解布局、窗格和智能体

按任务选择原语：

- workspace、tab、pane 拓扑组织终端位置。
- pane 命令控制原始终端、shell、测试、服务、输入和输出。
- agent 命令控制当前占据某个窗格、已被识别的编程智能体。

窗格可以没有智能体。`agent start` 需要一个已存在、可用的 shell 窗格，**从不**创建、拆分或移动布局。普通进程用 pane 命令。需要 Herdr 校验智能体身份，或解释 `idle`、`working`、`blocked`、`done`、`unknown` 生命周期状态时，用 agent 命令。

agent 命令接受唯一的在线智能体名字，或当前承载该智能体的 pane ID；不接受 terminal ID，也不接受光秃秃的 kind 标签。名字必须匹配 `[a-z][a-z0-9_-]{0,31}`，并在存活智能体中唯一。名字跟随当前窗格占用者；智能体退出、被 release 或被替换时清除。用 Ctrl+Z 挂起智能体后运行非智能体命令，只要原进程仍存活就保留身份；但另一个被识别的智能体接管后不保留原身份。保留身份不代表智能体在前台；发送输入前先检查窗格。

`idle` 和 `done` 通常表示智能体可以接收输入；二者都不保证一个陌生的审批对话框已被识别，也不保证保留身份的智能体在前台。CLI/API 用 server 的 seen 状态区分二者：显式 focus 命令会把目标标为已看，read 不会。每个 TUI 客户端独立跟踪已查看的完成项，所以 Done 徽章可能与 CLI 或另一个客户端不同。Antigravity 在后台任务或子智能体仍运行时就可能显示 idle，所以稳定状态等待不能证明这些任务已完成。`blocked` 表示 Herdr 识别到了审批或提问界面。`unknown` 表示有智能体但 Herdr 无法有把握分类；这不能证明已完成。

## 使用 ID 和调用方上下文

公开 ID 是不透明的稳定句柄：

- workspace：`w1`
- tab：`w1:t1`
- pane：`w1:p1`

已关闭的 tab 和 pane ID 不会复用。窗格移到另一个 workspace 后会得到新的、带 workspace 限定的 pane ID。`pane move` 之后，继续使用 `.result.move_result.pane.pane_id` 或在线智能体名字。旧值在 `.result.move_result.previous_pane_id` 中；只有被移动进程继承的调用方上下文还能解析这个旧 ID，所以不要把它当作通用的智能体目标。

Herdr 向每个托管窗格注入调用方上下文：

```bash
printf '%s\n' "$HERDR_WORKSPACE_ID" "$HERDR_TAB_ID" "$HERDR_PANE_ID"
```

pane 命令要作用于调用方自己的窗格时，优先用 `--current`。`pane split` 省略目标时，有 `HERDR_PANE_ID` 就用调用方窗格，否则用聚焦窗格。其他命令可能使用 UI 聚焦窗格，那可能属于用户或另一个客户端。

发现在线状态：

```bash
herdr workspace list
herdr tab list --workspace "$HERDR_WORKSPACE_ID"
herdr pane current --current
herdr pane list --workspace "$HERDR_WORKSPACE_ID"
herdr agent list
```

创建类响应会给出下一步要用的 ID。`workspace create` 返回 `.result.workspace`、`.result.tab` 和 `.result.root_pane`。`tab create` 返回 `.result.tab` 和 `.result.root_pane`。`pane split` 把新窗格放在 `.result.pane`。

ID 和在线智能体名字的作用域是一个 server。两台已保存的 SSH 机器可以同时有 `w1:p1` 或名为 `reviewer` 的智能体。在 TUI 中选中某台机器不会改变你窗格里命令的目标：不加 `--machine` 时，它们仍使用继承的 session 和 socket。

控制已保存的 SSH 机器时，发现和之后每条命令都使用同一个全局前缀：

```bash
herdr --machine <label-or-id> agent list
herdr --machine <label-or-id> pane list
herdr --machine <label-or-id> agent prompt <remote-agent-name> "Reply with your current status." --wait --timeout 120000
```

选择器必须是已启用的保存配置 ID，或唯一且区分大小写的标签，不能是任意 SSH 主机名。命令使用该配置的远端会话，不需要打开 TUI。不要把 `--machine` 与 `--session` 或 `--remote` 组合。在那台机器上重新发现 ID；继承的本地 ID 和 `--current` 不能指向远端窗格。

两端安装都必须支持 machine API 转发，远端 server 必须已在运行且 API 兼容。转发从不安装、启动或重启 server，也从不回退到本地。本地配置、会话管理、安装命令和交互附着不会被转发。远端 worktree 路径必须是绝对路径、`~` 或以 `~/` 开头；插件链接路径必须是绝对路径。连接失败不能证明写操作没有生效：重试前先检查远端状态。

`herdr machine list` 列出已保存的连接配置，不是跨机器的窗格清单；脚本中加 `--json`。只有用户要求时才添加、删除、启用或禁用配置。删除配置会断开客户端，但不会停止远端会话。交互式 `machine add` 会发现运行中的远端会话，并可能让用户选择一个；非交互设置使用远端默认会话，除非显式提供 `--remote-session`。诊断故障机器用 `herdr machine status [<label-or-id>] --json`。`herdr machine reconnect` 需要用户在自己的终端完成 SSH 认证；不要代为运行。setup 在停止不兼容 server 之前会询问，默认 No；未经用户同意不要批准替换。实验性 handoff 不是 `machine add` 的一部分。

## 启动并协调智能体

默认使用当前 tab 中的兄弟窗格和当前工作目录。除非用户明确要求那种拓扑或位置，不要新建 workspace、tab、worktree，也不要换 cwd。

尊重用户指定的方向。否则先检查调用方窗格：

```bash
herdr pane layout --pane "$HERDR_PANE_ID"
```

宽窗格向右拆，窄或高的窗格向下拆。避免同方向反复拆分，造成无法使用的窄列或矮行。把用户焦点留在调用方窗格，并显式保留调用方工作目录：

```bash
herdr pane split --current --direction right --cwd "$PWD" --no-focus
```

合适时把 `right` 换成 `down`。新窗格 ID 从 `.result.pane.pane_id` 读取。

可用的 shell 窗格必须停在交互提示符：shell 本身在前台，没有前台命令、编辑器或智能体在运行。在该窗格中用一个有意义的唯一名字启动受支持的智能体：

```bash
herdr agent start reviewer --kind codex --pane <returned-pane-id>
```

使用用户要求的 kind；Claude 和 Codex 的启动命令以文末“Claude 与 Codex 的启动方式”为准。运行 `herdr agent` 查看已安装的 kind 列表和选项。原生智能体参数只能放在 `--` 之后：

```bash
herdr agent start reviewer --kind codex --pane <returned-pane-id> -- <agent-args...>
```

`agent start` 成功返回，表示 Herdr 已在同一窗格检测到预期智能体，并认为它可以接收交互输入。如果智能体在启动期间处于 blocked，命令会立即返回 `agent_not_ready`，但名字仍可用于 `agent read` 和 `agent send-keys`。等它变为 idle 后再发送 prompt。启动默认超时 30 秒。

通过 agent 接口提交工作：

```bash
herdr agent prompt reviewer "Review the current diff and report only actionable findings." --wait --timeout 120000
```

`agent prompt` 遵守窗格当前的 bracketed-paste 模式，把文本和编码后的 Enter 作为一次有序提交发送。只有两者都写入后才报告提交成功；这本身不能证明智能体已开始一轮工作。在 Windows 上使用 Codex 时，Herdr 会在 Enter 之前发送粘贴边界，因此提交不依赖 prompt 长度。如果智能体已经停在审批或提问对话框，`agent prompt` 会在发送任何输入之前以 `agent_blocked` 拒绝。先检查 blocked 界面，回答前询问用户。普通智能体工作用 `--wait` 就够了：它等待第一个稳定的 `idle`、`done` 或 `blocked` 状态。不要再用 `--until` 重复这些默认值。

使用 `--wait` 时，从非 working 状态发出的 prompt 必须产生可观察到的 `working` 或 `blocked` 活动。提交后，Herdr 最多等待五秒观察这一活动；无关的 `idle`、`done` 或 session 变化不满足这个条件。没有观察到活动则返回 `agent_prompt_stalled`；调用方超时先到则返回 `timeout`。调用方超时包含提交时间。不设超时时，观察到活动后，稳定状态等待是无限期的。这个等待跟踪生命周期状态，不跟踪某一轮；如果智能体已在 working，当前轮结束也可能满足它。

`--until` 只用于特定状态的工作流，例如等待一个已在运行的智能体请求输入：

```bash
herdr agent wait reviewer --until blocked --timeout 120000
```

不带 `--until` 时，单独的 `agent wait` 与 `agent prompt --wait` 使用相同的稳定状态默认值。

交互式智能体界面使用逻辑按键：

```bash
herdr agent send-keys reviewer esc
herdr agent send-keys reviewer ctrl+c
```

Herdr 在写入任何字节之前校验全部按键。通过解析后的智能体读取结果：

```bash
herdr agent get reviewer
herdr agent read reviewer --source recent-unwrapped --lines 120
```

等待失败或返回 `blocked` 时，先查看 `agent get` 和 `agent read`，再决定发送什么输入。timeout 或 stalled 不能证明 prompt 从未送达；不要盲目再次提交。只有确实需要原始终端控制时才使用 pane 接口。

## 在另一个窗格运行普通命令

按同样的几何规则创建兄弟窗格，保留调用方工作目录，不改变用户焦点：

```bash
herdr pane split --current --direction right --cwd "$PWD" --no-focus
```

从 `.result.pane.pane_id` 读取新窗格 ID，然后运行并检查命令：

```bash
herdr pane run <returned-pane-id> "just test"
herdr pane wait-output <returned-pane-id> --match "test result" --timeout 120000
herdr pane read <returned-pane-id> --source recent-unwrapped --lines 120
```

`pane run` 把命令文本和 Enter 一起排队；成功表示已被接受，不表示命令已执行。在 macOS 上，`pane run` 和 `agent start` 会在排队前拒绝超过终端当前规范行输入长度的命令。等交互 shell 提示符出现后再重试。这项检查只覆盖本次提交，不覆盖之前未完成的行，也不覆盖之后的终端模式变化。`pane wait-output` 会立即搜索所选快照，已经存在的输出也能匹配。用 `--match <text>` 匹配字面子串，用 `--regex <pattern>` 匹配 Rust 正则。省略 `--timeout` 表示无限等待。

按任务选择 read source：

- `visible`：当前渲染的可视区域。
- `recent`：最近渲染的输出，包含软换行。
- `recent-unwrapped`：最近输出并接上软换行；日志和对话记录优先使用。
- `detection`：智能体检测使用的底部缓冲区纯文本快照。

颜色和终端样式本身是证据时，用 `--format ansi`；否则用 text。

`--lines` 向 Herdr 请求更多行，来源是窗格可用的屏幕和主机回滚缓冲区。备用屏幕（alternate screen）的行不会进入普通主机回滚。对受支持的 idle 智能体，Herdr 可以收集应用自身保存的历史，之后恢复视口，但不是每个应用或每条回复都能这样取回。

如果加大读取范围后仍看不到完整回复，让智能体把回复写成临时目录中的 Markdown 文件，只回复文件路径，然后在同一台机器上读取该文件。这只是兜底方法；不要在第一次 prompt 中就要求输出到文件。

## 安全与协调规则

- 后台工作使用 `--no-focus`，除非用户要求切换上下文。
- 使用 `--current`、明确的 pane ID 或唯一的智能体名字。不要依赖另一个客户端的聚焦窗格。
- 从 JSON 响应解析 ID。不要从侧边栏顺序或示例推导。
- 除非用户明确要求，不要关闭不是你创建的 workspace、tab、pane 或 session。普通的 CLI/API 关闭不会继承 TUI 的“最后一个窗格”确认。`workspace close --group` 会关闭主 workspace 及其关联的 worktree workspace；不要只为了绕过 `workspace_group_close_required` 就加上它。
- 只有用户核实过仓库后才使用 `--trust-repository`。它授予单次请求的 Git 信任，不是 worktree 命令失败后的常规重试。
- 更新后，client 和 server 版本可能不同。依赖新的 server 功能之前，先检查 `herdr status`。缺少某个方法不构成停止或升级 server 的许可。
- 除非用户明确要停止 server 及其窗格进程，否则不要从活动会话中运行 `herdr server stop`。
- 永远不要杀掉 Herdr 主进程。需要隔离 server 的实验，使用命名的测试 session。
- CLI server 错误以 JSON 输出到 stderr，退出状态 1。CLI 语法错误退出状态 2。

## Claude 与 Codex 的启动方式

**重点：** 用户要求 Claude 或 Codex 时，必须使用下面对应的命令，不要自行改用其他参数。`<name>` 换成唯一名字，`<returned-pane-id>` 换成 `pane split` 实际返回的窗格 ID。

### 要求 Claude 时

```bash
herdr agent start <name> --kind claude --pane <returned-pane-id> -- --dangerously-skip-permissions
```

相当于在该窗格运行 `claude --dangerously-skip-permissions`。`--dangerously-skip-permissions` 必须放在 `--` 之后，作为 Claude 的原生参数传入。

### 要求 Codex 时

```bash
herdr agent start <name> --kind codex --pane <returned-pane-id> -- --dangerously-bypass-approvals-and-sandbox
```

相当于在该窗格运行 `codex --dangerously-bypass-approvals-and-sandbox`。`--dangerously-bypass-approvals-and-sandbox` 必须放在 `--` 之后，作为 Codex 的原生参数传入。

### 两者通用

- 启动前，窗格必须停在交互 shell 提示符。
- 启动后用 `herdr agent prompt <name> "..." --wait --timeout 120000` 下发任务，用 `herdr agent read <name> --source recent-unwrapped --lines 120` 读取结果。
- 返回 `agent_not_ready` 时，先用 `herdr agent read <name>` 查看启动界面（例如确认或信任对话框），询问用户后再处理，不要自动确认。
