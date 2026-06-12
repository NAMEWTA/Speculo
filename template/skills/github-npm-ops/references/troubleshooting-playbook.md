# Release 故障排查手册

基于真实失败记录的排查流程。遇到问题先按这个顺序走。

## 统一诊断流程

```bash
# 1. 找到失败的 run
gh run list --workflow release.yml --limit 5 \
  --json databaseId,conclusion,displayTitle

# 2. 查看失败步骤的日志
gh run view <databaseId> --log-failed 2>&1 \
  | grep -E "npm error|npm warn publish|##\[error\]|Error:" \
  | head -30

# 3. 按下面的错误表对应修复
```

## 错误分类与修复

### 1. `E404 Not Found - PUT /<pkg>`

```
npm error code E404
npm error 404 Not Found - PUT https://registry.npmjs.org/my-cli
npm error 404  The requested resource 'my-cli@0.0.2' could not be found
              or you do not have permission to access it.
```

**两种原因：**

- **包名被占用**：别人已注册这个名字，你没权限写入
- **私有包但未创建 scope/org**：scope 不存在

**诊断：**

```bash
npm view <pkg-name>              # 有内容说明被占
npm owner ls <pkg-name>          # 看当前 owner
```

**修复：**

- 改用 scoped 包名：`@yourname/pkg-name`
- 同步更新 `package.json` 的 `name` 字段
- 若要用现有名字：联系当前 owner 做 transfer，或走 `npm support`

### 2. `E403 Two-factor authentication required`

```
npm error code E403
npm error 403 403 Forbidden - PUT https://registry.npmjs.org/@scope%2fmy-cli
              - Two-factor authentication or granular access token
              with bypass 2fa enabled is required to publish packages.
```

**原因：** 使用了 Classic Token 或未开启 2FA bypass 的 Granular Token。

**修复：**

1. npm → Access Tokens → **Generate New Token** → **Granular Access Token**
2. 勾选 **Bypass two-factor authentication**
3. 选择目标包或 scope，permission 为 **Read and write**
4. 复制新 token，更新 GitHub Secret `NPM_TOKEN`
5. 重新触发 workflow（删旧 tag 重推）

详见 [setup-npm-token.md](./setup-npm-token.md)。

### 3. `EUSAGE Can't generate provenance for new or private package`

```
npm error code EUSAGE
npm error Can't generate provenance for new or private package,
          you must set `access` to public.
```

**原因：** Scoped 包默认 private，首次发布未加 `--access public`。

**修复：**

```yaml
- run: npm publish --provenance --access public
```

### 4. `E422 Error verifying sigstore provenance bundle`

```
npm error code E422
npm error 422 Unprocessable Entity - PUT https://registry.npmjs.org/@scope%2fmy-cli
              - Error verifying sigstore provenance bundle:
              Failed to validate repository information:
              package.json: "repository.url" is "", expected to match
              "https://github.com/owner/my-cli" from provenance
```

**原因：** `package.json` 缺 `repository.url`，或值与实际 GitHub 仓库不匹配。

**修复：**

```json
{
  "repository": {
    "type": "git",
    "url": "https://github.com/owner/my-cli"
  }
}
```

- URL 不要带 `.git` 后缀也能通过（npm 会归一化）
- 注意大小写：虽然 GitHub 不区分，但 provenance 严格校验，保持与 workflow 运行环境一致

### 5. `Tag version does not match package.json version`

```
Tag version (0.0.2) does not match package.json version (0.0.1)
```

**原因：** 打 tag 前忘记 bump `package.json`，或 bump 后没 commit。

**修复：**

```bash
# 删除错误 tag
git tag -d v0.0.2
git push origin :refs/tags/v0.0.2

# 修复 package.json
npm version 0.0.2 --no-git-tag-version    # 只改文件，不打 tag
git add package.json && git commit -m "chore: bump version to 0.0.2"
git push origin main

# 重新打 tag
git tag v0.0.2
git push origin v0.0.2
```

### 6. `npm warn publish "bin[name]" script name ... was invalid and removed`

```
npm warn publish "bin[my-cli]" script name dist/cli/index.js was invalid and removed
```

**原因：** `bin` 路径没有 `./` 前缀，或 npm 版本对该路径格式敏感。

**修复：** 确认 `package.json` 已经是 `"./dist/cli/index.js"`。如果已经正确但警告仍在，可能是 npm 的误报——检查 npm publish 最终有没有返回 `+ @scope/pkg@version`，有就成功了。

### 7. Workflow 根本没触发

**诊断：**

```bash
gh run list --workflow release.yml --limit 3
# 如果最新的那个不在列表里，就是没触发
```

**原因：**

- Tag 名不匹配 `v*` 模式
- Tag 已存在，再次 push 被 Git 拒绝
- 仓库关闭了 Actions

**修复：**

```bash
# 确认 tag 推到远端了
git ls-remote --tags origin | grep v0.0.2

# 如果旧 tag 残留，先删
git tag -d v0.0.2
git push origin :refs/tags/v0.0.2

# 重新打
git tag v0.0.2
git push origin v0.0.2
```

### 8. 安装 pnpm 或 Node 失败

