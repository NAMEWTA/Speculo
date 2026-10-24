# 按实际领域补足交接

仅在交接范围命中以下领域时读取对应段；没有相关对象就跳过，不为交接创建对象或安装 workflow。

## SpecDev

交接范围包含 SpecDev change 时，引用 README 的唯一 Outcome、接续点和当前 owning 工件，并按实际存在情况链接 `source.md`、`triage.md`、`delivery.md`、`publish.md`（若请求过），不复制正文、不创建业务状态镜像。旧归档只读引用原件；混合状态或未结束转换交原 owner 恢复。若 `external_action` 为 `pending-close` 或 `close-failed`，必须记录准确远程 locator、已完成步骤、授权状态和恢复入口 `D-delivery`；不得把待关闭误报为本地未完成。若 `publish_action` 为 `pending` 或 `publish-failed`，必须记录账本路径、失败行和下一步，恢复入口仍是 D-delivery publish。交接范围包含尚未成 Change 的 inbox 记事项时，引用 `<Path>{roots.state}/specdev/capture.md</Path>`（若存在）的失败行与恢复入口 T-triage capture，不创建 change。

## OPS

OPS 交接引用原 Controller/Host/Project、task/Run/Release、immutable plan/approval/journal/目标 receipt 和 progress；不写凭据值或复制私密配置。started-only、终态失败、docs_pending 分别回到原恢复协议，不能包装成新 task 再试。只向接收方传递已授权范围内必要的 locator 与脱敏证据。

