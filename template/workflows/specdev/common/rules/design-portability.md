# 设计合同的离线消费、导出与恢复

单文件能力消费 UI 决定、需要首次基线发布或归档提升，而宿主不具备原项目工具时使用。本文保留相同 owner、摘要和批准门；不能把不可执行工具的名称当作已执行能力。纯 LOGIC 与无 UI 影响的工作独立继续。

## 工件与能力检查

项目基线位于 <Path>{roots.state}/specdev/design/DESIGN.md</Path>，不可变版本位于 <Path>{roots.state}/specdev/design/revisions/{revision}.md</Path>，检索投影位于 <Path>{roots.state}/specdev/design/INDEX.md</Path>。当前 change 的合同位于 <Path>{roots.state}/specdev/changes/{change}/DESIGN.md</Path>，原型、确认和浏览器证据位于 <Path>{roots.state}/specdev/changes/{change}/prototypes/{design-id}/</Path>。change DESIGN 是规范，源码包不是第二份规则来源；跨 change 发布仍由项目设计知识网关唯一负责，消费方不能直写基线。

先确定宿主能否读取全部相关文件、保留原始字节、计算 SHA-256、解析无重复键的 YAML/JSON、实际打开浏览器、写入文件，以及调用原 owner 的发布网关。缺少某能力只阻塞需要它的门。不能计算摘要时输出原始材料和待计算清单，不能编造 64 位字符串；没有真实浏览器时原型保持 draft/blocked；不能调用网关时导出待执行发布包，不宣称基线已发布。

使用本文内联的项目设计、change 设计、UI 源码包和浏览器证据 schema 核对字段、类型、必需值和枚举；字段表不是许可。路径必须是所属根内的正斜杠相对 locator，不含绝对路径、反斜杠、空段、点段或符号链接。已有用户根设计文件保留原 owner，记录只读派生来源，冲突未解决不发布。

## 可移植的摘要算法

拥有确定性解析和加密工具时按以下算法计算；对话推测和人工抄写不能代替它们。

1. `byte SHA-256` 对文件原始字节计算，保留换行和编码差异；用于候选、确认快照、实际 HTML、根设计文件和 current 的并发比较。
2. `designDigest`：解析 Markdown YAML 头部及正文；删除头部顶层 confirmation、status、updated_at；递归按键名排序对象，数组次序保持不变；对排序结果生成无额外空白的 JSON，再连接一个换行和将 CRLF 换成 LF、首尾 trim 后的正文；以 UTF-8 计算 SHA-256。同一算法用于项目基线与 change 合同，不能用全文字节摘要替代。
3. `prototype digest`：递归枚举该包 final/ 和 comparison/ 中全部普通文件，拒绝符号链接和其他文件类型；按路径排序，形成 `[包内相对路径, 文件字节SHA-256]` 数组。将 `{candidates, selected_candidate, files}` 递归按对象键排序后生成无额外空白 JSON，以 UTF-8 计算 SHA-256。候选内容、选择或任一运行文件变化都会使旧确认失效。所有运行依赖必须位于这两个目录中，离线运行，不能通过其他目录或网络旁路摘要。

token 引用必须可解析且无循环；页面/规则/来源 ID 唯一。正式合同的 confirmation.digest 等于 designDigest，confirmation.record_digest 等于固定确认快照的字节 SHA-256，快照正文必须包含当前 designDigest、prototype_ref.digest 与 baseline.digest。baseline 指向存在的不可变 revision 且其 digest 相同；prototype_ref 与当前选中的包 ID、prototype digest 和 selection 一致。不得静默更新历史 change 所引用的基线。

## 初始设计与下游消费门

