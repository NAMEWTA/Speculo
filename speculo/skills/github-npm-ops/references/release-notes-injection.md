# CHANGELOG → GitHub Release notes 注入

让每次 `git push origin vX.Y.Z` 触发的 GitHub Release **正文非空**、**与 CHANGELOG 段落严格一致**的标准方案。

## 1. 为什么 GitHub Release 默认是空的

`softprops/action-gh-release@v2` 仅设 `generate_release_notes: true` 时,GitHub 内部调用的是 **REST API `POST /repos/{owner}/{repo}/releases/generate-notes`**,该接口的输入是「上一个 tag → 当前 tag」之间的 **commit + PR + label**,优先取 PR 标题做分类。

两种典型场景下生成器会"贫瘠":

| 场景 | 生成器输出 | 原因 |
|------|----------|------|
| 直 push main(无 PR 流程) | 仅 `Full Changelog: vA...vB` 一行 | 生成器没有 PR 可分类,只能给 compare 链接 |
| 有 PR 但仓库没有 `.github/release.yml` | 全部 PR 都被塞进 "What's Changed" 一节 | 没有 label → 章节映射 |

而仓库通常已经维护了 `CHANGELOGS.md`(Keep a Changelog 格式)。**正确做法是把 CHANGELOG 段落作为 Release 正文的事实来源**,自动生成器仅作为补充链接。

## 2. 注入方案

核心思路:在 workflow 里加一步,从 `CHANGELOGS.md` 抽取当前 tag 对应的版本段落,写到 `release-notes.md`,再通过 `softprops/action-gh-release` 的 `body_path` 注入。

### 2.1 完整 workflow 步骤

加到 `Verify bin entry` 之后、`Publish to npm` 之前(也可以放 publish 之后,只要在 Create GitHub Release 之前):

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
      echo "::warning::CHANGELOGS.md 中未找到 [$VERSION] 段落,回退到自动生成。"
      echo "See [CHANGELOGS.md](https://github.com/${{ github.repository }}/blob/main/CHANGELOGS.md) for details." > release-notes.md
    fi

    echo "--- Release notes preview ---"
    cat release-notes.md
    echo "-----------------------------"

- name: Create GitHub Release
  uses: softprops/action-gh-release@v2
  if: success()
  with:
    tag_name: ${{ github.ref_name }}
    name: Release ${{ github.ref_name }}
    body_path: release-notes.md          # ← 关键
    generate_release_notes: true         # ← 与 body_path 共存,不冲突
    draft: false
    prerelease: false
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### 2.2 awk 抽取规则解释

```awk
$0 ~ "^## \\["v"\\]" { found=1; print; next }   # 1. 命中 "## [X.Y.Z]" 起始锚点,开关打开,打印当行
found && /^## \[/ { exit }                       # 2. 已在段落内,遇到下一个 "## [" 立刻退出
found && /^---[[:space:]]*$/ { next }            # 3. 跳过 "---" 分隔符(GitHub Release 不需要)
found { print }                                  # 4. 段落内的其他行原样输出
```

边界用例:

- **段落是 CHANGELOG 末尾**:没有下一个 `## [`,awk 跑到 EOF 自然结束
- **存在 `[Unreleased]` 段落**:不会被误抓,因为锚点要求精确匹配 `[X.Y.Z]` 形式
- **版本号含连字符(rc / beta)**:`0.0.10-rc1` 也能匹配,因为 awk 把 `v` 当字面量
- **CHANGELOG 缺该段**:`-s` 测试为空 → 写入兜底文案 + 输出 warning

### 2.3 `body_path` + `generate_release_notes` 共存语义

`softprops/action-gh-release@v2` 在两者同时存在时:

- **正文头部**:`body_path` 文件内容(你的 CHANGELOG 段落)
- **正文尾部**:GitHub 自动生成的 "What's Changed" + "Full Changelog" compare 链接

这是最优组合:**人写的精炼说明 + 机器可追溯的 PR/commit 索引**。

## 3. 事后修复历史 Release(已发布版本正文为空)

GitHub Release 的正文(body)**事后可改**(tag 不可改、npm 包不可改、但 Release body 可改)。两种方式:

### 3.1 命令行(推荐)

`notes_file` 只是一次性传给 `gh --notes-file` 的中间文件；若需要保留回填记录或 release notes，由调用方写入 `speculo/.speculo/commands/<command>/<YYYY-MM-DD>-<scope>-<topic>[-NN].md`。

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

### 3.2 GitHub UI

进入 `https://github.com/<owner>/<repo>/releases/tag/vX.Y.Z`,右上角铅笔图标 → 粘贴 CHANGELOG 段落 → Update release。

### 3.3 批量回填多个历史版本

