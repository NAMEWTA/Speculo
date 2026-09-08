---
name: speculo-write-skill
description: 编辑 Speculo 的 `template/skills/<name>/`；仅在新增、合并、重命名或审计 skill 触发、入口、references、scripts、assets 或所有权时使用。
---

# Speculo Write Skill

把一个可复用职责编译成可按需触发的 skill。入口只保留路由和每次运行必需的边界。

## 读取

先读：

- [`../_shared/project-model.md`](../_shared/project-model.md)
- [`../_shared/path-and-reference-rules.md`](../_shared/path-and-reference-rules.md)
- [`../_shared/authoring-quality.md`](../_shared/authoring-quality.md)
- [`../_shared/authoring-protocol.md`](../_shared/authoring-protocol.md)
- [`references/skill-contract.md`](references/skill-contract.md)
- `template/skills/writing-great-skills/SKILL.md`

再按目标读取目标 skill、真实调用方和同主导词资产。不要默认读取全部 template。

## 路由

1. 确认唯一职责、真实触发分支、调用方、写入 owner 和 `model-invoked | user-invoked`。
2. 只把每次运行必需内容留在 `SKILL.md`；分支规则、示例、schema 和 flags 放入 references/assets，并在触发处指针化。
3. 修改 `template/skills/<name>/` 及其调用方；不要创建未声明的 `.speculo` namespace。
4. 运行共享 gates、正常/失败场景和项目资产校验；需要生成物时由生成器重建。

## 停止条件

职责重复、触发无法区分、owner 不明、静态引用失效、未授权副作用或验证失败时停止受影响分支并报告路径、命令和未验证项。
