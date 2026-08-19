---
name: source-code-zip
description: 使用单文件 Node.js 脚本把指定源码目录打包为精简 ZIP，并通过可编辑的 JavaScript 正则 IGNORE 规则排除 node_modules、构建产物、压缩包、.env、YAML、密钥、媒体和其他非代码文件。用户要求归档、传输、备份或提交源码目录时使用。必须优先直接使用 node 运行；不得为了运行该脚本执行 npm install。
---

# Source Code ZIP

把一个目录压缩为安全、精简、主要只包含源码的 ZIP。实际执行逻辑位于：

```text
scripts/zip_source_code.js
```

该实现只有一个 JavaScript 文件，只使用 Node.js 内置模块：

```text
fs
path
os
crypto
zlib
stream
util
```

不需要：

- `npm install`
- `package.json`
- `node_modules`
- Python 或 `uv`
- 系统 `zip` 命令
- 任何第三方 JavaScript 包

建议使用 Node.js 14 或更高版本。

## 必须遵循的运行方式

始终先确认 `node` 可用：

```bash
node --version
```

然后直接运行：

```bash
node scripts/zip_source_code.js "/path/to/project"
```

Windows PowerShell：

```powershell
node scripts/zip_source_code.js "C:\path\to\project"
```

少数 Linux 发行版可能只提供 `nodejs` 命令；只有 `node` 确实不存在时，才回退为：

```bash
nodejs scripts/zip_source_code.js "/path/to/project"
```

不要为了运行本 SKILL 创建 npm 项目，也不要执行：

```text
npm install
pnpm install
yarn install
```

脚本没有第三方依赖，上述操作没有必要，还可能额外生成需要被排除的依赖目录和锁文件。

在 macOS 或 Linux 上，也可以把脚本设为可执行文件后直接运行：

```bash
chmod +x scripts/zip_source_code.js
./scripts/zip_source_code.js "/path/to/project"
```

## 标准工作流

1. 确认用户提供的是目录路径，不是单个文件；路径含空格时必须加引号。
2. 先确认 `node --version` 能正常执行。
3. 默认先运行一次 `--dry-run`；目录较大、规则刚修改或可能包含敏感信息时，同时添加 `--verbose`。
4. 检查预览结果，确认 `.env`、YAML、依赖目录、构建产物、归档文件和密钥没有被纳入。
5. 正式创建 ZIP。
6. 报告 ZIP 的绝对路径、纳入文件数、输入总大小和生成结果。
7. 除非用户明确理解风险并提出要求，不得使用 `--no-default-ignore`。

推荐预览：

```bash
node scripts/zip_source_code.js "/path/to/project" --dry-run
```

查看每个项目被排除的原因：

```bash
node scripts/zip_source_code.js "/path/to/project" \
  --dry-run \
  --verbose
```

正式创建：

```bash
node scripts/zip_source_code.js "/path/to/project"
```

默认输出在源目录旁边：

```text
<目录名>.code.zip
```

例如：

```text
源目录：/work/my-app
输出：  /work/my-app.code.zip
```

## 默认过滤行为

脚本采用两层过滤：

1. `IGNORE` 正则先排除危险、庞大或明确不需要的内容。
2. 默认源码白名单只纳入常见代码扩展名、特殊构建脚本名，以及带 shebang 的无扩展名脚本。

内置 `IGNORE` 默认排除：

- `.git`、`.hg`、`.svn`。
- `.idea`、`.vscode` 和常见系统元数据。
- `node_modules`、`node_module`、`vendor` 和常见依赖目录。
- Python 虚拟环境、测试缓存、编译缓存和通用缓存目录。
- `dist`、`build`、`target`、`out`、覆盖率目录和常见前端框架缓存。
- `.env`、`.env.local`、`.env.production` 等环境变量文件。
- `.yml` 和 `.yaml`。
- ZIP、RAR、7z、TAR、GZ、JAR、WHL 等归档文件。
- 可执行文件、动态库、目标文件、字节码和 WebAssembly 产物。
- 证书、私钥、keystore 和常见 SSH 密钥文件名。
- 图片、音频、视频、PDF 和 Office 文件。
- 数据库、日志、临时文件和备份文件。
- 常见依赖锁文件。
- `.min.js`、`.bundle.js`、`.min.css`、`.bundle.css` 等压缩或打包产物。

