# 按需 Skill 与必需方法

用于 T 规划、P 调度与 I 执行。Skill 是知识和方法，不等于一个 Agent。主 Agent 按当前任务读取适用内容；不要求事前枚举、哈希全部 Skill，也不要求为了普通发现创建配置或暂停 Ticket。

## 先区分义务与知识

- 用户、项目安全/权限规则或验收合同指定的方法是**必需方法**。在原 Ticket 的 `skill_bindings` 固定真实 `id`、Path `path`、`sha256`、`phase`、`operation`、`inputs`、`outputs`、`required: true` 和 `on_failure: block-ticket`。相关参考按触发条件固定 `path/sha256/when`。不可把已知义务重新标记可选来通过完成门。
- 普通可选 Skill 是执行中可发现的知识。无需预绑定；如需要导航，可只写 `id/path/required: false`。可记录条件、摘要和实际使用，但旧摘要或可选源消失不阻塞无关工作。可选项不能自行引入完成硬门。
- `skill_scan` 只在实际研究有价值时记录，不是每票 Ready 必填。Map 的项目 Skill 矩阵可省略，是导航而非 allowlist；仅 Purpose 以 `required:` 或 `必需：` 开头的条目表达上游必需方法，须在相关 Ready Ticket 保持 required 绑定。Ticket 的已知必需方法不因 Map 省略而失效。

## 发现与使用

先按项目指令和当前 scope、路径、技术域、风险定位相关入口。读取命中 Skill 和当前分支参考；执行中发现新的可选方法可直接使用，并把实际方法与相关产物记录到原 Evidence，不先修改 Map 或重新申请整个计划。

使用前核对路径、真实源和授权：项目相对 Path，不越界软链接、不以 node_modules/插件缓存充当项目维护源，不假装拥有不存在的宿主能力。仓库外技能需已有源域授权；可选提示的结构通过不是源路径或实际调用的认证。

只有新方法改变权限、范围、外部行为、依赖或验收时，按 deviation-control 重新确认受影响部分。必需方法缺失、ID 不符或源/相关参考漂移时，暂停对应 Ticket 和依赖闭包，由 Lead 检查变更并更新原绑定；不暂停独立分支，不自动接受最新文件，不改写历史已完成 Evidence。

## 完成证据

实际使用技能步骤或宿主调用，保留输入定位、操作、输出与可回读工具证据。“读过”、展示 `@skill` 或复制入口不是完成。

存在必需绑定时，在本票 `<Path>{roots.state}/specdev/changes/{change}/evidence/{ticket-id}.md</Path>` 的 `## Skill Execution Records` 后记录 JSON 数组。每个必需项须有唯一 `id/phase/operation/sha256/status: passed/evidence`，其中 evidence 为非空定位数组。可选方法只记录实际有助验收的信息，无需制造未使用条目。校验器检查合同和摘要，Lead 仍负责实际过程与 AC 验证。

绑定示例（需替换为真实项目源）：

```json
{"id":"project-test","path":"<Path>.agents/skills/project-test/SKILL.md</Path>","sha256":"<真实64位摘要>","phase":"verify","operation":"run-regression","inputs":["当前Ticket与定向diff"],"outputs":["验收Evidence"],"required":true,"on_failure":"block-ticket"}
```

SpecDev 自带 Work 方法按各自入口读取，不伪装为项目 Skill。数组对象使用单行 JSON。
