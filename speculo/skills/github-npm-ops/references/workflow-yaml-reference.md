# release.yml 完整注解

逐行解释 `.github/workflows/release.yml` 中每个选择的原因。

## 完整示例

```yaml
name: Release

on:
  push:
    tags:
      - 'v*'

jobs:
  release:
    runs-on: ubuntu-latest
    name: Release to npm
    permissions:
      id-token: write
      contents: write
      packages: write
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup environment
        uses: ./.github/actions/setup
        with:
          registry-url: 'https://registry.npmjs.org'

      - name: Verify tag matches package version
        run: |
          TAG="${{ github.ref }}"
          TAG_VERSION="${TAG#refs/tags/v}"
          PACKAGE_VERSION=$(node -e "console.log(require('./package.json').version)")
          if [ "$TAG_VERSION" != "$PACKAGE_VERSION" ]; then
            echo "Tag version ($TAG_VERSION) does not match package.json version ($PACKAGE_VERSION)"
            exit 1
          fi
          echo "Version verified: v$PACKAGE_VERSION"

      - name: Run lint
        run: pnpm lint

      - name: Run tests
        run: pnpm test

      - name: Build
        run: pnpm build

      - name: Verify bin entry
        run: node scripts/verify-bin.mjs

      - name: Extract release notes from CHANGELOGS.md
        run: |
          VERSION="${GITHUB_REF_NAME#v}"
          awk -v v="$VERSION" '
            $0 ~ "^## \\["v"\\]" { found=1; print; next }
            found && /^## \[/ { exit }
            found && /^---[[:space:]]*$/ { next }
            found { print }
          ' CHANGELOGS.md > release-notes.md

          if [ ! -s release-notes.md ]; then
            echo "::warning::CHANGELOGS.md 中未找到 [$VERSION] 段落，回退到自动生成。"
            echo "See [CHANGELOGS.md](https://github.com/${{ github.repository }}/blob/main/CHANGELOGS.md) for details." > release-notes.md
          fi

      - name: Publish to npm
        run: npm publish --provenance --access public
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}

      - name: Create GitHub Release
        uses: softprops/action-gh-release@v2
        if: success()
        with:
          tag_name: ${{ github.ref_name }}
          name: Release ${{ github.ref_name }}
          body_path: release-notes.md
          generate_release_notes: true
          draft: false
          prerelease: false
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

## 逐项解释

### 触发条件

```yaml
on:
  push:
    tags:
      - 'v*'
```

- 只在 push 带 `v` 开头的 tag 时触发（如 `v0.0.2`、`v1.2.3-rc1`）
- **不要**同时写 `branches`，否则每次 push main 都会触发 release
- 如果想预发，用独立的 tag 模式（如 `v*-rc*`）区分

### permissions

```yaml
permissions:
  id-token: write
  contents: write
  packages: write
```

| 权限               | 作用                                                                                   |
| ------------------ | -------------------------------------------------------------------------------------- |
| `id-token: write`  | **必需**：用于 npm provenance（OIDC 签名）                                              |
| `contents: write`  | **必需**：`softprops/action-gh-release` 创建 GitHub Release 需要                        |
| `packages: write`  | 仅在同时发 GitHub Packages 时需要；纯 npm 发布可省略                                    |

默认 `GITHUB_TOKEN` 只有 `contents: read`，这三项必须显式声明。

### Checkout

```yaml
- uses: actions/checkout@v4
```

默认浅克隆（`fetch-depth: 1`）。如果发布说明需要完整历史（如 changelog 生成），加 `fetch-depth: 0`。

### Setup environment

```yaml
- uses: ./.github/actions/setup
  with:
    registry-url: 'https://registry.npmjs.org'
```

复合 action，通常封装：

```yaml
- uses: actions/setup-node@v4
  with:
    node-version: '24.14.1'
    registry-url: 'https://registry.npmjs.org'
- uses: pnpm/action-setup@v2
  with:
    version: 9
