# 自适应访谈与决策收敛

## 目标

访谈只解决仓库事实无法确定、且会改变生成结果的高影响选择。没有固定问题数量。

## 问题触发条件

仅当至少满足一项时提问：

- 两个或更多现有实践发生真实冲突；
- 目标状态会改变公共 API、模块边界或目录主轴；
- 需要决定 MUST/SHOULD、立即强制或 Ratchet；
- 框架/语言版本迁移影响可用 API；
- CI 门禁或测试层级缺失且默认选择代价明显不同；
- 例外需要所有者、期限或风险接受。

## 问题格式

```text
事实：<证据路径与当前状态>
影响：<不同选择会改变什么>
推荐：<默认值及理由>
选项：
A. <可执行结果>
B. <可执行结果>
C. <可执行结果>
可自定义：是
```

一次只处理一个决策维度；高度耦合的两个选项可同轮处理。用户回答后立即记录：

```text
Decision ID:
Scope:
Decision:
Source: user-decision
Rationale:
Migration:
Verification:
```

## 常见通用决策

- whole repository 或指定模块；
- 新代码立即强制、存量 Ratchet 或阶段性全量迁移；
- public API、允许的依赖方向和跨模块访问；
- 架构/领域/包哪个是目录主轴；
- 测试层级、真实依赖和 CI 必跑范围；
- 格式、Lint、类型/编译、测试和构建门禁职责；
- 文件复杂度预算如何由仓库分布推导；
- 例外审批、所有者、到期与删除条件。

## 语言/框架问题

仅加载对应适配器中的问题。例如：

- TypeScript：`type/interface`、barrel、typed linting、不同运行环境 tsconfig；
- React：函数组件迁移、Server/Client 边界、状态工具；
- Vue：Vue 2/3、Options/Composition、`<script setup>`、Pinia/Vuex；
- Java/Spring Boot：Maven/Gradle、多模块、package-by-feature、事务和测试 slice；
- Go：公开 package、`internal`、命令布局、context 与 goroutine 生命周期；
- Rust：MSRV、unsafe、Clippy level、features、crate/public API。

## 直接生成模式

用户已经明确授权实施时：

- 使用仓库主导实践；
- 对新项目采用官方适用默认；
- 对存量项目采用 Ratchet；
- 不确定且高风险的事项标记为 `pending-decision`，不伪造用户选择；
- 继续生成可用规范，不用形式化问答阻塞。

## 完成条件

所有会改变目录、API、作用域、强制级别、迁移或 CI 的未知项均已决策或登记；任何默认值都有来源；没有询问可由仓库直接回答的事实。
