# Review Setup Phase

## 输入

- 用户提供的 fixed point；如果缺失，先询问
- 当前 git 仓库
- 当前 change 目录：`speculo/.speculo/dev/<change>/`

## 严重度模型

每条 finding 必须标注严重度：

| 级别 | 名称 | 含义 | 动作 |
|------|------|------|------|
| **P0** | Critical | 安全漏洞、数据丢失风险、正确性 bug | 必须阻断合并 |
| **P1** | High | 逻辑错误、显著 SOLID 违背、性能回退、关键需求缺失 | 合并前应修复 |
| **P2** | Medium | 代码异味、可维护性隐患、轻微 SOLID 违背、范围蔓延 | 本 PR 修或建后续项 |
| **P3** | Low | 风格、命名、小建议 | 可选改进 |

## 执行原则

- 用户说的任何东西都是固定点。若用户没有指定固定点，先询问；拿到前不要继续。
- 比较命令使用三点语法：`git diff <fixed-point>...HEAD`，同时记录 `git log <fixed-point>..HEAD --oneline`。
- **Worktree 模式**：若当前 change 为 worktree 隔离模式（`.status.json` 的 `worktree_enabled` 为真），fixed point 默认取 `base_branch`，且审查必须完整覆盖 change 分支树 `base_branch..change_branch` 的**每一个 commit**。此时读取 `../../../skills/worktree-isolation/SKILL.md` 的 `references/audit-branch-tree.md`。
- **Review-first**：本工作流默认只产出审查结论，**不修改代码**；除非用户在看到 findings 后明确授权修复。
- **诚实优先**：无法覆盖的区域要显式声明（见 `review-verdict.md` 的 clean-review 要求）。
- 机器已强制的标准（lint / 类型 / 格式）只记录来源，不重复人工检查。
- 如果环境支持并行子代理，三个维度应并行执行；否则按三个独立上下文顺序执行。

## 独立进入流程

本工作流**零硬依赖**。只需用户提供 fixed point + 当前 git 仓库即可启动。

1. **fixed point**：若用户未指定，先询问；worktree 模式下默认取 `base_branch`。
2. **change 目录**：若无 active change，执行 `../AGENTS.md` 进入协议步骤 3（原子三步），不得内联自初始化 JSON。
3. **信息自采集**：若同 change 下无上游产物，按下方「来源深度搜索」自行采集审查上下文。
4. **深度搜索**：Spec 和 Standards 来源仍不足时，对关键路径执行额外考古；检查测试文件推断预期行为。
5. **诚实优先**：找不到 spec 时记录 `no spec available`；找不到成文标准时记录覆盖空白。Engineering 维度始终执行。

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
8. Engineering 维度不需要外部来源，但记录将依据同目录的 `solid-checklist.md`、`security-checklist.md`、`code-quality-checklist.md`、`removal-checklist.md`（进入 Engineering 审查时按需读取）。

## 渐进披露（Engineering 维度深度清单）

- `solid-checklist.md`：SOLID 违背与架构异味
- `security-checklist.md`：安全漏洞、竞态、密钥、密码学
- `code-quality-checklist.md`：错误处理、性能、边界条件
- `removal-checklist.md`：死代码与删除候选

## 边界

- 不开始主观审查，先完成来源与范围收集。
- 找不到 spec 时不要编造；记录 `no spec available`。
- 找不到成文标准时记录覆盖空白，不把缺失当作"无问题"。

## 完成准则

- fixed point、diff 命令、commit 列表、diff 规模与分批策略已记录
- worktree 模式下已记录 change 分支树 `base_branch..change_branch` 的全部 commit
- standards 来源、spec 来源、关键路径已记录
- `.status.json` 写入 `review_fixed_point`、`review_diff_command`、`review_axes`、`standards_sources`、`spec_sources`，`review_status: collecting`
