# 研究来源与适用边界

核对日期：2026-11-04。以下为本技能编写时实际查阅的原始研究、机构方法和官方设计资料。正文为本项目原创综合；未复制第三方技能或将外部材料设为运行依赖。

## 来源如何影响设计

| 来源 | 支持的做法 | 适用边界 |
| --- | --- | --- |
| [SAMHSA，TIP 35，第 3 章：Reflective Listening / Summarizing（2019）](https://www.ncbi.nlm.nih.gov/books/NBK571068/?report=reader) | 将对含义的理解视为可修正的假设，复述后依据对方反馈校准；总结后允许补充遗漏 | 来自治疗性访谈；这里只借用倾听与检验理解的方法，不引入诊断、劝导改变、选择性强化或疗效主张 |
| [AHRQ：Check-Back 定义（2015）](https://www.ahrq.gov/hai/cauti-tools/phys-championsgd/appa.html) | 发送者表达、接收者回读、发送者核验，形成信息确认闭环 | 原场景是医疗团队沟通；不将逐字回读所有信息设为通用要求，也不据此声称本技能保证准确 |
| [Google Conversation Design：Confirmations（页面更新于 2024-09-18）](https://developers.google.com/assistant/conversation-design/confirmations) | 呈现系统如何理解输入；允许一步纠正、局部改动；区分理解参数与确认行动 | 页面面向旧版 Assistant 会话设计，此处仅参考设计原则。原文建议节制使用显式确认；本技能在用户主动核对或有实质歧义时才进入确认流程 |
| [Microsoft Research：Guidelines for human-AI interaction design（2019）](https://www.microsoft.com/en-us/research/blog/guidelines-for-human-ai-interaction-design/) | G9 支持高效纠正；G10 对目标不确定时消歧或缩小服务范围 | 原指南主要在图形界面产品上验证；不能将其当作本技能对话效果的直接实验认证 |
| [Paludan 等：Exploring conversational AI and response types for information elicitation，arXiv:2506.11610v1（2025-06-13），§6.1–6.2](https://arxiv.org/html/2506.11610v1) | 保留原始输入，提供可编辑／可确认的 AI 理解稿，适应不同表达偏好 | 含 50 位模拟客户的实验，未测真实客户与设计师合作关系或长期收益；清晰度有所改善，但主观可靠感降低，不能据此承诺消除返工 |

## 本技能的设计选择

「明确表达／推断／未知」的区分、原意与理解稿的双向核对，以及理解确认与执行授权的分离，是针对 AI 协作场景的工程设计选择，不是上述来源共同验证过的一套标准协议。

这里的「规范化」指重组语义、稳定指代并保留条件，使用户容易检查。它不代表把表达强行改成专业术语、需求规格书或某一种固定格式。

目标是尽早暴露理解偏差并支持纠正。用户未指出问题，不能证明已穷尽其内在意图；用户确认过的理解也可能随后变化。没有针对本技能的宿主实测，不声称降低错误率、节省工时或保证完全一致。
