# 失败回滚与恢复剧本

> 命令正文给出 4 类失败场景的对照表；这里给出每类的完整恢复 SOP、配套命令与错误码映射。
> 通用前置：所有恢复操作前先 `git fetch --tags` 同步远端 tag 状态，避免本地与远端不一致。

## 场景 A：publish 之前任何步骤失败（含 build / verify-bin / Extract release notes）

**特征**：`gh run view <id>` 显示 fail 步骤位于 `Publish to npm` 之前；npm 端尚未上传任何 tarball。

**恢复**：可重发同 tag。

```bash
# 1. 删本地 + 远端 tag
git tag -d vX.Y.Z
git push origin :refs/tags/vX.Y.Z

# 2. 修代码（修 lint / 修测试 / 补 CHANGELOG 段落 / 修 release.yml）
#    修复完后落新的非 release commit，保持 release commit 干净

# 3. （若 release commit 已被 push）amend / 追加修复 commit 都可
#    重要：若需要修改 package.json 或 CHANGELOGS.md，最好新落一个 fix commit
#    再用 --amend 合并到 release commit 后 force-push（仅个人分支或本地未推时）

# 4. 重新打 tag 指向（可能更新过的）release commit
git tag vX.Y.Z <release-commit-sha>
git push origin vX.Y.Z
```

**错误码映射**：失败步骤决定 E 码，常见有 `E004_noVerificationEvidence`（lint/test/build fail）、`E001_missingPrerequisiteArtifact`（CHANGELOG 段落抽空）。

---

## 场景 B：publish 之后步骤失败（如 Create GitHub Release fail）

**特征**：`gh run view <id>` 中 `Publish to npm` 步骤 success；其后步骤（多为 `Create GitHub Release`）fail。npm 已成功上传。

**恢复**：**不要**重发 npm（同版本号永久不可重发），仅手动补 GitHub Release。

```bash
notes_file="$(mktemp -t speculo-release-notes.XXXXXX)"
trap 'rm -f "$notes_file"' EXIT

# 1. 抽取 CHANGELOG 段落作为 Release notes
awk -v v="X.Y.Z" '
  $0 ~ "^## \\["v"\\]" { found=1; print; next }
  found && /^## \[/ { exit }
  found && /^---[[:space:]]*$/ { next }
  found { print }
' CHANGELOGS.md > "$notes_file"

# 2. 手动创建 GitHub Release
gh release create vX.Y.Z \
  --title "Release vX.Y.Z" \
  --notes-file "$notes_file" \
  --latest

# 3. 三端再次校验
npm view <pkg> version          # 应 == X.Y.Z
gh release view vX.Y.Z --json body,isDraft,isPrerelease
```

**错误码映射**：通常是基础设施层错误（GitHub API 抖动 / token 权限缺 `contents: write`），不计入项目业务错误字典。

---

## 场景 C：`Publish to npm` 本身上传失败

**特征**：`Publish to npm` 步骤 fail；npm 端 `npm view <pkg> version` 仍是上一版本（未上传成功）。

**恢复**：可重发同 tag（与场景 A 相同流程），但务必先确认 npm 端没有"半上传"状态。

```bash
# 确认 npm 没收到 tarball
npm view <pkg> versions --json | jq '. | index("X.Y.Z")'   # 应输出 null

# 删 tag → 修因（多为 NPM_TOKEN 失效 / provenance 配置 / package.json#repository.url 不匹配）
git tag -d vX.Y.Z
git push origin :refs/tags/vX.Y.Z

# 修复后重打同 tag
git tag vX.Y.Z <release-commit-sha>
git push origin vX.Y.Z
```

常见根因：

| 根因 | 修复 |
|------|------|
| `NPM_TOKEN` 过期 / 失效 | 重新生成 Granular Token，更新仓库 secret |
| `provenance` 失败 | workflow 缺 `id-token: write` 权限；package.json `repository.url` 不严格匹配 GitHub URL |
| 包名 scope 不属于当前 token | 检查 token 配置的 scope；首次发布 scoped 包需 `--access public` |
| 网络抖动 / npm registry 临时不可用 | 等几分钟后 rerun |

---

## 场景 D：npm 已成功上传 + 任何后续问题

**特征**：`npm view <pkg> version` 已是 `X.Y.Z`。

**铁律**：npm 不允许重发同 `version`（unpublish 过也不行）。**禁止**重打同 tag、**禁止**修代码后试图覆盖。

**恢复**：

```bash
# 1. bump 到 X.Y.(Z+1)，从 Phase 3 重走整条流水线
重新执行调用方的发布流程，并显式指定版本 X.Y.(Z+1)

# 2. 在 CHANGELOG 中诚实记录本次发布的偏差
#    在 [X.Y.(Z+1)] 段落开头加一句 "supersedes vX.Y.Z due to <根因>"
```

**错误码映射**：场景 D 通常是上游错误溢出（场景 B/C 处理不当后果），不单独列 E 码；流程上要求**事后复盘**，把可复用根因输出给调用方 workflow，由其追加到 `speculo/.speculo/.config/LESSONS.md`（本 skill 不自行选择持久化目录）。

---

## 场景共性：何时触发 P9（反重复失败原则）

> 反重复失败原则：同根因连续失败时，必须先声明新尝试与上次的差异。

- **同根因连续失败 ≥ 2 次** → 必须先停手，**书面声明**本次重试与上次的差异
- 未声明差异即重试 → 触发 `E010_repeatedFailurePattern`，`npm-cicd-release` 命令应主动暂停，等待用户输入差异声明

例：场景 C 中 NPM_TOKEN 失效连续两次 fail，第二次失败后必须先确认 token 已真正更新（粘贴新 token 的尾 4 位摘要 / GitHub Secrets 更新时间），再继续。

---

## 与 github-npm-ops skill 的关系

本文件是发布编排视角下的失败恢复入口；更细粒度的失败案例（如 EUSAGE / E422 / provenance 错误码、package.json 字段错误）见 `troubleshooting-playbook.md`。

| 失败位置 | 看本文件 | 看 github-npm-ops troubleshooting-playbook |
|---------|---------|---------------------------------------|
| Phase 1–6 编排逻辑层面 | ✅ | ❌ |
| release.yml 内部步骤的具体错误码 | ❌ | ✅ |
| npm 错误码（E403 / E404 / E422 / EUSAGE） | ❌ | ✅ |
