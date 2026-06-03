# Slice Loop Phase

## 输入

- `tdd-plan.md`
- `slices.md` 或用户确认的切片顺序
- `03-tdd.md` 中的内置 TDD 指引和同目录辅助文档

## 产物

- `.speculo/dev/<change>/implementation-log.md`，由 `../_templates/tdd-log-template.md` 填写
- 可选：`tasks/00-INDEX.md` 与 `tasks/TNN.md`，由 workflow 自治创建

## 填写引导

1. 每次只选择一个切片和一个行为。
2. RED：写一个通过公共接口验证行为的失败测试。
3. GREEN：写最少实现使当前测试通过。
4. REFACTOR：只在绿色状态下整理设计。
5. 每轮记录测试名、失败信号、实现摘要、重构摘要和验证命令。
6. 每轮检查：测试描述行为而非实现；测试只使用公共接口；测试能经受内部重构；代码是当前测试的最少实现；没有添加推测性功能。

## 边界

- 不预实现未来切片。
- 不使用内部实现细节作为主要断言。
- 不在 RED 状态下重构。

## 完成准则

- 每个完成切片都有 RED/GREEN/REFACTOR 记录
- `implementation-log.md` 无残留 `[TODO:]`
- `.status.json` 已追加 `red_green_refactor_cycles`
