# Learning 主动探究升级

## 范围与行为变化

基于 `335b39424ddead5d5699f7ba8ae5fcf701ddbbd6`，将主动发现、解释盲区原因、证据驱动追问和验证闭环接入现有 Learning。新增行为是 Question 的 explore 分支，不是把原苏格拉底批次悄悄改成 AI 自问自答。版本、全局 Learning v2 状态、已有作业/保持复习和 G 的计划/执行边界不变。未迁移或重写用户历史。

## 使用

在工作区激活 `learning/question`：

```text
mode=explore
主题：Agent 工具调用的可靠性。
已有基础：能够实现基本工具调用，但缺少生产环境经验。
主动发现未提出但重要的问题，解释为何容易遗漏，深入到责任层、处理边界和验证。
```

希望自己先思考时选择 `mode=tutor`；不指定时保持 tutor 默认。用户明确说“主动挖掘、直接深入讲解”会路由 explore，恢复则优先沿用工件中的模式。`teaching_method` 仍只控制提问配方，不能绕过提交协议。tutor 默认五题，用户指定 n 则输出 n 对 Q/A，不套用 mine 十问上限。

网页直接使用 `template/canonical/canonical-learning-lesson.md` 或 `canonical-learning-question.md`。每份只需要本身及用户材料；使用 `ai-workspace/`，不要求源仓库、路径解析器或另一份提示词。有文件工具时真实写入；不能写文件时完整输出 FILE bundle，明确需要保存，恢复时以实际文件而非模型记忆为依据。网页可把用户明确“提交本批答案”映射为 ready，原生工作区仍要求精确 `Response: ready` 行。

## 单一方法来源

下列路径以 `template/workflows/learning/` 为前缀。

| 源 | 职责与调用条件 |
| --- | --- |
| `common/rules/inquiry-depth-policy.md` | L、Q 和 G miner 共享；发现原因、机制/反例、证据、方案代价、验证、迁移与停止 |
| `common/rules/production-inquiry.md` | 工程、Agent、外部工具主题才加载；重复/无进展、问询循环、结果未知、多层重试、恢复重放、信任边界 |
| `common/rules/question-map-contract.md` | Q 负责的问题关系、工件定位、证据状态，不替代原文或掌握判断 |
| `Q-question/references/tutor-mode.md` | 原答题生成、精确提交、原文冻结、追加教学、重答新批次 |
| `Q-question/references/exploration-mode.md` | 主动发现并讲解，无学习者答案/提交；独立候选和验证 |
| `common/rules/portable-learning-runtime.md` | 仅网页编译适配：最小输入、便携状态、真实保存/完整导出、暂停与恢复 |

提问动作与内容覆盖分开：沿用澄清、证据、反例、视角、元问题，但选题必须来自相关遗漏而非填满槽位。没有提到不证明不理解；潜在风险不证明已发生事故；问题 resolved 不表示学习者 mastered。主要分支推进到证据与验证，其他分支保留待证据/暂缓。正常分页是重复调用的反例，数学等非工程主题不强加服务器故障模板。

L 仍一次提供 30–40 分钟活动预算的完整讲义；通过解释性段落说明盲区及现实检验，不创建答题区或作业。G miner 复用共享方法，但仍只审问 Lesson/源码、写自己的 probe，保留每课两批最多十问、单元最多十五课、无自动执行授权。

## 工件与兼容性

原生 Q 在当前稳定 Change locator 下拥有：

```text
inquiry/INDEX.md
inquiry/IQ-001-topic-batch-01.md
inquiry/question-map.json
inquiry/explorations/EX-001-topic.md
inquiry/evidence/
```

旧 IQ 与验证器保持兼容。问题地图首次需要时创建，schema_version=1、questions=[]，不回填旧记录；现有 runtime 保留策略不变。地图保存问题 ID、父问题、触发来源、重要性、潜在/观察到的缺口、问题/证据状态、拥有工件、结论与验证说明。原始回答和证据仍是权威。

EX 的五个二级章节为 Scope、Discovery、Deep Dive、Verification、Next，元数据标 mode=explore 和 focus question_ids。关闭需要明确处置 focus，不要求伪造“全部解决”；closed 工件只读，进一步探究新建记录并关联父问题。

