# Workflow 编写指南（开发者向）

本文档面向**框架扩展者**——你想新增一个 workflow。

## 创建步骤

```bash
mkdir -p framework/workflows/<cat>/NN-<name>
touch framework/workflows/<cat>/NN-<name>/NN-<name>.md
```

## 入口文件骨架

[TODO: 给出完整骨架 + 各字段说明。参考 `framework/workflows/dev/01-prd/01-prd.md`。]

## frontmatter 字段详解

[TODO: 见 `persistence-contract.md` 第 4 节，本文应展开举例。]

## 阶段子文件命名

- 文件名：`<name>-<phase>.md`（如 `prd-core.md`、`prd-review.md`）
- 入口文件 frontmatter `phases[].id` 必须与子文件 `<phase>` 对齐

## 模板存放

- 放在 `framework/workflows/<cat>/_templates/<name>-<artifact>-template.md`
- 入口 frontmatter 用相对路径引用：`template: ../_templates/<name>-<artifact>-template.md`

## `.status.json` 扩展字段

[TODO: 通过 `status_extensions` 声明自治字段。]

## 完成准则与状态写入

[TODO: 每个 phase 完成时必须做的状态更新动作。]
