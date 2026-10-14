---
name: speculo-write-skill
description: 编辑 Speculo 的 领域/Work 标准 Skill 与私有 common Skill 下的技能；仅在新增、合并、重命名或审计 skill 触发、入口、references、scripts、assets 或所有权时使用。
---

# Speculo Write Skill

把一个可复用职责编译成可按需触发的 skill。入口只保留路由和每次运行必需的边界。

## 读取

先定位本次目标、真实调用方和相关验证。纯文字修正核对局部事实即可；结构或行为变化时使用 [作者协议](../_shared/authoring-protocol.md)，按其中条件选择共享参考，不默认通读整个仓库。触发、元数据、包结构或所有权变化时读 [Skill 合同](references/skill-contract.md)；写作结构重构再读仓库根 `template/references/writing-for-agents/writing-contract.md`。 已加载且未变化的规则可复用。

## 路由

1. 确认唯一职责、真实触发分支、调用方、写入 owner 和 `model-invoked | user-invoked`。
2. 只把每次运行必需内容留在 `SKILL.md`；分支规则、示例、schema 和 flags 放入 references/assets，并在触发处指针化。
3. 修改 目标 `SKILL.md` 及资源目录 及其调用方；不要创建未声明的 `.speculo` namespace。
4. 按 [验证选择](../_shared/validation-gates.md) 检查实际变化；需要生成物时由生成器重建。

## 停止条件

职责重复、触发无法区分、owner 不明、静态引用失效、未授权副作用或验证失败时停止受影响分支并报告路径、命令和未验证项。
