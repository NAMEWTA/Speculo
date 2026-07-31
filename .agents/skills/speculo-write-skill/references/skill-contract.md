# Skill authoring contract

## 包形态

```text
template/skills/<skill-name>/
  SKILL.md
  references/        # 可选：分支专属规则
  scripts/           # 可选：确定性机械操作
  assets/            # 可选：脚本或输出所需静态资源
  GLOSSARY.md         # 可选：入口直接指向的术语表
```

资源目录按实际需要创建；空目录、装饰性 README 和未引用样例不进入包。

## Frontmatter

最低字段：

```yaml
---
name: <kebab-case>
description: <一句模型或人类可用的摘要>
---
```

- `name` 与目录名一致。
- Model-invoked：省略 `disable-model-invocation`，description 以主导词开头并覆盖每个真实触发分支。
- User-invoked：设置 `disable-model-invocation: true`，description 只给人类说明用途，不堆触发同义词。
- 只有当前 Agent skill 运行时已实际支持且项目已有先例的字段才加入；不凭想象扩展 schema。

## Description

Model-invoked description 同时说明能力和分支：

```text
<主导词>……；当任务涉及 A、B 或另一 skill 需要 C 时使用。
```

每个分支只出现一次。身份、流程和限制留在正文。

## 主体

有序执行型 skill 使用：

1. 步骤标题；
2. 输入与动作；
3. 必要的 context pointer；
4. 以“完成标准”结束。

纯参考型 skill 可以没有流程，但必须说明调用方如何穷尽应用规则。

## Reference

Reference 只承载某些分支需要的完整规则。入口指针同时说明：

- 触发条件；
- 读取目标；
- 该文件帮助完成的步骤。

同一规则不在入口再摘要一份。跨多个作者技能的事实进入 `_shared/`；模板运行时自己的事实进入 `template/` 对应资产。

## Script

加入 script 的条件：

- 动作确定、重复、容易漏项；
- 输出可验证；
- Agent 手工执行不会提供更好语义判断。

Script 必须：

- 不依赖未声明的全局包；
- 接受显式路径参数；
- 拒绝越出目标根；
- 默认不覆盖，或提供显式 `--force`；
- 错误写 stderr，退出码非零；
- `--help` 说明输入、输出和示例；
- 正常与失败样例都被运行。

## 所有权

Skill 可以：

- 返回文本、计划或结构化结果；
- 修改 `template/` 中属于自身维护任务的静态资产；
- 在运行时写调用方明确提供且已获授权的目标。

Skill 不可以自行决定 command 报告路径、workflow state namespace 或外部副作用授权。这些由 command/workflow 所有者传入。

## 合并与拆分

新增 skill 需要至少一个条件：

- 有独立的 model 触发分支；
- 有两个或更多调用方需要独立复用；
- 机械脚本与规则形成稳定能力边界。

只有单个调用方且没有独立触发需求的逻辑，放回该调用方的 reference。两个 skill 共享同一主导词时，优先合并或明确上下游，而不是添加更多同义 description。

## 删除完成条件

删除或重命名 skill 时，枚举并迁移：

- `template/commands` 调用；
- `template/workflows` 的 `<Path>`；
- 其他 `template/skills` 的 Markdown 链接或路径；
- canonical 源映射；
- scripts/tests/package 命令；
- 文档中的公开 id。

全仓搜索旧 id 为零，或每个保留命中都属于历史说明时完成。
