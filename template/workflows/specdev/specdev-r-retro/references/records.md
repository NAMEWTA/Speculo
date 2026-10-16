# 独立 RETRO 工件合同

## 身份、路径与 owner

`retro`、`upgrade` 均为首次创建日期加主题的 `YYYY-MM-DD-topic[-NN]`，检查现役和 archive 中名称未占用后创建；同身份多位置即冲突。R 拥有报告、升级方案与执行回执，A 拥有已批准归档的移动/封存。复盘资料不是 ADR/context 永久知识，不注册为永久知识 store。

- 报告：<Path>{roots.state}/specdev/retro/{retro}/RETRO.md</Path>，必要原文放同对象的 `sources/`。
- 方案：<Path>{roots.state}/specdev/retro/{upgrade}/PLAN.md</Path>，候选在对象内 candidates/；实际批准后才创建 <Path>{roots.state}/specdev/retro/{upgrade}/approval.json</Path>、approval/、execution.json、evidence/ 和必要 before-images。
- 归档：<Path>{roots.state}/specdev/retro/archive/{retro}/</Path> 或 <Path>{roots.state}/specdev/retro/archive/{upgrade}/</Path>，保持原名、不按月份嵌套。位置与原归档回执表达封存，不维护第二套全局状态。

只在当前请求需要时建对象。新报告独立于来源 change，不创建 review-only change、Spec、Ticket 或 implementation Evidence。完成报告后冻结其原文与事实；纠错使用新报告说明被替代结论。升级方案经批准后冻结，执行记录不回写 PLAN.md。

## 报告

按 <Path>{roots.workflows}/specdev/common/schemas/retrospective.schema.json</Path> 使用 v2 frontmatter；模板中的全部字段替换为真实值。`status` 只表达报告是否完成，不表达修复完成；findings 与 outcome 必须一致。

每个 source 的 `snapshot` 是对象内 `sources/` 下的真实原文片段，`sha256` 为该文件原始字节摘要，`quote` 必须逐字存在于快照。正文同时展示引用，不能只填 hash。`kind=change` 的 change 必填，locator 为 change 内相对文件路径，可带锚点；`kind=project` 为项目相对路径；`kind=session` 为实际 `session:` locator，change 不存在时填 null。会话日志只读定位不变成自动读取任意绝对路径的工具能力。

来源文件后来变化不覆盖快照；升级时另外核实当前事实。源 change 归档后按稳定 ID 查找。校验器只能证明快照完整性及引用结构，真实原文出处由本次采集观察负责。资料完全不足可以 sources/findings 都为空并使用 insufficient-evidence，正文明确限制；有发现必须引用实际 source，不能以空证据支持升级。

## 升级方案、批准与执行

PLAN 遵守 <Path>{roots.workflows}/specdev/common/schemas/retro-upgrade.schema.json</Path>。inputs 固定原报告 ID 和 RETRO.md 摘要；每个发现只有一个处置，所有待写文件均列入 changes。候选必须位于本方案 `candidates/`，目标限定项目 `.agents/skills/`；现有内容前摘要不符即漂移。retain 保留原字节且不产生写操作。先准备完整候选和关联引用，验证通过后才向用户提交方案。

用户确认后，在本方案保存不可变的原确认摘录 <Path>{roots.state}/specdev/retro/{upgrade}/approval/request.md</Path>，并按 <Path>{roots.workflows}/specdev/common/schemas/retro-approval.schema.json</Path> 写 approval.json：实际 source、snapshot、快照摘要、quote、confirmed_at、PLAN.md 摘要。它记录真实批准，不因字段齐全创造授权。确认涵盖 PLAN 的候选内容和归档清单；候选变化必须更新方案并重新核对批准。

execution.json 按 <Path>{roots.workflows}/specdev/common/schemas/retro-execution.schema.json</Path> 引用 PLAN 与 approval.json 摘要，status 为 applying/blocked/verified。results 每项保存实际目标、passed/failed/pending、落地摘要、`evidence/` 下原始验证输出的路径/摘要、method、observed、command 与 exit；非命令检查后二者为 null。实际命令成功 exit 必须为 0。开始前保存需要恢复的 before-image；逐项实际执行后追加结果，全部计划内项通过才 verified。

普通多文件修改不具有整体原子性。恢复先核对已经落地的目标、对应原执行证据与仍未执行的 before-image；不重复已成功动作，不按“回执缺失”推断未执行。未知或漂移只阻塞重叠写集；结果不明先人工核实并补真实记录。

## 只读校验入口

运行 <Path>{roots.workflows}/specdev/common/tools/validate-retro.mjs</Path>，不用 `validate-specdev --stage retro <change>`。

```bash
node <validator> --list --repo <project> --method-root <methods> --state-root <data-parent>
node <validator> --report <retro-id> --repo <project> --method-root <methods> --state-root <data-parent>
node <validator> --upgrade <upgrade-id> --repo <project> --method-root <methods> --state-root <data-parent>
node <validator> --upgrade <upgrade-id> --stage apply --repo <project> --method-root <methods> --state-root <data-parent>
node <validator> --upgrade <upgrade-id> --stage verified --repo <project> --method-root <methods> --state-root <data-parent>
```

`state-root` 是领域共同数据父根，其下才是 specdev，与 WorkContext 一致；安装存在时核对真实 roots，直接使用无需 CLI 初始化。默认 record 校验报告/方案；apply 校验批准与写前/恢复条件；verified 校验实际落地与执行证据。所有模式零写入、零命令执行；缺失/错误参数非零退出。

list 返回 reports 和 issues。坏报告导致非零退出并列出具体问题，同时保留独立合法报告的 ID；调用方只停止受影响输入，不能把一处错误当成没有其他候选。草稿报告可发现，但不能作为已完成升级输入。

归档门与 `archive-ready / archived / --sealed` 见 <Path>{roots.workflows}/specdev/specdev-a-archive-and-consolidate/references/retro-archive.md</Path>。输出区分 errors/warnings；schema、hash 和链接成功不代替真实授权、语义审查、验证命令运行或宿主触发观察。
