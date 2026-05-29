# 任务说明书：基于 6 个参考框架补完 Speculo workflows/{dev,ops}/

你将在 Claude Code 单次会话内连续推进本任务直到 Done when 全部通过即停（**不硬撞 token 上限**，剩余 < 20% 自动触发 finalize）。

────────────────────────────────────────
## 起手必读（按顺序逐字读完，读完后回报"已加载 N 个文档，关键约束 X 条"）

1. `docs/Speculo-architecture.md`              ← 架构铁律（v2.1）
2. `docs/persistence-contract.md`              ← 机器契约
3. `framework/workflows/dev/00-INDEX.md`       ← 现有 dev 索引
4. `framework/workflows/ops/00-INDEX.md`       ← 现有 ops 索引
5. `framework/workflows/dev/01-prd/01-prd.md`  ← 看现存填充水位（[TODO] 占位现状）
6. `framework/.speculo/.config/RULES.md.example` 与同目录其他 .example  ← 项目机器配置范例
7. `README.md`                                  ← 项目门面

未读完 7 个文件，禁止开始 Phase 1 调研。

────────────────────────────────────────
## Objective（一句话）

**研读 `temp/project/` 6 个参考框架 → 提炼可借鉴的 SDD/agent workflow 设计 → 在 v2.1 规范约束下，把 `framework/workflows/dev/` 与 `framework/workflows/ops/` 从"骨架 + [TODO] 占位"推进到"AI 工具能直接调用执行"的可用状态，并产出借鉴对照表 + 覆盖率快照报告。**

────────────────────────────────────────
## Scope

**可写**：
- `framework/workflows/dev/**`（所有 phase 入口、子规范、模板）
- `framework/workflows/ops/**`（同上，含新增 phase）
- `docs/inspiration-trace.md`（**新增**，本任务允许的唯一 docs/
- `docs/coverage-snapshot.md`（**新增**，本任务允许的唯一 docs/ 新增文件）
- `framework/.speculo/dev/2026-05-28-smoke-dev/**`（端到端冒烟产
- `framework/.speculo/ops/2026-05-28-smoke-ops/**`（端到端冒烟产物）
- `framework/.speculo/dev-status.json` / `ops-status.json`（冒烟

**只读**：
- `temp/project/**`（6 个参考项目，**用户已确认完全只读**）
- `docs/Speculo-architecture.md` / `persistence-contract.md` / `pting.md` / `quick-reference.md` / `skill-authoring.md` /`command-authoring.md`
- `framework/workflows/doc/**`（doc 工作流已完工）
- `framework/commands/**`（archive.md、status.md 已完工）
- `framework/adapters/**`、`framework/skills/**`
- `framework/.speculo/.config/*.example`

**绝对禁动**：`.git/**`、`README.md`、`CHANGELOG.md`（如存在）、`LICENSE`

────────────────────────────────────────
## Constraints（硬约束）

C1. **v2.1 frontmatter 极简** — workflow 入口 frontmatter **仅 5`name` / `description` / `keywords`。**禁止**在 frontmatter 里写`phases:` / `template:` / `uses_skills:` / `depends_on:` / `status_extensions:`（这些 v2.0 字段在 v2.1 全部移入正文）。违反即 stop。

C2. **正文章节固定四节**：`## 阶段` / `## 依赖` / `## 状态扩展字段` / `## 完成与状态更新`。每个 phase 入口 .md 必须四节齐全。

C3. **模板格式**：仅顶部 `> **服务工作流：** <相对路径>` + `> **产物文件名：** <name>` 两行归属说明 + 标题 + 章节 + `[TODO: 具体填写指引]` 占位符。**禁止**模板里出现"请按以下要求填写..."这类引导文字（引   `prd-core.md`）。

