# Diff Collect Phase

## 输入

- `speculo/.speculo/dev/docs-sync-state.json`
- `LAST_SYNC_SHA`
- 当前 `HEAD`

## 产物

- `speculo/.speculo/dev/<change>/docs-sync-report.md`，由 `../_templates/docs-sync-report-template.md` 填写或追加

## 填写引导

固定收集以下信息：

```bash
RANGE="$LAST_SYNC_SHA..HEAD"
git log --oneline --no-merges "$RANGE"
git diff --name-status "$RANGE"
git diff --shortstat "$RANGE"
git diff --name-only "$RANGE" | awk -F/ '{print $1"/"$2}' | sort | uniq -c | sort -rn
```

有疑问的具体改动再读取：

```bash
git log -p "$RANGE" -- <specific-path>
git show <sha> -- <specific-file>
```

把变更按对外可见性映射到 `tracked_docs`：

- 对外能力变化：README 类 + CHANGELOG
- 内部重构但行为未变：视情况写 CHANGELOG 或 AGENTS 类约定
- 依赖升级：CHANGELOG 聚合；安全 CVE 进 Security
- CI/CD 变化：CHANGELOG + AGENTS / CONTRIBUTING 的发布约定
- 文档自身：仅在对外可见时写 CHANGELOG 的文档类条目
- 测试 / 开发工具链：通常不进 CHANGELOG；AGENTS 的测试要求酌情更新
- 新增顶层目录 / 顶级文件：如 AGENTS 类存在仓库布局章节则必须同步

## 边界

- 不把每个 commit 都写成文档条目。
- 不修改未列入 `tracked_docs` 的文档，除非先获得用户确认并更新 state。

## 完成准则

- git 差异素材已记录到 report
- 已列出要更新的文档和理由，或判定空同步
