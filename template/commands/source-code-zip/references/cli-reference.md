# 独立源码 ZIP 工具

`scripts/zip_source_code.cjs` 只使用 Node.js 内置模块，支持普通目录和 `type: module` 项目；不需要 npm 安装、Python 或系统 zip。脚本最低 Node 14，Speculo CLI 的支持版本以根 package.json 为准。

## 定位与调用

已安装项目可以用 `speculo resolve . --path '{roots.commands}/source-code-zip/scripts/zip_source_code.cjs'` 取得真实路径，再将返回值作为独立参数调用。没有 Speculo 安装时，直接使用用户或宿主提供的该脚本绝对路径。

源目录和输出路径相对调用时的 cwd 解释；跨目录执行前固定路径。含空格的路径必须作为完整参数传入。

```bash
node /absolute/tool/zip_source_code.cjs '/path/project with spaces' --dry-run --verbose
node /absolute/tool/zip_source_code.cjs '/path/project with spaces' --output /path/exports/source.zip --quiet
```

## 参数与实际含义

| 参数 | 行为 |
| --- | --- |
| `--output <ZIP>` | 指定输出，默认在源目录旁生成 `<name>.code.zip` |
| `--dry-run` | 显示候选清单，不创建 ZIP |
| `--verbose` | 显示跳过原因 |
| `--quiet` | 成功时只输出 ZIP 的绝对路径 |
| `--include <REGEX>` | 在源码白名单之外额外纳入匹配文件；不覆盖 ignore |
| `--ignore <REGEX>` | 增加排除规则，可重复 |
| `--ignore-from <FILE>` | 从 UTF-8 文件读取规则；空行和 # 注释忽略 |
| `--all-files` | 纳入所有未被 ignore 排除的普通文件 |
| `--no-default-ignore` | 禁用内置 ignore；需先建立并核对完整替代范围 |
| `--force` | 允许覆盖已存在输出；默认拒绝覆盖 |
| `--contents-only` | 不加源目录名作为 ZIP 顶层 |
| `--compression-level <0-9>` | 0 为存储；默认 9 |
| `--allow-empty` | 显式允许空归档 |
| `--show-defaults` | 查看源码白名单与实际默认规则 |

规则是 JavaScript 正则，不是 Git glob，作用于源目录相对路径并统一 `/`。ignore 优先，命中的目录不再遍历；所以 `--include` 和 `--all-files` 都不能带回默认已排除的 YAML 或锁文件。

## 默认范围与限制

默认保留常见源码扩展名、特殊构建文件和带 shebang 的无扩展名脚本，排除 VCS、依赖、缓存、构建产物、秘密、YAML、锁文件、普通 JSON、文档和媒体。符号链接不会被跟随。源文件与预览不修改。

想加入 `package.json` 可以使用 `--include '(^|/)package\.json$'`；想要完整可复建工程，应按命令的工程归档分支选择完整材料和工具，不把默认源码包当成项目备份。

工具写临时文件后发布输出，失败时清理自身临时产物；已有输出默认保持。出错先读返回码和错误，不通过连续 `--force` 掩盖范围、空间或权限问题。