C4. **相对路径硬约束** — workflow 内所有跨文件引用必须相对路径，E '\]\((/|[a-z-]+/[a-z])' framework/workflows/{dev,ops}/`命中即违规。

C5. **命名约定**：phase 文件夹 `NN-<kebab>`，入口 `NN-<name>.md`（与文件夹同名），子规范 `<name>-<phase>.md`，模板 `<name>-<artifact>-template.md`。

C6. **温度感"参考项目只读"** — `temp/project/**` 一字节都不能改 / 移动 / 删除。可读取与引用源路径，不可复制源文件到 workflows/ 内（要内化、要重写、要
cite，但不要原样搬运）。

C7. **TODO 语义区分**：
   - 模板里的 `[TODO: 填写指引]` 是**合法的、必须保留**（用户填写时整块覆盖）
   - phase 入口 .md / 子规范 .md 里的 `[TODO]` / `[TODO: ...]`
   - 验收 grep 时用 `grep -rEn "\[TODO\]" framework/workflows/{dev,ops}/ | grep -v _templates/` 区分

C8. **输出语言** — 中文（与项目现有内容一致）。

C9. **改动 Scope 外的"只读"区域前**：必须先在 heartbeat 里点名"我打算改 X 因为 Y"并等下一轮自检通过后再动。**不要悄悄改 docs/ 或 adapters/**。

C10. **不引入新文件类型** — 仅 `.md` 与 `.json`（状态文件）。禁止新建 `.yaml` / `.xml` / `.toml` 顶层文件。

────────────────────────────────────────
## 执行阶段（用 TaskCreate 跟踪，每阶段完成立刻 commit）

### Phase A · 参考项目调研（预算 ≤ 80K token）
- 对 6 个参考项目（flow-kit / gstack / superpowers-zh / spec-kit / oh-my-claudecode / OpenSpec）**逐个**读 README + AGENTS.md / CLAUDE.md + 关键子目录（如
spec-kit/templates/、flow-kit/prompts/、OpenSpec/openspec/、oh-ms/）
- 每个项目至少识别 **5 个可借鉴特性**（命名、阶段切分、状态机、模板设计、checklist、依赖声明、UI/checklist、preset 模式 ...）
- 产出 `docs/inspiration-trace.md`（结构见 Appendix A）

**Phase A Done**：`docs/inspiration-trace.md` 存在 + 至少 30 个 /project/<proj>/<file>:<line>`（或文件级也可）。

### Phase B · dev/ 现有 5 phase 补完（预算 ≤ 80K token）
对 dev/01-prd ~ dev/05-review **逐个**：
1. 入口 `NN-<name>.md`：[TODO] 全部清零，四节齐全，frontmatter
2. 每个子规范文件（如 `prd-core.md` / `prd-review.md` / `design-arch.md` / `design-api.md` / `implement-core.md` / `implement-checklist.md` / `test-unit.md` /
 `test-e2e.md` / `review-code.md` / `review-security.md`）：补完判完"指引，**结尾**写"完成准则（机器可验证）"清单
3. 对应模板（`_templates/<name>-<artifact>-template.md`）：检查 `[TODO: 提示]` 完整（每个占位符必须有"填什么"提示，不允许裸 `[TODO]`），移除引导文字
4. 每完成一个 phase 立刻 commit，message: `feat(workflows/dev/NN (借鉴: <来源>)`

**Phase B Done**：`grep -rEn "\[TODO\]" framework/workflows/dev/0 行 + 每个入口 frontmatter 通过 C1/C2 校验。

### Phase C · ops/ 现有 2 phase 补完（预算 ≤ 40K token）
- 同 Phase B 方法，覆盖 ops/01-release、ops/02-deploy
- 修复 `00-INDEX.md` 的 [TODO]
- commit 同上

**Phase C Done**：`grep -rEn "\[TODO\]" framework/workflows/ops/ | grep -v _templates/` 命中 0 行。

### Phase D · 新增缺失 phase（预算 ≤ 60K token）
基于 Phase A 借鉴决策（必须 cite 来源），最少新增以下 phase（如 ，但需在 `inspiration-trace.md` 里写明决策依据）：

**dev/**:
- `dev/06-handoff/`（建议）— 与 doc/02-changelog 衔接的发版交接 phase。借鉴 spec-kit `workflows/` 与 OpenSpec `openspec/` 的 proposal → archive 衔接

**ops/**:
- `ops/03-monitor/`（建议）— 发版后观测窗口。借鉴 oh-my-claudeco
- `ops/04-incident/`（建议）— 事故响应流程。借鉴 flow-kit `M-health.md` 与 gstack canary 思路
- `ops/05-postmortem/`（建议）— 事后复盘 → 写回 `.speculo/.confi

每个新增 phase 包含：入口 `NN-<name>.md` + 至少 1 个子规范 + 至 DEX.md` 的"内置工作流清单"表。

**Phase D Done**：dev/ 至少 6 个 phase、ops/ 至少 5 个 phase；新e.md` 里有"借鉴决策"段说明来源与差异。

### Phase E · 端到端冒烟（预算 ≤ 30K token）
- 在 `framework/.speculo/dev/2026-05-28-smoke-dev/` 创建：
  - `.status.json`（含全部 framework 强制元字段）
  - 用 dev/01-prd 模板生成 `prd.md`（占位符填一段假需求，证明模板可用）
  - 用 dev/02-design 模板生成 `design-arch.md` + `design-api.md`
- 在 `framework/.speculo/ops/2026-05-28-smoke-ops/` 同样跑 ops/01-release
- 更新 `framework/.speculo/dev-status.json` 与 `ops-status.json`

**Phase E Done**：两个 smoke change 目录的 `.status.json` 通过 `[json.load(open(p)) for p in sys.argv[1:]]'framework/.speculo/{dev,ops}/2026-05-28-smoke-*/.status.json` 且包含 6 个强制元字段。

### Phase F · 覆盖率快照报告（预算 ≤ 10K token）
产出 `docs/coverage-snapshot.md`（结构见 Appendix B）

**Phase F Done**：报告存在 + dev/ops 每个 phase 一行 + 列出文件 。

### Phase G · finalize 报告（预算 ≤ 10K token，**剩余预算 < 20%
- 一份 `docs/inspiration-trace.md` 终稿（已在 Phase A 起就维护）
- 一份 `docs/coverage-snapshot.md`（Phase F）
- 一份**会话总结**直接在对话里输出（不写文件）：
  - 完成 / 未完成清单
  - 已 commit 数 + 文件改动统计
  - 偏离原计划的决策点（若有）
  - 推荐的下一步 / 给主人的接续建议

────────────────────────────────────────
## Done when（全部通过才算完成，每条机械可验证）

D1. **借鉴对照表落地** — `docs/inspiration-trace.md` 存在，含 ≥ p/project/<proj>/<file>`。grep 验证：`grep -c '^| temp/project/'docs/inspiration-trace.md` ≥ 30。

