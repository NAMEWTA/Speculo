# Workflow 合同、证据与恢复

[手册首页](README.md) · [架构](architecture.md) · [维护者指南](contributing.md)

Speculo 的工具检查实际文件、身份、版本和关系；各 Work 继续负责判断内容是否充分，以及在已有授权内采取哪一步。了解这两层的边界，可以判断一次通过究竟证明了什么，也能在中断后找到原来的负责人和证据。

## 1. 当前合同由谁维护

| 事实 | 权威来源与消费者 | 通过代表什么 |
|---|---|---|
| 一个 workflow 的身份、Works 与阶段依赖 | [manifest v2 schema](../template/workflows/workflow-manifest.schema.json)，由发现、安装、资产校验共用 [contracts.ts](../src/contracts.ts) | 注册完整、目录归属正确、阶段依赖无缺失或环路 |
| 宿主声明的模型与工具能力 | [capability profile schema](../template/references/contracts/capability-profile.schema.json)，由 doctor 检查 | 声明结构合法；实际可调用性仍以当前宿主证据为准 |
| SpecDev 的规划、实施与完成 | Change Markdown、Goal Plan 8、Implementation Plan 3、execution context/record 1 及领域工具 | 当前工件与已登记证据自洽；Ready、完成、独立审查仍按各自合同判断 |
| Learning 的位置与学习记录 | Change 状态、locations、来源工件及 Learning 工具 | 位置、预算、引用、原答和掌握证据之间没有已知矛盾 |
| OPS 的资源与执行结果 | OPS 资源 schema、纯资源校验核心及 ops.mjs | 资源描述合法；执行、验收、提交与可见记录各有自己的证据 |
| Person 的咨询进度 | 每个 Change 的 .status.json 与对应 Work 工件 | 当前咨询具备进入所声明阶段的登记材料 |
| Media 的交付 | 真实文件、artifacts manifest、render report 与 review | 已声明产物存在，字节、依赖和相应审核输入能相互核对 |

共享合同描述可发现的事实，不建立跨领域的统一执行状态机。旧版本 SpecDev JSON 权威、旧 TASK 适配器和未接入实际消费者的 kernel 合同不再分发。遇到未知或混合版本，受影响工具停止并保留原件；仅修改版本号不能把历史记录变成当前合法输入。历史记录的处置由实际 owner 决定。

## 2. SpecDev：让诊断、计划与交付指向同一范围

多 Change Goal 使用专用 [Implementation Map](../template/workflows/specdev/specdev-p-goal-plan/assets/implementation-map-template.md)、[Implementation Plan](../template/workflows/specdev/specdev-p-goal-plan/assets/implementation-plan-template.md) 和 [整体 Evidence](../template/workflows/specdev/specdev-p-goal-plan/assets/implementation-evidence-template.md)。它们登记成员、跨成员依赖、写入串行关系与整体验收，不能由普通单 Change Goal 模板替代。模板中的未执行证据保持未完成。

[结构化诊断](../template/workflows/specdev/common/tools/validation-diagnostics.mjs) 提供稳定 code、scope、change 和 ticket 身份。[ticket-control](../template/workflows/specdev/common/tools/ticket-control.mjs) 依据这些字段计算可执行范围，message 只用于展示。单票问题保留在该票；能可靠归属的成员问题保留在该成员；未知归属和全局图错误阻止依赖这项全局事实的调度。改变错误文案不改变 frontier。

Ready 的完整 Direct Spec 可直接交 Implement；原型完成后，获准继续真实实现时也回到 Implement。工作区是当前实际交付的输入：验证快照应覆盖本次未提交改动，并明确排除用户原有 dirty 写集。HEAD 不能代替完整工作树，也不因为验收而额外要求提交。固定输入、独立审查与实际 Evidence 继续由原领域网关消费。

