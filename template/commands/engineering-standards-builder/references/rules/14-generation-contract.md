# 项目 Skill Set 生成合同

## 最小结构

必须生成 `.agents/skills/engineering-standards/`，它是项目工程规范的权威入口和路由器。只有存在独立触发价值时才生成同级领域 Skill。

```text
.agents/skills/
  engineering-standards/
    SKILL.md
    generated-skill-set.json
    references/project/
      00-project-profile.md
      01-module-map.md
      02-decisions-and-exceptions.md
      03-skill-map.md
      04-source-and-template-map.md
      review-checklist.md
  <optional-domain-skill>/
    SKILL.md
    references/...
```

根入口使用 `templates/project-skill/SKILL.md.template`；领域入口使用 `templates/domain-skill/SKILL.md.template`。详细内容只创建有证据且被入口路由的文件。

## Skill 拆分门

领域 Skill 必须同时具备：独立触发场景、重复使用价值、项目证据、清晰责任边界和上下文缩减收益。语言、目录、Agent 数量或“看起来完整”都不是拆分理由。

根 Skill 维护跨域规范、项目画像、模块地图、决策/例外、Skill Map 和来源地图。领域 Skill 维护特定开发工作流、关键源码/模板导航、集成点和验证方式；不得重新定义根 Skill 的冲突规则。

## 项目源码与模板引用

每个重要来源使用项目根相对路径，并说明：

- 何时读取；
- 它负责的能力或生成范围；
- 输出目标；
- 生成后需要的注册、import、配置或补充实现；
- 对应消费者、测试或 validator；
- 发现 legacy 或不适用场景时如何处理。

项目 FM、scaffold 和源码保持唯一事实源。Skill 不复制 `.ftl`、源码文件或大段代码；只做精准导航和行为约束。

## 所有权清单

根目录中的 `generated-skill-set.json` 使用 `templates/project-skill/generated-skill-set.json.template`，最小 schema：

```json
{
  "schema_version": 1,
  "generator": "engineering-standards-builder",
  "skills": [
    {
      "name": "engineering-standards",
      "path": ".agents/skills/engineering-standards",
      "role": "router"
    }
  ]
}
```

允许的 role 只有 `router` 和 `domain`。必须恰有一个 router；path 必须等于 `.agents/skills/<name>`。不要加入时间戳、hash、模型、扫描计数或可从文件树重新推导的字段。

## 安全刷新

- create：目标名称与已有未登记 Skill 冲突时不得覆盖；
- refresh：只管理旧清单列出的 Skill，保留其他 `.agents/skills/*`；
- legacy 根 Skill 无清单时，只可在计划中声明接管 `engineering-standards` 本身，不能顺带接管同级 Skills；
- 删除和重命名必须在计划中列出；
- 先形成完整候选并验证，再替换已登记内容；失败时保持或恢复旧 Skill Set；
- 保留仍有效的用户决策、例外、公共 API 和项目特有知识；
- 相同输入重复刷新不得产生无意义 diff。

兼容入口只在用户要求或旧路径已存在时使用 `templates/compatibility/`，并保持一句单向路由；它们不进入项目规范正文。

## 规则格式

所有 MUST/SHOULD 至少包含：

```text
Scope:
Level: MUST | SHOULD
Source:
Rule:
Verification:
```

项目命令只能来自现有配置/CI 或用户明确决定。尚未实现的命令标记 `planned`，不能报告为当前门禁。