D2. **dev/ TODO 清零** — `grep -rEn "\[TODO\]" framework/workflows/dev/ | grep -v _templates/` 输出 0 行。

D3. **ops/ TODO 清零** — `grep -rEn "\[TODO\]" framework/workflows/ops/ | grep -v _templates/` 输出 0 行。

D4. **frontmatter v2.1 合规** — `grep -rE "^(phases|template|uses_skills|depends_on|status_extensions):" framework/workflows/{dev,ops}/` 命中 0 行（这些 v2.0
字段必须移入正文）。

D5. **frontmatter 五字段齐全** — 每个 phase 入口 .md 的 frontmat` / `name` / `description`，可选 `keywords`。脚本检测：每个文件grep 命中 4/4 必填字段。

D6. **正文四章节齐全** — 每个 phase 入口 .md 正文必须有 `## 阶段` / `## 依赖` / `## 状态扩展字段` / `## 完成与状态更新` 四级标题。`for f in
framework/workflows/{dev,ops}/*/*.md; do grep -c '^## ' "$f"; do

D7. **相对路径合规** — `grep -rEn '\]\((/[a-z]|/Users/)' framewo 0 行（无绝对路径）。

D8. **dev/ 至少 6 phase、ops/ 至少 5 phase** — `ls -d framework/6；`ls -d framework/workflows/ops/[0-9]*` 计数 ≥ 5。

D9. **端到端冒烟可解析** — `python3 -c "import json,glob; [json.glob.glob('framework/.speculo/{dev,ops}/2026-05-28-smoke-*/.status.json')]"` 退出码 0。

D10. **覆盖率快照报告** — `docs/coverage-snapshot.md` 存在 + 含 phase 数量 ≥ dev 6 + ops 5 = 11 行表格。grep 验证。

────────────────────────────────────────
## Stop if（机械可检测，触发即停下汇报）

