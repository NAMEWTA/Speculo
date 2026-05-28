# 发版检查清单

## 版本信息

- **版本号**：v1.4.0
- **发版日期**：2026-05-29
- **负责人**：Eng-Bob（执行）+ Claude Code 会话 sess-2026-05-29-smoke
- **关联 change**：`../../dev/2026-05-28-smoke-dev/`

## 前置检查

| 检查项 | 状态 | 证据 |
|--------|------|------|
| 1. 代码评审通过 | ⚠️ 跑冒烟时尚未完成 | dev change 仍处于 design-api 阶段；冒烟用例展示模板结构而非真实发版准入 |
| 2. 测试通过 | ⚠️ 跑冒烟时尚未跑测试 | 同上 |
| 3. 安全评审通过 | ⚠️ 跑冒烟时尚未评审 | 同上 |
| 4. Changelog 已更新 | ✅ | 引用 `CHANGELOG.md#1-4-0`（项目根 changelog；冒烟用例为占位引用） |
| 5. 依赖锁定无冲突 | ✅ | 执行 `pnpm install --frozen-lockfile` 输出："Done in 12s, no changes" |

> 备注：本 change 是端到端冒烟样例，前三项标"⚠️ 跑冒烟时尚未完成"是**有意为之**——展示当 dev 流程未走完时本工作流如何被阻挡（`prereq_checklist_passed=false` 写回 `.status.json`），印证硬依赖机制可工作。

## 发版步骤

> 冒烟样例不真实执行；以下步骤展示 release-checklist.md 模板的填充结构。

```bash
# 1. 在主分支创建 tag
$ git tag v1.4.0
# (no output)

# 2. 推送 tag
$ git push origin v1.4.0
# To github.com:org/repo.git
#  * [new tag]         v1.4.0 -> v1.4.0

# 3. 构建发布制品（pnpm 应用示例）
$ pnpm build
# > project@1.4.0 build
# > tsc && vite build
# vite v5.1.0 building for production...
# ✓ 234 modules transformed.
# dist/index.html  0.46 kB
# dist/assets/index-a1b2c3.js  124.83 kB │ gzip: 38.19 kB

# 4. 发布到分发渠道（npm 示例）
$ pnpm publish --access public
# + project@1.4.0
```

## 回滚预案

触发条件简述：
- 错误率 >2% 持续 5 分钟
- P99 延迟 >800ms 在 5 次连续采样
- 健康检查失败率 >50%

详细预案：见 `../../ops/2026-05-28-smoke-ops/deploy-rollback.md`（本冒烟未生成 deploy 阶段产物，引用结构展示如何衔接）。

完整预案路径模式：`../02-deploy/deploy-rollback.md`（workflow 规范引用）。
