# 全部 Work 重构：实施记录与合并边界

实施依据为用户上传计划的原字节副本 [plan.md](plan.md)，SHA256 见 [baseline.json](baseline.json)。基线为 `1e698821a65cdd02a40e48f98e78e87ad498617b`（v1.0.18）。用户随后明确授权完整实施、提交并创建一个面向 main 的 PR；计划原文中的“未实施/不是授权”是该文档形成时的状态，不是对后续实施结果的描述。

本次改动只在独立重构分支进行，不合并 main，不发版、不部署，不接触真实工作区、服务器或凭据。全部 30 个 Work 主入口已改动；行为调整与保真文档重构分别提交。不是把全部 Work 改成 SKILL，也没有新增统一 Agent 运行时或状态库。

## 实施对照

| 计划项 | 实施结果 | 依据/限制 |
|---|---|---|
| U00 / F08 | 冻结原计划、基线、30 Work ID/路径/摘要；区分维护源、生成物、证据与状态 | [baseline.json](baseline.json)、[work-matrix.md](work-matrix.md)、[protected-files.json](protected-files.json)；不含未推送本地安装与生产状态 |
| U01 / F02 / E1 | 扩展原 scorer；夹具、工件与独立观察三层分开；无证据的 observed/release 门退出 2 | [evaluation.md](evaluation.md)；导入规范化观察包，不伪造宿主专有事件格式；真实模型对照尚未执行 |
| U02 / F01 / E2 | 在原 disclosure 校验中加入条件引用、可达性、反向调用、失效链接、循环/孤立候选审计与实际读区间去重 | [disclosure.md](disclosure.md)；自然语言条件是审计提示，不是模型执行证明 |
| U03 / F03/F04 | 重构 SpecDev 14 入口及实际深层必读过程；四模式分诊、首次初始化、Spec、图解、架构设计分支各有维护点 | [30 Work 矩阵](work-matrix.md)；保留 CONTEXT、旧 O、状态/权限、用户数量、current/required 策略 |
| U04 / F05 | OPS 5 入口与激活合同分层；V 本地读取，S 独立接入，H profile，D 完整执行合同 | 布局与恢复细则保留；未改执行器、任务权限、凭据策略或状态 schema |
| U05 / F09 | Learning 9、Person 2 入口消除重复；状态/发布细则下沉但保留流程与原字段 | 保留教学与角色风格、领域数量、冻结原答、引用原文及永久知识网关 |
| U06 / F07/F09 | R report 与 selected-design；Q 实际题数与关闭前原答字节校验；Learning 初始化和 R/C 写入权界限 | 独立提交；有源契约与正/负夹具回归，不声称实际模型已完成基准 |
| U06 / C/E3/E4/E5 | 严格绑定的 review 复用；原 handoff 的下一安全动作；Dev Evidence 与 OPS 现有字段/回执引用；retro 的修复类型分类 | 复用原入口/工件/写入者，远程动作、正式知识和部署授权不扩大 |
| U06 / F06 | **保留既有 D 语义，不启用未经实测的放宽** | [实验登记](diagnosis-experiment.md)；计划明确要求实验通过后才采用 |
| U07 | 全套测试、资产/引用/生成校验；实际基线→候选→回退的隔离演练 | [compatibility-result.json](compatibility-result.json)、[verification.json](verification.json) |
| U08 | 发布前检查与回退指引已交付；没有实际发布 | 见下文；合并 PR 不替代生产、真实模型或在途 OPS 审查 |

## 测试和证据

本地运行环境：Linux、Node 22.22.3、pnpm 11.1.3。原始基线在固定提交的隔离 GitHub Actions 中运行：197 个主测试通过、资产校验通过。本次候选：

| 检查 | 实际结果 |
|---|---|
| `pnpm check` | 240 个主测试通过，0 失败、0 跳过；全部资产校验通过 |
| 上述测试调用的 OPS 子测试运行器 | 独立报告 196 个子测试通过，0 失败、0 跳过；不是另加 196 个主测试 |
| `pnpm verify-bin` | CLI init/version/doctor/resolve/recover 入口通过 |
| 四个 workflow 的 index 生成、canonical 生成与再次生成 | 两轮输出摘要一致，canonical --check 通过 |
| `validate-workflow-disclosure --json` | 30 个稳定 Work 可达，0 错误，1457 条潜在引用；7 个导航循环和 63 个孤立候选仅作审计线索 |
| `evaluate-scenarios --require observed`，无观察包 | 退出 2、not-evaluated、release_eligible=false；拒绝把夹具成功当行为通过 |
| 当前批次 inquiry 校验 | 1/5/7/12 题、连续编号、重复/缺号、Response 次序、原答改写拒绝、围栏示例与路径拒绝 |
| 独立 observer 验证器 | 合成密钥测试覆盖伪造签名、来源漂移、额外产物、禁读/副作用、缺覆盖、路径别名及自授信拒绝；**这些不是模型运行** |
| 基线与候选静态回退演练 | 两种项目布局均通过混合刷新、完整刷新、锁拒绝、未知 schema 拒绝、回退；每种布局 8 个自有夹具文件字节与权限保持 |
| 显式保护清单 | 114 个既有 CLI/安装元数据/schema/种子/common tools/CI/锁文件/软链接保持原字节；没有 runtime 迁移 |

