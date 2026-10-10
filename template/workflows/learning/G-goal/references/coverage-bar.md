# 覆盖尺（v1 编程）

v1 只实现编程四轴。其他领域可同构为 units / properties / structure / flow，但不在 v1 生成完整矩阵。

## 四轴

| 轴 | 对象 | 默认 SOLO | 证据 |
| --- | --- | --- | --- |
| (a) 函数目的 | 范围内公开/领域函数 | Unistructural + explained | Lesson 函数表或父课 covered-by-parent |
| (b) 方法性状 | 公开 API 与枢纽内部方法 | Unistructural + explained | 副作用、失败路径、幂等、并发、纯/不纯 |
| (c) 业务架构 | 系统与容器 | Relational | C4 Context + Container + 关键 Component 的 ASCII |
| (d) 数据流 | 主路径与失败路径 | Relational | 源 → 变换 → 汇 + 存储点 + 所有权 |

## 范围规则

- 「每一个函数」= 范围内公开/领域函数，不是仓库里每一个私有 one-liner
- helper / 生成代码 / 测试夹具：`covered-by-parent` 或 `deferred(reason)`
- Code 层不手维护过期清单；从源码生成库存，按模块归组
- Extended Abstract 不是完成条件
- 不改变矩阵格子的 Lesson 或 probe 不要写

## Wave（内容分组，不是挖掘门）

- Wave 1：Context + Container + 主数据流
- Wave 2：范围内 Code / 方法性状
- Wave 只按覆盖轴分组，不决定何时挖，也不是并发授权
- 默认最多 2 波
- 3 课的波不必撑到 15；单波若超过 15，只把挖掘切开，不把覆盖波扩成配额

## 挖掘扇出

挖掘扇出上界是 `mine_unit_cap=15`，不是必须凑满。4 节的小项目按 4 节挖。切分规则读 `<Path>{roots.workflows}/learning/G-goal/references/mine-unit.md</Path>`。

## 盲区发现与实际处置

授课、miner 和覆盖验收读取 `<Path>{roots.workflows}/learning/common/rules/inquiry-depth-policy.md</Path>`；生产相关代码还读取 `<Path>{roots.workflows}/learning/common/rules/production-inquiry.md</Path>`。将相关发现映射回上述矩阵格子，记录遗漏原因、影响、源码证据和验证设计；不把假设情境写成已发生事故。共享方法不增加问题配额，不改变十问后拆课、unit 上限或计划/执行授权边界。
