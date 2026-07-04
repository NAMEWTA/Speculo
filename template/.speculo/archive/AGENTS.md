# Speculo Archive AGENTS Guide

本目录保存已完成 change 的历史归档，用于回溯决策、提取经验和支撑 docs-sync。默认只读，不作为当前工作状态。

## 目录形态

```text
archive/
├── dev/<YYYY-MM>/<change-name>/
├── doc/<YYYY-MM>/<change-name>/
└── person/<YYYY-MM>/<change-name>/
```

- `<YYYY-MM>` 从 change 名称的日期前缀提取。
- `<change-name>` 必须保持原始 `YYYY-MM-DD-<kebab-name>`。
- 归档目录内保留该 change 原本的 `.status.json` 和产物文件。

## 读取方式

1. 先按分类和月份缩小范围，避免全量读取历史。
2. 读取目标归档 change 的 `.status.json`，确认 `change_status`、最后 phase 和产物路径。
3. 只读取与当前问题相关的归档产物；需要提取知识时，把候选写入当前 workflow 产物，由用户确认后再进入 `.config/`。

## 操作边界

- 不自动重写、删除或移动 archive 内容。
- 归档移动由 `speculo/commands/archive.md` 或 `speculo/workflows/dev/04-finalize/04-finalize.md` 负责。
- 若发现归档路径冲突、缺少 `.status.json` 或命名不符合 `YYYY-MM-DD-`，只报告问题，不自行修复。
