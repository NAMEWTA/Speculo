# 可验证的 Skill 调用契约

本规则用于 T 规划、P 调度和 I 执行。Map 维护最低读取路由；每票 `skill_bindings` 才定义本票调用，二者不得互相代替。

## 定位与绑定

1. 从项目 Agent 指令解析真实 Skill 根，先枚举元数据和触发条件，再读取命中入口及当前阶段要求的参考；不整读所有 Skills。
2. 保留逻辑路径、解析真实源，检查不存在的路径、越界软链接、缓存和入口 `name`。默认不使用插件缓存或 node_modules 充当项目可维护源；用户维护的项目内软链接保持原状。仓库外技能需要先取得明确源域授权并由项目网关处理，控制器不会自行扩大根目录。
3. 每个绑定必须包含真实 `id`（SKILL 的 name）、Path 标签 `path`、入口字节 `sha256`、`phase`（plan/implement/verify）、`operation`、非空 `inputs`、`outputs`、`required` 与 `on_failure`。引用较长参考时在 references 字段 中记录明确 Path、sha256 与 `when`；相关参考在调用前按条件回读。
4. 必需绑定失败固定为 `block-ticket`；可选绑定只有说明 `condition` 与不适用原因才允许 `report-and-continue`。可选标记不能覆盖用户要求或技能自身硬门禁。
5. 在模板 frontmatter 中，数组对象用单行 JSON；不使用自定义 YAML 对象语法。缺失 Skill、摘要漂移、占位符或入口 ID 不符，票不得进入 ready。没有适用项目 Skill 时 `skill_bindings: []`，`skill_scan` 必须写真实扫描范围与不适用理由，Map 同步无适用项。

## 示例形状（生成真实票时全部替换）

```json
{"id":"project-test","path":"<Path>.agents/skills/project-test/SKILL.md</Path>","sha256":"<真实64位摘要>","phase":"verify","operation":"run-regression","inputs":["当前Ticket与定向diff"],"outputs":["含命令、退出码和验收映射的Evidence"],"required":true,"on_failure":"block-ticket","references":[]}
```

此示例不是项目已存在的 Skill，不得复制为可执行绑定。SpecDev 自带技能在 Work 中按明确 Path 调用，不能伪装为项目 Skill。

## 执行证据

到相应阶段后，实际调用宿主能力或执行该 Skill 明确的步骤。记录技能 ID、phase、operation、所用摘要、输入定位、执行轨迹、输出与结果。仅展示 `@skill`、复制入口、声明“已读”都不是完成证据。

新版票 done 前，在本票 `<Path>{roots.state}/specdev/changes/{change}/evidence/{ticket-id}.md</Path>` 增加 `## Skill Execution Records`，紧接一个 JSON 数组代码块。每项有 `id`、`phase`、`operation`、`sha256`、`status`（passed/failed/skipped）、非空 `evidence` 字符串数组。required 项必须 passed；验证器只能检查记录结构与摘要一致，Lead 仍需回读真实工具/过程证据，不能把结构通过称为宿主调用已经被认证。

摘要变更先由 Lead 检查影响、更新绑定和 map 后重验；不自动接受最新文件，不回写已完成旧证据。
