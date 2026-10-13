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
4. 估算课数在 plan 时写进 chain。`/goal` 不得为了凑单元而加灌水课，也不得把已规划的第 16 节塞进当前单元。

规则：

1. 若估算课数 **≤ 15**：整个 Goal 就是一个 mine unit。先写完全部课，再按课扇出 miner。
2. 若估算课数 **> 15**：按模块 / 容器切成连续单元，**每个单元 ≤ 15 节**。写完一个单元的全部课 → 挖这一个单元 → 再写下一个单元。
3. 任何 mine unit 不得超过 15 节。校验器对「同一 mine unit 规划超过 15 节」报错。
4. **15 是扇出上界，不是配额，不是必须凑满。** 4 节的小项目按 4 节挖，不要为了填满 15 而灌水开课。
5. 3 课的波不必撑到 15；单波若超过 15，只把挖掘切开，不把覆盖波扩成配额。

## 与 Wave 的关系

Wave 1 / Wave 2 仍按覆盖轴分组。挖掘扇出上界是 `mine_unit_cap=15`，不是必须凑满，也不是 Wave 配额。若某一覆盖波本身超过 15 节，必须先拆成多个 mine unit，不得整波一次扇出超过 15 个 miner。

## 示例

- 6 节的小库：1 个 unit，写完 6 节再 6 路挖掘（受 `learning_agent_limit` 限制，默认同时 4 个，其余排队）。
- 11 节：1 个 unit。
- 18 节：例如 Unit A 10 节 + Unit B 8 节，不得 18 节一次挖。
- 某容器公开 API 单独就超过 15 节：说明课图过粗或范围过大。plan 阶段就应拆课或把一部分标 `deferred`，而不是把 16+ 节装进一个 unit。

## `/goal` 循环

当前 mine unit：阶段 T 写完全部 L → 阶段 M 按课 mine → 阶段 D Lead 处置 → 下一 unit。禁止 `L → mine → L → mine` 交错。当前 mine unit 课数不得超过 15。超过则停止，回到 G-goal `replan` 重新切单元。
