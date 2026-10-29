# 挖掘单元（mine unit）

覆盖波次（Wave 1 架构 / Wave 2 API）描述「学什么」，不单独决定「何时挖」。真正启动挖掘的单位叫 **mine unit**。

## Frontmatter

```yaml
mine_unit: project          # 按项目切分，不再写死 wave | goal
mine_unit_cap: 15           # 硬顶
learning_agent_limit: 4     # 默认并行度；硬顶 min(4, 本单元课数, 宿主能力)
```

`wave_cap` 不再当作挖掘门。Wave 只保留为覆盖尺上的内容分组。

## 怎么切

plan 阶段做编程库存之后，用下面规则切 mine unit（写入 `goal/chain.md` 的 Units 表，不要另造权威文件）：

1. 先按覆盖波分组：Wave 1 = C4 Context + Container + 主/失败数据流；Wave 2 = 范围内公开 API 与方法性状。
2. 再按模块 / 容器切课。琐碎 helper、生成代码、测试夹具标 `covered-by-parent` 或 `deferred`，不为它们开课。
3. 把课按依赖序装进 mine unit：
   - 同一单元内课数 ≤ 15。
   - 尽量不把有前置依赖的课和它的前置拆到两个尚未挖掘的单元里；若必须拆，后一单元的 T 要等前一单元 D 结束（或至少等前置课 `mined` / `revised`）。
   - 一课不得同时属于两个 unit。
   - 前置课尚未 `written` / `mined` / `revised` 的课，不得提前塞进当前单元。
4. plan 时将估算课数写入 chain：≤15 节为一个单元；>15 节按模块/容器分成连续单元，每个 `mine_unit_cap=15`。15 是上界，不是配额；不灌水开课。

Wave 只按覆盖轴分组；即使单波超过 15 节，也要拆成多个 mine unit，不改变覆盖波。例：6 节为一个单元；18 节可分为 10+8。挖掘受 `learning_agent_limit` 限制，默认同时 4 个，其余排队。单容器公开 API 超过 15 课时，plan 应拆课或 defer 部分范围，不塞入同一单元。

## `/goal` 循环

当前 mine unit：阶段 T 写完全部 L → 阶段 M 按课 mine → 阶段 D Lead 处置 → 下一 unit。禁止 `L → mine → L → mine` 交错。当前 mine unit 课数不得超过 15。超过则停止，回到 G-goal `replan` 重新切单元。
