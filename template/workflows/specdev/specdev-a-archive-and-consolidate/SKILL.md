---
name: specdev-a-archive-and-consolidate
description: "核对并封存已完成或取消的 change、已处置 RETRO，或独立审计维护 ADR、context 与当前 docs；拥有设计基线网关，明确要求时从代码访谈形成知识 change。"
metadata:
  speculo-kind: work-skill
  speculo-id: specdev/archive-and-consolidate
  speculo-domain: specdev
  speculo-contract-version: "2"
---

# 归档与沉淀

激活后读取 <Path>{roots.workflows}/specdev/common/rules/domain-runtime.md</Path>，按 <Path>{roots.workflows}/specdev/common/rules/activation-and-memory.md</Path> 定位有关知识。A 拥有收尾执行与知识网关；整体完成/取消仍由原完成 owner 判定，A 不代替用户取消。

## 选择范围

- **retro-knowledge**：接收 R 的具体获批 ADR/context 候选，按 [RETRO 知识网关](references/retro-knowledge.md) 执行并向原方案返回证据，不创建 change、不归档。
- **archive-retro**：R 的全部计划内沉淀目标已验证后，按 <Path>{roots.workflows}/specdev/specdev-a-archive-and-consolidate/references/retro-archive.md</Path> 执行固定报告及方案的归档；复用具体批准。该窄分支使用独立 RETRO 门，不执行下方 change 专属流程。
- **archive-single / archive-batch**：用户指定 completed/cancelled 对象；batch 必须明确请求并固定清单。无候选返回 no-candidates，不创建 change。
- **knowledge-audit / knowledge-maintenance**：按用户指定主题检查/维护既有知识，无需新 change；只读审计默认会话结果。
- **consolidate-from-code**：明确要求从代码访谈形成新知识，按 <Path>{roots.workflows}/specdev/specdev-a-archive-and-consolidate/references/consolidation-interview.md</Path> 建立真实验收载体，验证后结束并走归档。
- **mechanical-only**：已有仍有效的四类资产核对结果，或用户明确只授权移动时使用；不能默认为未读材料都无需维护。已知直接相关错误仍须处理或阻塞移动，未授权知识写入保留建议。

项目 DESIGN 首次 bootstrap 与后续 promotion 只经 <Path>{roots.workflows}/specdev/specdev-a-archive-and-consolidate/references/design-knowledge-gateway.md</Path>。P 完整批准包的窄调用保持 P owner、不启动归档；无 change 的维护不新增第三种设计发布模式。

## 流程

独立 knowledge-audit/knowledge-maintenance 直接按主题和真实来源执行第 3～5 步，不读取不存在的 change、完成门或远程交付账本，也不执行第 6 步。knowledge-audit 只返回候选和依据；维护仅写具体授权范围。下列第 1～2、6 步是归档分支。

1. 定位根、具体对象和原 owner；读取 README Outcome 与必要依据。归档读取 <Path>{roots.workflows}/specdev/common/rules/change-completion.md</Path>，核验 completed 或 cancelled 分支；父子关系存在才读取 <Path>{roots.workflows}/specdev/common/rules/parent-implementation-orchestration.md</Path>。未完成父实现的成员不能封存；移动前以 `--stage archive-ready` 核验结束与封存门，移动后运行 archived。
2. 核对已承诺的 <Path>{roots.state}/specdev/changes/{change}/delivery.md</Path> 的 `external_action` 与 <Path>{roots.state}/specdev/changes/{change}/publish.md</Path> 的 `publish_action` 与 PR 交付；pending/failed/未知结果返回原 Delivery 入口，未请求不造空账本。取消必须具备真实决定、writer 停止/交接、未交付及已落地影响、依赖和外部动作处置。
3. 按 <Path>{roots.workflows}/specdev/specdev-a-archive-and-consolidate/references/operation-contract.md</Path> 形成一份收尾计划：基础四类 change、ADR、context、当前 docs 各有有变更/无变更及依据；涉及 UI 再核对 DESIGN。只读 dry-run 不写文件。知识筛选读取 <Path>{roots.workflows}/specdev/specdev-a-archive-and-consolidate/references/knowledge-graduation.md</Path> 和 <Path>{roots.workflows}/specdev/specdev-a-archive-and-consolidate/references/consolidation-rules.md</Path>，清理候选才读 <Path>{roots.workflows}/specdev/specdev-a-archive-and-consolidate/references/cleanup-rules.md</Path>。
4. 核对并复用具体批准，固定写集、来源、before-image、摘要、预期结果与恢复检查点；只对新增副作用/范围/漂移补确认。实际 docs 维护直接使用 <Path>{roots.references}/writing-for-agents/references/current-facts-docs.md</Path>；不调用 project-maintenance 全局扫描/Git/state。
5. 先维护现役 docs/ADR/context，必要时经 DESIGN 网关发布，再核验当前资产/引用并执行已批准清理。每项回读，必需维护未完成就保留 change 不移动。completed 不证明每条设计规则 implemented，cancelled 不满足 implemented promotion 门。
6. 最后按 <Path>{roots.workflows}/specdev/specdev-a-archive-and-consolidate/references/archive-rules.md</Path> 整体无覆盖移动至新 archive，从实际目标验证完整性、来源与设计绑定；完成原回执后才宣布封存。失败保留已落地事实和恢复点，不重复移动/发布，不宣称整体原子回滚。

## 完成与恢复

返回 `no-candidates | dry-run | verified | partial | blocked`，附固定范围、四类资产及适用 DESIGN 结论、实际验证与原回执 locator。Command 调用由 Command 保存唯一总报告；直接有 change 的 confirmed 调用使用 change 内 archive-receipt；无 change 仅在恢复确需时使用 maintenance 回执，具体位置由 operation-contract 定义。

只有本次获批范围全部动作与检查完成才 verified；没有知识晋升是合法结果。未毕业材料随 change 保留。封存后只读，纠错用外部补充记录或后继对象；不可变 revision、批准、研究和许可不顺手整理。永久写入与移动的权限来自真实批准，文档标记不能授权。
