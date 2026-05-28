# Postmortem Checklist — 复盘规范

本阶段把"已止损的事件"转化为"可被未来 grep 命中的知识资产"。AI 在执行 `phase=postmortem-review` 时读本文件作为操作手册。

## 一、上下文与产物

- **输入**：关联的 `incident.md`、`incident.md` 根因分析、近期 `LESSONS.md`、近期同类型归档
- **产物**：`postmortem.md`（基于 `../_templates/postmortem-template.md`）
- **核心原则**：blameless（不指责个人）+ actionable（每个发现转化为可执行项）

## 二、章节填写引导

### 时间线
至少 3 个关键节点：

| 时间（ISO 8601） | 事件 | 数据 / 引用 |
|------------------|------|------------|
| 2026-05-28T13:55Z | 部署 v1.4.0 完成 | `deploy.md` |
| 2026-05-28T14:03Z | 监控告警：错误率突增 | dashboard 链接 |
| 2026-05-28T14:08Z | 回滚开始 | `incident.md#止损动作` |
| 2026-05-28T14:15Z | 服务恢复 | 监控曲线 |

不允许"约 5 分钟后"这种模糊；每条必须有可对账时间。

### 影响评估
量化以下维度（无对应数据时显式写"无影响"）：

- 受影响用户数 / 影响时长 / 营收损失（如适用）
- 数据完整性：是否丢数据 / 数据修正路径
- SLO 燃尽：消耗了多少 error budget

### 做对的事
≥2 条，例如：
- 监控告警 8 分钟内触发，符合 SLO
- 回滚预案在 `deploy-rollback.md` 已就绪，直接复用无需现写
- 团队沟通在 1 个频道集中，避免决策分散

目的：识别**已起作用的机制**，确保未来不被随意拆除。

### 做错的事（流程与工具，不指人）
≥2 条，例如：
- schema 迁移虽有 down 命令但未在 staging 预演
- 监控告警未覆盖业务关键指标 X，依赖人工巡检发现
- 回滚 runbook 中步骤 3 实际执行时报错，文档与现实有偏差

禁止：
- 点名个人（"X 当时没检查"）
- 笼统结论（"沟通不够"无具体场景）
- 推测性内容（"如果当时 X 可能就好了"）

### 改进项与指令
每条 actionable item 含：

| 项 | 描述 | 负责人 | 截止 | 跟踪载体 |
|----|------|--------|------|---------|
| AI-1 | staging 必须预演 schema down 迁移 | <name> | 2026-06-15 | PR/Issue 链接 |
| AI-2 | 监控接入业务关键指标 X 告警 | <name> | 2026-06-30 | Issue 链接 |
| AI-3 | 修订 RULES.md：schema 变更必须 staging down 预演 | （写入 LESSONS.md 修订建议段） | — | LESSONS.md |

至少 1 条改进项。负责人不能是"团队"或"All"。

## 三、LESSONS 写回（强制收尾）

抽象本次事件的失败模式（不写细节）：

> "schema 变更若未做 down 预演，回滚时可能数据兼容性失败 → 下次 dev/03-implement 的 implement-checklist.md schema 段必须包含 down 预演输出。"

格式要求：
- "X 在 Y 导致 Z" 三段
- 显式指引"下次哪个 phase 该做什么"
- 不超过 3 行（保持可被 grep 命中）

## 四、RULES.md 修订建议（不直接改 RULES.md）

若复盘发现的失败模式应升级为项目级硬约束：
- **不直接修改 `.speculo/.config/RULES.md`**（RULES.md 严禁 AI 自动改）
- 在 `LESSONS.md` 末尾追加 "## RULES.md 修订建议" 段（如不存在则新建）
- 建议条目格式：`日期 + 触发事件 + 建议条款`
- 等用户手动审批后写入 RULES.md

## 五、跨项目模式识别（可选）

读最近 N 次同类型归档，识别"这次的根因是否似曾相识"。若命中已有 LESSONS 条目，应**更新该条目**（追加新场景或新指引）而非新增重复条目。

## 六、完成准则（机器可验证）

- `grep -c '\[TODO:' postmortem.md` = 0
- 文件含 `## 时间线` / `## 影响评估` / `## 做对的事` / `## 做错的事` / `## 改进项与指令` 五个标题
- "时间线" 段含 ≥3 行带 ISO 时间戳的事件
- "做对的事" / "做错的事" 各 ≥2 条
- "改进项与指令" 段含 ≥1 个 actionable item，每项含负责人 + 截止 + 跟踪载体
- `timeline_events` / `improvement_items` / `lessons_appended` / `rules_change_proposed` 写入 `.status.json`
- `lessons_appended=true` 才允许 phase 标 `completed`
- 若提议修订 RULES.md：必须把候选条目追加到 LESSONS.md "RULES.md 修订建议" 段
