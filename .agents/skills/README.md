# Speculo maintainer skills

本目录用于维护 Speculo 仓库自身的 `template/` 资产，不是安装到用户项目中的运行时 skill 集。

维护者技能的完整正本直接位于 `.agents/skills/`；各 `SKILL.md` 与配套 references、scripts 一起维护，共享规则位于 `_shared/`。

## 能力

- `speculo-write-skill`：创建或审计领域/Work 标准 Skill 及私有 common/skills 能力。
- `speculo-write-command`：创建或重构 `template/commands/<command>/COMMAND.md`。
- `speculo-write-work`：创建或重构单个 workflow work。
- `speculo-write-workflows`：创建、重构或校验完整 workflow 包。
- `speculo-write-canonical`：把能力的完整静态依赖闭包编译为 canonical 单文件。

## 共同事实源

先定位目标、调用方和验证；结构/行为变化使用 `_shared/authoring-protocol.md` 按条件路由。安装布局/状态查 project-model，写作结构查 authoring-quality，路径变化查 path-and-reference-rules，验证按 validation-gates 选择；需要长期知识才读 memory-retrieval。已加载且未变化的资料不重复读，共享规则不在具体技能复制。

用户提供参考内容的适配任务应用 `_shared/authoring-quality.md` 中的“参考内容复用”规则：默认尽可能直接复制，只做 Speculo 正确运行所必需的最小适配；用户明确要求的重构按其目标执行并单列行为变化。

## 仓库与安装路径

维护时编辑 `template/**`。安装后，`template/` 的内容映射到项目根下的 `.agents/speculo/`：

- `template/references` → `.agents/speculo/references`
- `template/commands` → `.agents/speculo/commands`
- `template/workflows` → `.agents/speculo/workflows`
- `template/.speculo` → `.agents/speculo/.speculo`

`template/workflows/<workflow>/_state/` 是领域按需声明的初始化种子；SpecDev 无独有种子时缺省，其他领域保持自己的要求；运行时状态写入 `{roots.state}/<workflow>/`，不写入 `{roots.workflows}/<workflow>/_state/`。

## 一次性校验

```bash
node .agents/skills/speculo-write-workflows/scripts/validate-speculo-assets.mjs .
```

更新 workflow 的 AUTO-INDEX：

```bash
node .agents/skills/speculo-write-workflows/scripts/generate-index.mjs template/workflows/<workflow>
```

生成 canonical：

```bash
node .agents/skills/speculo-write-canonical/scripts/build-canonical.mjs \
  --repo . \
  --entry template/<asset-entry>.md \
  --draft <semantically-authored-portable-draft.md> \
  --output template/canonical/<canonical-name>.md
```