S1. **任何 docs/* 已存在文件被修改**（仅允许新增 inspiration-tra）— `git diff --name-only docs/` 出现 `Speculo-architecture.md` / `persistence-contract.md` / `workflow-authoring.md` / `adopting.md` / `quick-reference.md` / `skill-authoring.md` / `command-authoring.md` / `README*.md`
任一即停下回滚。

S2. **temp/project/** 任何文件被写入或删除 — `git status temp/`

S3. **framework/workflows/doc/ 或 framework/commands/ 被修改** —停下汇报理由。

S4. **C1 v2.1 frontmatter 违规** — 任何入口 .md frontmatter 出现2.0 字段，**立刻停下重读 docs/Speculo-architecture.md§6.2**，不要硬撞。

S5. **同根因连续失败 ≥ 2 次（P9）** — 例如同一个 grep 校验连续两轮没过、同一个 frontmatter 改两遍仍不合规 — 停下书面汇报：
   - 已试方案 + 它们的差异
   - 当前观察到的现象
   - 等用户指令

S6. **现有冒烟测试 / lint 出现 regression** — 任何已通过的 D 条 kip / 删除验收来解决；停下找根因。

S7. **剩余 token 预算 < 20%（≈ 60K 内）** — 立刻进入 **Phase G fnapshot.md` 与会话总结再停，不要继续开新 phase。

S8. **出现绝对路径或裸 id 引用** — 立刻在当前文件内修复；若同根

────────────────────────────────────────
## 健康守则（长跑必备）

H1. **Heartbeat（每完成一个 phase + 每改动 ≥ 8 个文件）** — 输出三行：
   Heartbeat | phase=X.N | files_changed=N | tokens_used≈N/300K
   commit=  done_so_far=<D1..D10 通过情况>
   next=<即将做什么>

H2. **Checkpoint（每完成 phase 必 commit）** — commit message 格
`feat(workflows/<cat>/NN-name): <动作> (借鉴: <来源>; Done: D<n>)`
commit 之前先用 `git status` 看清单，避免误带文件。

H3. **Anti-drift** — 改一个文件前问自己："这文件路径在 Scope 可 。

H4. **Anti-loop（P9 兜底）** — 同根因失败 ≥ 2 次必须停（S5）。失试了 X，结果 Y，下一步打算 Z，但若 Z 再失败必须停"。

H5. **Token guard** — 每完成一个 phase 估算累计 token 用量（hear 剩余 < 20% → S7。

H6. **Context reset 防御** — 若发现自己开始遗忘起手必读内容（如 立刻重读 `docs/Speculo-architecture.md` §6.1~6.7 与`docs/persistence-contract.md` §4~9 再继续。

H7. **TaskCreate 使用** — 起手把 Phase A~G 拆成 7 个 task，进入每个 phase 时 set in_progress，完成 set completed。子任务（如 dev/01-prd 补完）可作为子 task
添加。

────────────────────────────────────────
## Token budget: 300,000

预算用尽前必须完成 Phase G finalize（S7 兜底）。**做完 Done when 全部通过即停**，不必硬撞预算上限。

────────────────────────────────────────
## Appendix A — `docs/inspiration-trace.md` 结构

```markdown
# Speculo 借鉴对照表
> 本文档记录 framework/workflows/{dev,ops}/ 在补完过程中从 temp/性。

## 1. 参考项目概览
| 项目 | 核心范式 | 主要借鉴方向 |
|------|---------|------------|
| flow-kit | ... | ... |
...

## 2. 借鉴条目（按 Speculo 目标位置组织）

### dev/01-prd
| 源路径 | 借鉴点 | Speculo 落地位置 | 差异说明 |
|--------|--------|-----------------|---------|
| temp/project/spec-kit/templates/spec-template.md | spec → plan → tasks 三段切分 | dev/01-prd/prd-core.md §阶段拆分 | 我们保留 PRD 单文档形态，不拆
plan/tasks |
...

### dev/02-design
...

### ops/03-monitor (新增)
...

## 3. 决策记录（新增 phase 的依据）
- 为何新增 dev/06-handoff：...
- 为何新增 ops/03-monitor：...
- 为何 **不** 借鉴 X 项目的 Y 模式：...

Appendix B — docs/coverage-snapshot.md 结构

# Speculo workflows/{dev,ops}/ 覆盖率快照
> 生成时间：<ISO 时间>
> 任务参考：基于 6 个 temp/project/ 框架的开发建设结果

## dev/ 覆盖矩阵
| Phase | 入口文件 | 子规范数 | 模板数 | 字段填充率 | 主要借鉴来源 |
|-------|---------|---------|--------|-----------|------------|
| 01-prd | 01-prd.md (44 lines) | 2 | 2 | 100% | spec-kit, OpenSpec |
| 02-design | ... | ... | ... | ... | ... |
...

## ops/ 覆盖矩阵
（同上表）

## 验收清单逐项
| D | 描述 | 状态 | 证据命令 |
|---|------|------|---------|
| D1 | inspiration-trace 30+ 条目 | ✅ | grep -c ... = N |
...

## 偏离与待办
- 偏离 1：原计划 dev/06-handoff，实际改为 dev/06-X 因为 ...
- 待办 1：workflow-authoring.md 仍有 [TODO]，但属于 docs/ 规范级

---