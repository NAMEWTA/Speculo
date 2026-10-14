# 按需 owner、验证与取消记录

只在相关动作需要可回读证据时采用；不是每 Work 的默认表单。占位文本不是实际证据，也不创造批准。

## 简单任务的原 owner

无 Goal 时，README 可用以下段落绑定实际会话依据。复杂任务使用原 Goal/Implementation Plan 的 lead，不再复制：

```markdown
## Ownership

Owner: session:actual-locator
Evidence: #handoff

<a id="handoff"></a>
## 本次会话依据

Session: session:actual-locator
Source: 用户请求或真实交接的可回读来源
Observed: 实际接受的目标、范围和当前负责关系
```

需要绑定 P bootstrap 时，Ownership 与原会话依据都保存 `Work: specdev/prototype`；仅此实际动作需要，不逐 Work 更新镜像。Evidence 不得指回 Ownership 自身。

## 真实验证后记录

```markdown
<a id="verified-ac-1"></a>
## AC-1 观察

Method: 实际使用的验证方法
Source: 被检验源码/工件与实际输入的 locator
Observed: 实际输出、结果与覆盖边界
Command: 确实执行的命令（未执行命令则省略本项）
Exit: 0
Result: passed
```

README verification 的 AC-1 行引用 `#verified-ac-1`；可以引用原 Evidence 的对应段。不以声明 passed 替代真实运行；提供 SHA256 时工具严格匹配原件字节，缺摘要能力不编造值。

## 整体取消

用户确实取消后，保留独立原请求/交接依据，再按原完成 owner 核对下面字段。实际无某项时写有理由的 none，尚未知不能写 resolved。

```markdown
<a id="cancellation"></a>
## 取消说明

Source: #actual-cancellation-request
Scope: 实际取消范围
Time: 2026-10-14T10:00:00+08:00
Confirmed-By: session:actual-locator
Undelivered: 尚未交付的需求
Landed: 已落地代码、数据、设计与远程影响
Writers: none: 实际核验没有活动写入者的依据
Dependencies: none: 没有父子依赖的依据
Checkpoints: resolved: 未集成 checkpoint/candidate 的实际处置
External: waived: 已承诺外部动作经具体决定放弃的依据
Next: 后续 owner、保留材料和恢复限制
```

Writers 有过实际写入者时用 `stopped: <证据 locator>`，原件须有 `Writers: stopped` 和真实 Observed；超时不是停止。Dependencies/Checkpoints/External 允许 none/resolved/transferred/waived，但都要具体依据。全部核对通过后才将唯一 Outcome 改 cancelled，不批量改票、不回滚或关闭远程。
