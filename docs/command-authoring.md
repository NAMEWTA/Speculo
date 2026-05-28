# Command 编写指南（开发者向）

本文档面向**框架扩展者**——你想新增一个 command。

## 创建步骤

```bash
touch framework/commands/<name>.md
```

## 单文件约束

- Command **必须是单文件**，不允许子目录
- 复杂场景请升级为 workflow，不要把 command 拆成多文件

## 文件骨架

[TODO: 给出完整骨架，含 frontmatter + 内联模板章节。参考 `framework/commands/archive.md`。]

## 内联模板

- Command 产物模板**内联**在文件末尾的 `## 模板` 章节
- 占位符遵循 `[TODO: 描述]` 约定

## 调用 skills

- 通过 frontmatter `uses_skills` 字段声明（相对路径）
- skill 的输出归档到本 command 的 `artifact_dir`

## 破坏性操作

- 涉及目录移动 / 文件删除 / 外部 API 调用的 command，**必须先列清单 + 用户确认**才能执行
- 参考 `framework/commands/archive.md` 的"⚠️ 强制确认"段落
