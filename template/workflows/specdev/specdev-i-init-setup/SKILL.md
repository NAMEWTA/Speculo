---
name: specdev-i-init-setup
description: "发现项目事实，选择或复用可选协作方式并复用用户指定目录中的对应 Skill；仅在明确请求时建立当前工程 docs 基线。"
metadata:
  speculo-kind: work-skill
  speculo-id: specdev/init-setup
  speculo-domain: specdev
  speculo-contract-version: "2"
---

# 初始化设置

读取 <Path>{roots.workflows}/specdev/common/rules/domain-runtime.md</Path>，按 <Path>{roots.workflows}/specdev/common/rules/activation-and-memory.md</Path> 定位相关条目，明确项目、方法和数据根；直接使用无需 workspace 或 CLI。已有安装验证真实 roots，冲突只阻塞有关写入。普通 Work 不必先经过本入口。

## 流程

1. 只读探测包管理、workspace、构建/测试/类型/lint/CI、默认父分支、实际 worktree 与项目指令；定位真实入口和共享高冲突资源。未知验证命令保持未知，不凭框架名称编造。
2. 区分可用、未安装、未配置、未授权、不适用并注明依据。复用用户语言、工具、产物数量及已有配置；只问无法从仓库得到且实际影响当前任务的偏好。探测不自动安装依赖、发布或创建虚假 change。
3. 检查已有项目编排选择；未配置时提供 **Herdr / Orca / CLI / 暂时都不要** 四选一，已有有效选择则展示并复用，用户要求更改时才重选。Herdr/Orca 再由用户选择项目 `.agents/skills/` 或 `.claude/skills/` 入口目录；已明确的同范围选择直接复用。按 <Path>{roots.workflows}/specdev/specdev-i-init-setup/references/first-setup.md</Path> 保存项目级偏好并检查本地入口；缺失时引导通过 Speculo 安装器的 SKILLS-HUB 选择安装，当前按允许的 fallback 继续。只读、plan 或选择未完成时不写配置、不安装；普通 Work 不触发此问答。
4. 实际需要其他工具配置时继续使用上述参考。已有真实 GitHub/验证配置继续使用其 schema，不删除未知独有字段。无需求不创建 config、tracking、domain-layout、空知识目录、全局 status 或 change status。
5. 仅明确要求工程文档基线/全面理解代码时，直接使用 <Path>{roots.references}/writing-for-agents/references/current-facts-docs.md</Path> 的六步与覆盖表。最小 docs README/architecture 或已有负责正文导航，说明 HEAD/未提交或非 Git 范围、覆盖/未知/排除与实际验证；不改永久知识、不推进 docs-sync 基线。
6. 回读本次实际写入，报告已确认事实、必要偏好来源、验证命令/退出码和未知。只读调用无文件；有 change 的结果写回原 README/Evidence，不登记 Work 调用镜像。

## 停止与保全

未知 schema、旧活动或混合协议保留原件并交显式转换，不从初始化偷偷迁移。CLI 安装元数据与 back 不归本 Work。已有知识、用户配置和历史不覆盖；只读发现不证明方法已安装或业务已验收。

只有确实创建 worktree 时核对 `specdev-worktree/` 的忽略项与 owner：已安装的 CLI-managed 忽略项交 CLI 修复；直接模式按项目 owner 的真实授权维护，不能因没有 CLI 阻塞其他初始化事实发现。

## 完成标准

项目事实与未知有依据；本次选择已保存并回读或已有选择已复用，未完成的选择/写入据实报告。分别报告 Skill 已复用或未安装，以及工具可用、不可用或未检查。协作编排是可选能力：初始化生成的外部方式偏好允许不可用时回到当前智能体（mode: lead），Skill 缺失不阻塞独立的基础初始化，不得报告安装成功。实际运行与回退遵守 <Path>{roots.references}/coordination/coordination-contract.md</Path>，配置本身不授予提交、发布等其他动作权限。
