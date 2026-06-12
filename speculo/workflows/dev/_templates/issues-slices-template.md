> **服务工作流：** `../I-to-issues/I-to-issues.md`
> **产物文件名：** `slices.md`

# Vertical Slices

> 本文件融合了 roadmap 的 scope/architecture/phases/cross-cutting/dependency 五段结构与垂直切片标记。
> 每个切片有 `<phase id="...">` 标识，供 TDD 工作流直接引用。

## 0. 一句话战略
[TODO: 单句概括：做什么 + 为什么 + 怎么做到（新建/复用/以现有系统为基底）。]

## 1. 范围边界（IN / REUSE / OUT）
[TODO: 三列表格。]
| | 内容 |
|---|---|
| **IN 必造** | [TODO: 本次必造的新能力] |
| **REUSE 复用现有** | [TODO: 复用不改动的现有能力] |
| **OUT 本期不做** | [TODO: 留给后续迭代的内容] |

## 2. 架构上下文
[TODO: 涉及的模块与职责分工、新增模块定位、不可逾越约束。单文件修复可省略本节。]

## 3. 切片

### 切片 1 · [切片名称]
<phase id="[phase-id]" status="未开始"><!-- 未开始 → 已实现(dev/03) → 已验证(dev/04) --></phase>

- **类型：** AFK | HITL
- **阻塞于：** 无
- **覆盖：** [TODO: PRD 章节 / US 编号 / 用户故事]
- **交付物：** [TODO: 具体文件/模块/功能]
- **复用：** [TODO: 复用哪些现有能力]
- **验收切片：** [TODO: 可独立执行的验证命令或步骤]
- **对齐：** [TODO: PRD FR-xxx 或 issue 引用]
- **ADR 引用：** [TODO: 关联的 ADR 编号，可选]

### 切片 2 · [切片名称]
<phase id="[phase-id]" status="未开始"><!-- 未开始 → 已实现(dev/03) → 已验证(dev/04) --></phase>

- **类型：** AFK | HITL
- **阻塞于：** 切片 1
- **覆盖：** [TODO]
- **交付物：** [TODO]
- **复用：** [TODO]
- **验收切片：** [TODO]
- **对齐：** [TODO]
- **ADR 引用：** [TODO]

[TODO: 按需增加更多切片，每个有独立的 phase id]

## 4. 横切关注点
[TODO: 跨切片一致的规则与约束。]

## 5. 依赖顺序速查
```
[TODO: ASCII 依赖链，如:
P0  phase0-xxx  切片名称  ← 不可回退,最先
P1  phase1-xxx  切片名称  依赖 P0
]
```

## 用户确认
[TODO: 记录用户对粒度、依赖、HITL/AFK 标记、phase id 和发布策略的确认。]

## 发布记录
[TODO: 若发布到外部 issue tracker，记录 issue 引用；否则写明 local-only。]
