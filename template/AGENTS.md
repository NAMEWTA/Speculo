# Speculo runtime guide

先按当前任务定位相关 workflow、command、skill 或 change，再读取对应入口和分支 reference；不默认整读 `speculo/` 或永久知识索引。

- 被动发现：读取 `speculo/workflows/<workflow>/INDEX.md`，只定位与当前请求相关的永久知识条目。
- 激活 workflow：再读取对应 `README.md`、状态投影和当前 Work；只加载当前分支需要的规则、schema、模板与工具。
- 记忆检索：先定位索引 entry，再回读少量原文和 provenance；没有匹配证据时停止猜测。
- 记忆写入：先解析 owner/gateway，检查 pending transaction、lock 和 recovery evidence；网关未知时阻塞该写入并继续独立工作。
- 只读探索、静态编辑和本地测试可直接进行；提交、推送、发布、部署、远程写入、归档移动、永久知识改写和不可逆操作必须由拥有该动作的入口取得明确授权。
- 失败、漂移、schema 冲突、越界路径或 owner 不明时停止受影响分支，保留证据并报告恢复路径。

详细状态、所有权和副作用合同由各 workflow 的 `INDEX.md`、`README.md`、`common/rules/` 和 schema 定义。
