# Architecture Scan Phase — 探索深化候选

## 输入

- 当前 git 仓库与待改进的代码区域
- `speculo/.speculo/.config/context/CONTEXT.md`、触及区域的 `speculo/.speculo/.config/adr/` ADR
- 设计词汇单一事实源 `../../../vendor/codebase-design/SKILL.md`、`DEEPENING.md`

## 产物

- `speculo/.speculo/dev/<change>/architecture-candidates.md`

## 核心原则（引用 codebase-design）

- **删除测试**：对任何疑似浅的模块，想象删除它——复杂性会集中（好信号）还是只是移动？
- **深度是接口的属性**：小接口 + 大量实现；深化 = 缩小接口、把复杂性吸收进实现。
- **接缝纪律**：一个适配器 = 假设接缝，两个 = 真实接缝。
- 完整原则见 `../../../vendor/codebase-design/SKILL.md` 与 `DEEPENING.md`，本 phase 不复制。

## 填写引导

1. 先读 `speculo/.speculo/.config/context/CONTEXT.md` 与触及区域的 `.config/adr/`。
2. 用 Agent 工具（`subagent_type=Explore`）遍历代码库，注意摩擦：理解一个概念要在许多小模块间跳转？模块浅？纯函数仅为可测试性而提取？紧耦合泄漏？难以通过当前接口测试？
3. 对每个疑似浅模块应用**删除测试**，保留「删除会集中复杂性」的候选。
4. 每个候选记录：**涉及文件**、**问题**、**解决方案**、**收益**（局部性 / 杠杆 / 测试改善）、**依赖类别**（进程内 / 本地可替换 / 端口与适配器 / mock）、**推荐强度**（强烈 / 值得探索 / 推测性）。
5. 与现有 ADR 冲突的候选，仅在摩擦真实到值得重审 ADR 时保留，并显式标注。

## 边界

- 本 phase 不写 HTML 报告、不做接口设计。
- 候选均用 codebase-design 词汇命名，不散用「组件 / 服务 / 边界」。

## 完成准则

- 每个候选含文件、问题、解决方案、收益、依赖类别、推荐强度
- `architecture-candidates.md` 无残留 `[TODO:]`
- `.status.json` 写入 `candidate_count`，置 `architecture_status: scanning`
