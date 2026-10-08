# 领域建模规则

本规则只规范当前 change 内的候选领域知识。G 和 A 的 consolidate-from-code 模式都可以用它整理 change 工件，但它不授权写入永久 namespace；永久知识只能由 `<Path>{roots.workflows}/specdev/A-archive-and-consolidate/A-archive-and-consolidate.md</Path>` 在完成证据、毕业评估和用户确认全部通过后提升。

- 当前 change 的 CONTEXT 只保存已确认、供本 change 下游使用的项目规范语言，不保存普通编程概念、代码导航、一次性状态或讨论历史。
- 每个术语使用规范名称和 1–2 句定义；不推荐的同义词写入 `_Avoid_`。
- 一词多义必须拆分；多个 bounded context 使用独立 Context Map 描述关系，不把关系塞进术语定义。
- 讨论、替代和历史只留在 LOG；稳定行为进入 Spec；符合准入条件的取舍写入当前 change 的 ADR，`accepted` 只表示已成为本 change 的下游合同。
- 当前代码位置按需从仓库发现。只有发现成本被证明很高时，另建有 owner 和刷新策略的缓存工件，CONTEXT 不承担该职责。
- G 只读永久 `<Path>{roots.state}/specdev/context/</Path>` 与 `<Path>{roots.state}/specdev/adr/</Path>`，用于发现冲突和避免重复；不得创建、合并或改写其中内容。

完成标准：每个 change CONTEXT 条目都是本 change 下游必须使用的项目规范语言；每个 change ADR 都有明确来源和当前 change 的适用范围；没有把候选结论写成永久知识。