- run: pnpm install --frozen-lockfile
```

关键点：`registry-url` **必须**在 `setup-node` 里设置，它会生成 `.npmrc` 并让 `NODE_AUTH_TOKEN` 生效。

### Verify tag matches package version

防止错发：tag `v0.0.2` 指向一个 `package.json` 版本为 `0.0.1` 的 commit，会导致用户安装到错误版本。

失败时 workflow 直接退出，不会执行任何发布动作。

### Lint / Test / Build

即使本地已经跑过，CI 再跑一遍保证：

1. 发布的产物来自干净环境
2. 锁文件（`pnpm-lock.yaml`）在 CI 下可复现
3. Build 产物与 tag 对应的源码一致

如果 repo 已有一个单独的 `ci.yml` 跑在 push/PR 上，这里仍保留是为了**再次校验 tag 指向的 commit**——tag 可能指向旧 commit。

### Verify bin entry

```yaml
- run: node scripts/verify-bin.mjs
```

CLI 包专有：确认 `dist/cli/index.js` 存在、有 shebang、可执行。防止 tsconfig 出问题导致产物不完整。

### Extract release notes from CHANGELOGS.md

```yaml
- name: Extract release notes from CHANGELOGS.md
  run: |
    VERSION="${GITHUB_REF_NAME#v}"
    awk -v v="$VERSION" '
      $0 ~ "^## \\["v"\\]" { found=1; print; next }
      found && /^## \[/ { exit }
      found && /^---[[:space:]]*$/ { next }
      found { print }
    ' CHANGELOGS.md > release-notes.md

    if [ ! -s release-notes.md ]; then
      echo "::warning::..." >&2
      echo "See [CHANGELOGS.md](...) for details." > release-notes.md
    fi
```

把 `## [X.Y.Z]` 段落抽到 `release-notes.md`，让下面的 `softprops/action-gh-release` 通过 `body_path` 注入到 GitHub Release 正文。

**为什么必须有这一步**：仅用 `generate_release_notes: true` 时，GitHub 内部从 commit + PR + label 抽取 changelog；直 push main 流程没 PR，生成器只剩 `Full Changelog: vA...vB` 一行。CHANGELOG 是事实来源，注入它才能让 Release 正文非空。

**awk 规则细节**与边界用例（包含 `[Unreleased]` 同时存在、版本号含连字符 / 多语言 CHANGELOG / `body_path` + `generate_release_notes` 共存语义）见 [release-notes-injection.md](release-notes-injection.md)。

### Publish to npm

```yaml
- run: npm publish --provenance --access public
  env:
    NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

- `--provenance`：生成 sigstore 签名，要求 `id-token: write`
- `--access public`：scoped 包首次发布必需；非 scoped 包加了也不会错
- **位置在 GitHub Release 之前**：npm publish 不可回滚，如果后续步骤失败，至少 npm 发布是成功的

### Create GitHub Release

```yaml
- uses: softprops/action-gh-release@v2
  if: success()
  with:
    tag_name: ${{ github.ref_name }}
    body_path: release-notes.md
    generate_release_notes: true
```

- `if: success()`：只在 npm publish 成功后执行
- `body_path: release-notes.md`：**正文头部**注入上一步抽取的 CHANGELOG 段落
- `generate_release_notes: true`：**正文尾部**附 GitHub 自动生成的 What's Changed + Full Changelog compare 链接
- 两者共存不冲突，效果是「人写的精炼说明 + 机器可追溯的索引」叠加
- `softprops/action-gh-release@v2` 比废弃的 `actions/create-release@v1` 更稳定

仅用 `generate_release_notes: true` 而不注入 `body_path`，在没有 PR 流量的仓库会得到几乎为空的 Release 正文，详见 [release-notes-injection.md](release-notes-injection.md) §1。

## 常见变体

### 使用 pnpm publish 代替 npm publish

pnpm 也支持 `--access public --provenance`：

```yaml
- run: pnpm publish --provenance --access public --no-git-checks
```

`--no-git-checks` 避免 pnpm 检查当前 branch/tag（CI 中 detached HEAD 会被拒）。

### 发布到 GitHub Packages（可选）

```yaml
- name: Publish to GitHub Packages
  run: npm publish --registry=https://npm.pkg.github.com
  env:
    NODE_AUTH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

需要单独的 setup step 指向 GitHub Packages，且 package 名必须是 `@owner/name` 形式。

### Dry run（在 PR 里预演）

```yaml
- run: npm publish --dry-run --access public
```

放在一个仅 PR 触发的 workflow 里，帮你在合并前发现 tarball 问题。

## 不推荐的做法

- 在同一个 job 里既跑 push-to-main CI 又跑 release — 混乱，难以调试
- 使用 `actions/create-release@v1` — 已废弃，推荐 `softprops/action-gh-release`
- 用 `secrets.NPM_TOKEN` 直接传给 `npm publish` 命令行 — 会在日志里泄露
- 跳过 `prepublishOnly` 或 CI 测试 — 已知会发布过坏包
