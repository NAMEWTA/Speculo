# package.json 发布前字段清单

发布失败的一半原因都是 `package.json` 少字段或字段错位。按这张清单逐项确认。

## 必填字段

### name

- 普通包：全局唯一，小写 + 连字符（如 `my-cli`）
- Scoped 包：`@scope/name`，必须先在 npm 上拥有 scope
- **首次发布前用 `npm view <name>` 查询是否被占用**；返回 404 才可用

```bash
npm view my-cli                 # 404 = 可用；有输出 = 已占用
npm view @scope/my-cli          # 首次发布会 404，正常
```

### version

- 遵循 SemVer（MAJOR.MINOR.PATCH）
- 必须与要发布的 git tag 严格匹配：tag `v0.0.2` ↔ version `0.0.2`
- npm **不允许重复发布同一个 version**，即使之前 unpublished 也不行（24h 内）

### repository

**npm provenance 强制要求这个字段**，缺失会报 `E422`。

```json
{
  "repository": {
    "type": "git",
    "url": "https://github.com/owner/my-cli"
  }
}
```

- `url` 必须指向实际托管 workflow 的 GitHub 仓库
- 注意大小写：GitHub 虽不区分，但 provenance 验证严格匹配

### license

SPDX 标识符（如 `MIT`、`Apache-2.0`、`ISC`）。别写 `LICENSE.md` 或随意字符串。

## CLI 包专用字段

### bin

命令入口。路径必须以 `./` 开头：

```json
{
  "bin": {
    "my-cli": "./dist/cli/index.js"
  }
}
```

入口文件必须：

1. 有可执行权限（`chmod +x`，或通过 `scripts/inject-shebang.mjs` 注入 shebang）
2. 首行是 `#!/usr/bin/env node`
3. 是 ESM（`"type": "module"` 时）或 CJS，与 package 一致

### files

显式允许列表，避免把源码、测试、`.env` 发到 npm：

```json
{
  "files": [
    "dist",
    "templates",
    "!dist/**/*.test.js",
    "!dist/**/__tests__",
    "!dist/**/*.map"
  ]
}
```

- 不写 `files` 时，npm 走 `.gitignore` 加一堆默认规则，通常会漏发或误发
- 发布前用 `npm pack --dry-run` 看看 tarball 实际内容

## 推荐但可选字段

### description / keywords

影响 npm 搜索结果，写清楚。

### homepage / bugs

```json
{
  "homepage": "https://github.com/owner/my-cli#readme",
  "bugs": {
    "url": "https://github.com/owner/my-cli/issues"
  }
}
```

显示在 npm 包页面，方便用户找文档和报问题。

### engines

```json
{
  "engines": {
    "node": ">=24.14.1"
  }
}
```

声明最低 Node 版本；npm 会在安装时提示（但不会阻止）。

### type / exports

ESM 包：

```json
{
  "type": "module",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "default": "./dist/index.js"
    }
  }
}
```

## scripts

### prepublishOnly

发布前的质量闸门。仅在 `npm publish` 前执行（`npm install` 不触发）：

```json
{
  "scripts": {
    "prepublishOnly": "pnpm check"
  }
}
```

`pnpm check` 通常是 `pnpm lint && pnpm test && pnpm build`。

### 不要用的 scripts

- `prepublish` — 已废弃，会在 `install` 时也触发，容易误伤
- `prepare` — 在 `install` 时也跑，写构建命令会导致普通安装变慢

## 发布前自检流程

```bash
# 1. 检查 name 可用（首次发布）
npm view @scope/my-cli

# 2. 版本一致性
node -e "console.log(require('./package.json').version)"
git tag --list 'v*' | sort -V | tail -3

# 3. tarball 内容预览
npm pack --dry-run

# 4. 运行质量闸门
pnpm check

# 5. 预演发布（不会真的推送）
npm publish --dry-run --access public --provenance
```

如果 5 个命令都正常，再执行真正的 `git tag && git push origin <tag>` 触发 CI 发布。
