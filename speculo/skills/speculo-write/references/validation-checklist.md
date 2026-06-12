# Validation Checklist

## 结构检查

- [ ] 新 asset 路径符合 `speculo/workflows/`、`speculo/skills/` 或 `speculo/commands/` 约定
- [ ] workflow 入口文件名与目录名一致
- [ ] skill 入口命名为 `SKILL.md`
- [ ] command 是单个 `.md` 文件
- [ ] reference 文件都被入口直接引用
- [ ] 没有 README、INSTALLATION、CHANGELOG 等冗余 skill 文件

## Frontmatter 检查

- [ ] workflow frontmatter 只包含发现元数据
- [ ] skill frontmatter 包含 `id`、`type: skill`、`name`、`description`
- [ ] command frontmatter 包含 `id`、`type: command`、`name`、`description`，可选 `keywords`
- [ ] 没有把 phases、templates、depends_on、status_extensions 写进 frontmatter

## Workflow 检查

- [ ] 入口正文包含 `## 阶段`
- [ ] 入口正文包含 `## 依赖`
- [ ] 入口正文包含 `## 状态扩展字段`
- [ ] 入口正文包含 `## 完成与状态更新`
- [ ] 每个 phase 文件写清输入、产物、填写引导、边界、完成准则
- [ ] 模板放在对应分类 `_templates/`
- [ ] 模板顶部有服务 workflow 和产物文件名
- [ ] 模板占位符为 `[TODO: ...]`

## Skill 检查

- [ ] `SKILL.md` 能让 agent 判断何时触发
- [ ] 输入、输出、执行步骤清晰
- [ ] 大段细节放入 `references/`
- [ ] 自包含：不引用 `docs/` 或仓库外文件，复制后只读 `SKILL.md` 即可用
- [ ] skill 没有自选持久化目录；文件型产物由调用方写入或写入调用方声明的 `speculo/.speculo/...` 路径
- [ ] 如果需要持久化，明确归档到 `speculo/.speculo/commands/`、`speculo/.speculo/<cat>/<change>/` 或 `speculo/.speculo/.config/` 的哪类规范位置

## Command 检查

- [ ] 归档路径位于 `speculo/.speculo/commands/`
- [ ] 调用 skill 使用相对路径
- [ ] 被调用 skill 没有把持久化产物写到 `temp/`、系统临时目录或项目根目录
- [ ] 破坏性操作要求用户确认
- [ ] 产物模板内联且使用 `[TODO: ...]`

## `speculo/.speculo/` 检查

- [ ] 新分类有 `speculo/.speculo/<cat>-status.json`
- [ ] 新分类有 `speculo/.speculo/<cat>/.gitkeep`
- [ ] 新分类有 `speculo/.speculo/archive/<cat>/.gitkeep`
- [ ] 项目级长期上下文写入 `speculo/.speculo/.config/context/`
- [ ] 项目级 ADR 写入 `speculo/.speculo/.config/adr/`
- [ ] 没有新增项目根 state 文件

## 文档与测试

> 以下索引文件是 Speculo 仓库内的下游同步目标；项目无这些文件时跳过对应项。

- [ ] 项目若有 `docs/quick-reference.md`，包含新入口
- [ ] 项目若有 `docs/Speculo-architecture.md`，需要时更新内置结构
- [ ] 项目若有 `docs/adopting.md`，需要时更新安装后目录
- [ ] CLI tests 断言 `speculo init` 会复制新内置资产
- [ ] `pnpm test` 通过

## 残留检查

按迁移来源选择关键词扫描：

```bash
rg "\.specforge|\.docs-sync-state|docs/adr/|根目录.*CONTEXT" speculo docs
```

命中结果必须逐条判断：历史说明可保留，执行规范和路径约定不能保留旧值。
