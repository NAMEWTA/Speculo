# 维护者指南

[手册首页](README.md) · [架构](architecture.md) · [项目规则](../AGENTS.md)

本页面向修改 Speculo 本身的维护者。普通用户安装 npm 包即可，不需要运行仓库生成器。

## 本地准备

Node.js `>=22.22.3 <25`，包管理器版本以 `package.json` 的 `packageManager` 为准，当前为 `pnpm@11.1.3`。

```bash
pnpm install --frozen-lockfile
pnpm build
```

CLI 构建入口是 `dist/src/cli.js`。根项目规则和适用目录规则优先；修改文档结构、行为或所有权前，读取作者协议与文档保真合同。

## 先找到真正的源

| 要修改什么 | 维护位置 |
|---|---|
| CLI、安装、投影、恢复与路径校验 | `src/` |
| 一次调用的 Command 规则 | `template/commands/<id>/COMMAND.md` 及包内参考 |
| 领域与 Work 的行为 | `template/workflows/<domain>/` 中入口、rules、references、assets |
| 跨领域方法 | `template/references/` |
| 作者维护能力 | `.agents/skills/` |
| 面向用户的教程 | `docs/`、`README.md`、`README-ZH.md` |
| 生成与隔离验证 | `scripts/`、`test/` |

`template/lib/`、领域 AUTO-INDEX 和 `template/canonical/` 是生成物。调整真实源后再重建，不手工维护第二份生成内容；保留第三方许可与来源。

## 按改动选择验证

| 命令 | 作用 |
|---|---|
| `pnpm build` | 构建 TypeScript |
| `pnpm test` | 构建并运行仓库测试 |
| `pnpm validate-assets` | 验证分发资产、引用、生成闭包及领域合同 |
| `pnpm validate-skills` | 检查 Skill 格式与相关结构 |
| `pnpm validate-source-parity` | 检查真实源与分发关系 |
| `pnpm generate-assets` | 重建运行库、索引、验证器和 canonical |
| `pnpm verify-generated` | 两次生成并确认无内容变化 |
| `pnpm verify-bin` | 检查 CLI 入口行为 |
| `pnpm verify-package` | 检查打包后隔离使用 |
| `pnpm eval:run-artifacts` | 在一次性项目中调用真实安装 CLI 与领域工具，保存实际工件、退出码和未运行观察场景 |
| `pnpm validate-disposition` | 检查当前文件的保留、重写、移动、新增与退役记录；历史原摘要保持不变 |
| `pnpm check` | 运行测试与资产验证 |

只改文字，核对事实、链接和格式；入口或权限变化增加相关正常/失败场景；状态和事务变化使用一次性夹具验证冲突、恢复与零副作用分支。分发资产变化运行 validate-assets，生成物变化检查二次生成无差异。

结构校验不认证真实宿主、模型判断、浏览器画面或外部平台操作。报告实际运行命令和结果，并把未验证项单独说明。

运行与证据层级详见 [Workflow 合同、证据与恢复](workflow-integrity.md)。`eval:run-artifacts` 接到 CI 的安装产物检查；真正的 observed 评估仍需要操作者信任的独立观察记录。产物通过、观察门资格和发布授权是不同事实。

## 文档怎样持续保持当前

1. 从真实 CLI、manifest 和入口确认行为，不从旧发布报告推断现状。
2. 一个 Work 的作用、输入、输出、关键数量、权限或失败语义变化时，同步对应领域指南。
3. Command 变化时同步其单页和分类目录；公开能力增减时同步能力目录及项目首页。
4. 安装参数或默认值变化时同步入门、CLI、排障和 README 示例。
5. 检查相对路径和锚点，保证 GitHub 可以直接进入领域或 Command 类别。

`docs/` 不新增一次性开发计划、实施报告或发布验收流水。可复现示例保留真实证据与限制；许可和来源说明持续保留。历史版本变化查 CHANGELOG/Git。资产迁移审计数据位于 `scripts/data/asset-disposition.json`，它是维护数据，不是用户操作手册，也不是运行时路由。

## 发布边界

版本由 `package.json` 和 `CHANGELOG.md` 驱动，`v*` tag 触发 CI release。提交、推送、tag、npm 发布、GitHub Release 和部署需要明确授权。完成本地检查不自动执行这些动作。