默认源码白名单包括但不限于：

- JavaScript、TypeScript、JSX、TSX。
- Python、Java、Kotlin、Scala、Go、Rust、C、C++、C#、Swift。
- Shell、PowerShell、Ruby、PHP、Perl、Lua。
- HTML、CSS、SCSS、Vue、Svelte、Astro、MDX。
- SQL、GraphQL、Protocol Buffers、Terraform、HCL、Nix。
- Dockerfile、Makefile、CMakeLists.txt、Jenkinsfile、Bazel 和 Meson 构建文件。
- 带 `#!` shebang 的无扩展名脚本。

`README.md`、`package.json`、`pyproject.toml` 等普通项目文件默认不会进入 ZIP；需要时使用 `--include`。

## IGNORE 正则字段

脚本顶部包含可直接编辑的字段：

```js
const IGNORE = [
  String.raw`(^|/)\.git(?:/|$)`,
  String.raw`(^|/)node_modules(?:/|$)`,
  String.raw`\.zip$`,
  String.raw`(^|/)\.env(?:\..*)?$`,
  String.raw`\.ya?ml$`,
];
```

实际脚本中的默认列表更完整。

匹配规则：

- 匹配对象是相对于源目录的路径。
- 路径分隔符统一为 `/`，即使在 Windows 上也是如此。
- 路径开头没有 `/`。
- 脚本使用 `new RegExp(pattern, "i")`，默认不区分大小写。
- 使用的是 JavaScript 正则表达式，不是 Git `.gitignore` glob。
- 不要使用 Python 独有的正则语法。
- 忽略规则优先于 `--include`。
- 被忽略的目录不会继续遍历。

显示全部默认规则：

```bash
node scripts/zip_source_code.js --show-defaults
```

临时追加一个忽略正则，不修改脚本：

```bash
node scripts/zip_source_code.js ./project \
  --ignore '(^|/)fixtures?(/|$)'
```

追加多个正则：

```bash
node scripts/zip_source_code.js ./project \
  --ignore '(^|/)fixtures?(/|$)' \
  --ignore '(^|/)generated(/|$)'
```

也可以从 UTF-8 文本文件读取正则。每行一个规则，空行和以 `#` 开头的行会被忽略：

```bash
node scripts/zip_source_code.js ./project \
  --ignore-from ./custom-ignore.regex
```

规则文件示例：

```text
# 测试夹具
(^|/)fixtures?(/|$)

# 自动生成代码
(^|/)generated(/|$)
\.gen\.[a-z0-9]+$
```

`--ignore-from` 可以重复使用。

## 纳入额外项目文件

默认只纳入源码。需要额外打包 `package.json` 时：

```bash
node scripts/zip_source_code.js ./project \
  --include '(^|/)package\.json$'
```

同时纳入多个项目清单：

```bash
node scripts/zip_source_code.js ./project \
  --include '(^|/)package\.json$' \
  --include '(^|/)pyproject\.toml$' \
  --include '(^|/)Cargo\.toml$'
```

`--include` 只绕过源码扩展名白名单，不会绕过 `IGNORE`。例如，下列内容即使被 `--include` 匹配，仍会被默认安全规则排除：

```text
.env
config.yml
private.key
archive.zip
```

需要纳入所有未被 `IGNORE` 排除的普通文件时：

```bash
node scripts/zip_source_code.js ./project --all-files
```

只有用户明确要求并理解风险时，才可同时禁用默认过滤：

