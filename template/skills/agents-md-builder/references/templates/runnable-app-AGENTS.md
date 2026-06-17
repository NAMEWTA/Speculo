# <module-name>

## Scope

- 说明当前运行型 manifest 覆盖的目录范围。

## Module Positioning

- 标记当前角色为 `runnable-app`。
- 说明它是运行时装配入口、Web 服务入口、CLI 工具入口或独立应用入口。

## Directory Structure

- 列出直接子目录、关键文件、主源码路径、资源目录和测试目录。
- 指出最重要的实现分层与配置位置。

## Responsibilities

- 说明当前模块负责的启动、装配、应用入口和运行边界。
- 明确不负责哪些内部依赖模块的实现细节。

## Core Logic

- 解释启动入口如何组织应用。
- 解释核心链路（路由/控制器/服务/数据层 或 等价链路）如何协作。
- 解释内部依赖模块如何接入当前应用。

## Key Entry Points

- 启动入口文件
- 关键路由/控制器/服务入口
- 核心配置文件
- 测试入口

## Usage And Change Notes

- 改启动链路、装配逻辑或运行参数时，先检查启动入口、运行时配置与直接内部依赖模块。
- 新增或调整应用入口时，优先确认归档位置、配置联动和对应下游模块是否同步。
- 当前层是运行时装配入口，不要在这里替代内部模块的业务导读。

## Dependencies And Collaboration

- 列出直接内部依赖模块。
- 说明当前模块作为运行时装配层，如何把这些模块组装起来。

## Investigation Rule

- 明确：先读 manifest，再读启动入口与配置，再顺着核心链路下钻。
- 如果问题落到业务模块内部，必须跳到对应模块 AGENTS.md 与源码继续调查。
- 文档与代码冲突时以代码事实为准。

## Core Commands

- 当前模块的开发、构建、测试、运行命令。

## Verification

- 当前模块最小可执行校验。

## Routing

- 上级 manifest

## References

- manifest 文件
- 启动入口
- 关键源码目录
- 关键资源与测试入口
