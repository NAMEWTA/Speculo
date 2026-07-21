# Vendor — 原生 AgentSkills 收集目录

本目录用于收集来自各处的**原生 AgentSkills**，原样保存、不做 Speculo 化改造。Speculo 的组合、路径适配和持久化规则位于 workflow 包，不写回 vendor。

## 与 `skills/` 的区别

| | `skills/` | `vendor/` |
|---|---|---|
| 来源 | Speculo 官方出品 | 第三方搜集收录 |
| 格式 | 遵循 Speculo frontmatter 契约 | 保持原始格式，不做修改 |
| 结构 | `SKILL.md` + `references/` + `scripts/` | 原样保留原始目录结构 |
| 更新策略 | `speculo init` 全覆盖刷新 | 按 workflow 选择并增量合并（见下） |

## 更新策略

- **首次安装**：无条件复制所有 vendor 条目。
- **`speculo init`（无 `--all`）**：只添加缺失 vendor，保留用户已有内容。
- **`speculo init --all`**：用当前包中所有 vendor 条目全量刷新。

`vendor/matt-pocock/` 保留上游的领域目录和原生 `SKILL.md`。直接激活 raw skill 不受 Speculo 持久化保证。

## 如何添加原生技能

将任意 AgentSkill 目录直接复制到 `speculo/vendor/` 下即可：

```text
speculo/vendor/
├── README.md
└── matt-pocock/
    ├── engineering/
    ├── productivity/
    └── in-progress/
```

无需修改内容，无需添加 Speculo frontmatter。
