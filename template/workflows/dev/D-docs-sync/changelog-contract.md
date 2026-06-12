# CHANGELOG 类文档同步契约（通用）

CHANGELOG 类文档（`CHANGELOG.md`、`CHANGELOGS.md`、`HISTORY.md`、`RELEASES.md`）遵循 [Keep a Changelog 1.1.0](https://keepachangelog.com/1.1.0/) 格式与 [SemVer 2.0.0](https://semver.org/)。语言由项目决定（中/英/其他），日期建议采用 ISO 8601（UTC 或带时区偏移）。

## 文档骨架（Keep a Changelog 约定）

```
# Changelog

<简短介绍段：声明遵循 KaC + SemVer 等约定>

---

## [Unreleased]

### Added / 新增
### Changed / 变更
### Deprecated / 弃用
### Removed / 移除
### Fixed / 修复
### Security / 安全

---

## [x.y.z] — YYYY-MM-DD

<同样的分节>

---

## 版本链接 / Links

- [Unreleased](<compare-url>/vLATEST...HEAD)
- [x.y.z](<releases-url>/tag/vx.y.z)
- ...
```

`[Unreleased]` 顶部段落**永远存在**，即使内容为空。

## 标准分节与可选扩展

**Keep a Changelog 标准 6 节**（必须用标准名，语言本地化即可）：

| 标准节 | 语义 |
|------|------|
| Added / 新增 | 新功能、新命令、新模板、新技能 |
| Changed / 变更 | 既有能力的行为/默认值调整 |
| Deprecated / 弃用 | 将来会移除但本版本仍能用 |
| Removed / 移除 | 已从代码中删除的能力 |
| Fixed / 修复 | bug 修复 |
| Security / 安全 | 安全修复、CVE 响应、鉴权相关调整 |

**常见非标准扩展**（项目可选）：

| 扩展节 | 语义 |
|-------|------|
| Planned / 计划中 | 明确声明"即将做但未动工"的事项，用于路线图沟通 |
| Docs / 文档 | 对外文档的更新（README / AGENTS / references 等） |
| Performance / 性能 | 性能优化但行为未变 |
| Dependencies / 依赖 | 依赖升级聚合（非 Security） |

项目一旦采用某扩展节就在整个 CHANGELOG 内一致使用，不要忽隐忽现。**没有内容的分节不要列出空标题**；保留有内容的即可。

## 把 git 变更写成 Changelog 条目

[Conventional Commits](https://www.conventionalcommits.org/) 前缀对应分节（按项目采用的 commit 约定调整）：

| 前缀 | 分节 |
|------|------|
| `feat:` / `feat(...):` | Added / 新增 |
| `fix:` / `fix(...):` | Fixed / 修复 |
| `refactor:` / `perf:` | Changed / 变更（若有行为影响）或 Performance |
| `docs:` | Docs / 文档（如项目采用该扩展节）；否则不写 |
| `chore:` / `ci:` / `build:` / `style:` / `test:` | 默认不写；仅在用户能感知时写入相应分节 |
| `revert:` | 视被 revert 的内容归类 |
| 依赖升级（Dependabot 等） | Security（有 CVE） / Dependencies 或 Changed（常规） |

**不要把每一个 commit 都写成一行**。聚合为"主题条目"：

- 同一主题下的多个 commit → 一条 bullet，列出关键细节
- `chore:` 类型整批的 Dependabot 升级 → 一条"依赖周更"条目
- 只影响开发体验（测试配置调整、lint 规则微调）通常不进 CHANGELOG

示例（原始 commits → Changelog 条目）：

```
git log
  feat(cli): add --json flag to status command
  fix(status): handle missing config gracefully
  test(status): cover --json output

→ CHANGELOG 的 [Unreleased] 下：
### Added
- **CLI**：`status --json` 支持机器可读输出，缺失配置时给出空结构而非报错
```

## Tag 发版时的迁移

当检测到区间内发生了版本 tag（即项目元信息中的 version 变化 + 新 `v*` tag）：

1. 确定 tag 创建日期：`git log -1 --format=%aI vX.Y.Z`
2. 把 `[Unreleased]` 下除"Planned / 计划中"外的所有条目整体移动到新版本段落 `## [X.Y.Z] — YYYY-MM-DD`
3. 清空 `[Unreleased]`（保留空的"Planned / 计划中"区块，如项目使用该扩展节）
4. 更新底部版本链接：
   - 新增 `[X.Y.Z]` 链接行
   - 把 `[Unreleased]` 的 compare 基线改为 `vX.Y.Z...HEAD`
5. 如果 tag 之后还有新 commit，按正常流程把这些 commit 写入新的 `[Unreleased]`

## 版本链接契约

底部链接段落固定结构：

```
- [Unreleased](<repo>/compare/vLATEST...HEAD)
- [X.Y.Z](<repo>/releases/tag/vX.Y.Z)
- [X.Y.Z-1](...)
- ...
```

每发一个新版本 → 加一行；`[Unreleased]` compare 基线始终指向最新 tag。仓库 URL 由项目决定（GitHub / GitLab / Gitea / Bitbucket）。

## 条目写作规范

- 每个 bullet 以**能力名或模块名**加粗开头，如 `**CLI**：...`、`**API**：...`、`**templates**：...`、`**build**：...`、`**CI**：...`
- 用户视角描述"发生了什么"，不描述"怎么改的"
- 路径、命令、标志、版本号保留代码格式（反引号）
- 不使用表情符号
- 一条 bullet 不超过两行；更长拆成子列表

## 不做的事

- **不要**重写已发布版本段落的条目措辞 —— 这些是历史档案
- **不要**在 `[Unreleased]` 里保留已被移入正式版本的条目
- **不要**反向覆盖：用 GitHub / GitLab 自动生成的 release notes 盖掉人工整理的 CHANGELOG
- **不要**把文档自身同步写成 `Added / Changed` —— 如项目采用"Docs / 文档"扩展节归入该节；否则不写
- **不要**把内部重构写成新功能

## 示例：典型同步产物

```markdown
## [Unreleased]

### Added

- **CLI**：`status --json` 输出机器可读状态
- **templates**：新增 authentication 模板，覆盖常见登录模式

### Changed

- **doctor**：`--check-deps` 在检测到未知依赖时改为 warn（原 error）

### Docs

- 新增 `.agents/skills/docs-sync/`，用于基于 git diff 同步对外文档
```
