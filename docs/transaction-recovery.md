# 安装事务、刷新与恢复

[手册首页](README.md) · [CLI 参考](cli.md) · [架构](architecture.md)

本页只处理 **Speculo CLI 安装事务**。它不负责模型运行、业务 Goal、OPS 部署、Git 历史压缩或其他 Work 的状态恢复。先判断是哪一层失败，再选择原 owner 的恢复入口。

## 正常刷新会做什么

安装根为 `.agents/speculo/`。CLI 先准备 staging、执行验证，再切换方法资产，随后处理外部受管指令块、Skill 投影与 Hub 完整包，并验证结果。运行时数据和用户文件按各自合同保留；未知或不兼容的结构化内容会阻塞替换。

| 位置 | 含义 |
|---|---|
| `.agents/speculo/` | 当前安装 |
| `.agents/.speculo-install.lock/` | 独占安装锁，包含 owner 与 transaction 日志 |
| `.agents/.speculo-transactions/` | staging 与备份树；无残留时清理空目录 |
| `.agents/speculo/.speculo/back/<uuid>/` | 配置字段收敛时保留的定向备份，归 CLI 所有 |

不要由 workflow 或普通文档整理清理这些恢复资料。关闭投影也只清理被证明属于安装器、没有漂移的文件，用户附加文件保持。

正常安装、刷新、提交前取消、成功回滚和显式恢复完成后，CLI 会在释放锁前尝试删除空的 `.agents/.speculo-transactions/`。旧版本遗留的空目录也会在下一次成功刷新时清理；非空目录、未完成事务和失败恢复证据原样保留。`doctor` 始终只读，不自动清理。

## 安装中断后一步步处理

**第一步：只读检查。**

```bash
speculo doctor . --json
```

保存 transaction ID、owner、journal、staging、backup 和 blocker。不要先删除锁或重新创建安装元数据。

**第二步：核对现场。** 确认原安装进程已经停止，当前仍是原主机/平台；保留所有恢复文件。进程是否停止未知时，先查清，不直接把锁当作残留。

**第三步：针对报告中的完整事务 ID 恢复。**

```bash
speculo recover . --transaction <完整事务ID>
```

它会先核对路径、身份、文件与外部投影的 before/after 图像。未提交事务按可验证现场回滚；已经 committed 的事务只完成验证过的清理，不重新执行安装内容。

**第四步：再次检查。**

```bash
speculo doctor .
```

恢复成功后，再依据实际状态决定是否运行 `speculo init .`。不要把多次重试当作一种恢复策略。

## 哪些情况会停止

| 现场 | 处理原则 |
|---|---|
| 原 owner 仍活跃 | 等待或由原 owner 正常结束，不能抢锁 |
| transaction ID 不匹配 | 使用 doctor 实际报告的 ID，不猜测 |
| 日志 schema 未知，或来自不同主机/平台 | 保留证据，使用适当原版本与恢复环境 |
| 路径越界、symlink 逃逸 | 停止相关写入，核对真实路径 |
| 文件不再匹配记录的 before/after 内容 | 保留人工修改与漂移证据，先解决冲突 |
| 第三方 Skill 或附加文件冲突 | 不自动覆盖或删除，精确处理冲突对象 |

事务指纹包括目录存在性、文件字节、节点类型和链接文本；POSIX 还包括权限位。Windows 不宣称 ACL/ownership 等价。恢复假设协作写入环境，不是恶意文件系统沙箱。

## 旧版本与业务数据

CLI 新写 journal schema 4，记录完整 Hub 资源树与目录模式；仍可读取和恢复 schema 3 的投影事务，不迁移进行中的日志。未知版本或旧安装布局不自动转换。保留原件与独立备份，使用拥有该格式的版本确认恢复方案；不要改版本字段、重命名 journal 或伪造哈希。

当前 SpecDev 业务只支持 Markdown 与当前执行协议；旧活动或混合状态会被明确拒绝并保留原件。当前版本不分发旧协议转换器和历史 reader，安装恢复也不承担业务迁移。其他领域使用各自状态和恢复工具。

如果失败发生在已经开始的实现、知识发布或远端部署，返回原 Evidence、事务或 Run 的恢复入口。安装健康不能证明这些业务操作已经完成。

卸载 workflow 只移除受管方法、投影入口与发现导航，运行时数据仍原位保留。`install.json` 的可选 `retained_workflows` 保存停用 Work 的 ID 与阶段登记，使其旧协作规则可校验；这些登记不代表已安装能力。重新勾选后恢复方法并复用原数据，未知 Work/阶段仍报错。Hub 包用独立的 `hub-skills.json` 记录归属；中途失败按同一事务恢复全部资源，漂移时保留日志与现场。
