---
name: specdev-l-learn
description: "围绕需求参考、本项目代码、已有 change 或外部项目与文章开展学习，讲清功能、实现思路和运行机制，并用面向零专业背景读者的 Markdown 与 ASCII 图解记录理解。"
metadata:
  speculo-kind: work-skill
  speculo-id: specdev/learn
  speculo-domain: specdev
  speculo-contract-version: "2"
---

# 学习与图解

激活后读取 `<Path>{roots.workflows}/specdev/common/rules/domain-runtime.md</Path>` 与 `<Path>{roots.workflows}/specdev/common/rules/activation-and-memory.md</Path>`。从用户想理解的对象和问题开始；学习可以发生在需求实现前、开发中或实现后。

## 执行

1. **确定学习问题**：使用 `$ARGUMENTS` 或用户最新请求，明确想学的对象、本轮问题及已有背景；缺少对象或问题时只补问缺失项。默认读者是刚入大学、零专业背景的新生。带着需求来时，先讲参考对象解决什么问题、具有什么功能、为什么这样实现。
2. **定位依据**：按问题读取本项目代码、测试、文档，或外部项目源码、官方说明、文章与论文；关联 change 时才读取相关 Source、Spec、Ticket、Evidence 和 review。需求明确但未指定参考时，围绕问题检索可靠的一手资料。记录来源文件/章节/URL 及适用版本；资料无法访问或关键事实缺失时说明缺口，停止依赖它的结论，继续有依据的部分。
3. **确定保存位置**：问题与必要资料明确后，读取 `<Path>{roots.workflows}/specdev/specdev-l-learn/references/learning-change.md</Path>`。用户指定未归档 change 就使用其 learning 目录；同轮续学复用已选对象；未指定则新建承载本轮学习的轻量 change，不自动选择其他现有 change。指定对象不存在或身份冲突时先消歧，不静默另建。
4. **讲解与保存**：读取 `<Path>{roots.workflows}/specdev/specdev-l-learn/references/lesson-format.md</Path>`。先画 ASCII 全图，再按实际关系画短小结构、数据、调用或状态图；短句解释箭头，术语先日常解释再给专业名字。覆盖“它是什么、为什么需要、怎样流动或被调用”，按追问继续拆解；有当前需求时说明可借鉴之处和适用条件，不把参考思路写成已批准的实现方案。
5. **追加与交付**：按格式合同原子创建 `<Path>{roots.state}/specdev/changes/{change}/learning/{number}_{topic}.md</Path>`，再更新 `<Path>{roots.state}/specdev/changes/{change}/learning/index.md</Path>` 并回读。重讲同主题仍新增编号，保留旧文件、原顺序和全部历史行；部分失败先恢复已有结果。产物仅为纯 Markdown/ASCII，不写 `<Path>{roots.state}/learning/</Path>`、生产代码、永久知识或远程系统。

## 事实、理由与解释

区分源码事实、文章作者的观点、实际测试验证、可定位设计理由、教学类比、推断与未知。未运行测试就不宣称运行验证；旧计划、文章和实际实现冲突时明确各自版本与差异。类比帮助理解，不能代替证据；参考的可借鉴点不代表已经决定在本项目采用。

## 验收与恢复

```bash
node <Path>{roots.workflows}/specdev/common/tools/validate-specdev.mjs</Path> --stage learn <Path>{roots.state}/specdev/changes/{change}</Path>
```

图解覆盖约定问题、引用可追溯，符合四节、至少一个 ASCII 图和连续编号；索引指向真实文件且主题/简介一致，箭头方向与依据相符。验证通过后按保存位置合同完成本轮学习专用 change，或仅追加已有 change 的导航；学习交付不证明用户已经掌握，也不改变已有开发 change 的完成状态。

返回新图解、索引和 README 完整路径、验证结果及未解问题；失败保留恢复位置与原因。默认返回用户继续提问。用户另行提出开发需求时，需求澄清交 `<Path>{roots.workflows}/specdev/specdev-g-grill-with-docs/SKILL.md</Path>`，多 change 探索交 `<Path>{roots.workflows}/specdev/specdev-w-wayfinder/SKILL.md</Path>`，外部行为明确时交 `<Path>{roots.workflows}/specdev/specdev-s-spec/SKILL.md</Path>`，由下一 Work 核对范围与授权；不自动启动实现。系统课程、作业和周期复习由 Learning workflow 负责，本 Work 不改其状态。
