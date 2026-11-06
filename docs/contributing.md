# 贡献指南

## 开发

使用 `package.json` 声明的 Node.js 与 pnpm 版本：

```bash
pnpm install --frozen-lockfile
pnpm check
pnpm verify-bin
pnpm verify-package
```

`pnpm check` 编译、运行隔离测试并检查分发入口及相对文档链接。`verify-package` 创建真实 tarball，在独立临时目录安装，再验证两个宿主的完整技能、刷新、移除和用户数据保留。依赖必须可从配置的 registry 或缓存取得。

本地试用：

```bash
pnpm build
node dist/src/cli.js init /path/to/disposable-project --workflows specdev --skill-targets agents --skills domain/specdev
node dist/src/cli.js doctor /path/to/disposable-project
```

## 修改方法

工作流直接编辑对应 `SKILL.md`，无需改 manifest、模板、schema 或生成一套 Canonical 文档。命令直接编辑对应 `COMMAND.md`。普通说明不应触发一整套必填计划和证据文件。

新增知识时先找已有的维护位置。新增技能时明确触发条件和实际价值；只有需要确定性操作或独立技术资料时才增加脚本、references 或 assets。修改第三方衍生内容时保留必要许可，更新 [来源说明](../THIRD-PARTY-NOTICES.md)。

按真实改动选择验证。提示词的正常、边界场景可以用一次独立任务验证，保留简短结果即可；不要用“含有某标题/关键字”宣称模型行为已经通过。程序行为变化保留相应失败与恢复测试。

## 提交与发布

PR 说明问题、改变后的行为、实际检查结果及剩余限制。破坏性方法入口变化写入 [升级说明](upgrade-v3.md)。维护者决定何时发布；CI 的 `v*` tag 路径按现有流程暂存 npm 包，再经 npm 的维护者批准公开。日常 PR 不创建 tag 或发布。
