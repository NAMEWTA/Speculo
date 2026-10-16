# 扫盘

`ingest_kb.py` 递归读取 `kb_root`，不改源文件，不访问网络。

跳过目录名以 `.` 开头的路径（含 `.git`、`.venv`、`.obsidian`），以及 `node_modules`、`__pycache__`、`dist`、`build`、`.idea`、`.vscode`。跳过 `.DS_Store`。不读隐藏目录里的文件。

`sources/manifest.json` 每条：

- `id`：首次按路径排序从 `src-0001` 编号。再次扫描时同一 `relpath` 保留原 `id`，新文件取尚未使用的下一个号
- `relpath` 是稳定键。编号会因插入新文件而不再等于「当前排序第几」，主张要绑 `relpath` 或当次 `id`，不要凭记忆里的旧序号
- `relpath`、`sha256`、`mtime`、`bytes`
- `kind`：`text` 或 `binary`
- `status`：`indexed`、`truncated`（大于 256KB）、`skipped-binary`
- `summary`：第一段非标题正文，最多约 180 字

hash 未变时保留旧 summary。二进制只记账，不解析。v1 不做 OCR。

Agent 读完 manifest，按 [templates/sources-index.md](../templates/sources-index.md) 写 `sources/INDEX.md`，再按 `id` 回读少量原文。不要把清单外的整文件贴进上下文。超过约 200KB 的文本只摘头尾到 `sources/excerpts/`，摘录文件名用 `src-0001.md`。扫盘摘要写 `ingest-log.md`。