1. 已有项目先读代码中的 token、组件和真实页面，再继承已批准基线；没有基线时准备 change 内的 baseline-draft。默认自动组合候选并生成同任务 HTML，再集中展示。默认 3 个候选，配置范围 2–4 个；用户明确指定数量则记录 candidate_count_override 并严格按该数量生成。候选结构需要实质差异，不用换色复制冒充选择。
2. 源码包保留 final/index.html、final/styles.css、final/app.js 三个具名源码块；提取后与实际文件逐字一致。comparison 索引能访问每个候选，候选和 final 内容、控制与状态完整，所有资源存在且离线。源码、候选、资源先全部生成，包仍处于 awaiting-confirmation。
3. 浏览器证据对应当前 prototype digest。inspected_files 包含所有 candidate.entry 与 final/index.html；每个候选及 final 都至少有 390px、1440px case，case.entry 与实际入口相同，保存真实 PNG，final cases.states 覆盖每个页面的 `page-id:state`。实际检查操作、键盘/focus、溢出、长文案、缩放、reduced motion，记录 console_errors、offline、设计审查、技术审查及修复复核。模板或布尔标记不证明真实执行。
4. 预览门先核对全部资源、源码一致性、页面状态与浏览器证据。首次批准前，将候选基线的确定 revision/designDigest 预绑定到 draft change DESIGN；一次展示最终 HTML、change 合同、候选基线、永久目标、来源和例外。批准绑定上述原始字节与规范摘要，固定用户决定为 approval.md；后续 LOG 只追加定位。首次批准范围必须包含永久规范写入，原有同范围批准可继续使用。
5. 首次基线经原 owner 网关成功发布后回读 current、revision 和回执，确认与获批候选一致；再登记同一次 change confirmation。完整 approved 门通过后才能 ready。内容或摘要漂移时保持 blocked，先修订证据并重新确认受影响内容；不得用 pending 发布包满足 ready。
6. S 的 UI 行为/页面/状态 AC 引用 change 合同和基线版本。T 的 UI Ticket 使用 ui_change 和 design_ref 的 revision/digest/pages/acceptance；I/C 在开始时重新计算并实际读取对应内容，在 Design Conformance 中逐页逐 AC 记录实现证据。仅引用路径或标记 approved 不算消费。W 探索材料复用于子 change 时重新绑定其范围；历史包保留，消费的是 change prototype_ref 指定的包。

## 待执行网关包

无法调用原 owner 网关或无法写项目时，在 <Path>{roots.state}/specdev/changes/{change}/prototypes/{design-id}/gateway-request.json</Path> 输出完整请求，状态为 `pending`；这是交接记录，不是新写入网关。请求明确 owner、mode（bootstrap/promotion）、候选路径、目标 current、预期 current 字节摘要（首次为 null）、批准对象、所需但尚未运行的门、已经完成的检查点。批准对象保留 approved、source、confirmed_at、candidate_sha256、current_sha256 和 新 `locator_version: 2`、`record: {base: "change", change, path, sha256}`；bootstrap 的 `preview: {base: "change", change, path, sha256, package_path, prototype_digest}` 绑定同一包实际 final HTML 和所有候选/运行资源。根项目已有设计规范时添加 `project_design: {owner, disposition: derived-readonly, sha256}`，候选 sources 保留相同 locator/digest。

按稳定路径顺序输出完整 FILE 文件包：README 与原负责计划/owner 依据、原始请求、draft change DESIGN、候选 baseline、源码包、comparison/各候选/final 全部运行文件、浏览器证据和截图、固定确认、gateway-request、LOG。二进制截图保留为可下载原文件；若宿主不能导出则明确缺失并保持 blocked，不用 Markdown 假装 PNG。不要只提供 diff 或摘要，不导出并声称已经发布永久 current。若缺少真实批准，approval 为 null 且请求保持 draft，不伪造批准字段。

答复必须区分“已实际保存”“待保存”“待网关执行”和“已验证/未验证”，列出每个完整相对路径、当前 phase、阻塞条件与下一步。只有工具成功回执才能宣称持久化或发布；消费方可以在依赖未满足时完成独立非 UI 工作。

## 原 owner 恢复与归档提升

恢复先重新读取用户保存或工具实际写入的状态、gateway-request、固定批准快照、全部候选与资源；检查原 pending transaction、相关锁、owner 和 recovery evidence。重新计算候选/确认/current/HTML/prototype 摘要，任一变化停止该发布并重备具体 diff。未知锁不接管，不因年龄删除，不改其他任务状态。

由原 owner 先 dry-run，再按同一明确批准 apply；写入顺序是不可变 revision、current、INDEX，逐步保存 validated/revision-written/current-published/index-written 的真实回执。current 已是相同候选且 snapshot 一致时只修复缺失索引/回执，不重复发布；只有 snapshot 存在时核验原批准和 expected current 后继续；current 已被其他发布更新则停止合并。调用方原 owner 保持不变。

实施完成后，归档仅提升有跨 change 价值并有来源的规则。一次性页面与未采用候选留在原 change；implemented 必须有实质实现证据，只有设计确认的规则保持 approved-intent。promotion 展示下一连续 revision、保留规则、merge/supersede/skip、证据和 current 并发条件，取得该具体 diff 的授权后交给同一网关。promotion 在移动前完成；若原操作已移动，则从 archive 实际位置恢复，只补原批准操作缺失步骤、不再次移动。移动后核验唯一位置、未变 Outcome、原型/合同/批准 locator 与原发布回执，完成原回执后冻结。

请求 v2 的 path/package_path 相对稳定 change 根；旧请求 v1 保持 project locator 只读解释。移动不可变材料前后须能解析相同原字节，不能为修路径重算批准或另建 operation。
