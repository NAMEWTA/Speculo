# 扩展与设置

这份清单是候选参考，不是无条件安装白名单。仅选择本次所需语言和功能；执行时核对官方 Marketplace 的发布者、当前支持版本及弃用信息。已有用户选择优先，不把本清单当成永久最新事实。

## 缺失才安装

按缺失能力选择扩展，先查已安装版本的 `extensionDependencies`、`extensionPack`、`engines.vscode` 和目标平台。必要依赖与可选扩展包成员分别处理；Python、Java 扩展安装时也可能拉取或升级其他成员，不能只检查顶层 ID。不要为了补齐去升级已经能用的扩展。

| ID | 作用 |
| --- | --- |
| `redhat.java` | Java 语言服务，JDK 要求以安装版本为准 |
| `vscjava.vscode-java-debug` | Java 调试 |
| `vscjava.vscode-maven` | Maven 入口与项目支持，复用已有 Maven |
| `vscjava.vscode-java-test`、`vscjava.vscode-java-dependency` | 需要测试/项目管理时补充 |
| `ms-python.python` | Python 解释器、调试、测试 |
| `charliermarsh.ruff` | Python 格式化、导入排序、lint。Pylance 继续负责补全和类型 |
| `Vue.volar` | Vue - Official；按项目 Vue 版本与扩展支持选择语言服务 |
| `sdras.vue-vscode-snippets` | Vue SFC 片段 |
| `formulahendry.auto-rename-tag` | Vue 模板和 JSX 的成对标签重命名 |
| `bradlc.vscode-tailwindcss` | Tailwind 类名补全。项目不用 Tailwind 时不介入 |
| `dsznajder.es7-react-js-snippets` | React 片段（如 `rafce`）。JS/TS 语言服务用编辑器内置 |
| `dbaeumer.vscode-eslint` | JS / TS / Vue 诊断 |
| `esbenp.prettier-vscode` | JS / TS / Vue / JSON / HTML / CSS 格式化 |
| `golang.go` | Go 官方扩展，语言服务是 gopls |
| `ms-vscode-remote.remote-ssh` | 需要 SSH 的客户端安装，不能用远端已装代替 |
| `usernamehw.errorlens` | 行内错误 |
| `EditorConfig.EditorConfig` | 尊重仓库 `.editorconfig` |
| `tamasfe.even-better-toml` | `pyproject.toml` 高亮和校验 |

下面这些只有用户点名才装：`eamodio.gitlens`（已有 Git Graph 时不要主动加）、`ms-azuretools.vscode-docker`、`humao.rest-client`、`redhat.vscode-yaml`、`ms-toolsai.jupyter`、`yoavbls.pretty-ts-errors`。

Node 的 JS/TS 语言服务与 Node 调试通常由 VS Code 内置提供，先核对是否被禁用；不为“支持 Node”额外装第三方语言服务。Java 扩展包 `vscjava.vscode-java-pack` 只是成员集合，不是必须全装的运行时。

## 避免重复与真实冲突

不主动补旧的 `Vue.vscode-typescript-vue-plugin` 或另一套 TypeScript 自动导入/语言服务。Vue 2/Vetur 的已有项目按真实兼容性处理，不将现代 Vue 配置覆盖到旧项目；同一工作区不盲目同时启用 Vetur 与 Vue - Official。

已经选择 Ruff 时不再主动补 Black/isort/flake8/pylint；用户选择其他工具时保留，不能把重复能力当成必须卸载的冲突。不主动增加 `wix.vscode-import-cost` 等非任务必需项。

`rvest.vs-code-prettier-eslint`、`pmneo.tsimporter` 等只在真实配置冲突且移除已获本次授权时处理；不能仅因为清单里出现就卸载。检查旧扩展包成员，避免补装包时重新带入已经排除的 TypeScript Hero、tsimporter 等。

Java 扩展、Copilot 的启用/禁用选择、Git Graph、Path Intellisense、npm Intellisense，以及用户自己的扩展，均保留，除非它们正是本次具名处理的对象。

## 可控安装与读回

