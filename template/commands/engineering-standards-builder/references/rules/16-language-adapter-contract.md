# 语言适配器与 Fallback

Builder 内置语言/框架 references 是发现和审计检查清单。它们帮助识别公共 API、类型/错误/资源、并发、测试、工具链和版本风险，但不能覆盖项目代码、模板、配置与用户决定。

只读取 Project Inventory 和源码证据命中的适配器。一个依赖、一种扩展名或根目录 manifest 不能让规则扩散到所有模块。

## 未内置语言

遇到 Python、Kotlin、C#、C/C++ 或其他未内置语言时：

1. 从项目代码、配置、测试和 CI 提取真实规范；
2. 保留现有目录、公开边界和成熟惯例；
3. 引用真实 formatter、lint、test 和 build 命令；
4. 对缺乏证据的语言细节省略或标记 `pending-decision`；
5. 不套用 TypeScript、Java、Go 或 Rust 模式；
6. 只有需要让 Builder 本身长期识别该生态时，才扩展语言适配器与 fixture。

无内置适配器不阻止生成项目专属 Skill。项目证据优先于 Builder 覆盖范围。