```bash
node scripts/zip_source_code.js ./project \
  --all-files \
  --no-default-ignore
```

该组合可能把凭据、依赖目录、密钥、大型二进制文件和已有归档打包，不得作为默认方案。

## 输出控制

指定输出位置：

```bash
node scripts/zip_source_code.js ./project \
  --output ./artifacts/project-source.zip
```

`-o` 是 `--output` 的缩写：

```bash
node scripts/zip_source_code.js ./project \
  -o ./artifacts/project-source.zip
```

输出名称没有 `.zip` 后缀时，脚本会自动补上：

```bash
node scripts/zip_source_code.js ./project -o ./artifacts/project-source
```

实际输出：

```text
./artifacts/project-source.zip
```

默认拒绝覆盖已有 ZIP。确认允许覆盖后使用：

```bash
node scripts/zip_source_code.js ./project \
  -o ./artifacts/project-source.zip \
  --force
```

默认 ZIP 内保留一个顶层目录：

```text
project/src/main.js
project/tests/main.test.js
```

需要把源目录内容直接放到 ZIP 根目录时：

```bash
node scripts/zip_source_code.js ./project --contents-only
```

此时 ZIP 内路径类似：

```text
src/main.js
tests/main.test.js
```

## 压缩级别

压缩级别范围为 `0` 到 `9`，默认是 `9`：

```bash
node scripts/zip_source_code.js ./project \
  --compression-level 6
```

含义：

- `0`：仅存储，不执行 Deflate 压缩。
- `1`：压缩更快。
- `9`：通常压缩率更高，但运行时间可能更长。

脚本使用 Node.js 内置 `zlib`，不调用外部压缩程序。

## 预览和输出模式

只预览，不创建 ZIP：

```bash
node scripts/zip_source_code.js ./project --dry-run
```

预览并显示每个排除原因：

```bash
node scripts/zip_source_code.js ./project \
  --dry-run \
  --verbose
```

适合自动化脚本的安静模式；成功时只输出 ZIP 绝对路径：

```bash
archive_path="$(node scripts/zip_source_code.js ./project --quiet)"
printf '%s\n' "$archive_path"
```

Windows PowerShell：

```powershell
$archivePath = node scripts/zip_source_code.js "C:\work\project" --quiet
$archivePath
```

`--verbose` 与 `--quiet` 不能同时使用。

## 完整命令示例

安全预览：

```bash
node scripts/zip_source_code.js "/work/my app" \
  --dry-run \
  --verbose
```

打包源码并额外纳入 Node 项目清单：

```bash
node scripts/zip_source_code.js "/work/my app" \
  --include '(^|/)package\.json$' \
  --include '(^|/)tsconfig\.json$' \
  -o "/work/artifacts/my-app-source.zip"
```

排除测试夹具和自动生成目录：

```bash
node scripts/zip_source_code.js ./project \
  --ignore '(^|/)fixtures?(/|$)' \
  --ignore '(^|/)generated(/|$)'
```

纳入所有非敏感普通文件，但仍保留默认安全排除：

```bash
node scripts/zip_source_code.js ./project \
  --all-files \
  --dry-run
```

直接将内容写入 ZIP 根目录，并设置中等压缩级别：

```bash
node scripts/zip_source_code.js ./project \
  --contents-only \
  --compression-level 6
```

目录名以 `-` 开头时，在选项后使用 `--`：

```bash
node scripts/zip_source_code.js -- ./-special-project
```

## 空目录行为

默认情况下，没有任何匹配文件时脚本会报错，避免误生成看似成功但没有内容的 ZIP。

确认需要空 ZIP 时：

```bash
node scripts/zip_source_code.js ./empty-project \
  --allow-empty
```

可以结合 `--dry-run` 检查为什么没有文件被纳入：

```bash
node scripts/zip_source_code.js ./empty-project \
  --dry-run \
  --verbose \
  --allow-empty
```