原有测试还覆盖配置三方合并、opaque 文件、旧状态拒绝、嵌套 roots、kill 后事务恢复、OPS started-only/失败/文档/资产视图等隔离场景。没有用一次绿色状态声称绝对安全。

`validate-source-parity` 的旧参考源码 `temp/skills` 在基线就不可用，因此仍报告 **historical source hashes NOT VERIFIED**。当前源清单、路径与生成校验通过，不把这个历史缺口写成已认证。

## 删除、移动与成本口径

[work-matrix.md](work-matrix.md) 逐项列出主入口、操作、承接位置和保留合同；机器可读摘要在 [work-matrix.json](work-matrix.json)。没有删除 Work、历史证据、运行时目录、旧恢复键或持久化数据。

30 主入口的 Unicode 字符数从 **89,749** 变为 **66,107**。本次涉及的全部 61 份 Agent 源文档（包含新拆出的 references、交接和复盘增强，排除 canonical 派生副本及本审计目录）从 **152,396** 变为 **141,383**。详见 [metrics.json](metrics.json)。不能只用入口缩减忽略拆出的参考，也不能把这些数字称为 token、费用、套餐额度或真实读取量的下降。

本次没有真实模型 baseline/candidate 多次对照，因此没有宣称任务完成率、路由正确性或 30% 实际加载收益。引用图也不预测 Agent 是否会读取某文件。

## 如何复核

从仓库根使用已声明版本的 Node/pnpm；常规命令不需要外部凭据：

```bash
pnpm check
pnpm verify-bin
node scripts/validate-workflow-disclosure.mjs --json
node scripts/generate-specdev-canonical.mjs --check
```

重跑版本间演练时，在另一个只读目录准备固定基线 `1e698821a65cdd02a40e48f98e78e87ad498617b`，然后：

```bash
pnpm build
node scripts/verify-work-upgrade-compatibility.mjs --baseline-checkout /path/to/pinned-baseline
```

演练器只在自己新建的临时 fixture 中安装/刷新/回退，finally 清理自己的 fixture。CLI 源必须与基线相同才复用候选构建 API；不同则拒绝，需分别构建。不接受真实安装目标参数。演练器验证字节保留，不冒充实际服务器运行恢复。

真实 Agent 对照遵循 [evaluation.md](evaluation.md)。必须有完整断言、独立观察来源、模型/宿主版本、重复次数和实际工件；仓库里没有生产密钥、默认可信观察者或自动调用付费模型的代码。

## 合并、发布与回退

本 PR 是一个集成入口，但内部保留独立提交：先基线/评估/引用治理，再三个领域文档批次，再逐项行为增强，最后验证/回退记录。审查时可按提交核对语义变化；不要把所有改动误认为纯排版。

合并前检查 PR 当前 head 的 CI 和 diff，确认没有 main 漂移、schema/执行器变更或意外的运行数据。实验 F06 仍关闭；同一 main 合并不等于启用了诊断放宽。

**发布前仍须：**完成所选真实模型/宿主的观察对照；盘点真实安装与在途 OPS；读取原 recovery，核对旧批准与 executor/input/credential/identity 摘要。即使本次未修改执行器，也不能凭文档推断历史授权仍有效。未闭合运行先按原协议处理，不新建 task_id 掩盖 unknown。

文档回退只通过匹配版本的受管理静态刷新，不复制旧 state，不覆盖活跃 Change、Run、Release、receipt、原答、旧 CONTEXT 或永久知识。未发生 schema 变化，不需要本次新 migrator；将来另有迁移，回退必须恢复匹配版本和 targeted backup，而不只是 git revert。

OPS 的 docs_pending 只按文档恢复处理；V 失败不重跑业务；恢复旧镜像不声称数据库已回滚。正式部署、永久知识、清理以及发布仍走各自原网关。临时审计/传输分支不属于最终 PR 的源树。

## 未覆盖的边界

未审计未推送的本地安装，未取得真实 OPS 状态/凭据，未连生产目标，未运行付费模型、多宿主行为对照或实际部署健康验收。故障注入与迁移演练均为隔离夹具。上述缺口不会被绿色结构校验或合成签名测试隐藏；生产采用仍须对应验证。
