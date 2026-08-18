---
name: source-code-zip
description: 将指定源码目录打包为只包含代码的 ZIP，并使用可编辑的正则 IGNORE 规则排除 node_modules、虚拟环境、构建产物、压缩包、.env、YAML、密钥、媒体和办公文件。用户要求归档、传输、备份或提交源码目录时使用。必须优先通过 uv 运行；uv 不可用或无法运行时，再回退到 python3、py -3 或 python。
---

# Source Code ZIP

把一个目录压缩为安全、精简的源码 ZIP。实际执行逻辑位于：

```text
scripts/zip_source_code.py
```

该脚本只有一个 Python 文件，仅使用标准库，不需要安装第三方依赖。

## 必须遵循的运行顺序

始终先尝试 `uv`，不要一开始就使用 `pip`、`python` 或创建虚拟环境。

```bash
uv --version
uv run scripts/zip_source_code.py "/path/to/project"
```

脚本带有 PEP 723 元数据：

```text
requires-python = ">=3.10"
dependencies = []
```

若系统没有 `uv`，或 `uv` 因当前环境限制无法运行，再按以下顺序回退：

```bash
python3 scripts/zip_source_code.py "/path/to/project"
```

Windows 可使用：

```powershell
py -3 scripts/zip_source_code.py "C:\path\to\project"
```

最后才尝试：

```bash
python scripts/zip_source_code.py "/path/to/project"
```

因为脚本无第三方依赖，所以回退时不应执行 `pip install`。若用户希望安装 `uv`，优先使用其系统包管理器或官方安装方式，例如：

```bash
# macOS / Linux
curl -LsSf https://astral.sh/uv/install.sh | sh

# macOS Homebrew
brew install uv

# Windows PowerShell
powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"
```

## 标准工作流

1. 确认用户提供的源目录路径，并对包含空格的路径加引号。
2. 默认先运行一次 `--dry-run`，尤其是在目录较大、规则刚修改或内容可能敏感时。
3. 检查预览结果，确保 `.env`、YAML、依赖目录、压缩包和密钥没有被纳入。
4. 使用 `uv run` 正式创建 ZIP。
5. 报告 ZIP 的绝对路径、纳入文件数和生成结果。
6. 除非用户明确要求，不要使用 `--no-default-ignore`。

推荐预览命令：

```bash
uv run scripts/zip_source_code.py "/path/to/project" --dry-run
```

需要查看每个文件为何被排除时：

```bash
uv run scripts/zip_source_code.py "/path/to/project" --dry-run --verbose
```

正式创建：

```bash
uv run scripts/zip_source_code.py "/path/to/project"
```

默认输出在源目录旁边：

```text
<目录名>.code.zip
```

例如 `/work/my-app` 默认生成 `/work/my-app.code.zip`。

## 默认过滤行为

脚本采用两层过滤：

1. `IGNORE` 正则规则先排除危险、庞大或非源码内容。
2. 默认源码白名单只纳入常见代码扩展名、特殊构建脚本名，以及带 shebang 的无扩展名脚本。

内置 `IGNORE` 默认排除：

- `.git`、`.hg`、`.svn`、IDE 元数据和系统元数据。
- `node_modules`、`vendor`、虚拟环境、Python/测试缓存。
- `dist`、`build`、`target`、覆盖率目录和常见前端框架缓存。
- `.env`、`.env.local` 等环境变量文件。
- `.yml`、`.yaml`。
- ZIP、RAR、TAR、GZ、JAR、WHL 等归档文件。
- 可执行文件、动态库、目标文件、字节码和 WebAssembly 产物。
- 证书、私钥、keystore 和常见 SSH 密钥文件名。
- 图片、音视频、PDF、Office 文件、数据库、日志和临时文件。
- 常见依赖锁文件。

默认会纳入 Python、JavaScript、TypeScript、Java、Go、Rust、C/C++、C#、Shell、SQL、HTML、CSS、Vue、Svelte、Terraform 等源码。

## IGNORE 正则规则

脚本顶部有可直接编辑的字段：

```python
IGNORE: list[str] = [
    r"(^|/)\.git(?:/|$)",
    r"(^|/)node_modules(?:/|$)",
    r"\.zip$",
    r"(^|/)\.env(?:\..*)?$",
    r"\.ya?ml$",
]
```

实际脚本中的默认列表更完整。匹配规则如下：

- 匹配对象是相对于源目录的路径。
- 路径分隔符统一为 `/`，即使在 Windows 上也是如此。
- 路径开头没有 `/`。
- 使用 `re.search`，默认不区分大小写。
- 这是正则表达式，不是 Git `.gitignore` 的 glob 语法。
- 忽略规则优先于 `--include`；被忽略的目录不会继续遍历。

显示当前全部默认规则：

```bash
uv run scripts/zip_source_code.py --show-defaults
```

临时追加一个正则，不修改脚本：

```bash
uv run scripts/zip_source_code.py ./project \
  --ignore '(^|/)fixtures?(/|$)'
```

