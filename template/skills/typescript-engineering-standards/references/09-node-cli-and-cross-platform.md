# Node.js、CLI 与跨平台规范

## Node 内置模块

使用 `node:` 前缀：

```ts
import { readFile } from 'node:fs/promises'
import path from 'node:path'
```

## 路径

使用 `node:path` 组合和归一化路径，不手工拼接分隔符：

```ts
const configPath = path.join(rootPath, 'config', 'app.json')
```

涉及安全或相等判断时考虑：

- Windows 盘符和分隔符。
- UNC 路径。
- 大小写敏感差异。
- 符号链接。
- 相对路径和路径遍历。
- 规范化前后的边界检查顺序。

## CLI 分层

推荐拆分：

- `parse-cli-arguments.ts`
- `validate-cli-options.ts`
- `run-export-command.ts`
- `render-cli-error.ts`

要求：

- 参数解析与业务执行分离。
- 正常机器输出写 `stdout`，错误写 `stderr`。
- 明确定义退出码。
- 支持 `--help` 和 `--version`。
- 底层领域代码不直接调用 `process.exit()`。
- 信号处理和资源清理集中管理。

## 环境变量

在启动边界一次解析、验证和标准化：

```ts
type AppEnvironment = {
  port: number
  logLevel: LogLevel
}

export function loadEnvironment(
  source: NodeJS.ProcessEnv
): AppEnvironment {
  // ...
}
```

业务代码不应在各处直接读取 `process.env`。

## 子进程

- 优先使用参数数组，不拼接 Shell 字符串。
- 必须拼接时按目标 Shell 正确转义。
- 处理超时、取消、退出码、信号和输出上限。
- 避免将不可信输入直接作为命令或参数。
- 明确清理孤儿进程。

## 文件和流

- 大文件优先流式处理。
- 关闭文件句柄和流。
- 处理背压。
- 临时文件使用隔离目录并在失败路径清理。
- 写关键文件时考虑原子替换和崩溃恢复。

## 跨平台

跨平台逻辑应集中在适配器中。测试至少覆盖：

- 路径和换行符。
- Shell 参数引用。
- 文件权限和可执行位。
- 信号差异。
- 大小写和文件锁行为。

不要把平台判断散落在整个业务代码中。
