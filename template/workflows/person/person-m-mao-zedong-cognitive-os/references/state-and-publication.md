# 咨询 Change 状态与发布

本合同只为现有五阶段方法提供状态隔离和工具校验，不改变首次声明、开口问题、模型选择、原文检索、五拍论证或收尾四动作。方法内容及数量仍由各 phase 的原参考文件维护。

## 权威与所有权

每次咨询使用独立 Change ID。状态位于 <Path>{roots.state}/person/changes/{change}/.status.json</Path>，使用 <Path>{roots.workflows}/person/person-m-mao-zedong-cognitive-os/assets/templates/consultation-status-template.json</Path>；结构定义见 <Path>{roots.workflows}/person/person-m-mao-zedong-cognitive-os/schemas/consultation-status.schema.json</Path>。

`phase` 是唯一阶段字段：activating → diagnosing → strategizing → mobilizing → delivering → completed。`problem_type`、`primary_framework`、models/frameworks/methods/quotes 和阶段证据都属于这个 Change。全局 person/status.json 只维护 `active` 索引，禁止写咨询标量或另一咨询的字段。其他 Work、Change 和未知扩展字段保留；不得把“无旧格式兼容”用作改写原始材料的授权。

## 阶段证据

- 初始化使用 activating，status=active；已完成所有五阶段才为 completed。
- 完成问诊时在 problem-statement.md 原有六段之后附“首次声明与原始问答”：保存实际已输出的原声明、至少两个实际开口问题与用户原答。状态 activation 指向相同原文，不用自行总结代替用户回答，不为填表伪造回应。
- analysis_conditions/action_conditions 记录已核实的适用条件，驱动原方法中的必选模型/方法校验。未知条件仍由当前阶段追问处理，不能为了通过校验填 false。
- strategy_stages、action_disciplines 和 delivery_checks 记录原方法的已有门槛。五拍/声线等语义仍需按原文人工回读；工具不声称通过 JSON 即证明咨询质量。
- phase_evidence 只登记已完成的前序阶段。每项记录实际产物文件与 SHA-256；进入下一阶段前用工具计算，不自行臆造哈希。正文变了，旧证据立即失效。
- 引语 quotes_cited 存 kind（direct/paraphrase）、text、article_id、source 和 artifact。source 是本 Work 中对应 books/src/NNN-篇目.md；直引核对原文，转述保留原方法要求的“转述/大意”标注。工具只读取登记的篇目，不扫书库。
- 用户要求修订前序阶段时回到对应 phase，写 revision_reason 并移除该阶段及后续 phase_evidence；保留原问答和修订记录。后续输出重新按原有硬依赖验证。

## 实际工具调用

先在当前 Change 写 `state.candidate.json`，不要直接改正式状态。计算已存在工件的字节哈希：

```bash
node <Path>{roots.workflows}/person/person-m-mao-zedong-cognitive-os/scripts/consultation-state.mjs</Path> --state-root <Path>{roots.state}/person</Path> --change <change-id> --digest-artifacts
```

将本轮已完成前序阶段的结果填入 phase_evidence，再只读校验候选：

```bash
node <Path>{roots.workflows}/person/person-m-mao-zedong-cognitive-os/scripts/consultation-state.mjs</Path> --state-root <Path>{roots.state}/person</Path> --change <change-id> --candidate <candidate-file>
```

校验通过后，在当前咨询已有写入授权内对同一候选加 `--publish --expect-digest <candidate_sha256>`。这个摘要用于防止校验后输入漂移，不新增逐阶段用户确认。工具重读候选与阶段工件，校验通过才先发布 Change 状态、后合并当前 active 条目；完成时只移除本 Change、本 Work 的条目。

Person 的全局索引写者共同使用 <Path>{roots.state}/person/.person-status.lock</Path>，独占创建并只释放自己持有的锁。工具失败后原始咨询正文保持不变。若 Change 已发布而索引更新失败，使用同一候选重试修复投影；不能把旧索引当作另一个业务事实源。崩溃遗留锁仅在本主机原进程已退出、Work/Change/候选摘要完全一致时恢复；他人的锁保留并报告。

Mao 工具只管理自己的状态，不替代 Steelman 的 dossier 冻结、唯一问题或裁决资格校验；Steelman 继续先运行自己的候选验证器。
