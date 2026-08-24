---
id: upstream-fork-sync
type: skill
name: upstream-fork-sync
description: 上游同步评估：为持续二次开发的 Git fork 冻结已集成 checkpoint 与最新上游差异，生成 diff、冲突和定制风险报告；当任务涉及跟踪、评估或记录 fork 上游集成时使用。
---

# Upstream Fork Sync

以**检查点**为主导词。每个仓库始终分开记录：本次观测到的 upstream tip、可选本地 mirror tip，以及已经由产品分支历史证明完成集成的 upstream checkpoint。Fetch 或 mirror 变化不能推进集成 checkpoint。

## 1. 解析上下文

1. 从当前目录向上寻找并读取 `<Path>{roots.state}/workspace.json</Path>`，验证 `path_base` 和所有 roots，再读取 `<Path>{roots.config}</Path>`；无法唯一确定项目根时停止。
2. 读取项目 `AGENTS.md` 及其作用域内规则。项目存在工程规范时读取适用入口。
3. 将本 Skill 的唯一持久化根解析为 `<Path>{roots.state}/skills/upstream-fork-sync/</Path>`。独立运行只写该根；不得创建 workflow change 或 command 报告。
4. 读取 [Repository contract](references/repository-contract.md)，确定仓库、refs、网络刷新和副作用边界。

完成标准：项目根、Skill state 根、目标仓库集合和本次是否允许 fetch 都只有一个解释。

## 2. 建立稳定配置

读取 `<Path>{roots.state}/skills/upstream-fork-sync/repository-map.json</Path>`。不存在时，只读发现 Git 仓库、remotes、默认产品分支和 upstream tracking refs，按 [Repository contract](references/repository-contract.md) 创建 schema v1 配置；无法从 Git 事实唯一判断的字段一次性询问用户。配置已存在时验证，不静默改写。

读取 `<Path>{roots.state}/skills/upstream-fork-sync/customization-map.md</Path>`。不存在时创建最小稳定清单，记录 fork 必须长期保留的产品不变量和审查热点；无法从项目文档或代码证明的业务约束标记为待确认。该文件不接收运行 SHA、dirty paths、冲突或本次结论。

完成标准：每个 repository id 唯一，所有项目路径和 refs 可解析，稳定配置与动态运行事实分离。

## 3. 创建评估 change

读取 [State schema](references/state-schema.md) 和 [Report contract](references/report-contract.md)，从用户主题生成小写 ASCII kebab-case topic，然后运行：

```bash
node <Path>{roots.skills}/upstream-fork-sync/scripts/upstream-sync.mjs</Path> assess \
  --root . \
  --state-root <Path>{roots.state}/skills/upstream-fork-sync</Path> \
  --repository-map <Path>{roots.state}/skills/upstream-fork-sync/repository-map.json</Path> \
  --topic <topic>
```

- 默认离线使用本地 refs；只有用户明确要求刷新网络 refs 时添加 `--fetch`。
- 只需预览完整冻结快照时添加 `--dry-run`，此分支不写 state 或 change。
- 正常运行创建 `<Path>{roots.state}/skills/upstream-fork-sync/{date}-{topic}[-NN]/</Path>`，已有目录永不覆盖。

完成标准：脚本退出 0，change 的 state 与两份报告完整发布，根 `state.json` 只在 change 发布成功后更新。

## 4. 深化风险结论

逐仓库检查报告中的 Git 确认冲突、自动合并重叠和定制风险路径。对每条高风险路径使用报告冻结的 SHA 执行精确 `git diff <base>..<target> -- <path>`，再与 `customization-map.md` 的稳定不变量映射。

只把路径级证据支持的语义结论补入本 change 的报告。保持 Git 冲突、自动合并重叠、定制合同风险和 dirty-worktree 重叠为四个类别；零文本冲突不得表述为集成安全。

完成标准：所有冲突和定制热点都有结论或明确未验证项，报告中的命令可以从冻结 SHA 复现。

## 5. 返回后续选择

返回 change 路径、仓库 checkpoint、观测 upstream SHA、风险摘要和未验证项。列出适合继续处理的已安装 Work，但不自动创建 workflow change、不调用 Work、不 merge、不 commit、不 push；后续路线由用户选择。

完成标准：本次 Skill 在评估 change 完整后停止，用户能用冻结产物自行选择下一 Work。

## 6. 记录外部集成

只有其他 Work 已完成集成且用户要求更新 checkpoint 时进入此分支。读取目标 change state，并运行：

```bash
node <Path>{roots.skills}/upstream-fork-sync/scripts/upstream-sync.mjs</Path> record-integration \
  --root . \
  --state-root <Path>{roots.state}/skills/upstream-fork-sync</Path> \
  --repository-map <Path>{roots.state}/skills/upstream-fork-sync/repository-map.json</Path> \
  --change <change> \
  --repository <repository-id> \
  --merge-commit <full-sha> \
  --upstream-sha <full-sha> \
  --verification '<command>: exit 0'
```

该入口只在 merge commit 可从产品 ref 到达、目标 upstream SHA 是其精确非第一父节点且匹配 change 冻结目标时更新状态；它不执行集成。

完成标准：change state 和根 checkpoint 都已原子重读，实际 Git 历史与记录一致。

## 停止条件

目标 ref 缺失、保存的 checkpoint 不在产品历史、checkpoint 不在当前 upstream 历史、存在多个 merge-base、配置越界或状态 schema 非法时，停止且不移动 refs、不发布部分 change、不推进 checkpoint。返回准确 repository id、路径、refs 与 SHAs。
