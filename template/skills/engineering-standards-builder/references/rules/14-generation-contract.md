# 项目规范生成合同

## Canonical 路径

唯一正式规范：

```text
.agents/skills/engineering-standards/
```

推荐树：

```text
SKILL.md
references/
  project/
    00-project-profile.md
    01-module-map.md
    02-decisions-and-exceptions.md
  rules/
    architecture-and-boundaries.md
    files-and-naming.md
    api-errors-resources.md
    testing.md
    security-and-data.md
    quality-gates.md
    review-and-delivery.md
  typescript/...
  java/...
  go/...
  rust/...
```

只创建有内容并被入口路由的目录。未使用语言目录不得存在。

## 主入口

使用 `templates/project-skill/SKILL.md.template`。主入口必须：

- frontmatter `name: engineering-standards`；
- 描述适用项目与触发分支；
- 先读取 project profile 和 module map；
- 根据当前变更 scope 路由到最小 references；
- 要求实现前检查边界、实现后运行真实门禁；
- 不复制详细语言规范。

## 项目 References

使用模板：

- `00-project-profile.md.template`
- `01-module-map.md.template`
- `02-decisions-and-exceptions.md.template`
- `review-checklist.md.template`

生成规则统一格式：

```text
### <Rule ID> <Title>
Scope:
Level: MUST | SHOULD | MAY
Source:
Applies when:
Rule:
Rationale:
Verification:
Exception:
```

不是每个轻量建议都要展开九个字段，但所有 MUST/SHOULD 必须至少有 Scope、Level、Source、Rule、Verification。

## 选择性生成

- 通用规则按项目风险裁剪，但安全、错误、资源、测试和门禁不能被无理由删除；
- TypeScript 项目才生成 `typescript/`；
- React/Vue 分别按模块生成，混合仓库分别限定 scope；
- Java/Spring Boot、Go、Rust 同理；
- 未支持语言生成通用规则与明确 fallback，不伪造专属语法规范。

## 命令

生成规范只记录：

- manifest/build/CI 中已存在的命令；
- 用户明确确认要新增的命令；
- 对尚未实现的目标命令标记 `planned`，不能当作当前可执行门禁。

## 兼容入口

兼容文件只有一句单向路由，使用 `templates/compatibility/`。创建条件：

- 仓库已有旧路径；
- 用户要求；
- `.claude` 或其他 Agent 目录实际存在并需要入口。

不得让 `.agents/skills/engineering-standards` 指回兼容路径。

## 写入安全

- create：目标已存在时停止或转 merge；
- merge/refresh：先读取、备份或通过版本控制保护，再原子替换；
- dry-run：只输出计划和内容摘要，不写文件；
- 不覆盖目标根外路径；
- 不修改生成代码或 Vendor；
- 不删除未在计划中声明的用户文件。
