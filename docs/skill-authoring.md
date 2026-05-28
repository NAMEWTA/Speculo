# Skill 编写指南（开发者向）

本文档面向**框架扩展者**——你想新增一个 skill。

## 创建步骤

```bash
mkdir -p framework/skills/<name>/{references,scripts,examples}
touch framework/skills/<name>/SKILL.md
```

## 强制约束

1. **入口必须命名为 `SKILL.md`**，不允许其他名字
2. **子目录命名固定**：`references/` / `scripts/` / `examples/`，如需新目录可自行决定
3. **零跨目录引用**：skill 内部禁止引用 `framework/` 其他位置的相对路径，必须完全自包含
4. **零持久化责任**：skill 禁止写 `.speculo/` 或 `.status.json`，归档由调用者负责

## SKILL.md 骨架

[TODO: 给出完整骨架 + 各字段说明。]

## 渐进披露策略

[TODO: 说明 SKILL.md 是入口（精简、给方向），references/ 是按需细节。]

## 复制即可用合格线

复制 `framework/skills/<name>/` 整个目录到任何项目，任何 AI 工具读 `SKILL.md` 就能用——这是 skill 的合格线。
