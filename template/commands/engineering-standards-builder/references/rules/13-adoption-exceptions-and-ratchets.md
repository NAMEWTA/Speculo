# 采用、例外与 Ratchet

## 当前状态与目标状态分离

项目规范同时记录：

```text
Current: 当前可运行事实
Target: 新代码或最终目标
Migration: 从 Current 到 Target 的阶段
```

不得把尚未落地的目标描述成“仓库已经如此”。

## Ratchet

适用于存量问题：

- 新代码必须满足目标规则；
- 修改旧代码不得扩大违规；
- 每次触及时降低一项可量化问题；
- CI 阻止新增违规，而非一次性阻塞全部历史；
- 基线文件可生成，但必须有所有者和减少趋势；
- 达标后删除基线和兼容例外。

可 Ratchet 的信号包括 lint 错误、复杂度、文件大小、覆盖率、深导入、不安全类型、依赖漏洞和废弃 API。

## 例外格式

```text
Exception ID:
Scope:
Rule:
Owner:
Reason:
Risk:
Compensation:
Created:
Expires or removal condition:
Verification:
```

永久例外也要解释为什么与通用规则不适用。临时例外没有 owner 或删除条件则无效。

## Merge/Refresh

已存在 generated Skill 时：

1. 读取全部项目 profile、决策和例外；
2. 将仓库事实重新扫描；
3. 区分用户维护内容与旧生成模板；
4. 生成 diff 计划；
5. 保留仍适用的项目特有规则；
6. 不用新默认覆盖用户决定；
7. 删除不再有触发技术栈的规则；
8. 报告规则来源变化。

## 完成条件

每个存量偏差都有立即强制、Ratchet、迁移阶段或有效例外之一；没有无限期“以后处理”。
