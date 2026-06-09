---
id: scaffold-exercises
type: skill
name: Scaffold Exercises
description: 创建课程章节与练习目录骨架并验证 lint；当用户要求 scaffold exercises、创建练习桩、设置课程章节，或调用 command/scaffold-exercises 时使用。
---

# Scaffold Exercises

## 何时使用

当项目包含课程练习结构，用户要求创建章节、练习、`problem/`、`solution/` 或 `explainer/` 桩时使用。

## 输入

- 章节和练习计划、编号、名称和变体类型
- 项目中的练习根目录，默认 `exercises/`
- 项目的 lint 命令，默认 `pnpm ai-hero-cli internal lint`
- git 操作要求，例如是否需要 `git mv`、是否需要提交

## 输出

- 创建或移动的练习目录清单
- 每个练习变体的 `readme.md` 桩
- lint 运行结果和修复摘要
- 如用户或调用方要求提交，输出 commit hash 或无法提交原因

## 执行步骤

1. 读取 `references/exercise-structure.md`，确认章节、练习、变体和必需文件规则。
2. 从计划中提取章节名、练习名、编号和变体；缺失变体时默认使用 `explainer/`。
3. 创建目录前列出影响路径；涉及重命名时使用 `git mv`。
4. 为每个变体创建最小但非空的 `readme.md`。
5. 运行 lint；按 `references/lint-and-git.md` 迭代修复，直到通过或记录阻塞。
6. 仅在用户或调用方明确要求时提交 git。
7. 不自行选择持久化目录；需要归档时，由调用方 command 或 workflow 写入其声明的 `.speculo/...` 规范路径。

## 渐进披露

- `references/exercise-structure.md`：解析章节、练习编号、变体目录和必需文件时读取。
- `references/lint-and-git.md`：运行 lint、修复练习结构错误、移动目录或提交时读取。
