# Work authoring contract

## 结构与身份

入口为 template/workflows/<domain>/<domain>-<letter>-<name>/SKILL.md；可选 references/、scripts/、assets/。name 必须等于目录名，字母小写；business ID 保持 domain/semantic-id。领域 manifest 注册每个 Work。

```yaml
---
name: specdev-i-implement
description: 完成一个已授权实现步骤并返回验证证据。
metadata:
  speculo-kind: work-skill
  speculo-id: specdev/implement
  speculo-domain: specdev
  speculo-contract-version: "2"
---
```

YAML 使用真实解析器，metadata 只含字符串值。投影保持 YAML 字节，不重写名称、描述或扩展。重命名同步 manifest、领域路由、引用、canonical、测试；不靠旧路径兼容表。

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
7. 更新本领域唯一负责工件的事实与接续；SpecDev 不维护调用镜像；
8. 返回结果、证据和下一 work。

不适用步骤可以省略。关键步骤写可观察的完成条件，入口给出整体验收；无需为机械小步骤重复同一验收段。

## 输入权威

明确列出：

- 必需输入：缺失即阻塞；
- 可选输入：不存在时静默跳过；
- 冲突裁决：使用 workflow `artifact-contract` 或common/rules/domain-runtime.md 激活合同的规则；
- 外部事实：代码、测试、schema、配置和经验证文档；
- 用户决定：只承载无法从仓库发现的高影响取舍。

不得把缺失工件当作已确认事实。

## 输出与状态

运行时写入：

```text
{roots.state}/<workflow>/changes/{change}/...
```

仅领域合同确实声明且存在唯一 owner 时，Work 才可更新下列既有域状态；SpecDev 新协议不使用前两项：

- `{roots.state}/<workflow>/status.json`；
- change `.status.json`；
- common/rules/domain-runtime.md 激活合同明确声明且由该 work 拥有的长期 namespace。

`template/workflows/<workflow>/_state/` 是初始化种子，不是运行时目的地。普通 Work 不写 command 报告或 docs-sync sidecar；用户显式 handoff 时切入共享交接方法，由其声明本次会话报告或 change/handoff.md 的唯一作者和路径，不借此改变业务 owner。

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
- 本域权威工件、实际结果与结论一致，无重复可写镜像；
- 未决问题没有被伪装成 Ready；
- 下一路由和完整路径已返回。


## SpecDev 的 Markdown 优先协议

普通 Work 项目/必要资源明确即可直接使用，不以 CLI/workspace/config/status 为通用前置；安装故障仍按重叠写集停止。简单 change 使用 README 的唯一 Outcome、scope/acceptance/verification；无票 Goal 用原清单，有票进度归 Ticket/Evidence。用户指定独立产物、DESIGN、Ready、Skill binding、完整 Gate/集成证据都保留。

复杂 owner 归原 Plan lead；只有实际交接/高风险动作才在原负责工件记录 owner/依据/写集，不预建 leadership 或批准槽。整体完成/取消由原 owner 判定，A 验证并先维护现役 change/ADR/context/docs 及适用 DESIGN，再最后无覆盖移动。当前 docs 方法跨领域共享，不隐式 docs-sync、Git 或永久知识写入。