```bash
notes_file="$(mktemp -t speculo-release-notes.XXXXXX)"
trap 'rm -f "$notes_file"' EXIT

for v in 0.0.7 0.0.8 0.0.9; do
  awk -v ver="$v" '
    $0 ~ "^## \\["ver"\\]" { found=1; print; next }
    found && /^## \[/ { exit }
    found && /^---[[:space:]]*$/ { next }
    found { print }
  ' CHANGELOGS.md > "$notes_file"

  if [ -s "$notes_file" ]; then
    gh release edit "v$v" --notes-file "$notes_file"
    echo "✓ v$v"
  else
    echo "✗ v$v: CHANGELOG 中无对应段落,跳过"
  fi
done
```

## 4. 进阶:走 PR 流程的项目

若仓库以 PR 为主、合并产生 commit,推荐 **同时**保留 CHANGELOG 注入 + 配置 `.github/release.yml` 让自动生成器分类更友好。

### 4.1 `.github/release.yml`(GitHub 原生分类配置)

```yaml
# .github/release.yml
changelog:
  exclude:
    labels:
      - ignore-for-release
      - dependencies      # 可选:依赖升级单独成节
  categories:
    - title: 🚀 Features
      labels:
        - feat
        - feature
        - enhancement
    - title: 🐛 Bug Fixes
      labels:
        - fix
        - bug
    - title: 📚 Documentation
      labels:
        - docs
        - documentation
    - title: ♻️ Refactoring
      labels:
        - refactor
    - title: 🧪 Testing
      labels:
        - test
    - title: 🔧 Maintenance
      labels:
        - chore
        - ci
    - title: Other Changes
      labels:
        - "*"
```

效果:`generate_release_notes` 自动产出的 "What's Changed" 会被分类到上述章节中,与 CHANGELOG 段落叠加在 Release 正文内。

### 4.2 配套的 PR label 自动化

参考仓库已有 `.github/labeler.yml` + `.github/workflows/label-pr.yml`,基于改动路径自动打 label。也可让 PR 模板提示作者按 Conventional Commits 选择类型。

## 5. 多语言 CHANGELOG 处理

如果项目同时维护 `CHANGELOG.md` + `CHANGELOG-ZH.md`,Release 正文应优先取**主语言**(通常英文)。两种策略:

### A. workflow 选择主语言(简单)

```yaml
- name: Extract release notes
  run: |
    # 主语言文件名作为输入
    awk -v v="${GITHUB_REF_NAME#v}" '...' CHANGELOG.md > release-notes.md
```

### B. workflow 拼接双语(完整)

```yaml
- name: Extract release notes (bilingual)
  run: |
    VERSION="${GITHUB_REF_NAME#v}"
    EXTRACT='$0 ~ "^## \\["v"\\]" { found=1; print; next } found && /^## \[/ { exit } found && /^---[[:space:]]*$/ { next } found { print }'

    {
      awk -v v="$VERSION" "$EXTRACT" CHANGELOG.md
      echo
      echo "---"
      echo
      echo "### 中文版本说明"
      echo
      awk -v v="$VERSION" "$EXTRACT" CHANGELOG-ZH.md
    } > release-notes.md
```

## 6. 常见坑位

| 坑 | 现象 | 解法 |
|---|------|------|
| `body_path` 文件不存在 | action 失败 `Could not find the body_path` | 加 `if [ ! -s release-notes.md ]` 兜底写入 |
| awk 没匹配到 | release-notes.md 为空,Release 正文兜底文案 | 检查 CHANGELOG 段落标题与 tag 是否对应(`v0.0.10` ↔ `## [0.0.10]`) |
| awk 多匹配(同一版本写了两次) | Release 正文重复内容 | CHANGELOG 是 source of truth,先去重 |
| 全角中括号 `【】` 被当锚点 | 抽取失败 | CHANGELOG 标题统一用半角 `[` |
| body_path 文件含 BOM | Release 渲染异常 | 用 `sed -i '1s/^\xef\xbb\xbf//' release-notes.md` 去 BOM |

## 7. 验证

每次发布后必查:

```bash
# Release body 必须非空且包含 CHANGELOG 关键章节
gh release view "v$VERSION" --json body --jq '.body' | head -20

# 三端齐绿才算发布完成
npm view @scope/pkg version
gh release view "v$VERSION" --json isDraft,isPrerelease,publishedAt
gh run view <run-id> --json conclusion,jobs --jq '{conclusion, steps: [.jobs[].steps[] | select(.name | contains("Extract") or contains("Release")) | {name, conclusion}]}'
```

`Extract release notes` 步骤未 success → Release 正文将走兜底文案,需排查 awk 是否抽空。