`validate-exploration.mjs` 检查结构、ID/父链、状态、工件归属、请求数量、路径、实际引用及真实存在的非空测试记录。拒绝符号链接/穿越、学习者协议混入、无证据 resolved、缺文件却标 tested、改写 closed EX、冲突的既有元数据。它是只读门禁，不能证明证据真实、教学正确或学习有效。

生成 EX 时先验证候选记录和候选地图，artifact 指向正式目标；全部通过后在既有根锁下重读基线，按记录→地图→索引/日志→状态发布。IQ 保留 ready 原文快照，先验证字节冻结及结构；发布有效 IQ 后才验证引用它的候选地图。任何中断保留候选与恢复说明，不提前推进状态或覆盖未知内容。验证器不替代 root lock、用户授权或持久化网关。

## canonical 生成

`pnpm generate-canonical` 在现有生成入口后调用 `scripts/generate-learning-canonical.mjs`；`pnpm validate-assets` 检查两份新产物是否陈旧。生成器从明确的语义区块及网页适配组成成品，而不是维护另一套教学文案。源规则变更同时反映到两份成品；输出无源码路径、来源包装、注释、内部入口文件名或未展开标记。生成前先完成两份候选的编译与审计，逐文件安全替换；重复生成字节一致。

网页专属的输入降级、目录命名和提交映射集中在 runtime 适配中；不反向放宽原生合同。固定项目 URL 只出现一次；运行时学习资料仍应记录真实来源定位。新增成品由测试在隔离目录调用仓库现有 canonical 持久化审计器，避免把本改动扩大为其他 canonical 的重构。

工作流 AUTO-INDEX 使用现有 `skills/speculo-write-workflows/scripts/generate-index.mjs` 从 Work frontmatter 生成；不要手改生成块。

## 验证与证据层级

本地实施环境只取得从 GitHub 连接读取的选定源码，不是完整 clone，Node 为 22.16.0，低于仓库支持的最低版本。实施阶段实际运行：

```text
node --experimental-strip-types --test test/work-upgrade-inquiry.test.ts test/learning-inquiry-upgrade.test.ts
node scripts/generate-learning-canonical.mjs
node scripts/generate-learning-canonical.mjs --check
```

局部回归 35 项：34 通过、0 失败、1 跳过。跳过项是调用完整仓库中官方 canonical 审计器的集成测试；完整 checkout 存在该工具时会执行。原有九项 IQ 回归不修改，覆盖实际数量、ready 冻结、fence/CRLF、路径与只读。新回归覆盖地图、EX、负向边界、共享源传播、陈旧检测、生成前门禁与重复生成。

工作流索引使用从同一提交读取并核对 blob 的原生成器运行，输入为修改后的 L/Q、原 INDEX/README 和其余七个 Work 的真实 frontmatter 范围，不宣称是完整工作区测试。

完整仓库 `pnpm check`、`pnpm verify-bin`、两次 canonical 重建，以及支持的 Node 22.22.3/24 和 Windows 安装检查，以 PR 的真实 CI 结果为准；不能用局部测试替代。没有运行真实 LLM 行为对比或生产故障实验。

`test/fixtures/learning-inquiry-scenarios.json` 提供二十四个语义验收场景，全部明确 `not-evaluated`。`pnpm eval:learning` 只检查 fixture readiness；不得把场景字符串、关键词存在、模型自评或结构测试当作 observed 行为证据。模型评测应记录模型/参数/材料/工具一致的基线与候选实际输出，人工核对重要性、正确性、进展、误报、用户负担和停止行为，再按既有 observer 合同提交证据。

## 发布、回退与未改范围

本 PR 不升级 npm 版本，不发布、不自动合并、不归档用户记录。回退时可停止使用 explore 并保留 EX/map/evidence，撤回静态代码提交不会删除运行时文件；不要自动迁回或覆盖原答卷。源码基线保存在提交父版本，新增工件目录没有全局 schema 迁移。

实现、审阅与测试设计使用了 AI 协助。所有质量结论限于实际执行的检查与取得的证据。
