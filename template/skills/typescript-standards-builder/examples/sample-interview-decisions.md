# 问答决策示例

## 自动识别

- pnpm Workspace。
- ESM。
- React + Node.js。
- Vitest 单元测试已与源码共置。
- ESLint 和 Prettier 已在 CI 中运行。

## 用户确认

- 运行环境第一层隔离，环境内部按领域组织。
- React 业务组件使用 `PascalCase.tsx`。
- 默认命名导出，Barrel 仅用于包公共入口。
- 默认使用 `type`，扩展契约使用 `interface`。
- 普通 TS/TSX 文件软上限分别为 320/420 行。
- 历史超限文件使用 Ratchet，不立即全量整改。

## 默认基线

- 领域内部局部平铺。
- 文件名具体。
- 注释解释 WHY。
- 单元测试共置。
- CI 必跑格式、Lint、类型、测试和构建。
