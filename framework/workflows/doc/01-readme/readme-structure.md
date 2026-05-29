# README Structure — 章节结构规范

本阶段输出项目 README 草稿。AI 在执行 `phase=structure` 时读本文件作为填写指引。

## 一、上下文与产物

- **输入**：现有 README、项目清单文件、`.speculo/.config/*` 中已激活的项目事实。
- **产物**：`readme.md`（基于 `../_templates/readme-template.md`）。
- **边界**：不编造安装命令、兼容平台、License 或路线图；缺失信息写"未指定"。

## 二、章节填写引导

### 项目名与定位
用标题写项目名；简介第一句说明项目是什么，第二句说明解决什么问题，避免空泛口号。

### 快速开始
只写可执行步骤。若命令来自 package manifest 或已有脚本，记录来源；若未验证，把 `quickstart_verified=false` 写入 `.status.json`。

### 文档
列出用户下一步最可能读的 3-6 个入口，例如架构、接入、速查、命令、工作流。链接必须相对路径。

### License
读取仓库 `LICENSE` 或 README 既有声明。没有时写"未指定"。

## 三、完成准则（机器可验证）

- `grep -c '\[TODO:' readme.md` = 0
- README 至少包含标题、简介、快速开始、文档、License 五段
- 所有 Markdown 链接为相对路径，且指向存在文件或明确标注"待创建"
- `.status.json` 写入 `readme_target`、`quickstart_verified`、`missing_facts`、`readme_sections`
