# 生成与验证设计包

候选形成后使用。设计规则唯一属于 change DESIGN；design-system.md 是原型源码和证据。先生成可运行 HTML，再集中确认，不把模板示例当成已完成设计。

## 1. 同任务候选与 comparison

为每个候选创建 <Path>{roots.state}/specdev/changes/{change}/prototypes/{design-id}/comparison/variants/{candidate-id}.html</Path>，`candidate-id` 来自包内稳定 ID。相同任务、真实或明确标记的 fixture 内容与状态保持一致，差异体现在结构、层级、操作入口和视觉语言；数量按 style-selection-protocol 的配置或用户覆盖。

候选可单独打开，离线使用，不引用 CDN、远程字体或图片。所有运行依赖保存在当前包的 comparison/ 或 final/ 内，保证进入 prototype digest；不得引用包内其他目录或项目源码位置。图标优先复用项目既有库；新项目可以使用 <Path>{roots.workflows}/specdev/specdev-p-prototype/design-library/research-snapshot/ui-gallery/assets/</Path> 中具备归属的本地资产。复制资产保留来源与许可，不把图标库安装当作原型前提。

comparison 索引位于 <Path>{roots.state}/specdev/changes/{change}/prototypes/{design-id}/comparison/index.html</Path>，展示候选、来源、适合原因、组合边界、迁移成本、风险与打开入口。推荐方案明确标记为待确认；宽屏便于并排比较，窄屏顺序浏览，键盘可操作，预览不能被压成不可读小窗。

**完成标准**：实际候选全部可到达，内容与任务可比较，没有只换皮或虚构产品声明。

## 2. change DESIGN 草案与源码

将适用规则、token、页面、状态、交互、响应式、基线版本和例外写入 <Path>{roots.state}/specdev/changes/{change}/DESIGN.md</Path>，使用 <Path>{roots.workflows}/specdev/specdev-p-prototype/assets/change-design-template.md</Path>。现有基线引用其 revision/digest；首次 baseline draft 位于 <Path>{roots.state}/specdev/changes/{change}/prototypes/{design-id}/baseline-draft.md</Path>。集中确认前计算候选 revision/designDigest 并预绑定 draft 的 baseline，使用 draft 状态和包内发布记录注明尚未发布，不在规范正文加入事后必须改写的临时状态；成功发布前不得当成永久事实。

在 <Path>{roots.state}/specdev/changes/{change}/prototypes/{design-id}/design-system.md</Path> 的 `Prototype Sources` 保留三个且仅三个具名源码块，目标为 <Path>{roots.state}/specdev/changes/{change}/prototypes/{design-id}/final/index.html</Path>、<Path>{roots.state}/specdev/changes/{change}/prototypes/{design-id}/final/styles.css</Path>、<Path>{roots.state}/specdev/changes/{change}/prototypes/{design-id}/final/app.js</Path>：

````text
<!-- PROTOTYPE-FILE: final/index.html -->
```html
...完整实现...
```
<!-- /PROTOTYPE-FILE -->
````

HTML 用相对引用连接 CSS/JS。三个源码块完整、路径唯一；不得含占位符、secret、生产写操作或网络依赖。推荐 final 在批准前即可生成，包状态仍为 `awaiting-confirmation`。真实模板 seed 示例须替换为当前任务，不能直接标 ready。

## 3. 物化与离线检查

```bash
node <Path>{roots.workflows}/specdev/specdev-p-prototype/scripts/materialize-prototype.mjs</Path> <Path>{roots.state}/specdev/changes/{change}/prototypes/{design-id}/design-system.md</Path>
node <Path>{roots.workflows}/specdev/specdev-p-prototype/scripts/materialize-prototype.mjs</Path> --check <Path>{roots.state}/specdev/changes/{change}/prototypes/{design-id}/design-system.md</Path>
```

二次物化无 diff。运行项目可用的 HTML/CSS/JS 检查；源码匹配只证明物化一致，不能代替真实浏览器。

## 4. 浏览器、critique、audit 与修复

使用宿主实际可用的浏览器工具打开本次 comparison/各候选/final；需要本地服务器时仅服务离线包并记录停止方法。至少检查桌面和窄屏，以及用户指定尺寸。实际操作主路径与适用的正常、空、加载、失败、取消、重试、权限不足、恢复状态；覆盖键盘、focus、长文案、200% 缩放和 reduced motion。触屏手势单独验证并说明模拟或设备环境。

先评估产品适配、任务清晰度、视觉层级和整体一致性，再检查布局溢出、语义、对比度、状态和技术缺陷；可以隔离评审但不固定模型或宿主。修复后重新观察受影响路径，避免无目标的反复 polish。若工具不可用或证据不足，保留 blocked/草案并报告未验证项，不填写虚假通过。

