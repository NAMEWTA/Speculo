# Review Code — 代码评审规范

本阶段对本 change 的代码改动做**结构化合规与质量审查**。AI 在执行 `phase=code-review` 时读本文件作为评审手册。

## 一、上下文与产物

- **输入**：本 change 全部前置产物 + 代码 diff（`git diff <base>..HEAD`）
- **产物**：`review-code.md`（基于 `../_templates/review-code-template.md`）
- **角色红线**：**评审者只产报告，不改代码**；修订动作必须回 `../03-implement/` 完成

## 二、五项强制检查

### 检查 1 · AC 覆盖
- 对照 `prd.md#验收标准`：每条 AC 在 `test-unit.md` 或 `test-e2e.md` 中能找到对应测试
- `ac_coverage` 状态字段中无 `uncovered`（或有"已知接受未覆盖"的显式声明）
- 不通过 = `block`

### 检查 2 · 范围未蔓延
- 对照 `prd.md#范围与非范围`：实现未触碰"非范围"项
- 对照 `tasks/T0N.md` 的 `write_files`：实际改动文件未越界（或已在 `implement.md` "计划外改动声明" 段说明）
- 不通过 = `block` 或 `major`（视越界程度）

### 检查 3 · 与 RULES.md 不冲突
- 对照 `../../../.speculo/.config/RULES.md`（若存在）：实现未违反硬约束
- 若违反，必须在 `design-arch.md` 或 `implement.md` 有"宪法例外声明"段
- 不通过 = `block`

### 检查 4 · 测试金字塔完整
- 对照 `test-e2e.md#五维度覆盖状态`：五维度无沉默跳过（每条 `skipped` 必须带理由）
- 单测覆盖率达项目门槛（如未达，必须有理由）
- 不通过 = `major`

### 检查 5 · 反复用 + 反幻觉 grep 核验
- 抽查 ≥3 处实现，验证"沿用已有抽象"（grep 同类实现是否复用）
- 抽查引用的外部 API / 字段名（grep 验证存在性）
- 不通过 = `major`

## 三、问题分类与格式

每条问题三要素：

> **位置** · **严重度** · **修订指令**
>
> 例：`src/auth/middleware.ts:42` · `block` · "未验证 JWT exp 字段，导致过期 token 仍可通过；补加 exp 校验并新增对应单测"

严重度：
- `block`：阻塞，必修；评审决议自动为"不通过"
- `major`：建议必修；若选择不修，需用户显式签字接受
- `minor`：提示性；不阻塞合并

## 四、评审决议三档

- **通过**：五项检查全过、`block=0`、`major=0`（或 `major` 经签字接受）
- **通过-小修**：五项检查全过、`block=0`、`major≤3` 且已列明修订动作
- **不通过**：任一 `block` 或 `major>3`；必须回 implement / design / prd 修订后重审

## 五、跨模型 spot-check（可选优化）

若工具链支持调用其他 AI 模型（如 GPT / Gemini / Codex），抽查 1-2 个关键决策点请二次意见；分歧记录在 review-code.md "## 跨模型分歧" 段（可选）。

不强制（Speculo 工具无关原则）；列为推荐项。

## 六、写回 LESSONS（与 phase 收尾联动）

任何 `block` 或 `major` 问题，若属于"可复用的失败模式"（不是个案 bug），抽象成 1-2 句教训：

> "勿在中间件中默认信任 upstream 设置的 X 头，否则导致 Y。下次 PRD 描述类似场景时显式标注信任边界。"

追加到 `../../../.speculo/.config/LESSONS.md`，并把 `.status.json` 的 `lessons_appended` 置 true（与 `05-review.md#完成与状态更新` 联动）。

## 七、完成准则（机器可验证）

- `grep -c '\[TODO:' review-code.md` = 0
- 文件含 `## 评审决议` / `## 问题清单` / `## 建议性改进` 三个标题
- "评审决议" 段含 `通过` / `通过-小修` / `不通过` 三者之一
- 问题清单含 severity 关键词（block / major / minor）至少 1 次
- 每条问题含 `文件:行号` 或 `产物#段` 引用格式
- 若决议为"通过"或"通过-小修"：`block_issues_count` = 0 或 `major` 项均带"已签字接受"
- `code_review_decision` 与 `block_issues_count` 写入 `.status.json`
