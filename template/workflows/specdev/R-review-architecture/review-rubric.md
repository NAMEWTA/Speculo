# 架构审查准则

本准则只在 `<Path>{roots.workflows}/specdev/R-review-architecture/R-review-architecture.md</Path>` 激活时生效。它把热核级维护性标准转成候选筛选和排序规则。

使用 `<Path>{roots.workflows}/specdev/common/rules/codebase-design.md</Path>` 的术语：module、interface、depth、seam、adapter、leverage、locality。描述架构时不要滑向更弱的替代词。

## 重点观察

优先寻找有真实代码压力的候选：

- 结构性回退：module 变浅，interface 正在向 implementation 膨胀；
- 代码 judo 机会：删掉一个 branch、helper、wrapper、mode 或 special case；
- spaghetti growth：ad-hoc conditionals、散落例外或一次性 flags；
- boundary drift：cast、`any`、`unknown` 或 optionality 掩盖真实不变量；
- 文件大小或拆分压力，尤其是把文件推到 1k lines 以上；
- wrong-layer logic 泄漏进共享路径或 canonical helper；
- 重复的 canonical helper、identity abstraction 或 pass-through wrapper；
- 原本可以更原子化的顺序编排或部分更新；
- seam 正在把测试、错误或状态处理复杂性泄漏给调用方。

## 删除测试

只有删除当前 module、helper 或 branch 后，复杂性真的消失，或者至少集中到更容易推理的位置，候选才算成立。

拒绝以下候选：

- 只是重新摆放复杂性；
- 只是改名；
- 只是把一个 shallow module 换成另一个 shallow module；
- 只是加一个 thin wrapper、adapter 或 identity abstraction，却没有换来 leverage；
- 依赖 speculative generality，而不是当前真实压力；
- 没有文件、调用点或测试证据。

## 排序规则

按严重度和代码压力排序：

1. 结构性阻塞；
2. 明显的代码 judo；
3. 重复 special case 和 spaghetti growth；
4. boundary 与 type contract 漂移；
5. 文件大小和拆分压力；
6. wrong-layer logic 和 canonical helper 重复；
7. 低信号的可读性问题。

## 文件大小规则

不要让一个候选轻易把文件从 1k lines 以下推到 1k lines 以上。默认把它当成拆分压力，而不是通过项。

## 报告门槛

不要把报告写成杂音集合。只保留高置信 finding。若没有候选通过门槛，就直接写 `无高置信候选`，不要硬造一个来填模板。
