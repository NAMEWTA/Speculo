# Diff Collect Phase

## 输入

- `speculo/.speculo/dev/docs-sync-state.json`
- `LAST_SYNC_SHA`
- 当前 `HEAD`
- state 中的 `tracked_assets`

## 产物

- `speculo/.speculo/dev/<change>/docs-sync-report.md`，由 `../_templates/docs-sync-report-template.md` 填写或追加

## 填写引导

### Bootstrap Collect

若 State Read 设置了 `BOOTSTRAP_DOCS_INIT=true`：

1. 把同步范围记为 `<bootstrap>..HEAD`；不要对 `null` 运行 `git diff "$RANGE"`。
2. 盘点当前项目事实，至少收集：

```bash
git rev-parse HEAD
git log --oneline --no-merges --max-count=50
git ls-files
git ls-files -- 'README*' 'CHANGELOG*' AGENTS.md CLAUDE.md docs speculo/.speculo/.config .github package.json pnpm-lock.yaml package-lock.json yarn.lock pyproject.toml Cargo.toml go.mod Makefile justfile
```

3. 按项目实际技术栈读取元数据和入口文件，例如 `package.json` scripts/bin/files、CLI/API 入口、测试目录、CI workflow、release 配置、LICENSE。
4. 对比现有文档，列出初始化动作：
   - `add`：缺失但项目应具备的基础文档或章节。
   - `update`：已有文档与当前项目事实不一致。
   - `delete`：初始化时发现的空模板、旧事实或重复说明。
   - `keep`：已有且准确的文档资产。
   - `propose-only`：`RULES.md` 写入、`.config` 文件删除、不稳定术语或 ADR 候选。
5. `bootstrap` 不以 git diff 驱动，而以当前项目事实驱动；所有新增内容仍必须有真实文件、配置、命令或代码入口支撑。

### Regular Diff Collect

固定收集以下信息：

```bash
RANGE="$LAST_SYNC_SHA..HEAD"
git log --oneline --no-merges "$RANGE"
git diff --name-status "$RANGE"
git diff --shortstat "$RANGE"
git diff --name-only "$RANGE" | awk -F/ '{print $1"/"$2}' | sort | uniq -c | sort -rn
git diff --name-status "$RANGE" -- speculo/.speculo/archive speculo/.speculo/.config
```

有疑问的具体改动再读取：

```bash
git log -p "$RANGE" -- <specific-path>
git show <sha> -- <specific-file>
```

把变更按资产类型映射到 `tracked_assets`：

- 对外能力变化：README 类 + CHANGELOG
- 内部重构但行为未变：视情况写 CHANGELOG 或 AGENTS 类约定
- 依赖升级：CHANGELOG 聚合；安全 CVE 进 Security
- CI/CD 变化：CHANGELOG + AGENTS / CONTRIBUTING 的发布约定
- 文档自身：仅在对外可见时写 CHANGELOG 的文档类条目
- 测试 / 开发工具链：通常不进 CHANGELOG；AGENTS 的测试要求酌情更新
- 新增顶层目录 / 顶级文件：如 AGENTS 类存在仓库布局章节则必须同步
- `template/` 下 framework 资产变化：README 内置入口、quick reference、architecture、AGENTS 资产编辑规则、CHANGELOG
- `speculo/.speculo/.config/adr/` 变化：ADR README/索引、CONTEXT 相关术语、AGENTS/architecture 中的决策约束
- `speculo/.speculo/.config/context/` 变化：README/AGENTS 术语、PRD/architecture 中的通用语言
- `speculo/.speculo/.config/LESSONS.md` 变化：AGENTS 常见陷阱、workflow 规则、retro/diagnose 经验；低信号或重复项应建议删除
- `speculo/.speculo/.config/RULES.md` 变化：只审计和提出建议；写入必须等用户确认
- `speculo/.speculo/archive/` 变化：进入 `knowledge-extract.md`，从归档产物提取决策、经验、规则和文档漂移信号

## 边界

- 不把每个 commit 都写成文档条目。
- 常规同步不修改未列入 `tracked_assets` 的资产，除非先获得用户确认并更新 state；`bootstrap` 模式可把基础文档创建候选先纳入初始化 `tracked_assets`，再修改。
- 不因为某路径出现在 diff 中就自动扩写文档；必须判断旧内容是否仍然成立，是否应该删除或压缩。
- `bootstrap` 模式不虚构路线图、未实现能力或不存在的命令；无法从项目事实确认的内容进入 `propose-only` 或询问用户。

## 完成准则

- git 差异素材或 `bootstrap` 项目盘点已记录到 report
- 已列出要新增、删除、修改、保留的资产和理由，或判定空同步
- archive 与 `.config` 相关 diff 已移交后续阶段
