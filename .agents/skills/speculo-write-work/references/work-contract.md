# Work authoring contract

## 路径与命名

```text
template/workflows/<workflow>/<Letter>-<slug>/
  <Letter>-<slug>.md
  <branch-file>.md       # 可选
```

`Letter` 是便于发现的稳定前缀；slug 为 kebab-case。入口文件与目录完全同名。

## Frontmatter

当前 workflow-entry 形态：

```yaml
---
id: <workflow>/<semantic-id>
type: workflow-entry
workflow: <workflow>
name: <显示名>
description: <从输入推进到结果的一句话>
keywords: [<主导词>, <真实检索词>]
---
```

`semantic-id` 可以与去掉字母前缀的 slug 对齐；以目标 workflow 现有 id 和调用方为事实源。重命名时同步 INDEX、状态中的 `work_id` 约定、交叉引用、canonical 和测试。

## 入口内容

Work 入口通常包含：

- 身份与职责边界；
- 输入与权威；
- `## 流程`；
- 总体 `## 完成标准`；
- `## 子文件引用` 或等价的就近指针。

不强制固定章节数量。真实过程和可检查条件优先于模板一致性。

## 步骤

推荐依赖顺序：

1. 解析 roots，选择或恢复 change；
2. 读取已存在权威工件；
3. 探索可发现事实；
4. 只对高影响偏好或冲突请求用户决定；
5. 生成或更新该 work 拥有的工件；
6. 运行 schema/tool/项目验证；
7. 更新 workflow 与 change 状态；
8. 返回结果、证据和下一 work。

不适用步骤可以省略。每步写自己的完成标准，入口末尾再列全局完成条件。

## 输入权威

明确列出：

- 必需输入：缺失即阻塞；
- 可选输入：不存在时静默跳过；
- 冲突裁决：使用 workflow `artifact-contract` 或根 README 激活合同的规则；
- 外部事实：代码、测试、schema、配置和经验证文档；
- 用户决定：只承载无法从仓库发现的高影响取舍。

不得把缺失工件当作已确认事实。

## 输出与状态

运行时写入：

```text
{roots.state}/<workflow>/changes/{change}/...
```

Work 还可以更新：

- `{roots.state}/<workflow>/status.json`；
- change `.status.json`；
- 根 README 激活合同明确声明且由该 work 拥有的长期 namespace。

`template/workflows/<workflow>/_state/` 是初始化种子，不是运行时目的地。Work 不写 command 报告或 docs-sync sidecar。

每个输出说明：文件名、owner、首次创建/更新时机、原子写入方式、验证和冲突语义。

## 子文件

下沉条件是分支，而非长度。子文件适合：

- 某一模式专属协议；
- 只在某步骤加载的模板；
- 大型平级规则集；
- 某个校验器的输入 schema。

入口指针说明触发步骤。跨 work 共同规则进入 `common/rules`；有独立调用过程且至少两个 work 使用的能力进入 `common/skills`。

## 路由

Work 结束时返回：

- 结果枚举；
- 权威工件完整 `<Path>`；
- 验证命令与结果；
- 尚未解决的高影响问题；
- 下一 work 的完整 `<Path>`，或明确完成/阻塞。

只有 workflow 明确串联或用户要求时自动进入下一 work；否则返回路由而不隐式扩大任务。

## 副作用与偏差

项目事实与计划冲突时，记录偏差、停止受影响路径并返回上游 owner 修订。提交、push、merge、worktree 删除、发布、部署、归档移动和不可逆迁移需要 owning step 的明确授权。

## 完成

Work 完成时：

- owned 工件已原子写入并重读；
- schema 和适用验证通过；
- 每个验收条件有证据；
- workflow/change 状态与工件一致；
- 未决问题没有被伪装成 Ready；
- 下一路由和完整路径已返回。
