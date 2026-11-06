# 快速开始

## 安装并选择一个领域

在目标项目目录运行：

```bash
npm install -g @namewta/speculo
speculo init . --workflows specdev --skill-targets agents --skills domain/specdev
speculo doctor .
```

这会安装 SpecDev 领域、它的 21 个 Work 和必要资料，只向宿主暴露领域总入口。AI 根据当前任务读取对应 Work；无需在宿主技能列表里同时放入所有入口。

Claude 技能目录使用 `--skill-targets claude`；两个宿主同时使用时使用 `agents,claude`。未指定参数的交互运行会展示选择与安装预览。非交互首次运行没有预选领域或方法投影，后续运行保留有效的已有选择。

直接调用常用 Work 时，可以明确选择：

```bash
speculo init . --workflows specdev --skill-targets agents --skills domain/specdev,specdev/prototype,specdev/implement,command/status
```

全部领域、全部公开入口和全部 Hub 是不同选择。例如：

```bash
speculo init . --workflows all --skill-targets agents,claude --skills domain/specdev,domain/learning,domain/media,domain/person
speculo init . --hub-skills writing/eli5
```

`--skills all` 明确暴露全部已安装领域、Work 和命令；Hub 通过 `--hub-skills` 单独选择。参数详见 [CLI](cli.md)。

## 第一次任务

宿主读到当前项目的技能目录后，用自然语言给出目标和关键约束即可：

> 使用 SpecDev，评估 issues #12、#18 和这份反馈，做 v0.6。交互有变化时先让我看原型；确认后继续实现、验证并提交 PR。

这可能用到 triage、grill-with-docs、prototype、spec、implement 和 delivery，但不要求生成对应数量的文档。已有 issue 和设计可以直接引用，默认一份交付记录串联必要事实。

明确的单项任务可以直接进入 Work：

> 用 specdev/diagnose-bugs 调查这条错误，找到可验证的原因并修复。

> 用 specdev/project-deploy，把已经验证的这个版本部署到 staging。

> 用 learning/lesson 教我数据库索引，先用直觉解释，再展示一个可运行例子。

安装动作不会启动模型。用户请求覆盖到的工作应持续完成；只有会改变目标、体验或操作范围且无法自行查清的缺口才需要询问。

## 下次继续

给出交付名称、已有记录或环境：

> 继续 v0.6，读取当前记录，核对代码和部署状态后完成剩余工作。

记录优先放在现有项目位置；没有约定时采用 `.agents/speculo/.speculo/`。小修复可以只保留 issue 或 PR，跨会话交付通常使用一份 `releases/<name>/README.md`，记录来源、关键决定、实际结果和下一步。

查看 [完整交付流程](workflow.md) 了解设计版本、提纯和归档。源码试用见 [贡献指南](contributing.md)，已有 2.x 安装见 [升级说明](upgrade-v3.md)。
