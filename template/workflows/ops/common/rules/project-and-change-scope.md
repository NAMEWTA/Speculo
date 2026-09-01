# Project 与 Change Scope

## Scope

- `global`：宿主机、共享环境、Docker/集群控制面基线或跨项目运维规则；change 位于根 changes/archive。
- `project`：指定应用、仓库或可独立部署组件；change 和永久知识位于 `projects/{project_id}`。

项目工作不得使用 global scope 来绕过项目历史；project change 可在 A 阶段把确实跨项目的候选提升到全局知识。

## 项目身份

`project_id` 是 lowercase kebab 稳定目录 id，不等同于可变 display name。识别顺序：用户显式 id、已登记无凭据 VCS identity、monorepo component identity、workspace/package identity、用户确认 alias。目录 basename 只能提出候选。

VCS identity 必须移除 scheme userinfo、token、query 和 fragment；无法可靠脱敏时存储 hash 与人类可识别 label，不保存原值。identity 冲突或多个项目命中时一次展示并请求选择，不自动合并历史。

## Change 选择

全局索引 entry 统一为 `{scope, project_id, change}`。tuple 唯一；change 名只需在同一 scope root 内唯一。新 change 先写完整目录和 `.status.json`，再加入 active；失败时不留下索引悬挂。

归档 change 不恢复写入。follow-up 继承 project/global scope，但 request 明确记录来源 archive locator 和仍适用的事实；不得复制旧批准作为当前授权。
