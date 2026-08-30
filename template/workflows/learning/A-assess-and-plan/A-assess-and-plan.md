---
id: learning/assess-and-plan
type: workflow-entry
workflow: learning
name: 评估背景并制定学习计划
description: 从学习请求和已有 Markdown 知识中建立未教学基线，锁定目标、前置知识、来源和掌握证据。
keywords: [评估, baseline, 学习计划, objectives, 背景知识]
---

# 评估背景并制定学习计划

> 激活本 Work 后，先读取 `<Path>{roots.workflows}/learning/README.md</Path>`，再执行本入口。

本 Work 拥有 intake、baseline、learning plan 和初始 sources。它不开始正式教学，也不根据用户自信度直接宣称掌握。

## 流程

1. 确认 I 已完成。解析主题、领域 id 和 `project | product | subject | language | skill` 类型；缺少真正影响目标的选择时一次只问一个问题。
2. 选择或创建 change。新建时使用 `<Path>{roots.workflows}/learning/A-assess-and-plan/change-status-template.json</Path>`，原子登记两级状态并设置 `current_work=learning/assess-and-plan`。
3. 写 `intake.md`，记录学习对象、期望能做什么、范围外内容、可用时间、来源范围和安全限制。
4. 按 `<Path>{roots.workflows}/learning/common/rules/knowledge-organization.md</Path>` 读取 context 总目录、目标领域 INDEX 和精确相关知识；不要遍历无关领域。索引失效时用 `rg` 定位并在计划中记录异常。
5. 在任何 lesson 前进行短基线：让学习者回忆、解释或完成一个小任务；原样保存回答到 `baseline.md`。不能仅用“是否听说过”判断水平。
6. 从模板写 `learning-plan.md`：明确记录“5 岁的小孩”“大一新生”等教学表达基线；目标使用稳定 `OBJ-NN`，标记关键目标、前置知识、证据类型、深度 `quick | standard | deep`、课程顺序和双重掌握门。目标实质变化必须保留 revision 记录。
7. 写 `sources.md`，区分项目事实、权威外部来源、类比和未知。外部 URL 在使用时验证；无法验证的结论不进入关键目标答案。
8. 运行 Learning validator。成功后把 phase 设置为 `assessment`，完成本 Work，并路由 E-eli5；失败时保留 blocker 和当前 Work。

## 完成标准

- baseline 先于 lesson，且包含学习者原始证据；
- 教学表达基线使用直接标签，不使用含糊的“初学者”替代；
- 每个目标有关键性、证据和完成判断；
- 已有知识来自精确 Markdown 文件，不来自索引摘要推测；
- rubric 没有因基线表现而降低目标；
- 所有输入、状态和下一路由可恢复。

## 子文件引用

- Change seed：`<Path>{roots.workflows}/learning/A-assess-and-plan/change-status-template.json</Path>`
- 计划模板：`<Path>{roots.workflows}/learning/A-assess-and-plan/learning-plan-template.md</Path>`
