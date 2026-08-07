# <module-name>

## Scope

- 说明当前契约/约束型 manifest 覆盖的目录范围。

## Module Positioning

- 标记当前角色为 `contract-module`。
- 说明它负责依赖约束、版本对齐、类型契约、配置契约或导出契约。

## Directory Structure

- 列出直接子目录与关键文件。
- 如果没有 `src/` 或主源码目录，要显式说明这是约束层而不是实现层。

## Responsibilities

- 说明当前模块约束了什么、暴露了什么。
- 明确不负责运行时代码或业务处理。

## Core Logic

- 解释当前 manifest 如何提供依赖对齐、导入关系或契约出口。
- 解释它由谁引用、为什么需要独立出来。

## Key Entry Points

- manifest 文件
- 若存在类型定义、配置文件或导出文件，列出这些文件

## Usage And Change Notes

- 改版本约束、依赖管理或契约导出前，先确认直接消费它的模块。
- 如果目录没有实现代码，要明确它仍然是约束层；不要补写成运行时代码模块。
- 当改动会影响构建对齐或依赖传递时，同步检查根级或聚合层导读。

## Dependencies And Collaboration

- 说明父模块、子模块或消费方如何使用它。
- 说明它不直接承载业务实现。

## Investigation Rule

- 明确：先读 manifest 的依赖管理、导入关系和导出方式。
- 若要判断实际实现效果，继续进入引用它的消费模块源码。
- 文档与代码冲突时以代码事实为准。

## Core Commands

- 当前模块的最小构建校验命令。

## Verification

- 当前模块最小可执行校验。

## Routing

- 上级 manifest

## References

- manifest 文件
- 关键导出或配置文件
- 主要消费方
