# <module-name>

## Scope

- 说明当前聚合 manifest 覆盖的目录范围。
- 明确哪些子模块拥有自己的 AGENTS.md。

## Module Positioning

- 标记当前角色为 `aggregator`。
- 说明它在父层中的职责（公共能力聚合、业务域聚合、独立服务聚合等）。

## Directory Structure

- 列出直接子目录、关键文件、子级 manifest 模块。
- 对子级模块按职责分组，而不是纯罗列。

## Responsibilities

- 说明当前聚合层负责模块编排、边界划分和阅读入口。
- 明确不负责子模块内部实现细节。

## Core Logic

- 解释当前聚合为什么存在。
- 解释 manifest 的子模块声明在编排什么。
- 解释子模块之间的关系与进入时机。

## Key Entry Points

- 当前 manifest 文件
- 代表性子模块的 manifest、启动入口或核心能力入口
- 必要时补充关键配置或装配入口

## Usage And Change Notes

- 先按当前聚合层的分组逻辑定位子模块，再继续下钻，不要把聚合层写成叶子模块说明。
- 调整子模块清单、模块归类或聚合职责时，同步检查父层导读。
- 如果问题已经落到接口、领域逻辑或运行时配置，立即进入对应子模块 AGENTS.md 与源码。

## Dependencies And Collaboration

- 说明当前聚合与父层、子层的协作关系。
- 说明哪些问题必须下钻到哪个子模块源码。

## Investigation Rule

- 明确：先读本层分组和编排关系。
- 如果需要具体实现、接口、配置或异常处理，继续进入对应子模块 AGENTS.md 与源码。
- 文档与代码冲突时以代码事实为准。

## Core Commands

- 面向当前聚合层的构建、测试命令。

## Verification

- 当前聚合层最小可执行校验。

## Routing

- 上级 manifest
- 子级 manifest（每个附带一句话定位）

## References

- 当前 manifest
- 关键聚合配置
- 代表性子模块入口
