# 快速开始

## 安装方法

在目标项目目录运行：

```bash
npm install -g @namewta/speculo
speculo init . --workflows specdev --skill-targets agents --skills domain/specdev
speculo doctor .
```

这只安装 SpecDev 及其宿主入口。需要全部四个领域和八个命令时：

```bash
speculo init . --workflows all --skill-targets agents,claude --skills all
```

Skills Hub 是可选工具包，交互安装器会显示实际可用项目。可以通过 `--hub-skills writing/eli5` 指定需要的包；整个包连同必要脚本一起安装。

当前源码的构建与本地运行见 [贡献指南](contributing.md)。若从 2.x 升级，先看 [升级说明](upgrade-v3.md)。

## 让 AI 开始

先确认宿主读到了当前项目的技能目录，再用自然语言描述目标。例如：

> 使用 SpecDev，评估 issues #12、#18 和这份用户反馈，做 v0.6。交互有变化时先让我看原型；确认后继续实现、验证并提交 PR。

或直接进入一个明确的步骤：

> 使用 SpecDev，把已验证的这个版本部署到 staging。

> 使用 SpecDev，修复这条报错并给出可复现的验证结果。

安装器不会启动模型，也不会把安装动作解释成提交、发版或部署授权。用户请求覆盖到的工作无需逐阶段重复确认；只在仍缺少会改变结果的产品决定或操作授权时询问。

## 下一次继续

告诉 AI 发版名称、现有记录或部署环境即可：

> 继续 v0.6，读取当前记录后完成剩余工作。

它读取相关记录、设计与真实代码。只需短期回答的工作不必留下文件；需要恢复的任务通常在一份 `releases/<name>/README.md` 中更新结果和下一步。更完整示例见 [开发流程与持久化](workflow.md)。
