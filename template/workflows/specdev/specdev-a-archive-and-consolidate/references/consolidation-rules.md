# Consolidation Rules

从选定 change 或独立维护的真实来源中提取、纠错和替代已声明知识；整体完成/取消不是所有条目自动毕业的证明。

## 提取来源

对选定 change 先枚举实际存在的有关产物，按候选问题读取以下来源，不要求空工件。独立维护按主题读取真实来源及有关现役条目，无须创建 change：

1. Evidence 与 Goal Plan — 交付边界、验证证据和残余风险
2. <Path>{roots.state}/specdev/changes/{change}/ADR.md</Path> — 架构决策记录
3. <Path>{roots.state}/specdev/changes/{change}/LOG.md</Path> — 设计决策日志（可能含未正式记录的 ADR）
4. <Path>{roots.state}/specdev/changes/{change}/CONTEXT.md</Path> — 项目规范术语
5. Change DESIGN — 本 change 唯一视觉与交互合同；以规则 ID 去重，原型与 Evidence 只提供佐证
6. diagnosis、reviews、prototypes、questionnaires 和任何 workflow 自定义知识产物

## Store 映射与合并策略

新对象命名使用 `YYYY-MM-DD-topic[-NN]`，已有历史名称保持不变；change 使用本次固定候选。

### adr/（架构决策记录目录）

- **提取条件**：有持续决策价值，保留真实理由、备选、后果、负向保证与恢复义务；不可逆/令人意外/真实权衡是线索，不要求同时满足。
- **名称分配**：实际创建时按日期/主题选择未占用名称，必要时加 `-NN`，不创建编号注册中心。
- **文件命名**：`<Path>{roots.state}/specdev/adr/{date}-{topic}[-NN].md</Path>`。
- **内容格式**：标题、状态（Accepted）、日期、决策上下文、决策内容、后果。
- **Supersede 处理**：若新 ADR 取代旧 ADR，在旧 ADR 开头添加 Superseded by 与新 ADR 的完整指针 `<Path>{roots.state}/specdev/adr/{date}-{topic}[-NN].md</Path>`；不删除旧 ADR。
- **从 LOG 提升**：<Path>{roots.state}/specdev/changes/{change}/LOG.md</Path> 中满足 ADR 标准且尚未写入 <Path>{roots.state}/specdev/changes/{change}/ADR.md</Path> 的决策 → 创建正式 ADR，注明"从 <Path>{roots.state}/specdev/changes/{change}/LOG.md</Path> 提升"；已有 change ADR 时只评估该唯一候选，不重复生成。

### context/（领域术语、项目规则与经验）

- **提取条件**：项目特有领域术语、稳定规则、可复用经验或错误模式；通用编程常识、单次未证实猜测不提升。
- **合并方式**：将新术语合并到 `context/` 目录下的现有术语文件中。若目录为空，创建首个术语文件。
- **术语条目格式**：遵循 `**术语名**：定义` + `_Avoid_: 同义词` 格式。
- **冲突检测**：若术语已在 context/ 中存在定义，比较两者：
  - 一致 → 跳过（记录"已存在"）
  - 不同 → 标记 `needs-confirmation`，展示两个版本
- **保留现有**：已有的 `_Avoid_` 标注和术语分组不覆盖。
- **术语更名**：若新术语取代旧术语，在旧术语的 `_Avoid_` 中保留旧名称，创建新术语条目。

经验/错误模式按主题使用 <Path>{roots.state}/specdev/context/{date}-{topic}[-NN].md</Path>，记录类型（lesson/error-pattern）、适用条件、触发信号、处理方法、验证及来源 RETRO/F-ID/E-ID；同主题优先更新已有条目。context/INDEX.md 记录稳定条目、类型、主题、适用范围与来源索引，条目和索引都须在获批写集中。缺索引不默认整读知识树，可先按文件/关键词定位；创建后每次仅检索命中行。

错误经验不写成全局无条件禁令；成功经验保留适用边界，机械规则交自动检查。索引是导航，正文与来源是知识权威；不另建 ERROR store。引用报告归档后按稳定 ID 在现役/archive 中唯一解析。

### design/（仅已声明的 SpecDev 项目设计知识）

按 `<Path>{roots.workflows}/specdev/specdev-a-archive-and-consolidate/references/design-knowledge-gateway.md</Path>` 进行规则级毕业、冲突确认与发布。稳定 tokens、组件约束、跨页面交互模式可以毕业；单次页面、未落地候选、临时实验不提升。每条 implemented 规则必须有可定位实现证据，completed 状态本身不够。

DESIGN.md 是唯一 current，revisions 不可变，INDEX 可重建。首次不存在时只由该网关按已批准计划 lazy 创建；本 Work 的通用合并步骤不 append、覆盖、清理 revision，也不将新规范写回已归档 change。

### 其他知识 store（若领域声明）

若领域 Skill/manifest 持久化约定声明了 `adr/`、`context/` 和上述专有网关以外的知识 store：

- **提取条件**：按知识类型匹配最合适的 store。
- **合并方式**：按已声明的 store 格式与网关处理；未声明写法只提出候选，不猜测 append 权限。
- **冲突处理**：与已有内容矛盾 → 标记 `needs-confirmation`。
- **未声明则跳过**：不向领域持久化约定未声明的路径写入。

## 保护规则

- **不盲覆盖**：按具体批准原地纠错、merge 或后继替代，保留 before-image；不是每次只许 append 使错误长期存在。
- **目录 store（adr/、context/）**：首次写入时若目录不存在则自动创建。
- **不创建未声明 store**：只写入领域 Skill/manifest 持久化约定声明的 store。
- **来源溯源**：所有合并内容保留真实来源和日期；有 change 时使用其稳定名称，独立维护使用原材料、决定或会话证据，不虚构 change 来源。
- **禁止跨 workflow**：合并范围限定于当前 workflow 声明的 stores。

## Store 创建策略

仅在领域已声明并允许创建时：

| store | 行为 |
|-------|------|
| `adr/` | 首次写入时自动创建目录 |
| `context/` | 首次写入时自动创建目录 |
| SpecDev `design/` | 只由 A 设计网关按具体批准 lazy 创建 |
| 其他已声明 store | 若不存在则跳过并警告；不自动创建 |

## 完成标准

- 每个选定 change 的有关知识产物，或独立维护固定主题的来源，均有分类结论。
- 每个提取候选项已评定毕业状态和目标 store。
- 冲突项已标记 `needs-confirmation` 并提供双方版本。
- 合并计划中每项都有真实来源、目标 store、动作和判定理由；已有条目的纠错、替代或删除还须满足下节及 cleanup 的保真要求。


## 完整替代、部分替代和历史

小纠错原地更新现役条目；真实决策反转创建后继 ADR 并说明替代范围。完整替代须逐项证明全部有效内容已承接或失效，旧记录保留独有理由、被拒方案、负向保证、验证与恢复义务。部分替代只退出已承接部分，剩余约束继续现役并保留双向引用，不能仅加 superseded 布尔值或整组归档。

context 实质含义变化记录后继与适用范围；旧数据/兼容消费者尚在时保留所需解释。docs 当前参考原地更新，只有退役协议、事故或旧数据说明有独立价值才建历史快照。现役退出可在具体授权后移到各自 archive，冻结历史不做格式整理、翻译或重命名。没有历史依据不能由当前代码编造“当初为了什么放弃什么”。
