# Architecture Review Phase — 可视化架构审查报告

## 输入

- `speculo/.speculo/dev/<change>/architecture-candidates.md`
- `speculo/.speculo/.config/context/CONTEXT.md`

## 产物

- `speculo/.speculo/dev/<change>/architecture-review.html`

## 填写引导

1. 按 `../HTML-REPORT.md` 编写**自包含** HTML（Tailwind + Mermaid 走 CDN），每个候选一张卡片含**前后对比图**，结尾「首要推荐」段。
2. 写入 `speculo/.speculo/dev/<change>/architecture-review.html`（**不写临时目录**），用 OS 命令打开（macOS `open`、Linux `xdg-open`、Windows `start`），并告知用户绝对路径。
3. 领域用 CONTEXT 词汇、架构用 codebase-design 词汇。
4. 此时不提接口设计；写入并打开后，询问用户：「这些候选你想探索哪一个？」

## 边界

- 本 phase 不做接口设计或质询。
- 报告必须写入 change 目录，禁止 `temp/` 或项目根目录。

## 完成准则

- HTML 自包含、每个候选有前后对比图与推荐强度徽章、含首要推荐段
- 报告已为用户打开
- 已请用户选择候选
- `.status.json` 写入 `candidate_count`、`report_path`，置 `architecture_status: reported`
