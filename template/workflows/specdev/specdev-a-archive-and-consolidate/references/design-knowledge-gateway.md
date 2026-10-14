# Project DESIGN write gateway

本协议由 A 唯一拥有，只有两种调用：P 的首次基线 `bootstrap`，以及 A 归档时的 `promotion`。它不接管 ADR/context 网关，不启动 runner，不改变调用方原 owner，不修改业务代码或项目根用户 DESIGN。机械发布使用 <Path>{roots.workflows}/specdev/common/tools/publish-design.mjs</Path>；内容遵守 <Path>{roots.workflows}/specdev/common/schemas/project-design.schema.json</Path>。

## 权威与批准

- <Path>{roots.state}/specdev/design/DESIGN.md</Path> 是唯一当前项目设计规范。
- <Path>{roots.state}/specdev/design/revisions/DESIGN-NNNN.md</Path> 是不可变历史快照；当前文档必须与所指 revision 逐字相同。已发布快照不得覆盖、删除或借清理重写。
- <Path>{roots.state}/specdev/design/INDEX.md</Path> 是可重建检索投影，不决定当前版本；缺失或过时只需恢复索引，不重新发布规范。
- <Path>{roots.state}/specdev/changes/{change}/DESIGN.md</Path> 由 P 拥有，是该 change 唯一页面设计合同；固定引用项目 revision 与规范 digest。永久基线更新不静默改写活动 change。

文件中的批准字段只是确认的可核验记录，不自行授予权限。调用方必须持有真实用户授权，记录具体目标、内容、范围和时间。字节 SHA-256 用于发布漂移与不可变快照检查；`designDigest` 用于规范内容确认，两者不能混用。

## Bootstrap：HTML 和首次基线一起确认

1. P 先只读探索项目代码与现有设计文档，按任务组合离线模板。首次基线候选留在 <Path>{roots.state}/specdev/changes/{change}/prototypes/{design-id}/baseline-draft.md</Path>；尚未批准不创建永久 DESIGN。项目根已有用户 DESIGN 时保留原 owner、记录 locator/digest，将其作为现有约束；owner 未知或矛盾未解决只阻塞永久写入。Speculo 基线是其只读派生，重叠规则仍由用户根 DESIGN 约束，不建立矛盾的第二权威，不自动接管根文件。
2. 向用户一次展示可运行 HTML、change DESIGN、首次基线内容和永久目标。批准范围必须同时包含预览与项目规范写入；只说“页面可以”而未展示永久变更，不是永久写入授权。沿用会话已取得的明确批准，不为同一未变确认包重复询问。
3. 准备 `DESIGN-0001`，`supersedes: null`；所有规则为 `verification: approved-intent`。这表示已接受规范，不表示已实现。新项目不能伪造代码、生产验证或 implemented 证据。
4. 调用发布工具 dry-run，确认候选、HTML 字节摘要、根路径和目标仍一致；P 同时核验整个原型的 CSS/JS/资源摘要及独立浏览器证据，批准后有变化则重开受影响确认。获得具体批准后 `--apply`。P 调用 A-owned 网关时保持 P 的实际归属与原证据，不创建虚假 completed change 或启动归档。此时基线尚未发布，不调用要求永久 snapshot 已存在的最终 approved DESIGN 门；发布成功后再完成该门。
5. 工具原子无覆盖发布首次 current 文件，并返回 revision、字节摘要、规范 digest 与检查点。P 把回执记入原 change LOG/批准证据，回读 current/revision/索引后才完成基线写入。两个 change 同时首次初始化时仅一个发布成功；另一方重读已存在基线，重新合并并针对变化重新确认，不能覆盖胜出者。

## Promotion：完成证据支持的规则提升

1. 从已完成 change 的 DESIGN 按稳定规则 ID 选出跨 change 有用的 token、组件约束和交互模式；同一结论只生成一个候选，LOG/原型/Evidence 提供证据，不重复提取正文。一次性页面、未实施候选和实验仍随归档 change 保留。
2. 对照已实现代码、测试和 Evidence 逐条评估，记录来源 change、稳定 locator 与字节摘要。`Outcome: completed` 只表示完成门，不能将所有规则自动标为 implemented；缺乏实质证据的规则仍为 approved-intent，或从候选中排除。
3. 读取当前项目 DESIGN，生成下一连续 revision 和完整新规范，`supersedes` 指向当前 revision。展示规则级 create/merge/supersede/skip 及冲突，不把局部覆盖强推为项目通用约束；仍有效的原规则保持。
4. 把预期 current 字节摘要、候选摘要、规则证据与新 revision 加入原归档计划，取得该具体 diff 的批准。发布在归档移动之前完成；移动后解析 source change 的最终 archive locator，重新核验来源；可使用稳定 change ID 与 change 内路径，使移动本身不伪造内容变化。
5. 由原 A 网关调用发布工具。先发布不可变 revision，再替换 current，最后修复索引；每步实际结果写入原报告。索引错误不撤销已成功的规范发布，也不重复分配 revision。

## 工具接口与回执

```text
node <Path>{roots.workflows}/specdev/common/tools/publish-design.mjs</Path> --repo <project-root> --method-root <method-root> --candidate <candidate.md> --state-root <resolved-specdev-state-root> --approval <approval.json> --mode bootstrap --expect-absent
node <Path>{roots.workflows}/specdev/common/tools/publish-design.mjs</Path> --repo <project-root> --method-root <method-root> --candidate <candidate.md> --state-root <resolved-specdev-state-root> --approval <approval.json> --mode promotion --expected-current <sha256> --apply
```

