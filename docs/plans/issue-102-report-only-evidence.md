# Issue #102 — SpecDev 只入库结果报告

## 目标与问题界定

SpecDev 的 `evidence/`、`prototypes/*/evidence/` 和 `sessions/*/evidence/` 混放两类数据：应长期回读的结果报告，以及大体积可再生的过程材料。前者是验收和责任记录，后者是诊断、浏览器原始输出、模型输入和构建审计。把所有过程文件加入 Git 会导致库持续膨胀；取消跟踪不会自动清除历史 Git 对象。参见 [#102](https://github.com/NAMEWTA/Speculo/issues/102) 的真实项目规模、全新克隆报告校验失败和原型缺证观察。

## 设计原则

1. **写入与提交分离**：执行时仍需真正冻结、观察和检查原始输入；默认 Git 规则只排除过程材料，不删除本地文件或 CI artifact。
2. **结论不能自我认证**：一份报告仅在结构、固定点、适用规范、两轴结论、Lead/Reviewer 身份与 AC/E2E 结果一致时可以作为已有工作的可回读记录；只有本地/CI 原件存在才核验它们的字节。
3. **丢失原件时不宣称重现**：报告摘要是不可重放快照的索引，不是签名，不具备证明已省略原始日志真实性的能力。要重新验证当前实现，应重新运行对应检查、形成新的报告。
4. **项目所有权与安全优先**：不重写用户 .gitignore 中的非 Speculo 字节，不覆盖链接/只读目标；保留事务 before/after 快照与回滚。已有被 Git 跟踪的大文件绝不由安装器自动删除或改写历史。

## 实施切片与文件归属

### T1：安装器事务和 Git 白名单

`src/agent-files.ts` 在选择 SpecDev 的 `planExternalEdits` 阶段增加唯一 `SPECULO-EVIDENCE` 受管块；一次安装、刷新和停止/恢复使用同一外部文件镜像合同。只允许 `evidence/T-[0-9][0-9]*.md`、`report*.md` 和 `approval-*.md`；所有嵌套的 JSON、patch、log、PNG、构建/预算审计默认忽略。未选 SpecDev 时不制造规则。使用 `git check-ignore` 做真实语义验证，不以字符串包含代替行为测试。

### T2：Review 只读报告验证

`review-evidence.mjs` 支持完整 JSON（本地执行时）和只含 scope 摘要的 Markdown（干净克隆时）两种输入形态。摘要记录 `mode`、`base_sha/head_sha/observed_head`、路径计数和摘要。scope 自带 `input_sha256` 只代表范围；完整 review input 的 `Input-SHA256` 由两轴原始结果独立核对。报告没有两个一致的结果、有效身份或真实 Observed 时不能批准。源文件仍可读时按原合同核验摘要；仅报告模式不会虚构原始材料。

### T3：Acceptance 与浏览器批准回读

`plan-contract.mjs` 验证每个 AC 只有一份 `passed`、Method/Source/Observed 真实、命令 Exit 0；若它引用的本地过程文件存在则比对 SHA-256，不存在不作为 Git 提交失败。

`validate-design-package.mjs` 在新原型的预览审批阶段仍要求 `browser.json`、真实截图、页面状态和 viewport 检查；当获批 DESIGN、基线与审批记录摘要都有效，且仅在 `--check-ready` 消费已批准结果时，允许缺少浏览器原始材料。存在但损坏/漂移的证据仍阻塞。

### T4：方法、文档与回归

更新 Review 证据说明、Implement Evidence 模板、工作流及架构文档。新增测试覆盖：安装刷新字节幂等、事务失败保留、实际 Git 忽略语义、报告摘要双轴一致与失败拒绝、AC 过程文件缺失和存在但漂移、已批准原型与尚未批准原型的区分。保持 Specs/Tickets/执行结果等既有硬门。

## 验收矩阵

| 场景 | 期望 |
| --- | --- |
| 新安装/重复刷新 | 用户原有忽略规则不变；受管块唯一 |
| 本地原始 review JSON/patch/browser/screenshot/log | 仍可生成和审查，但 `git check-ignore` 为 ignored |
| `T-01.md`、`report-*.md`、`approval-*.md` | 可由 Git 跟踪 |
| 完整 frozen input | 继续原严格字节、源摘要及当前 scope 漂移校验 |
| 仅有摘要的 Review | 两轴引用同一完整 Input-SHA256，身份、状态、固定点和结论正确才通过报告验证 |
| 一轴失败、结果矛盾、假 reviewer、错误 SHA | 阻塞 |
| 完成票的 AC 过程附件缺失 | 如报告自身具备真实合格结果则可以回读 |
| 本地过程附件存在而摘要不匹配 | 阻塞 |
| 新建/修改原型并申请批准 | 必须实际浏览器检查 |
| 已批准原型在全新克隆中无 browser.json | 可回读批准报告；设计摘要变化仍阻塞 |
| 未提交改变、必需 E2E/独立审查未完成 | 不得因 Git 忽略规则而绕过 |

## 交付和限制

此次只改变未来 Git 默认提交集合与已完成报告的回读合同，不清除旧仓库历史，也不降低生产执行时的真实验证责任。全新克隆的验证结论只说明 **保存的报告可核验、相关当前合同未发现冲突**；不代表丢失的原始截图、工具输出或模型会话重新通过。

关联：Issue [#96](https://github.com/NAMEWTA/Speculo/issues/96) 的主 Agent 自主委派/风险适配审查已在此前变更落地；本次不引入第二套调度器、独立审查硬门或 per-Ticket worktree。
