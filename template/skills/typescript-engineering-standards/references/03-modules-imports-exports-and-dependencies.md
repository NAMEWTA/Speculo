# 模块、导入、导出与依赖

## 命名导出优先

默认使用命名导出：

```ts
export function parseTerminalOutput(input: string): ParsedOutput {
  // ...
}
```

默认导出仅用于：

- 框架规定的页面、路由或配置入口。
- 工具链必须的默认导出。
- 仓库已形成明确且一致的入口惯例。

命名导出便于搜索、自动导入、重构和统一引用名称。

## 一个文件一个主要公开概念

一个文件可包含少量私有辅助函数，但通常只公开一个主要能力或一组高度相关能力。辅助函数达到独立职责后，应拆成具有具体名称的文件。

不要为了测试内部细节而导出私有辅助函数；优先通过公共行为测试，或将真正独立的纯逻辑抽出。

## Barrel 文件

允许 `index.ts`：

- 作为包或领域的明确公共入口。
- 隐藏内部实现并稳定外部 API。
- 作为依赖装配或框架入口。

禁止：

- 每个目录机械创建 `index.ts`。
- 建立全项目万能 Barrel。
- 通过 Barrel 暴露内部实现。
- 通过 Barrel 形成循环依赖。

## 导入顺序

默认顺序：

1. Node.js 内置模块。
2. 第三方依赖。
3. 项目别名。
4. 相对路径实现。
5. 类型导入按照工具规则分组或合并。

```ts
import { readFile } from 'node:fs/promises'

import { z } from 'zod'

import { createLogger } from '@/shared/logger'

import { parseConfig } from './config-parser'

import type { AppConfig } from './app-config'
```

要求：

- Node 内置模块使用 `node:` 前缀。
- 仅作为类型使用时采用 `import type`。
- 不保留未使用或重复导入。
- 副作用导入必须有明确原因。
- 路径别名对应稳定边界，不用于任意跨层跳转。

## 依赖方向

推荐：

```text
UI / Entry
    ↓
Application orchestration
    ↓
Domain
    ↓
Ports / contracts
    ↑
Infrastructure adapters
```

- 领域逻辑不直接依赖数据库、HTTP、文件系统或 UI 框架。
- 共享模块不依赖具体领域。
- 底层模块不反向导入界面层。
- 跨环境调用通过显式契约和适配器。

## 循环依赖

循环依赖是架构问题，不应通过调整导入顺序或增加 Barrel 隐藏。解决方式：

- 提取真正共享的契约。
- 使用依赖注入反转方向。
- 合并实际属于同一职责的模块。
- 将端口放在需求方而非实现方。
- 缩小公共入口。

## 公共 API

公开库或跨包模块应：

- 明确列出允许导出的入口。
- 避免消费者导入内部路径。
- 不暴露框架、数据库或第三方 SDK 的内部类型，除非这是刻意的 API 设计。
- 保持输入、输出和错误契约稳定。
- 变更时考虑语义化版本和迁移说明。
