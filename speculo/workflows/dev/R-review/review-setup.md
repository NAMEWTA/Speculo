# Review Setup Phase

## 输入

- 用户提供的 fixed point；如果缺失，先询问
- 当前 git 仓库
- 当前 change 目录：`.speculo/dev/<change>/`

## 产物

- `.speculo/dev/<change>/review-sources.md`，由 `../_templates/review-sources-template.md` 填写

## 填写引导

1. 沿用用户提供的 fixed point，不自行替换为其他分支。
2. 记录 `git diff <fixed-point>...HEAD` 和 `git log <fixed-point>..HEAD --oneline`。
3. 寻找 spec 来源，顺序为：
   - commit message 中的 issue / PR 引用
   - 用户作为参数传入的路径
   - `.speculo/dev/<change>/prd.md`、`slices.md`、`decision-log.md`
   - 仓库中与分支名或功能匹配的规格文档
4. 寻找 standards 来源，常见路径包括：
   - `.speculo/.config/RULES.md`
   - `.speculo/.config/context/`
   - `.speculo/.config/adr/`
   - `AGENTS.md`、`CONTRIBUTING.md`
   - `.editorconfig`、`eslint.config.*`、`biome.json`、`prettier.config.*`、`tsconfig.json`
5. 机器强制的标准只记录来源，不重复检查工具已覆盖的内容。

## 边界

- 不开始主观审查，先完成来源收集。
- 找不到 spec 时不要编造；记录 `no spec available`。

## 完成准则

- fixed point、diff 命令、commit 列表已记录
- standards 与 spec 来源已记录
- `.status.json` 的 review setup 字段已更新
