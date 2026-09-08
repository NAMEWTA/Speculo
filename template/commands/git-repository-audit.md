---
id: git-repository-audit
type: command
name: Git Repository Audit
description: Produce a read-only reproducible audit for explicitly selected local Git repositories.
keywords: [git-audit, git-inventory, repository, commit, merge, contribution, 仓库盘点, 代码审计, 团队评估]
---

# Git Repository Audit 命令

## 意图与边界

执行一次性、只读、可复现的 Git 仓库盘点：

- 发现 `project_root` 下的 Git 仓库；
- 按用户选择的时间、仓库、refs、作者名字和路径范围采集本地 Git 历史；
- 分析 commit、merge、功能迭代、bug 修复、提交节奏、代码增减、热点模块、团队协作和个人贡献；
- 将完整选择、Git 快照、原始指标、关键证据、结论和复核命令写入唯一 Markdown 报告。

本命令是单次短编排，不维护 workflow 状态机，不调用外部 API，不补抓远端数据。

## 持久化契约

唯一持久化产物：

```text
<Path>{roots.state}/commands/git-repository-audit/{date}-{scope}-{topic}[-NN].md</Path>
```

实际路径必须通过 `<Path>{roots.state}/workspace.json</Path>` 的 `roots.state` 解析：

```text
<Path>{roots.state}/commands/git-repository-audit/{date}-{scope}-{topic}[-NN].md</Path>
```

规则：

- `<scope>`：
  - `workspace`：全部发现仓库；
  - `multi-repo`：多个但非全部仓库；
  - `repo-<slug>`：单个仓库。
- `<topic>`：用户主题转小写 kebab-case；缺失时为 `git-audit`。
- 同日同 scope/topic 冲突时，从 `-01` 开始选择最小未占用编号。
- 禁止覆盖已有报告。
- 禁止把正式报告写入 `temp/`、系统临时目录或其他位置。
- 本命令不创建 `state.json`、sidecar、CSV、JSON、数据库或长期缓存。
- 临时数据只存在于内存或 `tempfile.TemporaryDirectory()`，结束时清理。
- 报告内所有路径使用 POSIX 项目根相对路径；不持久化绝对路径。

## 写操作边界

只允许创建 command 专属目录并原子写入、重读本次报告。

不得修改仓库、工作区、索引、refs、远端或 Python 项目环境。不得执行：

```text
git add/commit/checkout/switch/reset/restore/clean/merge/rebase/cherry-pick/revert
git branch -d/-D
git tag/stash/fetch/pull/push/gc
uv sync/add/lock
```

不得修改项目源码、测试、文档、Git 配置、`.git/`、`pyproject.toml`、`uv.lock` 或项目内 `.venv`。

## Python 运行契约

所有 Python 采集和计算统一使用：

```bash
uv run --no-project python -
```

- 脚本从标准输入传入；
- 仅使用 Python 标准库；
- 不直接调用 `python`、`python3`、`pip` 或 `poetry`；
- 不创建项目内虚拟环境；
- `uv` 不可用时停止，不切换管理方式。

## 按需执行

本命令选中后，采集或生成报告前必须读取 `<Path>{roots.commands}/references/git-repository-audit-procedure.md</Path>`，按其输入选择、身份处理、固定点采集、计算、交叉校验、报告结构和原子持久化顺序执行。用户未明确的范围按原选择协议确认；不得先扩大分析范围。

默认运行工具仍是 `uv run --no-project python -`；不可用即停止，不静默切换。仍只交付一个完整 Markdown 报告，包含原始指标、证据、限制和复核命令；不另建 CSV/JSON/sidecar。采集不可复现、交叉校验失败、来源不可读或报告路径冲突时停止受影响报告，不猜测数据、不覆盖已有结果。完成后回读报告，再按参考的返回合同交付。
