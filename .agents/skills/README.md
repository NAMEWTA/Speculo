# Speculo maintainer skills

本目录用于维护 Speculo 仓库自身的 `template/` 资产，不是安装到用户项目中的运行时 skill 集。

## 能力

- `speculo-write-skill`：创建或重构 `template/skills/<skill>/`。
- `speculo-write-command`：创建或重构 `template/commands/<command>.md`。
- `speculo-write-work`：创建或重构单个 workflow work。
- `speculo-write-workflows`：创建、重构或校验完整 workflow 包。
- `speculo-write-canonical`：把能力的完整静态依赖闭包编译为 canonical 单文件。

## 共同事实源

所有技能先读取 `_shared/project-model.md` 和 `_shared/authoring-quality.md`，再读取与当前资产类型对应的 reference。共享规则只在 `_shared/` 中维护，具体技能不复制它们。

用户提供参考内容时，所有作者技能先应用 `_shared/authoring-quality.md` 中的“参考内容复用”规则：默认尽可能直接复制，只做 Speculo 正确运行所必需的最小适配。

## 仓库与安装路径

维护时编辑 `template/**`。安装后，`template/` 的内容映射到项目根下的 `speculo/`：

- `template/skills` → `speculo/skills`
- `template/commands` → `speculo/commands`
- `template/workflows` → `speculo/workflows`
- `template/.speculo` → `speculo/.speculo`

`template/workflows/<workflow>/_state/` 是初始化种子；运行时状态写入 `{roots.state}/<workflow>/`，不写入 `{roots.workflows}/<workflow>/_state/`。

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
  --output template/canonical/<canonical-name>.md
```
