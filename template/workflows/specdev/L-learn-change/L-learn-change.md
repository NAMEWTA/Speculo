---
id: specdev/learn-change
type: workflow-entry
workflow: specdev
name: Change 学习
description: 在开发完成后围绕当前 SpecDev change 回答问题，并用面向零专业背景读者的 Markdown 与 ASCII 图解持续记录理解。
keywords: [learn-change, change 学习, 开发后提问, 零基础, 大一新生, Markdown, ASCII]
---

# Change 学习：给零基础新生的图解

> 激活本 Work 后，先读取 `<Path>{roots.workflows}/specdev/README.md</Path>`，再执行本入口。

## 读者与职责

读者是刚入大学、没有专业背景（零专业背景）的新生。读者能理解日常因果和简单流程，但不应被假定知道代码、网络、数学或行业背景。

本 Work 用于在 change 开发完成后回答与该 change 有关的问题。它只解释，不作产品决定、架构决定或实现授权；它把当前 change 中已验证的工件、实现和测试事实写成可恢复的 Markdown 图解。图比段落更先出现，文字只负责读懂图。

```text
已完成 change 的已验证事实
            |
            v
      用户关于 change 的问题
            |
            v
    ASCII 全图 + 分步图 + 简短说明
            |
            v
 learning/01_<topic>.md、02_<topic>.md、...
            |
            v
      learning/index.md（图解目录）
```

主题：`$ARGUMENTS`

## 输出格式

在当前 change 的 `<Path>{roots.state}/specdev/changes/{change}/learning/</Path>` 内原子写入一份新的 `<Path>{roots.state}/specdev/changes/{change}/learning/{number}_{topic}.md</Path>`，并原子更新索引 `<Path>{roots.state}/specdev/changes/{change}/learning/index.md</Path>`。这些产物属于 SpecDev change，不写入 `<Path>{roots.state}/learning/</Path>`。文档必须是纯 Markdown，不生成 HTML、CSS、SVG、图片链接或浏览器专属交互。

`<number>` 是两位起始、持续递增的序号：先读取索引和同目录已有的图解文件，取最大序号加一，因此第一次为 `01`，下一次为 `02`；不为旧文件重编号。`<topic>` 是主题的简短、可作文件名的标签，可使用中文、字母、数字、`-` 或 `_`，但不能含空格、`/`、`\\` 或 `..`。同主题再次解释也创建新编号文件。

索引是唯一目录，使用下列 Markdown 表格；每新增一份图解就在表末追加一行，并保留既有行。文件列只写同目录的文件名：

```markdown
# Change 学习图解索引

| 编号 | 文件 | 主题 | 简介 |
| --- | --- | --- | --- |
| 01 | 01_<topic>.md | <主题> | <一句话说明它解释什么> |
```

按主题选择最贴切的图，但优先用多个短小 ASCII 图代替长文字：

```text
结构图：
[系统]
  |
  +-- [部件 A]
  +-- [部件 B]

数据流图：
[输入] -> [处理] -> [结果]

调用流图：
[用户动作] -> [入口] -> [服务] -> [回应]

状态变化图：
[等待] -> [进行中] -> [完成]
```

每份图解至少包含以下四节：

1. `## 先看全图`：一个能说清“谁和谁有关”的 ASCII 图。
2. `## 一步一步看`：按箭头顺序解释。流程、数据或调用会移动时，再给对应的 ASCII 图。
3. `## 术语小词典`：只保留读图必需的词。每个词先用日常语言解释，再给它的专业名字。例如：`临时便签（缓存）`，意思是“把常用结果先放在手边，下一次不用重新找”。
4. `## 你现在能复述什么`：用短句归纳“它是什么、为什么需要它、它怎样流动或被调用”。

图中的方框名称使用普通名词和动词，不用缩写；箭头必须有方向。一个图只讲一个问题。确有边界、失败或例外时，单独画一张小图说明，不把它塞进主图。

## 执行

1. 按 `<Path>{roots.workflows}/specdev/README.md</Path>` 读取全局状态和当前 change 状态。只选择用户指定或唯一未归档的现有 change；没有可用 change 时说明必须先完成或指定一个 SpecDev change，不创建空 change。已归档 change 保持只读，不在归档目录追加学习产物。`current_work` 为空时设为 `specdev/learn-change`；若指向其他 Work，先完成显式交接。`change_status=completed` 不因本 Work 被重新打开为开发中。
2. 将调用中的 `$ARGUMENTS` 解析为主题；直接提出的问题以用户最新消息为主题。主题缺失时只询问问题或主题，不猜测。先写下读者要带走的三个答案：它是什么、为什么需要它、它怎样流动或被调用。
3. 按需读取当前 change 的 Source、Spec、Ticket、Evidence、review、项目实现、测试和可靠来源。区分已验证事实、便于理解的类比和未知处；实现事实与旧计划冲突时以当前代码、测试和 Evidence 为准，并显式指出差异。类比只能帮助理解，不能替代事实或掩盖边界。
4. 先画 `先看全图`，再按实际关系补充结构图、数据流图、调用流图或状态变化图。每张图旁只用短句解释箭头；避免长段落、术语堆叠、缩写和先备知识。
5. 首次使用术语时，先写日常解释，再在括号中给专业名字。读完后从读者角度检查：没有背景知识的人能否仅靠图和短句复述三个答案；若不能，拆图或替换术语，不增加大段说明。
6. 读取 `<Path>{roots.state}/specdev/changes/{change}/learning/index.md</Path>` 和 `<Path>{roots.state}/specdev/changes/{change}/learning/</Path>` 内已有图解文件。从两者的最大序号计算下一个编号，先原子创建新的图解文件，再原子更新索引；不覆盖、重命名或重排已有图解。重读确认新文件是 Markdown，包含四个必需章节、至少一个 ASCII 图且没有 HTML 标记或图片依赖；索引的文件名、主题和简介都与新文件对应。
7. 运行 `<Path>{roots.workflows}/specdev/common/tools/validate-specdev.mjs</Path>` 的 `--stage learn-change`。成功后把 `specdev/learn-change` 去重加入 `works_run`，清空 `current_work`，并返回新 Markdown 与索引的完整路径；失败时保留 `current_work` 和阻塞原因，便于恢复，但不改变 change 的开发完成状态。

## 完成标准

- `<Path>{roots.state}/specdev/changes/{change}/learning/index.md</Path>` 存在，按序列出每份图解的编号、文件、主题和简介；每个文件名都对应同目录真实文件。
- 新的 `<Path>{roots.state}/specdev/changes/{change}/learning/{number}_{topic}.md</Path>` 存在，是纯 Markdown，并含有全部四个必需章节和至少一个 ASCII 图；编号比既有最大编号大一，旧文件未被重排或覆盖。
- 文档面向刚上大一、没有专业背景的读者；用图和短句回答当前 change 的问题，而不是把专业长文换成更简单的字。
- 图解覆盖主题需要的结构、数据流、调用流或状态变化；能画图的地方优先画图，且每张图的箭头方向与事实一致。
- 术语首次出现前有日常解释；类比不把读者带向相反结论；计划与最终实现的差异没有被隐藏。
- 状态已原子更新；所有学习产物只写入当前 SpecDev change 的 `learning/` namespace，没有修改项目代码、永久知识、Learning workflow state 或远程系统。
