# Vendor — 原生 AgentSkills 收集目录

本目录用于收集来自各处的**原生 AgentSkills**，原样保存、不做 Speculo 化改造。

## 与 `skills/` 的区别

| | `skills/` | `vendor/` |
|---|---|---|
| 来源 | Speculo 官方出品 | 第三方搜集收录 |
| 格式 | 遵循 Speculo frontmatter 契约 | 保持原始格式，不做修改 |
| 结构 | `SKILL.md` + `references/` + `scripts/` | 原样保留原始目录结构 |
| 更新策略 | `speculo init` 全覆盖刷新 | 增量合并（见下） |

## 更新策略

- **`speculo init`（无 `--all`）**：增量合并 —— 只添加 `vendor/` 中尚不存在的技能，已收集的原生技能不受影响
- **`speculo init --all`**：全覆盖 —— 用当前打包的 `vendor/` 内容完全替换

## 如何添加原生技能

将任意 AgentSkill 目录直接复制到 `speculo/vendor/` 下即可：

```text
speculo/vendor/
├── README.md
├── some-native-skill/
│   └── SKILL.md
└── another-skill/
    ├── SKILL.md
    └── references/
        └── guide.md
```

无需修改内容，无需添加 Speculo frontmatter。
