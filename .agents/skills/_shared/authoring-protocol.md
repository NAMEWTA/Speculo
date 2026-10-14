# 作者维护协议

先搜索目标入口、真实调用方、生成器与相关验证。纯文字或事实修正可直接核对局部内容；结构、行为、迁移或所有权变化才使用以下流程。

1. 确定实际改动的触发、输入、输出、owner、授权、完成与恢复边界；资产字段以对应合同为准。
2. 每次必需的短流程留在入口，只有条件分支、长示例和模板下沉。读取目标和触发条件就近说明；已读取且未变化的规则不重复加载。
3. 路径或引用变化时读 [路径规则](path-and-reference-rules.md)；职责、术语或结构变化时读 [写作质量](authoring-quality.md)；安装布局或状态归属变化时查 [项目模型](project-model.md) 的相关部分。
4. workflow 入口或指针变化时运行 `node scripts/validate-workflow-disclosure.mjs --json --changed <source-path>`，核对反向调用与生成影响。导航环和未链接候选是审查线索，不是删除授权。
5. 按 [验证选择](validation-gates.md) 运行适用检查；仅重建受影响的生成物并确认二次生成无差异。交付真实修改、行为差异、命令结果及未完成项。

## 保真

结构、行为、迁移或所有权变化前读仓库根 `template/references/writing-for-agents/references/document-contract.md`。保留真实源、软链接、模式、许可、必要元数据及用户明确的数量、工具、权限和失败语义。重构保存可恢复的编辑前内容；字符统计只用于评估重构，不推断 Token 或额度收益。
