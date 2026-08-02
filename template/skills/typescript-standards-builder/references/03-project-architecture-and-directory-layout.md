# 项目架构与目录布局

## 先表达稳定边界

目录优先表达以下一种或组合后的稳定边界：

- 运行环境：`main/`、`renderer/`、`server/`、`worker/`、`cli/`。
- 产品领域：`user-auth/`、`orders/`、`payments/`。
- 架构职责：`domain/`、`application/`、`infrastructure/`。
- 独立发布单元：`apps/`、`packages/`。

对多运行环境项目，通常先隔离运行环境，再在各环境内部按领域组织。

## 领域内部局部平铺

这是生成规范的固定默认原则：一个职责明确的领域目录应优先直接平铺文件，不为每个文件建立同名目录。

推荐：

```text
features/user-auth/
├── login-command.ts
├── login-command.test.ts
├── login-policy.ts
├── login-service.ts
└── user-session.ts
```

不推荐：

```text
features/user-auth/
├── commands/login/login-command.ts
├── policies/login/login-policy.ts
└── services/login/login-service.ts
```

增加子目录的条件：

- 形成稳定、可命名的子领域。
- 同级文件长期较多，浏览成本明显上升。
- 文件组拥有独立入口、资源、夹具或生命周期。
- 文件组需要整体移动、替换或发布。
- 运行环境或依赖方向要求物理隔离。

阈值应根据项目实际规模确定，不能机械复制通用数字。

## 领域优先，技术类型局部化

小项目可从技术类型目录起步；业务增长后，应把 `components/`、`hooks/`、`services/` 等技术目录移动到对应领域内部。

不要在同一层混用互不相干的分类主轴。

## `shared/` 准入

代码进入共享层前应满足：

1. 至少有两个真实调用方。
2. 不依赖具体业务领域。
3. 能用具体名称说明能力。
4. API 相对稳定。
5. 不造成反向依赖。
6. 共享确实减少重复，而非提前抽象。

`shared/` 不是“不知道放哪里”的收容区。

## 多运行环境

- 各环境使用独立 `tsconfig` 或项目引用。
- 浏览器代码不得意外导入 Node 专属模块。
- 服务端代码不得无意依赖 DOM。
- 跨环境数据通过显式、可序列化、可版本化契约。
- 桥接 API 最小化，并验证所有边界输入。

不要把 Electron 专属的 `main/preload/renderer` 目录复制到普通项目；只在实际存在这些运行环境时采用。

## 拆分信号

- 一个目录同时包含多个运行环境。
- 改动一个领域经常触发无关领域。
- 文件名需要大量前缀才能区分。
- 公共入口持续扩大。
- 依赖图出现循环。
- 不同部分需要不同构建、发布或权限策略。