可重复添加：

```bash
uv run scripts/zip_source_code.py ./project \
  --ignore '(^|/)fixtures?(/|$)' \
  --ignore '(^|/)generated(/|$)'
```

也可以从 UTF-8 文本文件读取，每行一个正则，空行和以 `#` 开头的行会被忽略：

```bash
uv run scripts/zip_source_code.py ./project \
  --ignore-from ./custom-ignore.regex
```

示例规则文件：

```text
# 测试夹具
(^|/)fixtures?(/|$)

# 自动生成代码
(^|/)generated(/|$)
\.gen\.[a-z0-9]+$
```

## 纳入额外的项目文件

默认只打包源码，所以 `README.md`、`package.json`、`pyproject.toml` 等不会自动进入 ZIP。

只额外纳入指定文件时，优先使用 `--include`：

```bash
uv run scripts/zip_source_code.py ./project \
  --include '(^|/)package\.json$' \
  --include '(^|/)pyproject\.toml$'
```

`--include` 只绕过源码扩展名白名单，不会绕过 `IGNORE`。例如 `.env` 和 `.yml` 仍然会被排除。

需要纳入所有未被 `IGNORE` 排除的普通文件时：

```bash
uv run scripts/zip_source_code.py ./project --all-files
```

只有用户明确理解风险并要求禁用安全规则时，才使用：

```bash
uv run scripts/zip_source_code.py ./project \
  --all-files \
  --no-default-ignore
```

该组合可能把密钥、凭据、依赖和大型二进制文件打包，不应作为默认方案。

## 输出控制

指定输出位置：

```bash
uv run scripts/zip_source_code.py ./project \
  --output ./artifacts/project-source.zip
```

`-o` 是 `--output` 的缩写。输出名称没有 `.zip` 后缀时，脚本会自动补上。

默认不覆盖已有 ZIP。确认允许覆盖后使用：

```bash
uv run scripts/zip_source_code.py ./project \
  -o ./artifacts/project-source.zip \
  --force
```

默认 ZIP 内会保留一个顶层目录：

```text
project/src/main.py
project/tests/test_main.py
```

需要直接把目录内容放到 ZIP 根目录时：

```bash
uv run scripts/zip_source_code.py ./project --contents-only
```

压缩级别范围是 `0` 到 `9`，默认 `9`：

```bash
uv run scripts/zip_source_code.py ./project --compression-level 6
```

其中 `0` 表示仅存储不压缩，`1` 更快，`9` 压缩率通常更高。

## 完整命令示例

安全预览：

```bash
uv run scripts/zip_source_code.py "/work/my app" \
  --dry-run \
  --verbose
```

打包源码并额外纳入 Python 与 Node 项目清单：

```bash
uv run scripts/zip_source_code.py "/work/my app" \
  --include '(^|/)pyproject\.toml$' \
  --include '(^|/)package\.json$' \
  -o "/work/artifacts/my-app-source.zip"
```

排除测试夹具和自动生成目录：

```bash
uv run scripts/zip_source_code.py ./project \
  --ignore '(^|/)fixtures?(/|$)' \
  --ignore '(^|/)generated(/|$)'
```

适合脚本调用的安静模式，成功时只输出 ZIP 绝对路径：

```bash
archive_path="$(uv run scripts/zip_source_code.py ./project --quiet)"
printf '%s\n' "$archive_path"
```

Windows PowerShell：

```powershell
$archivePath = uv run scripts/zip_source_code.py "C:\work\project" --quiet
$archivePath
```

## 安全与可靠性约束

- 默认跳过所有符号链接，不跟随到源目录之外。
- 默认拒绝覆盖已有 ZIP，避免误删旧归档。
- 输出文件位于源目录内部时，扫描会排除该输出 ZIP 本身。
- ZIP 先写入临时文件，成功后再替换最终输出，降低留下半成品的概率。
- 默认不允许创建空 ZIP；确认需要时使用 `--allow-empty`。
- 正式打包前修改过 `IGNORE` 时，应重新执行 `--dry-run --verbose`。
- 不要为了运行该脚本安装第三方 Python 包。

## 常见问题

### 没有找到可打包文件

先查看默认规则：

```bash
uv run scripts/zip_source_code.py --show-defaults
```

再预览全部未被忽略的普通文件：

```bash
uv run scripts/zip_source_code.py ./project --all-files --dry-run
```

若只缺少少量项目文件，使用 `--include`，不要直接禁用默认忽略规则。

### 输出文件已存在

指定新文件名，或在确认覆盖安全后添加 `--force`。

### 正则无效

脚本会指出无效的命令行规则，或 `--ignore-from` 文件中的具体行号。正则应符合 Python `re` 语法。

### uv 不可用

按本 SKILL 开头的回退顺序使用 `python3`、Windows 的 `py -3`，最后使用 `python`。脚本不依赖外部包。

## 命令帮助

```bash
uv run scripts/zip_source_code.py --help
```

版本信息：

```bash
uv run scripts/zip_source_code.py --version
```