```
Error: Unable to find 'pnpm' executable
```

**修复：** 在 setup 里加：

```yaml
- uses: pnpm/action-setup@v2
  with:
    version: 9     # 匹配 packageManager 字段或 lockfile 格式
```

如果 `package.json` 里写了 `packageManager: "pnpm@9.x.x"`，`pnpm/action-setup` 可不传 `version`，它会自动读取。

### 9. `npm ERR! 403 Forbidden - PUT` 但 token 正常

可能是包名大小写问题。npm 内部是小写，但 `package.json` 里写了大写：

```json
{ "name": "MyCli" }     // ❌
{ "name": "my-cli" }    // ✅
```

### 10. GitHub Release 正文为空 / 仅一行 `Full Changelog`

```
Release v0.0.10 (Latest)
Full Changelog: v0.0.9...v0.0.10
[Source code (zip)] [Source code (tar.gz)]
```

**原因**：`softprops/action-gh-release@v2` 只设了 `generate_release_notes: true`，而 GitHub 自动生成器从 PR 标题 + label 抽取 changelog。直 push main 的仓库没有 PR 流量，生成器只剩 compare 链接可写。

**修复（workflow 改造）**：在 Create GitHub Release 之前加一步从 `CHANGELOGS.md` 抽取段落，再用 `body_path` 注入。完整 YAML 见 [workflow-yaml-reference.md](workflow-yaml-reference.md) 的 `Extract release notes from CHANGELOGS.md` 步骤；模式说明见 [release-notes-injection.md](release-notes-injection.md)。

**修复（事后回填历史 Release，无需重发版）**：

```bash
VERSION="0.0.10"
notes_file="$(mktemp -t speculo-release-notes.XXXXXX)"
trap 'rm -f "$notes_file"' EXIT

awk -v v="$VERSION" '
  $0 ~ "^## \\["v"\\]" { found=1; print; next }
  found && /^## \[/ { exit }
  found && /^---[[:space:]]*$/ { next }
  found { print }
' CHANGELOGS.md > "$notes_file" && \
  gh release edit "v$VERSION" --notes-file "$notes_file"
```

**诊断**：

```bash
# Release body 长度过短就是出问题了
gh release view v0.0.10 --json body --jq '.body | length'

# workflow 里 Extract release notes 步骤是否存在并 success
gh run view <run-id> --json jobs \
  --jq '.jobs[].steps[] | select(.name | test("Extract|Release"))'
```

### 11. `Extract release notes` 步骤报 "release-notes.md is empty"

**根因**：CHANGELOG 段落标题与 tag 不匹配，awk 抽空。

**自查**：

```bash
# 实际 CHANGELOG 标题
grep '^## \[' CHANGELOGS.md | head -5

# 当前 tag 应当对应的标题
echo "## [${GITHUB_REF_NAME#v}]"
```

常见问题：

- 全角中括号 `【0.0.10】` 而非半角 `[0.0.10]`
- 版本号有 `v` 前缀（`## [v0.0.10]`）— awk 期望去前缀的纯数字
- 段落写错位置（`[Unreleased]` 段还没迁移到正式版本段）

## 发布成功但找不到包

典型场景：workflow 显示绿色，但 `npm view @scope/pkg` 返回 404。

- **传播延迟**：npm CDN 有 30–60 秒缓存延迟，等一下再查
- **日志确认**：`gh run view <id> --log | grep "+ @scope"`——有 `+ @scope/pkg@version` 才算真的成功
- **provenance 页面**：https://search.sigstore.dev/ 能查到签名日志

```bash
# 等待 + 轮询
for i in {1..10}; do
  npm view @scope/my-cli version 2>/dev/null && break
  sleep 10
done
```

## 已发布但需要撤回

npm **24 小时内**可以 `unpublish`（仅限无依赖项）：

```bash
npm unpublish @scope/my-cli@0.0.2
```

超过 24 小时或有依赖者只能 `deprecate`：

```bash
npm deprecate @scope/my-cli@0.0.2 "Security issue, use 0.0.3+"
```

**npm 不允许重发同一个 version**——即使 unpublish 过了。必须 bump 版本号。

## 排查 checklist

按顺序检查，90% 的问题在前三项：

1. [ ] `NPM_TOKEN` 是 Granular Token、bypass 2FA、包含目标 scope 的 read+write
2. [ ] `package.json` 有 `repository.url` 且匹配 GitHub repo
3. [ ] Workflow 含 `permissions: id-token: write` 和 `--access public`
4. [ ] Tag 版本与 `package.json` version 字符一致
5. [ ] Publish step 在 Release step 之前
6. [ ] Workflow 触发器是 `on.push.tags: ['v*']`，没写 branches
7. [ ] `bin` 路径以 `./` 开头
8. [ ] `files` 字段不排除构建产物
9. [ ] **Workflow 包含 `Extract release notes from CHANGELOGS.md` 步骤，且 `Create GitHub Release` 设了 `body_path: release-notes.md`**
10. [ ] **CHANGELOGS.md 顶部有当前版本对应的 `## [X.Y.Z]` 段落（半角中括号）**
