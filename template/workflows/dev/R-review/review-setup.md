# Review Setup Phase

## 输入

- 用户提供的 fixed point；如果缺失，先询问
- 当前 git 仓库
- 当前 change 目录：`speculo/.speculo/dev/<change>/`

## 独立进入时的来源深度搜索

当本工作流独立进入（无上游 PRD、slices、decision-log 等产物）时，在收集 spec 和 standards 来源时执行以下扩展搜索。**不要求用户先执行 dev/01、dev/02 或其他工作流。**

### Spec 来源的扩展发现（按优先级）

1. **commit message 提取**：`git log <fixed-point>..HEAD --oneline` + `git log <fixed-point>..HEAD --format="%B"` 提取全部 commit message 正文，搜索 issue/PR 引用（`#\d+`、`fixes #`、`closes #`、JIRA key 模式）
2. **commit message 全文搜索**：`git log <fixed-point>..HEAD --grep="<关键词>"` 搜索与变更主题相关的 commit
3. **代码注释/TODO 提取**：在 diff 涉及的文件中搜索注释、TODO、FIXME 和 HACK 标记——这些常包含需求意图
4. **本地 spec 文档搜索**：搜索仓库中与分支名、变更模块名匹配的 `.md` 文档、`docs/` 目录、`spec/` 目录
5. **Speculo 文档搜索**：搜索 `speculo/.speculo/doc/`、`speculo/.speculo/archive/` 中与变更模块相关的领域文档
6. **测试文件读取**：读取 diff 中测试文件的变更——新增测试描述了预期行为
7. **上游产物继承**（若存在）：`speculo/.speculo/dev/<change>/prd.md`、`slices.md`、`decision-log.md`
8. **以上均无时**：记录 `no spec available`——Spec 维度跳过，不编造来源

### Standards 来源的扩展发现

1. **Speculo 配置搜索**：`speculo/.speculo/.config/RULES.md`、`speculo/.speculo/.config/adr/`、`speculo/.speculo/.config/context/`
2. **项目根文档搜索**：`AGENTS.md`、`CONTRIBUTING.md`、`CLAUDE.md`、`README.md`
3. **工具配置搜索**：`.editorconfig`、`eslint.config.*`、`biome.json`、`prettier.config.*`、`tsconfig.json`、`pyproject.toml`
4. **全部缺失时**：记录覆盖空白说明（如"仓库无 RULES.md、无 ADR、无 CONTRIBUTING.md——Standards 维度仅检查通用工程实践"），不把缺失当作"无问题"

## 产物

- `speculo/.speculo/dev/<change>/review-sources.md`，由 `../_templates/review-sources-template.md` 填写

## 填写引导

1. 沿用用户提供的 fixed point，不自行替换为其他分支。**Worktree 模式**（`.status.json` 的 `worktree_enabled` 为真）下，若用户未另行指定，fixed point 默认取 `base_branch`，并按 `../../../skills/worktree-isolation/SKILL.md` 的 `references/audit-branch-tree.md` 用 `git log <base_branch>..<change_branch> --oneline` 记录 change 分支树**全部 commit**、`git diff <base_branch>...<change_branch>` 取全量 diff，确保审查覆盖每个 commit。
2. 记录 `git diff <fixed-point>...HEAD` 和 `git log <fixed-point>..HEAD --oneline`。
3. 用 `git diff <fixed-point>...HEAD --stat` 评估 diff 规模并定分批策略：
   - **无变更**：`git diff` 为空时，告知用户并询问是否改审 staged 变更或某个 commit 区间，拿到前不继续。
   - **大 diff（> 500 行）**：先按文件 / 模块汇总，再按模块或功能分批审查。
   - **混合关注点**：按逻辑功能分组，不只按文件顺序。
4. 标识关键路径：auth / 授权、支付 / 金额、数据写入、网络 / 外部调用、并发 —— 这些区域在 Engineering 维度需重点审查。
5. 寻找 spec 来源，按「独立进入时的来源深度搜索」中的 Spec 扩展发现顺序执行：
   - commit message 中的 issue / PR 引用 → commit message 全文搜索
   - 用户作为参数传入的路径
   - 代码注释/TODO/FIXME 中的需求线索
   - 仓库中与分支名或功能匹配的规格文档
   - `speculo/.speculo/dev/<change>/prd.md`、`slices.md`、`decision-log.md`（若存在）
   - `speculo/.speculo/doc/` 和 `speculo/.speculo/archive/` 中的领域文档
   - 以上均无时记录 `no spec available`
6. 寻找 standards 来源，按「独立进入时的来源深度搜索」中的 Standards 扩展发现顺序执行：
   - `speculo/.speculo/.config/RULES.md`
   - `speculo/.speculo/.config/context/`
   - `speculo/.speculo/.config/adr/`
   - `AGENTS.md`、`CONTRIBUTING.md`、`CLAUDE.md`
   - `.editorconfig`、`eslint.config.*`、`biome.json`、`prettier.config.*`、`tsconfig.json`
   - 全部缺失时记录覆盖空白说明
7. 机器强制的标准只记录来源，不重复检查工具已覆盖的内容。
8. Engineering 维度不需要外部来源，但记录将依据同目录的 `solid-checklist.md`、`security-checklist.md`、`code-quality-checklist.md`、`removal-checklist.md`。

## 边界

- 不开始主观审查，先完成来源与范围收集。
- 找不到 spec 时不要编造；记录 `no spec available`。
- 找不到成文标准时记录覆盖空白，不把缺失当作"无问题"。

## 完成准则

- fixed point、diff 命令、commit 列表、diff 规模与分批策略已记录
- worktree 模式下已记录 change 分支树 `base_branch..change_branch` 的全部 commit
- standards 来源、spec 来源、关键路径已记录
- `.status.json` 写入 `review_fixed_point`、`review_diff_command`、`review_axes`、`standards_sources`、`spec_sources`，`review_status: collecting`