复杂分支按需读取 [代表性首票](../template/workflows/specdev/specdev-p-goal-plan/references/representative-ticket.md) 或 [已采集材料取证](../template/workflows/specdev/specdev-d-diagnose-bugs/references/captured-evidence-forensics.md)。编排公共规则放在 [coordination](../template/workflows/specdev/common/rules/coordination.md)，入口保留自身触发、产物和停止条件。

## 3. Learning：位置恢复与学习证据分别检查

### 整树迁移

[relocate-learning](../template/workflows/learning/common/tools/relocate-learning.mjs) 默认只读生成计划和 plan_digest。获准执行同一计划时传入 `--apply --expect-digest`；执行前取得本次锁并重新核对输入。实际移动之前，工具持久化来源、目标、文件字节、目录清单及恢复事实。迁移会更新全部后代位置、父子关系和全局定位。

中断后使用工具返回的 manifest 路径：

```bash
node <relocate-learning.mjs> --state-root <learning-root> --resume <manifest>
node <relocate-learning.mjs> --state-root <learning-root> --rollback <manifest>
```

恢复先比对原始字节、当前位置、文件模式和暂存项。已完成事务再次恢复时，必须处于该终态应有的精确方向：完整的迁移前数据不能冒充 applied，完整的迁移后数据不能冒充 rolled-back。外部改动、软链接和不属于本次的锁保持原样并报告；不能通过重复运行覆盖它们。整合后的永久 context 发布仍走原有发布网关。

### 学习记录

[evidence-integrity](../template/workflows/learning/common/rules/evidence-integrity.md) 将可机械核对的要求接入 [validate-learning](../template/workflows/learning/common/tools/validate-learning.mjs)：

- Lesson 的分段分钟数为正数，合计与 30–40 分钟总预算一致；OBJ、来源与授课时间可解析到实际记录。
- Homework 只接受一行精确的 `Submission: pending` 或 `Submission: ready`。评审冻结原始提交字节并追加 Review，不能改写用户原答。
- “已评审”与“已通过”分别记录。`Immediate result: passed` 需要对应逐题判断与理由；错误、未解决的不确定性或阻塞误区不能仅凭存在 Review 就变成 immediate 通过。
- Retention 需要真实延迟 Review、答题、时间与匹配的目标；永久知识中的掌握声明还需要对应来源和发布记录。

这些检查证明记录自洽，不代替教学判断，也不把所有题全对、强制复习或掌握状态变成归档前置。Goal 仍是计划型 Work；用户可按原生命周期结束学习。

## 4. OPS：静态检查、未知原因与业务验收

[validate-ops](../template/workflows/ops/common/tools/validate-ops.mjs) 区分三种入口：

| 调用 | 范围 | 副作用 |
|---|---|---|
| `--package-check` | 仓库方法资产及分发种子 | 只读，无目标服务器访问 |
| `--self-check` | 安装后的静态方法资产 | 只读，不要求方法目录带业务状态种子 |
| `--state-root <绝对路径>` | 显式指定的业务状态 | 只读，不初始化状态或进行 SSH 探测 |

安装器与独立 OPS 工具共享 [resource-validation](../template/workflows/ops/common/tools/opslib/resource-validation.mjs) 的纯资源语义。目标侧不因此增加 npm 依赖；入口各自的文件读取和执行边界仍保留。共享病例检查双方对同一资源的结论。

服务器检查失败时，结果保留 unknown，并记录受控的探测阶段、分类与错误码。输出不保存原始 stderr 或可能含凭据的异常文本。FLEET 展示这些已登记原因；展示快照不等于重新探测。

[business-verification](../template/workflows/ops/common/tools/business-verification.mjs) 为已有 verifier 生成项目专属业务检查条目。业务响应、依赖和输入文件由项目说明；工具生成检查配置不执行部署，也不提供新的部署授权。计划、apply、真实验收、commit 与 view 继续消费各自的冻结输入。

## 5. Person 与 Media：完成声明必须能回到原工件

### 多对象咨询

