# TypeScript Standards Builder Skill

这是一个“规范生成器”Skill，而不是静态编码规范合集。它会先读取项目事实，再通过用户问答确认决策，最后为当前项目生成专属的 TypeScript Standards Skill。

## 生成目标

```text
.agents/skills/typescript-standards/     # 唯一正式规范源
.agents/skills/typescript--standards/    # 双连字符兼容跳转
.claude/skills/typescript-standards/     # 只有一句强制引用
```

## 核心特点

- 先扫描仓库，再提问，不让用户回答配置中已经明确的事实。
- 通过自适应问答确认真正有分歧的项目规则。
- 主 Skill 精简，详细规则拆入项目内 `references/`。
- 默认采用领域内部局部平铺、具体文件名、文件大小预算、WHY 注释、自动化门禁和测试共置。
- 不机械复制 Electron、React 或某个工具的专属目录。
- 对遗留项目采用只降不升的 Ratchet 策略。
- 同时兼容 `.agents` 与 `.claude` 的 Skill 发现方式。

## 包结构

```text
typescript-standards-builder/
├── SKILL.md
├── README.md
├── references/
├── templates/
├── examples/
└── manifest.txt
```

## 使用方式

将整个目录安装到支持 Skill 的位置，以 `SKILL.md` 为入口。运行后，Skill 会在当前项目中生成项目专属规范，而不是修改本生成器包本身。

## 路径说明

正式项目规范使用单连字符：

```text
.agents/skills/typescript-standards/SKILL.md
```

为兼容用户指定的 Claude 引用路径，还会创建：

```text
.agents/skills/typescript--standards/SKILL.md
```

该兼容文件只跳转到正式规范，避免维护两份内容。
