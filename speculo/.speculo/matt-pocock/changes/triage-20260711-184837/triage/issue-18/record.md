# Triage Record — Issue #18

## 元数据

- **Issue**: [#18](https://github.com/NAMEWTA/Speculo/issues/18)
- **标题**: bug: knowledge/domain.md 指定 CONTEXT.md 位于仓库根目录，与 speculo 持久化契约冲突
- **作者**: NAMEWTA
- **创建时间**: 2026-07-11T11:03:05Z
- **当前标签**: `bug`
- **Triage 时间**: 2026-07-11

## Phase 1: Collect — 事实核查

### 1.1 Issue 声明验证

| 声明 | 状态 | 证据 |
|---|---|---|
| `domain.md` 文件树使用 `/CONTEXT.md`（仓库根目录） | ✅ 确认 | `knowledge/domain.md` L7-L13: 文件树以 `/` 为根，`CONTEXT.md` 在其下 |
| `domain.md` 明确写"仓库根目录" | ✅ 确认 | L17: "CONTEXT.md（仓库根目录）" |
| `domain.md` 引用 `docs/adr/` 在根目录 | ✅ 确认 | L10, L18 |
| WORKFLOW.md 声明 `knowledge/` 为领域文档命名空间 | ✅ 确认 | `<persistence>` 段: `<store id="knowledge" ... path="knowledge" />` |
| 架构 workflow 实战中 CONTEXT.md 被写入项目根目录 | ⚠️ 无法复现 | 当前无 CONTEXT.md 存在于根目录或 knowledge/ 目录；issue 引用的 `changes/2026-07-11-unify-executor/.status.json` 未找到 |

### 1.2 Vendor Skill 路径分析（扩展发现）

vendor domain-modeling skill 本身也存在相同的根路径假设：

| 文件 | 问题路径引用 |
|---|---|
| `vendor/.../domain-modeling/SKILL.md` L14-L21 | 文件树: `CONTEXT.md` 在 `/` 下 |
| `vendor/.../domain-modeling/CONTEXT-FORMAT.md` L34 | "在仓库根目录下一个 CONTEXT.md" |
| `vendor/.../domain-modeling/CONTEXT-FORMAT.md` L58 | "延迟创建一个根目录下的 CONTEXT.md" |
| `vendor/.../domain-modeling/ADR-FORMAT.md` L3 | "ADR 存放在 docs/adr/ 中" |

**关键区分**：vendor skills 描述的是通用模式（任何项目的 CONTEXT.md 在根目录），这是正确的通用行为。`knowledge/domain.md` 的职责是将这些通用指令**翻译**为 Speculo 持久化模型内的路径。当前 `domain.md` 未执行此翻译，直接沿用了根路径。

### 1.3 冗余性检查

- 无项目级 `.out-of-scope/` 目录
- 非 #15、#16、#17 的重复
- 当前无 CONTEXT.md 文件存在（无论根目录还是 knowledge/），属于"零日漏洞"——尚未造成实际损害但指令错误
- `temp/matt-pocock-skills/.out-of-scope` 与 Speculo 项目无关

### 1.4 受影响资产确认

| 资产 | 修复类型 |
|---|---|
| `speculo/.speculo/matt-pocock/knowledge/domain.md` | **主修复**：物理路径 → 逻辑路径 |
| `speculo/vendor/matt-pocock/engineering/domain-modeling/SKILL.md` | **需评估**：通用 skill 是否需感知 Speculo 路径 |
| `speculo/vendor/matt-pocock/engineering/domain-modeling/CONTEXT-FORMAT.md` | **需评估**：同上 |
| `speculo/vendor/matt-pocock/engineering/domain-modeling/ADR-FORMAT.md` | **需评估**：`docs/adr/` 路径引用 |

## Phase 2: Recommend — 分类建议

### 类别

**`bug`** — 当前标签正确。这是持久化契约的文档/指令错误，会导致 AI agent 将运行时产物写入错误位置，违反 WORKFLOW.md `<persistence>` 段的核心契约。

不建议改为 `documentation`，因为该缺陷有明确的行为后果（写入错误路径），而非仅仅是文档不清晰。

### 状态

**`ready-for-agent`** — issue 自包含完整的：
- ✅ 根因分析（三层：domain.md 物理路径 vs 持久化契约 vs vendor skill 通用假设）
- ✅ 证据链（具体行号、文件路径）
- ✅ 建议改动（3 条具体修改，含 before/after）
- ✅ 验收标准（4 条可验证条件）
- ✅ 受影响资产清单

无需 `needs-info` 补充或 grilling 质询。

### 优先级

**high** — issue 作者标记正确。虽然当前未造成实际文件污染（CONTEXT.md 尚未被创建），但任何触发 domain-modeling skill 的 workflow 都会静默写入错误路径。属于"静默契约违反"，发现难度高。

### 架构备注

该 issue 触及 speculo 的核心设计问题：**vendor skills（通用）与 Speculo 持久化模型（特定）之间的路径翻译层**。`knowledge/domain.md` 正是这个翻译层，但它目前只是透传 vendor skill 的根路径假设。

建议在修复时明确这一分层：
1. Vendor skills 保持通用（描述"一个项目"的 CONTEXT.md 在哪）
2. `domain.md` 作为适配层，将通用路径映射到 `{state_root}/knowledge/` 命名空间
3. 在 `domain.md` 中增加明确的路径解析规则说明

## Phase 4: Apply — 已执行

| 动作 | 结果 |
|---|---|
| 添加标签 `ready-for-agent` | ✅ 已添加 |
| 发布 triage 评论 | ✅ [#18#issuecomment-4945196245](https://github.com/NAMEWTA/Speculo/issues/18#issuecomment-4945196245) |

### 外部引用

- Comment URL: `https://github.com/NAMEWTA/Speculo/issues/18#issuecomment-4945196245`
- 标签变更: `bug` → `bug, ready-for-agent`
