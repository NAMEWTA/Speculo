# Mission: Speculo Matt-Pocock 工作流使用方法

## Why
用户需要双重掌握：(A) 在日常开发中使用 Matt-Pocock 工作流管理项目全生命周期（triage → to-spec → implement → code-review）；(B) 作为 Speculo 维护者理解工作流架构，以便修改编排层和扩展新路由。目标是在一周内达到能独立阅读、理解并修改 WORKFLOW.md 及其路由体系的水平。

## Success looks like
- 能说出三层架构（vendor → workflows → .speculo/state）的职责边界和数据流向
- 能独立跟踪一条路由从用户意图到 vendor skill 激活的完整链路
- 能解释 WORKFLOW.md 中 XML 声明式语法每个块的含义（runtime-context、persistence、routes、entry protocol、state-schema、transitions）
- 能修改现有路由或新增一条路由，并验证其正确性
- 能运行一次完整的 triage → to-spec → implement → code-review 流程

## Constraints
- 时间预算：一周内完成（约 2026-07-18 前）
- 学习方式：以阅读文档为主，详细教学，暂不强调动手实操
- 已有基础：已理解三层架构概述，已阅读 WORKFLOW.md 全文，熟悉 vendor/matt-pocock/ 下的原始技能清单

## Out of scope
- Matt Pocock 原始技能的具体实现细节（仅了解其接口契约即可）
- Speculo 框架本身的其他模块（commands、skills 目录下的非 runtime-context 技能）
- 实际在代码仓中运行完整工作流（后续实践阶段再做）
