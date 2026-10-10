# 问题地图合同

只在 Q 新建或推进批次/探索时读取。地图属于当前 Change 的 `inquiry/`，由 Q 独占写入，不新增全局状态，也不回填旧历史。种子见 `<Path>{roots.workflows}/learning/Q-question/question-map-template.json</Path>`。在当前 Change locator 下解释本文中的相对工件路径。

<!-- portable:map:start -->
## 问题地图与证据状态

`inquiry/question-map.json` 是可重建索引，原始问题、学习者回答、探索记录和真实证据仍是权威。文件根为 `schema_version: 1` 与 `questions` 数组；首次使用为空数组，不扫描或迁移历史批次。

每条问题有以下字段：

| 字段 | 合同 |
| --- | --- |
| `id`、`parent_id` | 当前范围内唯一的 `P-001` 式编号；父 ID 为已存在问题或 null；禁止自引用和环 |
| `origin`、`trigger` | 来源为 `user`、`answer`、`material` 或 `inference`；trigger 定位触发输入或说明推断假设 |
| `dimension`、`why_it_matters` | 相关角度与值得关注的原因，不能只写“重要” |
| `gap_kind` | `potential` 或 `observed`；observed 必须附可定位证据，不根据未提到而断言不理解 |
| `status` | `open`、`exploring`、`resolved`、`needs_evidence` 或 `deferred`；不是掌握程度 |
| `evidence_status`、`evidence` | `unverified`、`supported` 或 `tested`；evidence 为来源/工件定位字符串数组；supported/tested 不得没有定位 |
| `artifact` | 首次拥有该问题的相对路径：`inquiry/IQ-...md` 或 `inquiry/explorations/EX-...md`；不能指向其他能力或越界 |
| `conclusion`、`verification` | 当前结论与验证设计/待证据项；resolved 不能没有结论、验证说明或仍为 unverified |
| `revisit_reason` | 可选；复问时说明新增信息、情境变化、矛盾或明确复习意图 |
| `test_evidence` | evidence_status=tested 时必填，指向 `inquiry/evidence/` 内真实测试记录；没有执行记录只标 supported/unverified |

地图中的 tested 仍只是有测试记录引用，不认证测试结果真实性或一般正确性。证据缺口保留 needs_evidence，不能为了关闭一轮改写为 resolved。

更新时保留未知扩展字段和不相关问题。用户原始答题内容不得被地图摘要覆盖。关闭的问答/探索工件只读；要复问则新建问题、链接父问题并注明 revisit_reason，不原地改写历史。当前轮停止后仍可保留 needs_evidence/deferred；这不表示所有问题已解决。
<!-- portable:map:end -->
