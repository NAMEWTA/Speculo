# 场景路由协议

选择主模式的目标是控制上下文和分析顺序，不是把复杂请求强行归为单一类别。

## 1. 主模式判定

| 模式 | 典型信号 | 主要输出 |
|---|---|---|
| `bug` | 报错、异常、错误结果、性能退化、事故、根因 | 现象—机制—证据—根因候选—修复原则的认知地图 |
| `codebase` | 仓库、源码、模块、启动流程、调用链、开源项目 | 项目全貌、架构、入口、核心链路、关键代码与阅读地图 |
| `requirements` | 需求、业务流程、技术方案、技术选型、可行性 | 问题定义、约束、候选方案、推荐与反转条件 |
| `architecture` | 系统边界、架构设计、高可用、扩展性、一致性、评审 | 驱动因素、结构与数据流、质量属性、故障模型和架构取舍 |
| `domain-learning` | 陌生概念、新技术、新行业、原理学习、技术地图 | 知识地图、核心机制、术语关系、技术生态与常见误区 |

## 2. 混合模式

混合请求先识别“当前阻止用户继续判断的主要未知”。按依赖顺序处理，例如：

- Bug + 源码：先建立最短故障链，再补相关模块结构；
- 需求 + 架构：先明确业务目标与质量属性，再比较架构；
- 新领域 + 技术选型：先建立概念和约束，再做产品或技术比较；
- 源码 + 二次开发方案：先理解现有扩展点，再讨论方案；
- 架构 + Bug：若事故正在发生，先解释故障机制；若是长期治理，先明确架构压力。

在主产物记录：

- `primary_mode`；
- `secondary_modes`；
- `mode_order`；
- 每个模式的进入条件与退出条件。

## 3. 不应由本 Work 独立承担的情况

- 必须运行实验、测试或插桩才能继续定位：移交 `<Path>{roots.workflows}/specdev/D-diagnose-bugs/D-diagnose-bugs.md</Path>`；
- 调查面过大、需多 Agent 或并行领取未知项：移交 `<Path>{roots.workflows}/specdev/W-wayfinder/W-wayfinder.md</Path>`；
- 需要正式锁定产品行为和验收：移交 `<Path>{roots.workflows}/specdev/S-spec/S-spec.md</Path>`；
- 需要正式架构候选接受与 ADR 同步：移交 `<Path>{roots.workflows}/specdev/R-review-architecture/R-review-architecture.md</Path>` 或 `<Path>{roots.workflows}/specdev/G-grill-with-docs/G-grill-with-docs.md</Path>`；
- 用户要求实施、修复或提交：本 Work 先完成解释与边界说明，再按治理路线移交，不自行执行。

## 4. 路由变更

新证据改变主问题时可以切换模式，但必须：

1. 在 MLOG 记录旧模式为何不足；
2. 标记旧结论仍有效、被限制或被替代的部分；
3. 更新 frontmatter 的模式与阶段；
4. 不重复加载无关专项协议。