Mao 咨询的 phase、problem_type、模型及阶段证据保存在各自 Change；全局 person/status.json 只做 active 导航。按 [状态发布合同](../template/workflows/person/person-m-mao-zedong-cognitive-os/references/state-and-publication.md) 先校验候选，再在当前授权内发布同一摘要；全局索引只合并本 Work、本 Change 的条目。共享索引锁也供其他 Person 写者遵守。

阶段推进核对实际问答、方法要求与工件哈希；修改前序结论须显式回退阶段并使后续证据失效。原文引语读取登记篇目核对，不扫描整套书库。状态、候选或锁为悬空软链接时，发布会拒绝并保留链接。钢人方法继续使用自己的 dossier 冻结、回答和裁决资格；[可选独立决策审查](../template/workflows/person/common/rules/independent-decision-review.md) 只在适用场景触发。

### 真实媒体交付

基础 Brief 聚焦事实、受众和内容；进入 Video 才要求视频分支的规格。提供了可选规格时也会校验，不能用“可选”隐藏无效数据。

[render_preview.py](../template/workflows/media/media-v-video/scripts/render_preview.py) 在源码和安装布局中定位同一共享工具，记录实际渲染器、工具链、字体与输入摘要。最终产物检查会重新读取审核标准、分数、阻塞项、预览视频、审核静帧以及实际编码规格；缺件、漂移或未登记的依赖会使受影响结论失效。

[artifacts schema](../template/workflows/media/common/schemas/artifacts.schema.json) 将产物 owner、版本、依赖图、实际哈希和文件类型关联起来。声明 final MP4 必须有真实 MP4 及完整相应审核证据；只提交工程文件不算成片。环境身份与内容批准分别核对，不能单凭工具链变化臆断内容审核失败，也不能用旧报告掩盖新字节。生成本地草稿仍不代表已经发布到平台。

## 6. 怎样运行并解释评估

在仓库完成构建后运行确定性的安装及产物场景：

```bash
pnpm build
pnpm eval:run-artifacts
pnpm eval:run-artifacts --output /absolute/path/to/new-evidence
pnpm eval:run-artifacts --scenario artifact-learning-relocation-recovery
```

显式输出目录必须是新目录。运行器在一次性项目中调用实际安装 CLI 和分发后的领域工具，保存进程退出码、stdout、stderr、前后文件清单及声明工件，并生成 fixtures.json、trace.jsonl、inputs.json 和 result.json。失败保留原日志；不会清空已有输出目录。CI 同时运行隔离 tarball 检查和显式准备环境后的离线浏览器渲染，并保留产物证据。

| 证据层级 | 能支持的结论 | 不支持的结论 |
|---|---|---|
| fixtures，无 trace | 场景登记可读取；结果为 not-evaluated | 模型已按入口执行、业务已完成 |
| artifact gates | 所提供 trace 与真实产物满足声明断言；运行器另外记录实际子进程和前后文件差异 | 所有瞬时副作用、模型语义质量、未登记读取均被观测 |
| observed gates | 经操作者信任的独立观察者验证的记录满足已配置观察门 | 普遍正确性、业务批准、发布授权 |

运行器列出全部未运行的观察场景，并明确 `model_executed: false`、`observer_authenticated: false`、`publication_authorized: false`。手工制造 trace、签名或 approval 字段不能把夹具变成真实宿主观测。`gate_eligible` 仅描述所配置观察门的资格；评估工具不授予发布权。

维护者继续使用 `pnpm check`、`pnpm verify-bin`、`pnpm verify-package` 和 `pnpm verify-generated` 检查源、分发与生成一致性。来源映射保留历史原文摘要；源包或历史提交不可用时，校验报告会说明只检查了当前映射与覆盖，不能据此声称重新验证了历史源字节。

完整 Canonical 保留独立使用所需的方法闭包。没有真实宿主读取与质量对照数据时，不根据文件大小宣称节省 Token，也不将精简版替换完整分发。OPS 并行化同样需要真实争用证据与可靠的共享事实提交规则。
