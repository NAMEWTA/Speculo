# <project-name>

## Scope

- 说明当前根级 manifest 覆盖的目录范围。
- 明确哪些更深层 manifest 目录会接管说明。

## Module Positioning

- 标记当前角色为 `repo-root`。
- 说明根目录在整个项目中承担的总入口职责。
- 概括顶层模块如何分层（如有 workspace / multi-module）。

## Directory Structure

- 列出顶层直接子目录与关键根级文件。
- 点明哪些中间层目录本身没有独立 AGENTS.md，事实如何上收。

## Responsibilities

- 说明根级目录负责哪些项目边界、装配边界和阅读路径。
- 明确不负责的子模块内部实现细节。

## Core Logic

- 解释顶层 manifest 如何组织子模块或 workspace。
- 解释从根级进入项目时，应该如何定位到聚合层或叶子层。
- 不要只列模块名，要解释分层理由。

## Key Entry Points

- 顶层 manifest 文件
- workspace / multi-module 配置
- 顶层直接子模块的代表性入口
- 关键根级配置文件

## Usage And Change Notes

- 先用顶层 manifest 与模块分组判断问题落在哪个聚合层或叶子层，不要在根层直接推断子模块细节。
- 调整顶层模块清单、父依赖或构建插件时，先检查根级配置与子模块导读是否需要同步。
- 根层只负责边界与导航；涉及具体实现时，必须进入对应子模块继续调查。

## Dependencies And Collaboration

- 说明顶层模块之间的协作关系。
- 说明哪些问题必须下钻到子模块源码。

## Investigation Rule

- 明确：先用本文件建立范围与导航。
- 如果本文件无法回答问题，继续深入子模块 AGENTS.md、manifest、关键源码、配置与测试。
- 文档与代码冲突时以代码事实为准。

## Core Commands

- 根级常用构建、测试、运行命令。

## Verification

- 根级最小可执行校验。

## Routing

- 链接全部子级 manifest 目录（每个附带一句话定位）。

## References

- 顶层 manifest
- workspace / multi-module 配置
- 关键根级配置文件
- 代表性入口文件
