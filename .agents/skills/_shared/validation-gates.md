# Validation gates

对任何 Speculo 作者任务依次执行。跳过某一门时必须说明不适用的具体原因。

## Gate 1 — 范围

列出新增、修改、删除和重命名的全部文件；列出每个调用方、生成物和状态 namespace。所有受影响资产都进入清单后完成。

## Gate 2 — 结构

- Markdown frontmatter 首尾完整；
- JSON 可解析；
- asset id 与路径一致；
- skill 入口名为 `SKILL.md`；
- command 是 `commands/<id>.md`；
- work 目录和入口同名；
- workflow 有唯一 `INDEX.md`；
- `type: workflow` 的根 README 中 AUTO-INDEX 标记成对且唯一，INDEX 不含标记；`type: workflow-index` / `auto_generated: true` INDEX 不含标记并由生成器拥有整文件。

每个目标文件都通过后完成。

## Gate 3 — 引用闭包

枚举所有 Markdown 链接和 `<Path>`。静态目标逐个存在；动态 state 路径逐个有所有者、生成时机和变量定义；没有循环导致的重复事实源。每个引用有结论后完成。

## Gate 4 — 所有权

逐个写路径标记 owner：workflow、change、command、独立 skill、docs-sync 或项目。独立 skill 只能拥有 `{roots.state}/skills/<skill>/`；被 command/work 调用时使用调用方提供的 owner 路径。发现跨 owner 写入时，移动职责或增加明确的调用/确认边界。所有写入只有一个 owner 后完成。

## Gate 5 — 过程质量

逐步骤检查：

- 输入在使用前读取；
- 分支在 description 或步骤中可到达；
- 完成标准可检查；
- 关键枚举穷尽；
- 后续步骤不会掩盖当前步骤；
- reference 只在触发分支加载；
- script 的失败退出非零并报告具体路径。

涉及用户提供的参考内容时，列出相对原文的实质修改及其 Speculo 集成理由；没有集成冲突的内容直接复用，方法、步骤顺序、问题、判断和完成标准未被非预期改变。无法说明必要性的改写恢复原文后再通过本 Gate。

全部步骤有证据后完成。

## Gate 6 — 生成物

- Workflow 按 INDEX frontmatter 选择 README 标记区块或 INDEX 整文件模式，并从当前 work 重建；
- Canonical 从源的传递静态依赖闭包重建；
- 生成物没有手工专属规则；
- 再运行生成器得到无 diff 的结果。

所有受影响生成物可重复后完成。

## Gate 7 — 场景

至少执行：

1. 一个正常场景；
2. 一个缺失引用或非法路径场景；
3. 涉及副作用时，一个未确认场景；
4. 涉及生成器时，一个二次运行幂等场景。

记录命令、退出码和关键输出。所有预期行为都被观察后完成。

## Gate 8 — 修剪

逐句检查相关性、no-op、重复、沉积、蔓延和否定。逐文件搜索旧 id、旧路径及已删除契约。搜索结果为零，或每个命中都被证明仍有效后完成。

## 推荐命令

```bash
node .agents/skills/speculo-write-workflows/scripts/validate-speculo-assets.mjs .
```

项目若提供更强的 `pnpm validate-assets`、测试或 canonical 生成命令，应一并运行。仓库命令缺失时，以本技能包校验器作为最低门，不虚构成功。
