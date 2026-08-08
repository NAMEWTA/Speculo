# Fowler Smell Baseline

以下条目是标准轴最低启发式，不是硬性违规；仓库明确允许时抑制，工具链已覆盖时不重复报告：

- **Mysterious Name**：名称不能揭示职责或数据含义；重命名，无法诚实命名时重新审视设计。
- **Duplicated Code**：同一知识形态出现在多个代码块；提取单一权威实现。
- **Feature Envy**：方法主要操作另一个对象的数据；把行为移动到数据 owner。
- **Data Clumps**：一组字段/参数反复同行；形成有语义的类型。
- **Primitive Obsession**：基本类型代替领域概念；引入小型领域类型。
- **Repeated Switches**：同一分类判断重复出现；集中映射或使用多态。
- **Shotgun Surgery**：一个逻辑变化迫使分散修改多个文件；汇聚共同变化知识。
- **Divergent Change**：同一模块因多个无关理由变化；按职责拆分。
- **Speculative Generality**：为规范未要求的未来需求增加抽象；删除并内联到真实需求出现。
- **Message Chains**：调用者依赖长导航链；由第一个对象隐藏导航。
- **Middle Man**：模块大部分只做转发；删除无价值中间层。
- **Refused Bequest**：继承者拒绝大部分合同；使用组合或重建接口。

每个命中写为“可能的 <Smell>”，引用代码块并解释为什么在当前 diff 中构成风险。