默认 dry-run 不写文件；`--apply` 才发布。此工具 `--state-root` 表示 SpecDev 根（不是 WorkContext 的领域共同父根）；须等于归一后的 context.specdevRoot。已有安装验证 workspace 一致，无安装使用明确 repo/method/state 根，不把 cwd 或另一 worktree 当回退。候选和批准记录由调用方保存在其已拥有的 change 证据或既有报告资源中，工具不选择报告路径。JS 接口为 `publishDesign({repoRoot, methodRoot, stateRoot, candidatePath, approval, mode, expectedCurrent, apply})`（stateRoot 为该工具的 SpecDev 根）；`expectedCurrent: null` 表示预期不存在。

批准记录：`approved: true`、真实用户决定的 `source`、ISO `confirmed_at`、`candidate_sha256`、`current_sha256`（首次为 null）及 新请求 `locator_version: 2` 与 `record: {base: "change", change, path, sha256}`。`record` 必须位于当前 change 或原归档 Command 报告 namespace；推荐 P 在包内保存不可变确认 Markdown，LOG 只引用它。确认正文包含 source、时间、候选摘要及预期 current 摘要（首次写 `absent`），不能用任意非空文档替代；追加日志不得使原确认快照无声漂移。

bootstrap 还必须有 `preview: {base: "change", change, path, sha256, package_path, prototype_digest}`：`package_path` 指向同一 change 的 <Path>{roots.state}/specdev/changes/{change}/prototypes/{design-id}/design-system.md</Path>，`path` 必须是该包的 <Path>{roots.state}/specdev/changes/{change}/prototypes/{design-id}/final/index.html</Path>；确认正文也包含这两个摘要。字节摘要绑定已展示 HTML，`prototype_digest` 绑定候选与完整 final/comparison 资源（含 CSS/JS）。发布器直接核验这些摘要，不调用依赖已发布基线的最终包门。

项目根存在用户 DESIGN 时，候选 sources 的 locator 必须为项目根相对 <Path>DESIGN.md</Path>，并记录其完整字节 digest；批准对象增加 `project_design: {owner, disposition: "derived-readonly", sha256}`，确认正文同时包含 owner、disposition 与该摘要。owner 必须已解析，不能为 unknown。工具检查源摘要与声明，不判断语义矛盾；调用方必须先解决冲突并取得同一确认包的批准。用户根 DESIGN 漂移或失踪时停止写入。

路径为项目相对路径或已解析安全 locator，不保存机器绝对路径。工具校验记录与实际文件一致，不声称它能认证真实人类批准、视觉质量或 Evidence 的语义真实性。完整工件合同由 SpecDev 验证入口检查；发布器共用稳定 change 身份、Outcome 与原 owner 读取。bootstrap 核对实际 P 归属和原会话依据；promotion 核对原完成 owner 与完成门，A 仅作为发布网关执行者，不以字符串自封 owner。

stdout 返回检查点 `validated`、`revision-written`、`current-published`、`index-written` 和实际文件摘要；失败返回已完成检查点及恢复信息，调用方立即追加到原 LOG/Command 报告，不伪造整次原子成功。

## 互斥、失败与恢复

发布器在 design store 内使用短期 `.publish-lock` 文件，以原子排他创建序列化单次文件发布；它只保护这一个 store，不是新工作流或通用事务服务。锁记录原 owner、进程、批准来源和操作摘要。其他操作看到锁时停止；年龄不构成删除或接管授权。

- 正常返回或可捕获失败：工具只释放自己创建的锁，已写 revision/current 不回滚覆盖；从回执核验实际状态再继续。
- 进程中断遗留锁：只有原操作、原批准及 owner 相符，且原本机进程已结束，才能通过显式 `--resume` 恢复；未知主机或进程状态保持阻塞。恢复本身用短期 `.publish-resume` 排他保护，若该保护文件也因进程中断遗留，则保留证据并由原网关人工核验，不再自动接管。不得手工删除他人锁。
- current 已等于候选且 revision 一致：重试只核验来源并修复 INDEX，不重新发布；current 被另一个 revision 更新则停止，重新准备 diff。
- 只有 revision 已写而 current 尚未更新：必须确认原批准、expected current 和 snapshot 都一致，继续发布原候选；不得覆盖冲突的 snapshot 或跳过 revision。
- 归档已移动：只可从归档目标和原报告恢复已经发布的同一知识操作；核对原批准、current/revision 与操作摘要后，修复缺失的 INDEX 或事实回执，不能再次移动。若知识尚未发布，停止该发布分支并保留证据，由原网关处理，不能从归档对象发起新发布。知识成功而报告保存失败：按 current/revision 摘要重建事实回执，不把“未保存结果”当成“操作没发生”。

完整归档仍遵守 <Path>{roots.workflows}/specdev/specdev-a-archive-and-consolidate/references/operation-contract.md</Path> 的 dry-run/confirmed、漂移和重读门。归档前检查 completed/cancelled 对应证据（promotion 仍只接受已完成来源）；归档后检查实际位置、目录完整性与知识发布回执，不在 archived 对象上运行只接受 completed 的阶段门。

新 locator_version 2 的 record/preview 将稳定 change 名与对象内 path/package_path 绑定，移动前后使用同一 operation；source 同样优先稳定 change + 对象内 locator。旧 v1 project locator 只读解释，不改快照、批准、摘要或 ID；不能验证移动后仍可解析时保留原位置并阻塞迁移。
