# 停止规则

停止看证据，不看「还能不能再问出新问题」。

## 完成即停

当范围内格子全部为 `covered`、`deferred(reason)` 或 `covered-by-parent`，且每个 chain 节点有 L 合同 Lesson，且每节新课或改写课有对应 probe（每课 ≤10 问），且 `goal/verify.md` 已写，则 Goal 完成。

## 过程即停（任一即停）

- 本 mine unit 没有矩阵格子发生变化
- 出现第 11 问，或 `GP-*-b03.md`
- 交错 L/mine（阶段 T 完成前启动 miner，或 `L → mine → L`）
- miner 写入 `lessons/` 或 matrix
- 同一 mine unit 规划或扇出超过 15 节
- 用户暂停
- 缺源码、缺 baseline，或目标主要是无法核对的生成物
- 所有权冲突或路径越界
- split depth=2 后仍不清：`defer(needs-replan)`，写 verify 草稿，回到 G-goal `replan`

## 不算完成

- 课写完
- 文件巡览结束
- 模型表示「已经理解」
- 主观百分比
- 阶段 T 结束但尚未 mine
