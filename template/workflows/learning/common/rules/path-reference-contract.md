# Learning 路径引用合同

静态 Learning 文件使用完整 `<Path>{roots.workflows}/learning/<relative-path></Path>`；运行时状态使用完整 `<Path>{roots.state}/learning/<relative-path></Path>`。不得使用机器绝对路径、反斜杠、`..`、裸文件名或把 workflow `_state` 当作运行时目录。

`{change}` 是启动协议选择的 change 名；`{domain}` 来自 `learning-plan.md` 和 change 状态；`YYYY-MM` 从 change 日期前缀派生。项目证据使用项目根相对路径，外部来源使用真实 URL。

动态知识路径必须先由 promotion plan 明确，确认后才允许创建或改写。完整路径只确定对象，不授予副作用权限。
