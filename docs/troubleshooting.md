# 常见问题与排障

[手册首页](README.md) · [CLI 参考](cli.md) · [事务恢复](transaction-recovery.md)

## 安装后为什么只有核心功能

非交互首次 `speculo init .` 默认只安装核心 Command 与共享方法。明确选择领域：

```bash
speculo init . --workflows specdev,learning --skill-targets agents --skills domain/specdev,domain/learning
```

安装与宿主曝光独立。安装了 SpecDev 但没曝光，不表示入口不存在；也可以让 AI 直接读权威 `SKILL.md`。

## --workflows all 提示 Unknown workflow package

先核对实际运行的 CLI 版本与路径，避免旧全局包或旧 `dist` 被误用。也可以显式列出当前五个领域：

```bash
speculo init . --workflows specdev,learning,ops,person,media --skill-targets agents --skills domain/specdev,domain/learning,domain/ops,domain/person,domain/media
```

`--skills all` 是曝光选择，与 `--workflows` 的领域选择不同。更新包后仍要在使用项目中运行 init 才刷新方法资产。

## 为什么宿主列表里没有某个 Work 或 Command

`domains` 只展示领域入口；`all` 才曝光全部已安装公开入口。也可以按业务 ID 选择。先检查实际目录和安装 warning，再看宿主自己的重新加载机制。

```bash
speculo init . --workflows specdev --skills specdev/implement,command/status
```

如果目标宿主读取 `.claude/skills/`，使用 `--skill-targets claude`；需要两个位置时使用 `--skill-targets agents,claude`，统一配置 `--skills`。静态投影存在不等于宿主已经加载或认证实际调用。

## 能否在终端输入 speculo implement 或 speculo project-maintenance

不能。终端 CLI 只提供安装、版本、检查、路径解析和恢复。对 AI 明确请求 `specdev/implement` 或 `command/project-maintenance`，或提供安装后的入口文件路径。见[概念说明](concepts.md)。

## 我用 App，会不会被强制切换到 CLI

不会。未指定时按当前宿主正常执行。明确指定 CLI 交互或 Herdr 等方式才使用对应分支。App 本身的文件、终端或协作能力不足时应说明缺口，不能伪装实际执行。

## 为什么没有 Ticket 或 Goal

完整获批 Spec 可以直接进入实现，已有 Ready Ticket 也可以直接实现。只有需要独立调度、依赖或逐票追踪才拆票；需要整体总控才加 Goal。你明确要求这些产物时，入口仍需按要求交付。

## 为什么没有全局 SpecDev status.json

当前 SpecDev 从 change 目录和 README 唯一 Outcome 发现整体状态，细节由原计划、Ticket/Evidence 负责。空项目没有业务对象是合法情况，不需要手动创建旧状态骨架。其他领域仍使用各自状态模型。

## 为什么 AI 停在计划或等待确认

先核对请求是否仅要求计划、所选模式是否是 plan，以及后续动作是否涉及尚未授权的提交、部署、发布或知识写入。已有具体授权应该复用；缺少会改变结果的用户决定时需要回答。要求 AI 给出具体阻塞、当前产物和下一步，不要用笼统“继续”覆盖未知外部副作用。

## 学习问答为什么没有讲解或评审

Question tutor 要在 IQ 文件中保留真实答案并标记 `Response: ready`；Homework 要标记 `Submission: ready`。然后再次调用对应入口。二者不能混用。explore 直接展开分析，不使用这些答题标记。

## 工具说完成了，为什么还标未验证

退出码、候选文件和 AI 自述只说明部分事实。浏览器画面、独立审查、真实部署健康、双边回执或延迟学习证据可能尚未完成。请查看该 Work 的具体完成门，缺哪项就补哪项，不把未运行改成 passed。

## 安装警告说 Skill 同名或被修改

第三方同名目录和用户人工修改受保护。查看精确冲突路径，判断哪个是真正需要保留的内容，再对具体路径处理。不要删除整个 skills 根，也不要把用户文件改成受管哈希来绕过检查。

## doctor 不健康、存在 lock 或安装中断

保留完整输出，沿[安装事务恢复](transaction-recovery.md)处理。锁不一定是垃圾；不能直接删锁重试。`speculo recover` 只处理匹配安装事务，不恢复 workflow 的业务状态。

## Media 没有视频、图片或发布结果

Hand Drawn 默认只交提示词。Video 缺少真实渲染工具时交工程与未渲染报告。Publish Draft 只导出本地包，没有线上发布接口。查[Media 指南](workflows/media.md)确认当前 Work 的真实产物，不根据名称推断额外能力。

## OPS 状态是 docs_pending 或 unknown

业务动作可能已落地，但文档回执未闭合或结果未知。沿原 task/Run/Release 查询并恢复，不创建新任务重复操作，也不以更新看板代替目标检查。见 [OPS](workflows/ops.md)。

## 当前 docs 为什么不记录每次开发计划

Speculo 仓库的 docs 是当前产品手册。版本变化保留在 CHANGELOG/Git；使用项目里的实施历史保存在原 change/Evidence，命令报告保存在对应命令 namespace。工程文档持续描述现状，不充当所有开发活动的流水账。

## 如何报告问题

提供版本、操作系统/Node、完整命令、返回码、具体路径和脱敏错误输出，说明预期与实际。涉及本地业务结果时给当前工件和恢复位置；不要上传秘密。Speculo 产品问题可用 [retro](commands/speculo-feedback.md)先形成提案，确认后才创建远端 Issue。
