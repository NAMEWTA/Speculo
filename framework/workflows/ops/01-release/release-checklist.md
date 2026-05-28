# Release Checklist — 发版检查清单规范

本阶段把发版执行落到一份**机械化、可勾选、命令输出可贴入**的清单。AI 在执行 `phase=checklist` 时读本文件作为操作手册。

## 一、上下文与产物

- **输入**：本 change 的 dev 产物（含 `prd.md` / `design-*.md` / `implement.md` / `test-*.md` / `review-*.md`）；项目 `CHANGELOG.md`；`.speculo/.config/RULES.md`
- **产物**：`release-checklist.md`（基于 `../_templates/release-template.md`）
- **核心原则**：AI 不能声称"已通过"而没跑过对应命令并贴出输出（继承 flow-kit R4.4）

## 二、章节填写引导

### 版本信息
- **版本号**：遵循项目约定（SemVer / CalVer / 自定义）
- **发版日期**：ISO 格式 `YYYY-MM-DD`
- **负责人**：执行发版的人 + AI 工具会话标识
- **关联 change**：`../../../.speculo/dev/<change-name>/` 路径

### 前置检查（五项强制）
每项满足两种证据之一：(a) 命令输出贴入；(b) 用户显式签字接受。

| 检查项 | 通过条件 | 证据 |
|--------|---------|------|
| 1. 代码评审通过 | `code_review_decision ∈ {通过, 通过-小修+已签字}` | 引用 dev change 的 `.status.json` |
| 2. 测试通过 | 单测 + e2e 退出码 0 | 贴出 `pnpm test` / `pytest` 等命令实际输出 |
| 3. 安全评审通过 | `security_review_decision = 通过` | 引用 dev change 的 `.status.json` |
| 4. Changelog 已更新 | `CHANGELOG.md` 含本版本条目 | 引用条目锚点 |
| 5. 依赖锁定无冲突 | lockfile 与 manifest 一致 | 贴出 `npm ci --dry-run` / `pnpm install --frozen-lockfile` 输出 |

任一项未过 → 不能进入发版步骤段。

### 发版步骤
按顺序列出，每步必须：
- 可机械执行（命令可粘贴）
- 输出贴入产物
- 失败有显式停止条件

典型步骤集：
1. 在主分支创建版本 tag（`git tag v1.4.0`）
2. 推送 tag（`git push origin v1.4.0`）
3. 构建发布制品（如 `pnpm build` / `cargo publish --dry-run`）
4. 发布到分发渠道（npm / docker hub / release notes）
5. 更新 `../../../.speculo/ops-status.json` 与本 change 的 `.status.json`

### 回滚预案
- 触发条件：什么情况下立即回滚（如 `../03-monitor/` 报告错误率 >X% 持续 Y 分钟）
- 详细预案：链接到 `../02-deploy/deploy-rollback.md`（不在此处重复）

## 三、与 doc/02-changelog 的衔接

本工作流**不生成 changelog 内容**（那是 `framework/workflows/doc/02-changelog/` 的职责）。本阶段只验证：
- 项目 `CHANGELOG.md` 已含本版本条目
- 条目格式与项目约定一致

若 changelog 缺失，停下回 `doc/02-changelog` 完成后再来。

## 四、与 ops/02-deploy 的衔接

本工作流**只准备版本制品**（tag / changelog / 包），**不部署**。部署归 `../02-deploy/`。
若发版后需自动部署，由调用方编排：发版完成 → 进入 deploy。

## 五、完成准则（机器可验证）

- `grep -c '\[TODO:' release-checklist.md` = 0
- 文件含 `## 版本信息` / `## 前置检查` / `## 发版步骤` / `## 回滚预案` 四个标题
- 前置检查段含五项检查表格，每项标"✅ / ⚠️ 已签字接受 / ❌"三态
- 发版步骤段含 ≥3 个 ` ``` ` 代码块（命令 + 输出）
- 回滚预案段含 `../02-deploy/deploy-rollback.md` 链接
- `version` / `tag` / `changelog_path` / `release_artifact_count` / `prereq_checklist_passed` 写入 `.status.json`
- `prereq_checklist_passed=true` 才允许工作流标 `completed`
