# 停止规则

停止看证据，不看「还能不能再问出新问题」。

## 完成即停

当范围内格子全部为 `covered`、`deferred(reason)` 或 `covered-by-parent`，且每个 chain 节点有 L 合同 Lesson，且每节新课或改写课有对应 probe，且 `goal/verify.md` 已写，则 Goal 完成。

## 过程即停（任一即停）

- 本波没有矩阵格子发生变化
- 已达到 `wave_cap` 或 `max_waves`
- 用户暂停
- 缺源码、缺 baseline，或目标主要是无法核对的生成物
- 所有权冲突或路径越界

## 不算完成

- 课写完
- 文件巡览结束
- 模型表示「已经理解」
- 主观百分比
