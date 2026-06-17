# Manifest Discovery

## 核心规则

目录中存在任一 manifest 文件 → **允许且必须有** `AGENTS.md`。
目录中不存在任何 manifest 文件 → 已存在的 `AGENTS.md` 必须删除，**禁止创建**。

## Manifest 文件注册表

一个目录可能同时存在多个 manifest 文件。按优先级选择**主 manifest**，其余作为辅助参考。

| 优先级 | 生态 | Manifest 文件 |
|--------|------|--------------|
| 1 | Node.js / TypeScript | `package.json` |
| 1 | Java / Maven | `pom.xml` |
| 2 | Java / Gradle | `build.gradle`、`build.gradle.kts` |
| 1 | Rust | `Cargo.toml` |
| 1 | Go | `go.mod` |
| 1 | Python | `pyproject.toml` |
| 2 | Python（旧） | `setup.py`、`setup.cfg` |
| 1 | C / C++ / CMake | `CMakeLists.txt` |
| 3 | C / C++ / 通用 | `Makefile` |
| 1 | Ruby | `Gemfile` |
| 1 | Elixir | `mix.exs` |
| 1 | Dart / Flutter | `pubspec.yaml` |
| 1 | PHP | `composer.json` |
| 1 | Zig | `build.zig` |
| 1 | .NET | `*.csproj`、`*.fsproj` |
| 1 | Swift | `Package.swift` |
| 1 | Haskell | `*.cabal`、`stack.yaml` |
| 1 | Nix | `flake.nix`、`default.nix` |

### 多 manifest 选择规则

同一目录存在多个 manifest 时，按优先级选主 manifest：

```
目录有 package.json + Makefile → 主 manifest = package.json（优先级1 > 3）
目录有 pom.xml + build.gradle → 主 manifest = pom.xml（优先级1 > 2）
目录有 CMakeLists.txt + Makefile → 主 manifest = CMakeLists.txt（优先级1 > 3）
```

主 manifest 决定角色判定的主要依据；辅助 manifest 在证据收集时补充参考。

## 扫描算法

### 输入

- `root`: 项目根目录
- `target_subdir`（可选）：仅扫描该子树
- `manifest_filter`（可选）：仅匹配指定 manifest 文件类型

### 扫描步骤

1. **确定扫描起点**：`scan_root = root / target_subdir`，若未指定则为 `root`。
2. **递归遍历**：从 `scan_root` 递归遍历所有子目录。
3. **跳过忽略目录**：以下目录不进入、不扫描、不处理：
   - `.git`、`node_modules`、`dist`、`target`、`.turbo`
   - `coverage`、`__pycache__`、`.idea`、`.vscode`
   - `build`、`out`、`.next`、`.nuxt`
   - `vendor`、`bower_components`
   - 任何在 `.gitignore` 中且非被跟踪的目录
4. **检测 manifest**：对每个非忽略目录，检查是否存在任何 manifest 文件。
5. **选择主 manifest**：按优先级选择。
6. **应用过滤**：若用户指定了 `manifest_filter`，仅保留匹配该类型的目录。

### 构建父子树

1. 所有 manifest 目录按路径深度排序。
2. 每个目录的**父 manifest 目录** = 路径上最近的祖先 manifest 目录。
3. 项目根目录（`repo-root`）的父级为 `null`。

## 特批例外：scripts-docs 目录

某些目录虽无 manifest 但值得保留 AGENTS.md，需用户显式指定或按约定自动检测：

### 自动检测条件

- 目录名匹配 `script`、`scripts`、`docs`、`docker`、`deploy`
- 且父目录是 manifest 目录
- 且目录内不含任何 manifest 文件

### 用户显式指定

用户可在调用时声明额外的 scripts-docs 目录，格式：相对于项目根的路径。

## 清理规则

### 必须清理（删除 AGENTS.md 和 CLAUDE.md）

- 任何无 manifest 目录下的 `AGENTS.md`
- 任何无 manifest 目录下的 `CLAUDE.md`
- 忽略目录（`node_modules` 等）下的任何 `AGENTS.md` 或 `CLAUDE.md`

### 不清理

- 有 manifest 目录下的 `AGENTS.md`（将被刷新）
- 有 manifest 目录下的 `CLAUDE.md`（将被刷新）
- 用户显式指定的 scripts-docs 目录下的文档

### 清理后处理

- 删除文档后若目录变空且需要保留，使用 `.gitkeep` 留存。
- 不要用 README 或 AGENTS 占位。

## 忽略目录完整清单

```
.git
node_modules
dist
target
.turbo
coverage
__pycache__
.idea
.vscode
build
out
.next
.nuxt
vendor
bower_components
.cache
*.egg-info
.venv
venv
env
```

若用户项目有特定忽略需求，以用户说明为准。
