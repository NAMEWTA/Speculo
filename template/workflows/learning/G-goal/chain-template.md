# Chain: <主题>

本文件是 Goal 的课程序列投影，不是 C-consolidate，不搬迁 Change。权威 OBJ 仍在 `course.md`。mine unit 切分写在本文件 Units 表，不要另造权威文件。

## DAG

```text
L-001 → L-002
```

## Lessons

| ID | 标题 | OBJ | 覆盖格子 | 前置 | 估时 | 将写入 | 状态 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| L-001 | <系统地图> | OBJ-01 | C:context, D:happy-path | — | 35 | `lessons/L-001-<slug>.md` | planned |

状态：`planned` | `writing` | `written` | `mined` | `split_proposed` | `split` | `revised` | `deferred`。

## Units

| unit_id | Lessons | 上限 | 状态 |
| --- | --- | --- | --- |
| U1 | L-001 | ≤15 | planned |

任何 unit 课数不得超过 15。15 是上界，不是配额。小项目允许远小于 15。一课不得同时属于两个 unit。前置课尚未 `written` / `mined` / `revised` 的课，不得提前塞进当前单元。

## Waves

| Wave | 焦点 | Lessons | 分组尺 | Gate |
| --- | --- | --- | --- | --- |
| 1 | C4 Context + Container + 主数据流 | L-001 | 架构与数据流 | G1/G2/G3 |
| 2 | 范围内公开 API 与方法性状 |  | 公开 API | G1/G2/G3 |

Wave 是覆盖尺上的内容分组，不是挖掘门，也不是并发授权。不改变任何覆盖格子的节点不要写入本表。
