# Coverage Matrix: <主题>

状态只允许：`uncovered` | `covered` | `deferred(reason)` | `covered-by-parent`。

默认档：架构/数据流 = Relational；范围内函数/方法 = Unistructural + explained。

## (c) 业务架构

| 单元 | 类型 | 状态 | 证据 | 备注 |
| --- | --- | --- | --- | --- |
| <系统 Context> | Context | uncovered |  |  |
| <容器 A> | Container | uncovered |  |  |

## (d) 数据流

| 路径 | 源 → 汇 | 状态 | 证据 | 备注 |
| --- | --- | --- | --- | --- |
| 主路径 | <input> → <store> | uncovered |  |  |
| 失败路径 | <input> → <error> | uncovered |  |  |

## (a) 函数目的

| 符号 | 模块 | 状态 | 证据 | 备注 |
| --- | --- | --- | --- | --- |
| <exportedFn> | <module> | uncovered |  |  |
| <helper> | <module> | covered-by-parent |  | 由父模块课覆盖 |

## (b) 方法性状

| 符号 | 性状 | 状态 | 证据 | 备注 |
| --- | --- | --- | --- | --- |
| <exportedFn> | 副作用/失败路径 | uncovered |  |  |

## 闭合统计

- in-scope 格子总数：
- covered：
- deferred：
- covered-by-parent：
- uncovered：
