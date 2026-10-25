---
name: research
description: 为调用 Work 的功能、设计、规划或实现决定查证外部事实并比较可复用方案，返回原始来源、采用理由、适配限制和未知，由调用方接收。
compatibility: Requires the owning Speculo workflow resources and explicit project roots.
metadata: {"speculo-source-id": "specdev-research"}
---

# SpecDev Research

## 输入

- `decision`：研究要支持的一个具体决定；
- `questions`：当前决定需要回答的具体问题集；
- `stop_condition`：何时证据已足够；
- `caller`：调用 Work 的完整业务 ID，由入口声明；用它区分原型、Goal 规划、初始化、实现等共用字母的 Work；
- `target_artifact`：调用方拥有且将接收结果的完整 Path；只读分支明确填 `response`，由调用方在当前回复交付。

缺少 caller 或接收目标时返回阻塞，不创建 `{change}/research/` 等共享 namespace。用户要求保存时必须有真实目标，不能用 `response` 冒充持久化完成。

## 流程

1. 读取 <Path>{roots.references}/research-and-reuse/research-contract.md</Path>，固定问题、版本、环境和停止条件，检查已有研究及项目先例是否仍适用。
2. 只针对实际缺口查证一手来源或成熟同类实现。按共享合同核对维护状况、依赖、许可和已知问题，比较采用、适配及不采用的理由；不要求重复搜索仍有效的已有依据。
3. 对每个会改变决定的实质声明就近给出原始链接、版本和限制，区分事实、推断、建议与未知；来源冲突及不可访问情况按共享合同处理。
4. 返回可直接用于 `target_artifact` 的 Markdown block，标明结论影响和后续应保留的引用。文件目标由 caller 按原工件合同原子写入并回读；`response` 只返回文本。本 Skill 不自行写 state。

## 输出

```markdown
## Research: <问题>
- Decision / target:
- Scope / version:
- Stop condition:

### R-001
- Claim（就近附原始链接）:
- Type: official fact / code fact / inference / recommendation
- Source / version / checked:
- Borrowed idea / adaptation:
- Confidence:
- Limits:
- Artifact impact:

### Conflicts and Unknowns
### Reuse Comparison（涉及方案选择时）
### Recommendation
```

按实际问题省略不适用栏目；比较只记录真实考察的候选。后续产物继承原条目定位、关键原始 URL 与适用限制，不复制整份研究。不得长篇复制受版权保护内容；长期有效且经实现验证的结论仅由 Archive 按已声明知识网关从原工件提升，不自行建立永久 research store。

## 完成标准

- 每个输入问题有答案或明确未知；
- 每个实质声明就近引用一手来源，实际采用内容和适配边界可追溯；
- 版本、限制、冲突和置信度已记录；
- 结果有唯一 owning artifact 或明确的只读回复目标；
- 本 Skill 没有创建自己的 state 路径。
