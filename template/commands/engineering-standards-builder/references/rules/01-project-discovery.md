# 项目发现合同

## 确定性基线

先运行只读扫描：

```bash
node <skill-root>/scripts/discover-project.mjs --root <project-root> --pretty
```

默认捕获 stdout，不把 inventory 写进项目。只有用户明确需要保留诊断证据时才使用 `--output`，且输出路径必须在项目根内。

扫描器识别 Workspace/Monorepo、多模块、语言、框架、build/test 系统、CI、现有规范以及生成/Vendor/构建目录。它不执行安装、构建、测试、生成器、项目脚本或网络请求。

## 项目语义审计

扫描之后仍要检查每个可编辑模块的：

1. manifest、build、formatter、lint、编译和测试配置；
2. CI 真正执行的命令及 working directory；
3. 公共入口、依赖方向和跨模块消费者；
4. 成熟实现、相应测试、失败路径与资源清理；
5. 用户指定需要学习的代码和目录；
6. FM、scaffold、generator asset、catalog、context contract 与其 validator；
7. README、ADR、AGENTS、CLAUDE、CONTRIBUTING 和现有 Skills；
8. legacy、generated、vendor、fixture、冻结和不可编辑区域。

代表性样本按架构角色和调用链选择，不按文件名排序取前几个。只出现依赖或扩展名是“信号”，不能单独升级为全模块规则。

## Agent Team 证据合同

有独立证据域且运行环境支持时，由 leader 派只读 scouts 并行审计。每个 scout 返回：Scope、Observed capability、Canonical source paths、Mature implementations、Template paths、Consumers and tests、Applicable conditions、Legacy/counterexamples、Conflicts/unknowns、Recommended skill boundary。

scout 不修改项目，不直接生成最终 Skill。leader 复读高影响文件、解决跨域冲突并负责唯一写入。团队不可用时按同一合同顺序执行。

## 置信度

- **high**：配置、入口、CI、测试或真实消费者直接支持；
- **medium**：多个稳定源码模式与目录结构相互支持；
- **low**：仅由目录名、少量文件或间接依赖推断。

低置信度且高影响的判断必须询问或登记为 `pending-decision`。

## 完成条件

每个模块和模板职责均可追溯；项目规范来源、反例、冲突、未知项和扫描限制明确；没有向用户询问仓库可直接回答的问题。
