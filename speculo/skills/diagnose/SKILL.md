---
id: diagnose
type: skill
name: Diagnose
description: 针对疑难 Bug 和性能回退执行纪律化诊断循环；当 dev/H 或 hotfix workflow 需要复现、假设、插桩、修复和回归验证时使用。
---

# Diagnose Skill Wrapper

## 何时使用

当用户报告 Bug、异常、测试失败、性能回退，或 dev workflow 进入 `dev/H` hotfix/diagnose 路径时使用。

## 输入

- 用户描述的失败现象、日志、复现步骤或性能症状
- 当前 change 目录及调用方 workflow/command 指定的产物路径
- 可运行的测试、脚本、服务或其他反馈循环

## 输出

- 诊断记录、假设列表、插桩结果、修复与回归验证结论
- 若缺少可信反馈循环，输出已尝试方法和需要用户提供的材料

## 执行步骤

1. 读取并严格遵循 `source/SKILL.md`。
2. 需要 HITL 脚本时，按 `source/scripts/hitl-loop.template.sh` 的说明使用。
3. 持久化由调用方负责；本 skill 不直接写 `.speculo/` 或 `.status.json`。
4. 调用方要求报告时，把 source skill 的阶段结果整理到调用方指定产物中。

## 渐进披露

- `source/SKILL.md`：进入诊断循环时读取。
- `source/scripts/hitl-loop.template.sh`：只有必须由人类操作才能复现时读取。
