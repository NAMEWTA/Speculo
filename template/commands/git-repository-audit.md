---
id: git-repository-audit
type: command
name: Git Repository Audit
description: 只读盘点项目根目录下一个或多个 Git 仓库，生成可复核的代码迭代、团队协作与个人贡献报告
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

## 输入选择

从用户自然语言解析：

```yaml
start_time: "YYYY-MM-DD HH:mm:ss"
end_time: "YYYY-MM-DD HH:mm:ss"
timezone: "Asia/Shanghai"

repositories:
  mode: all                 # all | selected
  include: []               # project_root 相对路径
  exclude: []

branches:
  mode: default             # default | selected | all-local | all-refs
  include: []
  primary_branch: ""

authors:
  mode: all                 # all | selected
  include: []               # 作者名字
  exclude: []
  exclude_bots: true

paths:
  include: []
  exclude:
    - ".git/**"
    - "<Path>{roots.state}/**</Path>"
    - ".venv/**"
    - "node_modules/**"
    - "vendor/**"
    - "dist/**"
    - "build/**"
    - "coverage/**"
    - "*.min.js"
    - "*.map"
    - "*.lock"

options:
  include_merge_commits: true
  include_commit_body: true
  include_raw_commit_appendix: true
  weekly_breakdown: true
  monthly_breakdown: true
  top_n: 20
  topic: git-audit
```

默认与阻塞规则：

1. 时区缺失时使用 `Asia/Shanghai`。
2. 仓库缺失时选择全部发现仓库。
3. refs 缺失时选择每个仓库主分支的可达历史。
4. 作者缺失时选择全部作者名字并排除可识别机器人。
5. 开始或结束时间缺失时：
   - 只完成仓库发现；
   - 展示各仓库最早、最新提交；
   - 一次性询问缺失时间；
   - 时间确认前不采集完整历史、不创建正式报告。
6. 纯日期的开始边界为 `00:00:00`，结束边界为 `23:59:59`，两端包含。
7. 指定仓库、ref 或作者名字未命中时停止并列出未命中项，不静默忽略。

## 作者身份

作者身份只使用 Git Author Name，即 `%an`。

身份键为“Unicode NFC 后去除首尾空白的作者名字”。

- 不读取、展示或使用邮箱；
- 不使用 `.mailmap`；
- 不调用 `git check-mailmap`；
- 同名合并为同一作者；
- 不同名字视为不同作者；
- 保持大小写，不猜测别名。

机器人只按名字识别，如 `[bot]`、`dependabot`、`renovate`、`github-actions`、`automation` 或明显的 `bot` 名称。

报告必须注明：同名可能误合并，同一人的不同名字可能被拆分。

## 执行

### 1. 解析 Speculo 工作区

1. 从当前目录向上寻找 `<Path>{roots.state}/workspace.json</Path>`。
2. 第一个命中的目录为 `project_root`；多个候选或用户目录不一致时停止消歧。
3. 验证 `workspace.json`：
   - 非空且是有效 JSON；
   - `path_base` 为 `project-root`；
   - roots 是 POSIX 项目相对路径。
4. 读取 `<Path>{roots.config}</Path>`。
5. 任一初始化文件缺失、为空或不可解析时，停止并提示运行：

```bash
speculo init
```

完成标准：`project_root`、`roots.state` 和最终报告目录只有一个解析结果。

### 2. 检查工具

执行并记录：

```bash
git --version
uv --version
uv run --no-project python -V
```

报告声明：

- 仅分析本地历史；
- 未执行 fetch；
- Git、uv、Python 版本；
- 生成时间和时区。

完成标准：Git 与 uv 可用，Python 由 uv 成功启动。

### 3. 发现仓库

用标准库脚本扫描 `project_root`，识别：

- 根目录仓库；
- `.git/` 目录；
- worktree/submodule 的 `.git` 文件；
- 嵌套仓库。

遍历时默认剪枝：

```text
.git
<Path>{roots.state}</Path>
.venv
node_modules
vendor
dist
build
coverage
```

对候选执行：

```bash
git -C "<candidate>" rev-parse --is-inside-work-tree
git -C "<candidate>" rev-parse --show-toplevel
git -C "<candidate>" rev-parse --is-bare-repository
```

按真实仓库根路径去重。每个仓库记录：

- 名称和项目相对路径；
- bare/worktree/submodule 信号；
- 当前分支和主分支；
- 本地分支、远端跟踪分支、标签数量；
- 最早和最新提交；
- `git status --short` 摘要；
- remote 名称与脱敏地址；
- 分析开始时 HEAD；
- 选中 refs 的 tip 哈希。

