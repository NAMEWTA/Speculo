# SpecDev Tools

## 校验一个 change

```bash
node <Path>{roots.workflows}/specdev/common/tools/validate-specdev.mjs</Path> \
  --stage <triage|diagnosis|grill|eli5|spec|tickets|goal-plan|implement|review|prototype|wayfinder|complete> \
  --repo <project-root> \
  <Path>{roots.state}/specdev/changes/{change}</Path>
```

`--stage` 只要求该阶段已经拥有的工件；所有已经存在的工件仍会验证。省略 stage 时验证当前存在的工件，不会因未来 Work 尚未运行而报错。`--repo` 可选；提供后会把状态中的 SHA、祖先关系、当前分支和完成时 clean 状态与真实 Git 仓库交叉验证。

## 校验 SpecDev 工作流包

```bash
node <Path>{roots.workflows}/specdev/common/tools/validate-specdev.mjs</Path> --self-check
```

工具只依赖 Speculo 已要求的 Node.js 运行时，不使用第三方包。返回码 `0` 表示没有阻塞性结构错误；warning 仍需人工判断。工具不替代项目测试、事实核验、设计审查或用户批准。