先核对目标 CLI 与 Profile，生命周期限制见 [Profile 工作流](profiles-and-validation.md#创建选择和同步是不同步骤)。下列模板只用于已存在、已验证的本机 Profile；Remote 则使用实际支持的远程安装接口或连接后的 Extensions UI：

```bash
code --profile "<已确认的 Profile>" --list-extensions --show-versions
code --profile "<已确认的 Profile>" --install-extension "<缺失 ID>@<兼容版本>"
```

两端兼容时可复用经过验证的版本基线，不要求不同 OS/客户端强制相同版本。精确版本安装也不能保证传递依赖不更新；若必须控制包成员，优先逐个安装所需成员。只有当前版本明确支持时才使用跳过包成员的选项，且不能跳过必要依赖或签名验证。

复用已有 VSIX 缓存时核对压缩包内 publisher/name/version、目标平台、完整性与来源，然后仍通过受支持安装接口注册。不要复制解压目录或手工写扩展清单。不存在可核验缓存时按授权下载或报告缺失。

设置有限重试和超时；超时后确认本任务安装进程树已退出再开始下一次，避免残留子进程并发写入。只结束本任务的进程，不全局 `pkill code`。读回安装日志、目标 Profile 清单及启用状态，检查意外升级/新增并按已记录差异处理，不能对所有扩展自动卸载重装。

2026-10-14 亲自读取 [VS Code 命令行](https://code.visualstudio.com/docs/configure/command-line)；执行时仍以目标 CLI 的实际能力为准，不将文档中的窗口启动行为推及所有安装子命令。

## 设置片段

只从下面的候选片段选择本次语言需要的键；它们不是全量推荐或统一基线。按当前扩展 schema 和用户偏好决定，已有键保留，授权修复的冲突另列差异。`eslint.validate` 去重合并，`emmet.includeLanguages` 按键合并但不覆盖已有冲突。运行时入口另见 [运行时复用](runtime-reuse.md)。

```json
{
  "python.languageServer": "Pylance",
  "python.analysis.typeCheckingMode": "basic",
  "python.analysis.autoImportCompletions": true,
  "go.useLanguageServer": true,
  "go.formatTool": "default",
  "gopls": {
    "ui.semanticTokens": true,
    "ui.diagnostic.staticcheck": true
  },
  "eslint.validate": [
    "javascript",
    "javascriptreact",
    "typescript",
    "typescriptreact",
    "vue"
  ],
  "javascript.updateImportsOnFileMove.enabled": "always",
  "typescript.updateImportsOnFileMove.enabled": "always",
  "emmet.includeLanguages": {
    "javascript": "javascriptreact",
    "typescript": "typescriptreact",
    "vue": "html"
  },
  "emmet.triggerExpansionOnTab": true,
  "editor.linkedEditing": true,
  "editor.bracketPairColorization.enabled": true,
  "[python]": {
    "editor.defaultFormatter": "charliermarsh.ruff",
    "editor.formatOnSave": true,
    "editor.tabSize": 4,
    "editor.codeActionsOnSave": {
      "source.fixAll.ruff": "explicit",
      "source.organizeImports.ruff": "explicit"
    }
  },
  "[javascript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode",
    "editor.formatOnSave": true,
    "editor.tabSize": 2,
    "editor.codeActionsOnSave": { "source.fixAll.eslint": "explicit" }
  },
  "[javascriptreact]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode",
    "editor.formatOnSave": true,
    "editor.tabSize": 2,
    "editor.codeActionsOnSave": { "source.fixAll.eslint": "explicit" }
  },
  "[typescript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode",
    "editor.formatOnSave": true,
    "editor.tabSize": 2,
    "editor.codeActionsOnSave": { "source.fixAll.eslint": "explicit" }
  },
  "[typescriptreact]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode",
    "editor.formatOnSave": true,
    "editor.tabSize": 2,
    "editor.codeActionsOnSave": { "source.fixAll.eslint": "explicit" }
  },
  "[vue]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode",
    "editor.formatOnSave": true,
    "editor.tabSize": 2,
    "editor.codeActionsOnSave": { "source.fixAll.eslint": "explicit" }
  },
  "[json]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode",
    "editor.formatOnSave": true,
    "editor.tabSize": 2
  },
  "[jsonc]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode",
    "editor.formatOnSave": true,
    "editor.tabSize": 2
  },
  "[html]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode",
    "editor.formatOnSave": true,
    "editor.tabSize": 2
  },
  "[css]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode",
    "editor.formatOnSave": true,
    "editor.tabSize": 2
  },
  "[scss]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode",
    "editor.formatOnSave": true,
    "editor.tabSize": 2
  },
  "[go]": {
    "editor.defaultFormatter": "golang.go",
    "editor.formatOnSave": true,
    "editor.insertSpaces": false,
    "editor.tabSize": 4,
    "editor.codeActionsOnSave": { "source.organizeImports": "explicit" }
  },
  "[go.mod]": {
    "editor.formatOnSave": true
  }
}
```

某个语言块已经存在时，只补缺的键，不要覆盖用户已经改过的 `editor.tabSize` 或 `editor.defaultFormatter`。

Vue + TypeScript 的项目如果需要工作区 TypeScript，写在**该仓库**的 `.vscode/settings.json`，不要写进用户 Profile：

```json
{
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true
}
```

ESLint 修复与 Prettier 可能都改动代码；实际冲突取决于项目规则。项目采用 `eslint-config-prettier` 等方案时尊重现状，不把 Profile 配置任务扩展成项目 lint 依赖改造。
