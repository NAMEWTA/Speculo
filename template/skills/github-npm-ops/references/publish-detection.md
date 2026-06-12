# Release.yml 是否含 npm publish 的判定脚本

> 用于决定 Phase 5 是否做 npm 端校验。命令正文只展示了核心 grep；这里给出完整模式集合、第三方 action 清单与误判排除策略。

## 判定输出

```bash
RELEASE_YML=".github/workflows/release.yml"

if [ ! -f "$RELEASE_YML" ]; then
  echo "RELEASE_YML_MISSING=true"
  exit 0
fi

# 主判定：是否含 npm publish 步骤
if grep -Eq 'npm[[:space:]]+publish|run:[[:space:]]*pnpm[[:space:]]+publish|run:[[:space:]]*yarn[[:space:]]+publish|JS-DevTools/npm-publish|cycjimmy/semantic-release-action|changesets/action' "$RELEASE_YML"; then
  echo "PUBLISH_TO_NPM=true"
else
  echo "PUBLISH_TO_NPM=false"
fi
```

## 模式集合

`PUBLISH_TO_NPM=true` 命中下列任一行时为真：

| 模式 | 形态 | 说明 |
|------|------|------|
| `npm publish` | `run: npm publish --provenance --access public` | 官方 npm CLI |
| `pnpm publish` | `run: pnpm publish --no-git-checks` | pnpm 包管理器 |
| `yarn publish` | `run: yarn publish --new-version $VERSION` | 旧 yarn / berry |
| `JS-DevTools/npm-publish@vN` | `uses: JS-DevTools/npm-publish@v3` | 第三方封装 action |
| `cycjimmy/semantic-release-action@vN` | `uses: cycjimmy/semantic-release-action@v4` | semantic-release 流水线 |
| `changesets/action@vN` | `uses: changesets/action@v1` 且配置 `publish:` 输入 | Changesets 风格的多包发布 |

## 误判排除

下列形态**不应**触发 `PUBLISH_TO_NPM=true`：

| 形态 | 是否触发 | 原因 |
|------|---------|------|
| `# npm publish` 注释行 | ❌ | grep `-E` 默认匹配整行；如需更严格可加 `^[^#]*` 锚定 |
| `description: 'Run npm publish ...'` | ⚠️ 可能误命中 | 收紧 grep 为 `run:[[:space:]]*npm[[:space:]]+publish` 即可避免 |
| `npm publish --dry-run` | ✅ 仍命中 | 视作真发布意图；如需排除，可在判定后追加 `--dry-run` 检查并手动降级 |
| `npm pack` | ❌ | `pack` 不是 `publish` |
| 仅 `softprops/action-gh-release` | ❌ | 这是 GitHub Release 创建器，不是 npm publish |

## 收紧版（推荐用于精确判定）

```bash
grep -E '^\s*(run:\s*(npm|pnpm|yarn)\s+publish|uses:\s*(JS-DevTools/npm-publish|cycjimmy/semantic-release-action|changesets/action))\b' "$RELEASE_YML"
```

> 如果仓库使用了非主流的发布方式（如自写 shell 脚本里调用 `npm publish`），grep 仍可能漏判。
> 漏判后果：Phase 5 跳过 `npm view` 校验。这是**安全侧**漏判（不会误报"未发布"），但用户应在该仓库的 README 或 SKILL 注释里明确发布方式，避免歧义。

## 多 workflow 文件的处理

若仓库有多个 release 相关 workflow（如 `release.yml` + `publish-canary.yml`），默认只看 `release.yml`。
如需扩展，在调用方 workflow 或项目上下文中声明 `releaseWorkflowPaths: [...]`，执行时按该列表逐个判定。

## 与 Phase 5 的衔接

| 嗅探结果 | Phase 5 行为 |
|---------|-------------|
| `PUBLISH_TO_NPM=true` | 跑 `gh release view` + `gh run` + `npm view` 三端 |
| `PUBLISH_TO_NPM=false` | 仅跑 `gh release view` + `gh run` 两端，并向用户输出「本仓库 release.yml 不含 npm publish 步骤」提示 |
| `RELEASE_YML_MISSING=true` | Phase 0 直接终止，不进入后续 phase |
