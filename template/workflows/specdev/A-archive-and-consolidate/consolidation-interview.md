# 代码库沉淀访谈协议

本协议由 `<Path>{roots.workflows}/specdev/A-archive-and-consolidate/A-archive-and-consolidate.md</Path>` 的 consolidate-from-code 模式使用，遵循 `<Path>{roots.workflows}/specdev/common/rules/artifact-contract.md</Path>` 与 `<Path>{roots.workflows}/specdev/common/rules/planning-principles.md</Path>`。

目标不是设计新功能，而是**以当前代码库为基本事实**，把散落在代码里的领域语义与架构决策访谈出来、固化为永久知识。区别于 `<Path>{roots.workflows}/specdev/G-grill-with-docs/G-grill-with-docs.md</Path>`（实现前打磨方案），本协议描述的是**系统当前已经如此**的真相。

## 1. 基本事实优先

- 一切结论以当前代码、配置、接口、schema、测试和经验证文档为准。
- 提问前先只读探索相关实现，能从代码回答的事实不得转交用户；只有语义命名、边界取舍、不变量意图、历史缘由这类代码无法自证的事项才升级为访谈问题。
- 涉及不熟悉的外部技术、第三方 API、标准或版本行为时，调用 `<Path>{roots.workflows}/specdev/common/skills/research/SKILL.md</Path>`，把来源与置信度写入当前 change 的 LOG。
- 若无相关 change 参考，直接以代码为事实开始访谈，不因缺少历史 change 而阻塞。

## 2. 决策树

按“哪些永久知识当前缺失或过时”驱动，不机械提问：

1. 领域边界与限界上下文：系统由哪些领域构成，各自职责与边界；
2. 规范术语与语义：代码中的类型/模块名对应什么业务概念，别名与禁用词；
3. Context Map：多个 bounded context 之间需要明确的关系；
4. 已固化的架构决策：现有代码体现了哪些难逆转、令人意外且来自真实权衡的决定；
5. 历史缘由：为什么当前这样，哪些是有意决策、哪些只是可从代码即时发现的实现事实。

## 3. 每轮只关闭一个关键结论

每轮格式：

1. **代码事实：** 简述从代码/测试读到的证据，带 `CODE:<Path>project/relative/path</Path>` 指针；
2. **唯一问题：** 不使用复合问题；
3. **可行解读：** 只列实质不同的语义/决策解读；
4. **权衡：** 不同解读对术语一致性、架构约束、下游影响的差异；
5. **推荐：** 给出基于代码最可能的默认解读及理由；
6. **用户结论：** confirmed / deferred / rejected；
7. **落盘：** 立即更新当前 change 的 LOG，并按需更新 CONTEXT 或 ADR。

## 4. 记录与格式

change 内三份文档复用 grill 的既有格式，避免重复发明：

- 设计日志：`<Path>{roots.workflows}/specdev/G-grill-with-docs/log-format.md</Path>`；
- 领域上下文：`<Path>{roots.workflows}/specdev/G-grill-with-docs/context-format.md</Path>`；
- 架构决策：`<Path>{roots.workflows}/specdev/G-grill-with-docs/adr-format.md</Path>`；
- 领域建模规则：`<Path>{roots.workflows}/specdev/G-grill-with-docs/domain-modeling-rules.md</Path>`。

同步顺序固定：先 LOG，再 CONTEXT，最后 ADR。CONTEXT 只描述当前真相，历史轨迹留在 LOG；未确认的解读不得写成已接受 ADR；与现有永久 ADR 冲突时建立 supersedes 链，不重写历史。高影响条目带来源标识（`USER-DECISION`、`CODE:`、`RESEARCH:`、`ADR-###`）。

## 5. 停止条件

- 目标主题的规范术语、Context Map 与符合准入条件的架构决策已覆盖，足以提升为永久知识；或
- 用户明确延后，且该延后不伪装成已确认真相；或
- 缺少必要外部信息或权限，change 标 blocked；或
- 继续提问只会产生低影响或纯实现细节，交给对应实现阶段决定。

停止后交回入口 §3，进入知识提升评估。未获代码或实际行为验证的结论一律不提升，只留在 change 内。