## 安全与可靠性约束

- 默认跳过所有符号链接，不跟随到源目录之外。
- 忽略规则在额外纳入规则之前执行。
- 默认拒绝覆盖已有 ZIP。
- 输出 ZIP 位于源目录内部时，会排除该输出文件本身。
- ZIP 先写入同目录的临时文件，完整写入并同步后才安装到最终路径。
- 未使用 `--force` 时，最终安装采用“不覆盖已有目标”的方式，降低并发竞态造成误覆盖的风险。
- 源文件逐个流式读取和压缩，不会一次性把整个目录或整个 ZIP 放入内存。
- 脚本自行计算 CRC32，并生成标准 ZIP 中央目录。
- 脚本支持 ZIP64 元数据，可处理中央目录偏移或条目数量超过普通 ZIP 字段范围的情况。
- 若文件在扫描后变成符号链接或不再是普通文件，脚本会中止。
- 默认不创建空 ZIP；需要时必须显式使用 `--allow-empty`。
- 收到中断信号时会尝试删除临时 ZIP。
- 修改 `IGNORE` 后，正式打包前必须重新运行 `--dry-run --verbose`。

## 常见问题

### node 命令不存在

先确认是否只有 `nodejs` 命令：

```bash
nodejs --version
```

若存在，可运行：

```bash
nodejs scripts/zip_source_code.js ./project
```

若两个命令都不存在，需要先按当前系统或组织规定安装 Node.js。不要因此执行 `npm install`；npm 不能代替 Node.js 运行时。

### Node.js 版本过低

脚本会显示当前版本和最低要求。升级到 Node.js 14 或更高版本后重新执行。

### 没有找到可打包文件

先查看默认规则：

```bash
node scripts/zip_source_code.js --show-defaults
```

再预览全部未被忽略的普通文件：

```bash
node scripts/zip_source_code.js ./project \
  --all-files \
  --dry-run
```

若只缺少少量项目文件，使用 `--include`，不要直接禁用默认忽略规则。

### package.json 没有进入 ZIP

这是默认行为，因为 JSON 不属于默认源码扩展名。显式添加：

```bash
node scripts/zip_source_code.js ./project \
  --include '(^|/)package\.json$'
```

### YAML 没有进入 ZIP

这是默认安全规则，也是本 SKILL 的明确过滤要求。`--include` 不会绕过该规则。

只有用户明确要求改变这一行为时，才编辑脚本顶部的 `IGNORE`，或使用风险更高的 `--no-default-ignore` 并重新补充其他安全规则。

### 输出文件已存在

指定新文件名，或确认覆盖安全后添加：

```bash
--force
```

### 正则无效

脚本会指出无效的命令行正则，或 `--ignore-from` 文件中的具体行号。

规则必须符合 JavaScript `RegExp` 语法。例如，Python 的某些内联标志或专用结构不能直接使用。

### ZIP 内多了一层项目目录

这是默认行为。需要直接写入目录内容时添加：

```bash
--contents-only
```

### 需要查看所有命令参数

```bash
node scripts/zip_source_code.js --help
```

版本信息：

```bash
node scripts/zip_source_code.js --version
```

## 参数速查

```text
-o, --output <ZIP>             指定输出路径
-f, --force                    覆盖已有输出
    --ignore <REGEX>           追加忽略规则，可重复
    --ignore-from <FILE>       从文件读取忽略规则，可重复
    --include <REGEX>          额外纳入文件，可重复
    --all-files                关闭源码白名单
    --no-default-ignore        禁用默认忽略规则
    --contents-only            ZIP 根目录直接放内容
    --compression-level <0-9>  压缩级别
    --dry-run                  仅预览
    --allow-empty              允许空 ZIP
-v, --verbose                  显示跳过原因
-q, --quiet                    成功时只输出路径
    --show-defaults            显示默认规则
    --version                  显示版本
-h, --help                     显示帮助
```
