# Skill Set 验证合同

## 静态验证

运行：

```bash
node <skill-root>/scripts/validate-generated-skill.mjs --root <project-root> --strict
```

验证器必须确认：

- `engineering-standards` 根路由和六个项目 references 存在；
- `generated-skill-set.json` schema、唯一 router、name/path/role 与实际目录一致；
- 清单中每个 Skill 的 frontmatter 合法，根入口能路由到所有领域 Skill；
- Markdown 链接只能落在项目根内，目标存在且不经 symlink 越界；
- 来源地图至少引用一个 Skill 外的真实项目文件；
- 没有未替换模板变量；
- MUST/SHOULD 规则包含 scope、source、rule 和 verification；
- 生成的语言/框架规则有 Project Inventory 信号；
- compatibility wrapper 只有一句且不形成循环；
- 同名 canonical 正文没有重复副本。

验证器只检查清单声明的 Builder 产物，不把清单外 Skill 当作待删除对象。

## 语义验证

人工复核模块地图、Skill 拆分、命令来源、模板责任范围、消费者/测试、current/target/migration、用户决策和例外。尤其确认：

- 没有把 Builder 默认写成项目事实；
- 没有用 legacy 多数模式覆盖用户指定模板或成熟实现；
- 没有复制项目模板/源码造成第二事实源；
- 每个领域 Skill 都能独立触发并减少上下文；
- 未覆盖范围被明确省略或标为待确认，而非伪造规则。

## 项目门禁与幂等性

只运行项目真实存在且已授权的命令，记录 working directory、退出码、结果和未验证影响。失败时保留原始失败，不改配置或删测试掩盖问题。

使用相同项目事实与决策再次生成，应无无意义 diff。时间戳和扫描计数不得进入生成内容。

结果使用 `passed`、`failed`、`not-run`、`not-applicable`；未运行不能报告为通过。
