# 接入 Speculo（使用者向）

本文档面向**框架使用者**——你想把 Speculo 接入自己的项目。

## 快速接入

```bash
# 1. 复制框架资产到你的项目
cp -r Speculo/framework/* my-project/

# 2. 复制对应工具的 adapter
cp -r Speculo/framework/adapters/claude-code/.claude my-project/.claude    # Claude Code
# 或
cp Speculo/framework/adapters/agents/AGENTS.md.example my-project/AGENTS.md  # Cursor / Aider / Codex 等

# 3. 激活默认配置（按需挑选）
cd my-project/.speculo/.config
mv RULES.md.example RULES.md         # 强制规则
mv ARCHITECTURE.md.example ARCHITECTURE.md
# ... 其他 .example 按需激活
```

[TODO: 详细补充：
- 各类工具的具体接入步骤与验证方法
- 接入后的目录效果展示
- 常见问题（FAQ）
- 卸载 Speculo 的步骤
]

## 第一次使用

[TODO: 引导用户跑 `workflows/<cat>/00-INDEX.md` 作为第一个动作。]
