---
id: specdev/learn-change
type: workflow-entry
workflow: specdev
name: Change 学习
description: 在开发完成后围绕当前 SpecDev change 回答问题，并用面向零专业背景读者的 Markdown 与 ASCII 图解持续记录理解。
keywords: [learn-change, change 学习, 开发后提问, 零基础, 大一新生, Markdown, ASCII]
---

# Change 学习：给零基础新生的图解

激活后读取 `<Path>{roots.workflows}/specdev/README.md</Path>` 与 `<Path>{roots.workflows}/specdev/common/rules/activation-and-memory.md</Path>`。只解释当前 change 已验证的实现与测试事实，不作产品/架构决定或授予实现权限。

## 执行

1. **选择现有 change**：使用用户指定或唯一未归档 change；没有时返回缺失输入，不创建空 change。只读归档不追加学习材料。按原交接规则登记 `current_work=specdev/learn-change`，不把 `change_status=completed` 重新打开为开发中。
2. **确定主题**：使用 `$ARGUMENTS` 调用参数或用户最新问题；缺少时只询问主题。读者是刚入大学、零专业背景的新生，先确定“它是什么、为什么需要、怎样流动或被调用”三个答案。
3. **定位事实**：按主题读取 Source、Spec、Ticket、Evidence、review、实际代码/测试与可靠来源。区分已验证事实、类比与未知；旧计划和实现冲突时明确差异，以当前代码、测试、Evidence 为实现事实，不让类比代替证据。
4. **生成与保存**：读取 `<Path>{roots.workflows}/specdev/L-learn-change/references/lesson-format.md</Path>` 的完整格式和命名合同。先画 ASCII 全图，再按实际关系画短小结构/数据/调用/状态图；用短句解释箭头，术语先日常解释再给专业名字。验证零背景读者能复述三个答案；不能时拆图或换词，不灌长文。
5. **追加而非覆盖**：从 `<Path>{roots.state}/specdev/changes/{change}/learning/index.md</Path>` 及同目录真实图解的最大编号取下一号；先原子创建 `<Path>{roots.state}/specdev/changes/{change}/learning/{number}_{topic}.md</Path>` 新图解，再更新索引并回读。重讲同主题仍新增编号，保留旧文件、原顺序和全部历史行。产物仅为纯 Markdown/ASCII，不生成 HTML、CSS、SVG、图片或浏览器依赖，不写 `<Path>{roots.state}/learning/</Path>`、生产代码、永久知识或远程系统。

## 验收与恢复

```bash
node <Path>{roots.workflows}/specdev/common/tools/validate-specdev.mjs</Path> --stage learn-change <Path>{roots.state}/specdev/changes/{change}</Path>
```

图解符合格式参考的四节、至少一个 ASCII 图和连续编号；索引指向真实新文件且主题/简介一致，箭头方向与事实相符。验证通过才去重更新 `works_run`、清空 `current_work`，返回新图解和索引完整路径。失败保留恢复位置与原因，不改变 change 原有开发完成状态。