按 <Path>{roots.workflows}/specdev/common/schemas/prototype-browser-evidence.schema.json</Path> 写入 <Path>{roots.state}/specdev/changes/{change}/prototypes/{design-id}/evidence/browser.json</Path>，包字段 browser_evidence 使用当前包内 evidence/browser.json 相对 locator。记录真实 provider、inspected_files、viewport、截图、操作状态、检查结果、console_errors、offline、design_review、technical_review 与修复后 rechecked。inspected_files 覆盖每个 candidate.entry 和 final/index.html；每个 case.entry 指向实际打开的相同 locator，每个候选及 final 都有 390px 和 1440px 的独立 case。cases.states 使用 page-id:state，final 的实际操作逐一覆盖 DESIGN 页面状态。截图为包内真实 PNG 相对路径；design_review/technical_review 指向包内实际评审记录，写明发现和复核，不能填一句通过。每张截图打开确认有效。布尔项仅在实际操作通过后填写；证据绑定当前 prototype digest。

浏览器检查结束、页面状态和摘要齐全后，在确认前运行完整预览门：

```bash
node <Path>{roots.workflows}/specdev/specdev-p-prototype/scripts/validate-design-package.mjs</Path> --check-preview <Path>{roots.state}/specdev/changes/{change}/prototypes/{design-id}/design-system.md</Path>
```

该门验证候选、源码、所有本地资源、浏览器证据和 draft DESIGN 页面/状态，不要求基线已发布或用户已确认；普通 draft schema 通过不能代替它。

## 5. 集中确认、摘要与封板

对照 <Path>{roots.workflows}/specdev/common/rules/design-contract.md</Path> 展示初始批准包。首次基线通过 <Path>{roots.workflows}/specdev/specdev-a-archive-and-consolidate/references/design-knowledge-gateway.md</Path> 发布；批准记录须覆盖候选文件、实际 HTML 与首次发布，候选基线与 change DESIGN 的待发布绑定已在批准包中固定，网关回读后核验确定的 revision/digest 完全一致再设置 approved。同一批准包已明确的内容不重复询问；摘要或内容不符则暂停。

使用 <Path>{roots.workflows}/specdev/common/tools/design-artifacts.mjs</Path> 的 --prototype-digest 加当前源码包路径和 --digest 加当前设计合同路径 计算 prototype digest 与 `designDigest`；前者覆盖运行文件与候选组成，后者排除 confirmation/status/updated_at，禁止手填摘要或使用全文 byte hash 替代。change DESIGN 的 `prototype_ref`、`selection`、`baseline` 和 `confirmation` 相互匹配，`confirmation.by` 为 user、`record` 可回读。发布网关的 byte SHA-256/CAS 与规范摘要职责不同，不能混用。bootstrap approval.preview 必须同时记录实际 HTML 的 path/sha256、同一包对象内相对 package_path（新 locator_version:2 明确 base:change 与稳定 change 名） 和 prototype_digest；preview.path 必须指向该包的 final/index.html，整个 final/comparison 内容和候选一起绑定，不能只确认一张首页截图。

将该次真实用户决定、展示内容和范围固化到 <Path>{roots.state}/specdev/changes/{change}/prototypes/{design-id}/approval.md</Path>，正文包含当前 change designDigest、prototype_ref.digest 和 baseline.digest。change confirmation 的 record_digest 记录该文件完整字节 SHA-256，LOG 仅追加定位与结果。A 的批准对象另外填写 `record: {path, sha256}`，字节摘要绑定这份固定确认记录，避免后续追加 LOG 使发布重试失效。项目根已有 <Path>DESIGN.md</Path> 时，批准对象包含 `project_design: {owner, disposition: derived-readonly, sha256}`；owner 必须已解析，候选 sources 包含 locator 为 DESIGN.md 的同一字节 digest，保留根文件原权威，不允许静默接管。

发布基线并登记同一用户确认后，先运行封板全门，成功才把包设置 ready：

```bash
node <Path>{roots.workflows}/specdev/specdev-p-prototype/scripts/validate-design-package.mjs</Path> --check-ready <Path>{roots.state}/specdev/changes/{change}/prototypes/{design-id}/design-system.md</Path>
```

该模式检查完整 approved 合同，即使包仍为 awaiting-confirmation；不得用只校验 draft 结构的调用代替。设 ready 后再运行：

```bash
node <Path>{roots.workflows}/specdev/common/tools/validate-specdev.mjs</Path> --stage prototype --prototype-id UI-NNN --repo <project-root> <Path>{roots.state}/specdev/changes/{change}</Path>
```

prototype stage 失败则恢复 blocked、保存失败与恢复点，不推进 Work 完成。多个包并存时始终指定目标；历史 rejected/blocked 包保留证据，不覆盖它们换取通过。后续修改使受影响批准和浏览器证据失效，重新验证并确认后恢复。

**完成标准**：三源码块逐字匹配 final，候选数/来源可核验，真实浏览器证据与摘要一致，用户确认和基线发布可回读，S/T/I 能从 change DESIGN 直接继续。