主分支按以下顺序识别：

1. 用户指定；
2. `refs/remotes/origin/HEAD`；
3. `main`；
4. `master`；
5. `develop`；
6. 当前分支；
7. 最近提交最新的本地分支。

无法可靠确定时阻塞该仓库，不猜测。

完成标准：仓库列表去重，每个仓库有明确成功/失败状态和项目相对路径。

### 4. 确定 revision scope

- `default`：主分支可达历史；
- `selected`：用户指定 refs；
- `all-local`：全部本地分支；
- `all-refs`：本地与远端跟踪 refs。

多个 refs 含同一 commit 时，按“仓库 + 完整哈希”去重。

默认使用 Committer Date 过滤和统计，同时保留 Author Date 用于异常分析。

完成标准：每个纳入仓库都有明确 refs、tip 快照、时间范围和时区。

### 5. 采集 Git 原始数据

Commit 元数据：

- 完整/短哈希；
- 父提交与父数量；
- Author Name；
- Author Date；
- Committer Date；
- subject、body、refs；
- merge、revert、机器人标记；
- 是否位于主分支 first-parent。

使用记录分隔符和字段分隔符解析 `git log`，不得解析终端对齐表格。

文件变化：

```bash
git -C "<repo>" show --numstat --format= <commit>
git -C "<repo>" show --name-status --find-renames --format= <commit>
```

记录：

- changed files；
- additions、deletions；
- binary；
- A/M/D/R/C/T；
- rename/copy；
- 一级/二级目录；
- 扩展名和语言；
- 业务代码、测试、文档、配置、CI、迁移、依赖、generated/vendor。

Merge commit 只统计合并事件；普通 churn 默认只汇总非 merge commit。需要 merge diff 时使用 first-parent 并单独标注。

路径排除只影响 LOC、热点和模块统计，不删除 commit。全部文件被排除的 commit 仍保留，`effective_churn` 为 0。

完成标准：每个指标可回溯到 commit；binary、rename 和排除路径口径明确。

### 6. 分类与主题聚合

一级分类：

```text
feature
bugfix
refactor
test
docs
build-ci
performance
security
chore
revert
merge
unknown
```

分类依据：

1. Conventional Commits；
2. subject/body；
3. issue、PR、需求编号；
4. 文件与模块；
5. diff 规模和文件类型；
6. 测试、文档、配置伴随变化。

置信度：

- `high`：message、路径、变化一致；
- `medium`：message 明确，文件证据有限；
- `low`：主要依赖推断；
- `unknown`：证据不足。

按编号、相似 message、模块、时间、依赖、follow-up fix 和 revert 链聚合功能/技术主题。每个主题记录：

- 可观察目标；
- 起止时间；
- commit 数和关键哈希；
- 主要作者名字；
- 仓库/模块；
- additions、deletions、churn；
- 测试伴随；
- 后续 fix/revert；
- 置信度。

证据不足时使用“疑似”或“待人工确认”，不杜撰业务背景。

完成标准：分类总数闭合；主要 feature/bugfix 已归入主题或未聚类清单。

### 7. 计算分析指标

基础指标：

```text
total_commits
non_merge_commits
merge_commits
first_parent_merges
revert_commits
feature/bugfix/refactor/test/docs/build_ci/performance/security/chore/unknown
active_authors
active_days
changed_files
additions
deletions
net_change
churn
binary_changes
added/deleted/renamed_files
```

定义：

```text
net_change = additions - deletions
churn = additions + deletions
active_day = 至少一个纳入统计的非 merge commit 的自然日
```

提交强度：

```text
commit_density = non_merge_commits / active_days
weekly_commit_rate = non_merge_commits / period_weeks
churn_per_active_day = churn / active_days
files_per_commit = changed_files / non_merge_commits
churn_per_commit = churn / non_merge_commits
```

按全局、仓库、周、月、作者和模块计算，并分析：

- 月/周趋势；
- 星期和小时分布；
- 工作日、周末、非标准时段占比；
- 连续活跃和最长静默；
- 高峰日/周；
- 中位数、四分位数、P95；
- 周期末集中提交；
- 超大或跨模块 commit；
- Author/Committer Date 差异。

不得把提交时间解释为工时或勤奋度。

功能迭代强度优先展示：

- 每周 feature commit/churn；
- feature 活跃天数和模块数；
- 测试伴随率；
- 后续 bugfix/revert 比例。

