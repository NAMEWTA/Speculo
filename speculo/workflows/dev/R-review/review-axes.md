# Multi-Axis Review Phase

## 输入

- `.speculo/dev/<change>/review-sources.md`
- `git diff <fixed-point>...HEAD`
- spec 来源文件或 `no spec available`
- standards 来源文件或覆盖空白说明
- Engineering 深度清单：同目录 `solid-checklist.md`、`security-checklist.md`、`code-quality-checklist.md`、`removal-checklist.md`

## 产物

- `.speculo/dev/<change>/review-report.md`，由 `../_templates/review-report-template.md` 填写

## 填写引导

三个维度各自独立成区，每条 finding 都要带**严重度（P0–P3）**、**文件/行或 hunk 依据**、**引用来源**，并尽量给出**可执行的修复建议**。

### Spec 维度（做对了吗）

1. 先读 spec，再读 diff。
2. 报告：缺失需求、范围蔓延（spec 外的实现）、看似实现但有问题的需求。
3. 每条引用 spec 原文。缺少 spec 时整区写 `no spec available`。

### Engineering 维度（做好了吗）

按需读取四份清单，逐项扫描 diff：

1. **SOLID 与架构**（`solid-checklist.md`）：SRP/OCP/LSP/ISP/DIP 违背、代码异味；提重构时说明为何改善内聚 / 降低耦合，非平凡重构给增量计划。
2. **安全与可靠性**（`security-checklist.md`）：注入 / XSS / SSRF / 路径穿越、认证授权、密钥泄露、竞态（TOCTOU、共享状态、DB 并发）、密码学、运行时风险；每条说明可利用性与影响。
3. **代码质量**（`code-quality-checklist.md`）：错误处理（吞异常、异步错误）、性能（N+1、热路径昂贵操作、缓存）、边界条件（null、空集合、数值 / 字符串边界、off-by-one）。
4. **删除候选**（`removal-checklist.md`）：死代码、冗余、关停特性；区分可安全删除与需计划，只产出候选与计划，不在审查中删代码。

### Standards 维度（合规吗）

1. 先读已记录标准（RULES、ADR、CONTRIBUTING、配置），再读 diff。
2. 报告违反**已成文**标准的位置，引用标准来源。
3. 工具已机器强制的项不重复人工检查；无成文标准时说明覆盖空白。

### 并行与隔离

- 如果可用，使用三个并行子代理分别审查 Spec、Engineering、Standards。
- 如果没有子代理，分三个独立小节顺序执行，不让任一维度的结论影响另一维度。
- 最终报告在 `## Spec`、`## Engineering`、`## Standards` 下并排呈现，可轻微清理措辞，但不要合并或重排 findings。

## 边界

- 不修复代码（review-first）。
- 不把三个维度混成一个优先级列表。
- 缺少 spec 时跳过 Spec 维度并明确写 `no spec available`；Engineering 维度始终执行。
- 严重度按各清单的"严重度提示"判定，不凭印象拔高或压低。

## 完成准则

- `review-report.md` 已按 Spec / Engineering / Standards 三区呈现
- 每条 finding 有严重度、明确依据和来源引用
- `.status.json` 写入 `severity_summary`，`review_status: judged`
