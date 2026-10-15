# Retro：反馈 Speculo 产品使用问题

[手册首页](../README.md) · [Command 目录](README.md) · [源入口](../../template/commands/retro/COMMAND.md)

**业务 ID：** `command/retro`

## 什么时候用

Speculo 的方法、入口、指令或流程让你遇到实际摩擦，希望形成有证据的产品改进提案。开发项目自己的过程复盘用 [specdev/retro](../workflows/specdev.md#retro)，内容运营复盘用 [media/retro](../workflows/media.md#retro)。

**这个 Command 的远端 Issue 目标固定为 `NAMEWTA/Speculo`，无论在哪个项目调用都一样。** 它不是向当前项目随意提 Issue 的通用入口。

## 怎样调用

```text
明确调用 command/retro，分析本次使用 Speculo 时反复选择入口的问题。
先形成有证据的提案和去重结果，展示精确标题、标签、正文与目标仓库；先不创建 Issue。
```

输入包括明确范围、实际摩擦、报告/会话/工件来源。未知信息保持未知，不全量收集无关历史。

## 流程与产物

先根据证据形成去重、分级、根因化提案，保存命令报告。对拟提交项通过 Triage 远程协议搜索重复 Issue，确认实际标签，展示精确内容并取得或复用覆盖它的真实授权。

确认后才使用 `gh` 创建 Issue，保存稳定 marker、正文摘要、授权和返回 URL。请求超时先按原 marker 查询，任一失败停止后续创建并记录已建/未建项，避免重复提交。

如果没有安装 SpecDev/Triage，继续本地分析与提案，远端步骤等待依赖具备；不静默安装 workflow。如果没有可用 workspace，则先做会话分析，不猜报告目录。

## 完成怎么看

返回本地报告、核心提案、去重或未提交原因，以及确实创建成功的 Issue 链接。报告完成与 Issue 创建是两个结果；缺少远端授权时保留可审查提案即可。