有足够比较样本时可附加：

```text
FII =
  30% × normalized(feature_commits_per_active_week)
+ 25% × normalized(feature_churn_per_active_week)
+ 20% × normalized(feature_modules_touched)
+ 15% × normalized(feature_active_day_ratio)
+ 10% × normalized(feature_test_companion_rate)
```

必须同时显示原始值、标准化范围和权重；样本不足时不计算。

质量与风险信号：

- bugfix 占比与高频修复模块；
- feature 后快速 fix、连续 fix、revert 后重做；
- 测试伴随缺口；
- generated/vendor/lockfile 噪声；
- 高频热点和高 churn；
- Top1/Top2 作者 commit、churn 集中度；
- message 模糊和 unknown 比例。

这些只能作为 Git 证据信号，不得称为真实缺陷密度、实际 bus factor 或绩效事实。

完成标准：所有百分比同时给分子/分母，排名注明口径，表格合计一致。

### 8. 团队与个人评估

团队结论统一使用：

```text
事实 → 解释 → 风险或价值 → 建议
```

每个优点、不足和风险至少引用一个数据、项目相对路径或 commit 短哈希。建议分：

```text
P0：立即复核
P1：下一迭代改进
P2：持续优化
```

每位作者按统一结构输出：

- commit、merge、活跃天；
- additions、deletions、churn、changed files；
- 仓库和模块覆盖；
- feature/bugfix/refactor/test/docs/build-ci/performance/security；
- 测试伴随率；
- 平均、中位、最大 commit；
- 主要主题、模块和代表性 commit；
- Git 可见的贡献重心；
- 优势信号、风险和改进点；
- 证据与限制。

可使用“功能交付型、缺陷治理型、架构重构型、测试保障型、工程效率型、文档规范型、多模块支持型、核心模块深耕型”描述 Git 可见重心。

禁止只按 commit/LOC 给出最好或最差排名，禁止推断职位、态度、能力或绩效。

完成标准：每位纳入范围的非机器人作者都有多维画像和限制声明。

### 9. 交叉校验

写报告前验证：

- 全局 commit 与仓库去重合计一致；
- 非 merge 分类之和等于非 merge commit；
- merge 未重复进入普通 churn；
- 作者合计闭合；
- 多 refs 已去重；
- 时间边界和时区一致；
- binary 未作为普通 LOC；
- 排除路径一致应用；
- 仓库、周、月、作者和分类表合计一致；
- 关键哈希在对应仓库存在；
- 最终报告路径未占用。

无法修复的差异使报告 `status: partial`，并记录具体差异，禁止伪造平衡数字。

完成标准：校验结果进入报告正文和 frontmatter。

### 10. 原子持久化

1. 在内存生成完整 Markdown。
2. 在 command 专属目录创建同文件系统临时文件。
3. 写入并 flush；可用时 fsync。
4. 原子 rename 到最终未占用路径。
5. 重新读取验证：
   - frontmatter 完整；
   - command、scope 与文件名一致；
   - 仓库选择和 Git 快照完整；
   - 必需章节存在；
   - 文件非空；
   - 无绝对路径、邮箱或未脱敏凭证。
6. 清理临时脚本和数据。
7. 不执行 `git add` 或 commit。

完成标准：只有一个正式报告持久化，已有报告未覆盖，临时数据已清理。

## 报告 frontmatter

```yaml
---
command: git-repository-audit
schema_version: 1
status: complete
scope: workspace
topic: git-audit
generated_at: "ISO-8601"
project_root: "."
timezone: "Asia/Shanghai"
time_range:
  start: "ISO-8601"
  end: "ISO-8601"
date_basis: committer-date
author_identity: author-name-only
exclude_bots: true
repository_mode: all
repositories:
  - path: "."
    primary_branch: main
    refs: [main]
    head_at_start: "<full-sha>"
path_includes: []
path_excludes: []
include_merge_commits: true
local_history_only: true
fetch_performed: false
tool_versions:
  git: ""
  uv: ""
  python: ""
validation:
  status: passed
  warnings: []
---
```

- `status` 为 `complete` 或 `partial`。
- `scope` 必须与文件名一致。
- `repositories` 保存完整选择、refs 和 HEAD 快照。
- 部分仓库失败时使用 `partial` 并列明。
- 不记录邮箱。

## 报告结构

