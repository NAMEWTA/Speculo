# 验证合同

## 静态验证

运行：

```bash
node <skill-root>/scripts/validate-generated-skill.mjs \
  --root <project-root> \
  --strict
```

必须确认：

- canonical 路径和 `SKILL.md` 存在；
- frontmatter 合法且 `name: engineering-standards`；
- 所有相对 Markdown 引用可解析；
- 没有未替换模板变量；
- project profile、module map、decisions/exceptions 存在；
- 每条 MUST/SHOULD 规则有 scope、source 和 verification；
- 未使用语言/框架目录没有生成；
- compatibility wrapper 仅一句且单向；
- 没有 wrapper 循环；
- canonical 内容只有一份。

## 语义验证

人工检查：

- 模块地图与仓库事实一致；
- 每个命令来自 manifest/CI/用户决策；
- React/Vue、Java/Spring、Go、Rust 规则只应用于正确 scope；
- current/target/migration 没有混写；
- 用户决定和仍有效例外被保留；
- 没有将 Builder 默认伪装为仓库事实；
- 不存在通用规则中的语言专属目录硬编码。

## 项目门禁

只运行已授权且项目真实存在的命令。记录：

```text
command
working directory
exit code
result
unverified impact
```

失败时保留原始失败，不通过改配置、删测试或扩大排除获取通过。

## 幂等性

对 generated Skill 重新执行同一输入时应产生零无意义 diff。若时间戳会变化，应从生成内容中删除时间戳或使用稳定的源版本字段。

## 报告

结果分为：

- passed；
- failed；
- not-run；
- not-applicable。

“未运行”不能报告为通过。
