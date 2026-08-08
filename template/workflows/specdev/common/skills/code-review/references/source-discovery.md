# Review Source Discovery

## 规范来源

按顺序查找并记录每一步结论：

1. commit message 中的 Issue/PR 引用，对应本地 `<Path>{roots.state}/specdev/changes/{change}/source.md</Path>`；
2. 调用方显式提供的 Spec、Ticket、ADR、Goal Plan 或其他路径；
3. 与分支或功能匹配的仓库 `docs/`、`specs/` 或同类规范文件；
4. 都不存在时询问规范是否确实不存在。确认不存在后规范轴标记 `skipped:no-spec`。

远程 Issue/PR 必须先由 Triage 冻结，或解析为本地不可变 SHA；review 不把可变远程正文当作唯一权威。

## 标准来源

穷尽仓库中声明代码写法的文件：适用的 AGENTS/CLAUDE、CONTRIBUTING、编码标准、lint/type/test 配置和项目生成的 standards skill。记录适用范围；工具已经机械执行的格式项不重复生成人工噪声。

## 完成标准

- 每个候选来源有 found/not-found/not-applicable 结论；
- 来源使用项目相对 Path 或 SpecDev 完整 Path；
- 不存在的规范被明确确认，不由 reviewer 猜测。