```markdown
# Git 仓库代码迭代与团队贡献盘点报告

## 0. 执行摘要
## 1. 分析范围与统计口径
## 2. 仓库发现与 Git 快照
## 3. 全局核心指标
## 4. 仓库间对比
## 5. 提交时间与提交强度
## 6. 合并与分支活动
## 7. 功能迭代主题
## 8. Bug 修复与质量活动
## 9. 代码增减与变更结构
## 10. 热点模块与知识集中
## 11. 团队优点、不足与风险
## 12. 个人贡献画像
## 13. 优先行动项
## 14. 数据质量、限制与复核
## 15. 原始数据附录
```

执行摘要在一页内包含范围、仓库数、commit、merge、feature、bugfix、作者数、additions、deletions、churn、3 至 5 条关键发现、3 至 5 条建议和主要限制。

核心表格：

```markdown
| 仓库 | 项目相对路径 | 主分支 | refs | 本地分支 | 远端分支 | 标签 | 最早提交 | 最新提交 | 工作区状态 |
|---|---|---|---|---:|---:|---:|---|---|---|

| 主题 | 时间 | commits | 主要作者 | 仓库/模块 | +行 | -行 | 测试伴随 | 后续修复 | 关键哈希 | 置信度 |
|---|---|---:|---|---|---:|---:|---|---|---|---|

| 作者 | commits | 活跃天 | feature | bugfix | test | refactor | 工程类 | churn | 主要模块 | 主要主题 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---|---|

| 优先级 | 发现 | 数据证据 | 影响 | 建议行动 | 建议负责人 |
|---|---|---|---|---|---|
```

无法从 Git 判断负责人时写“团队共同确认”。

## 原始数据附录

默认在同一报告中保留全部所选 commit，不静默截断。每条至少包含：

```markdown
| 仓库 | 哈希 | Committer Date | 作者名字 | 类型 | 置信度 | Subject | 文件数 | +行 | -行 | 主要模块 | 主题 |
|---|---|---|---|---|---|---|---:|---:|---:|---|---|
```

同时包含：

- 仓库、周、月和作者原始汇总；
- merge 事件；
- 功能主题与 commit 对照；
- 待人工确认 commit；
- 排除文件和 binary 影响摘要。

commit 很多时按仓库和月份拆表，可用 `<details>` 折叠，但仍保留每个 commit，不生成第二个持久化数据文件。

## 数据限制

报告必须明确：

- 仅本地可见历史，未 fetch；
- 删除分支名称通常不可恢复；
- merge commit 数不等于历史分支数；
- squash/rebase 可能隐藏合并和多人贡献；
- 作者只按名字归一化；
- Git 无法完整反映设计、Review、沟通、带教、pair programming 和未提交工作；
- LOC 会受格式化、生成文件、lockfile 和文件移动影响；
- 测试文件未变化不等于没有测试；
- bugfix 占比不等于真实缺陷密度；
- 报告不能直接替代绩效评估。

## 复核命令

报告末尾按实际范围填充只读命令：

```bash
git -C "<repo>" log "<ref>" --since="<start>" --until="<end>" --format="%H" | sort -u | wc -l
git -C "<repo>" log "<ref>" --merges --first-parent --since="<start>" --until="<end>" --format="%H"
git -C "<repo>" log "<ref>" --no-merges --since="<start>" --until="<end>" --numstat
git -C "<repo>" shortlog -sn "<ref>" --since="<start>" --until="<end>"
```

作者复核不使用 `-e`，不输出邮箱。

## 返回

完成后只返回：

1. 报告项目相对路径；
2. 分析范围摘要；
3. 3 至 5 条最重要发现；
4. `complete` 或 `partial`；
5. 待人工复核事项。

完整报告不再次复制到对话；报告文件是唯一事实源。

## 完成标准

- Speculo 工作区和 state 根唯一解析；
- Python 仅通过 `uv run --no-project python -` 执行；
- 范围内仓库发现并去重；
- 时间、时区、仓库、refs、作者、路径范围明确；
- 作者只按名字区分，未读取或输出邮箱；
- commit 按仓库和完整哈希去重；
- merge 与普通 churn 分开；
- 功能、bugfix、时间、强度、代码量、热点、团队和个人分析完整；
- 所有评价有数据、路径或 commit 证据；
- 报告 frontmatter 保存完整选择和 Git 快照；
- 报告位于 command 专属规范路径且 scope 可见；
- 已有报告未覆盖；
- 未创建 state、sidecar 或第二份正式数据；
- 临时数据已清理；
- 未修改 Git 仓库、项目文件或 Python 项目环境；
- 最终报告已重读并通过结构和敏感信息检查。
