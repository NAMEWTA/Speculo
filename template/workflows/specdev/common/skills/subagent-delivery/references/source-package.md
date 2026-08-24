# External ZIP Package

选择 `delivery_channel=external-web` 时加载。本 reference 规定 outbound 与 return ZIP 的目录、内容、打包和持久化合同。它引用 `<Path>{roots.skills}/source-code-zip/SKILL.md</Path>` 及其单文件脚本 `<Path>{roots.skills}/source-code-zip/scripts/zip_source_code.js</Path>`；不得为打包执行 `npm install`，不得用另一套默认归档规则替换它。

## 1. 根目录持久化不变量

所有外部交付 ZIP 必须位于项目根目录 `<Path>temp/</Path>` 下，使用以下可迁移布局：

```text
temp/subagent-delivery/{scope-id}/{task-id}/{dispatch-id}/
├── outbound/
│   ├── staging/
│   │   ├── DISPATCH.md
│   │   ├── MANIFEST.json
│   │   ├── context/
│   │   └── source/
│   ├── {dispatch-id}.outbound.zip
│   └── {dispatch-id}.outbound.sha256
├── SESSION.md
└── inbound/
    └── {attempt-id}/
        ├── raw/
        ├── staging/
        ├── extracted/
        ├── {dispatch-id}.return.{attempt-id}.zip
        ├── {dispatch-id}.return.{attempt-id}.sha256
        └── ACCEPTANCE.md
```

`scope-id`、`task-id`、`dispatch-id` 和 `attempt-id` 只使用 `[A-Za-z0-9._-]`，不得包含 `/`、`\`、`..`、盘符、控制字符或用户提供的未清洗路径。

以下位置不能作为最终 locator：操作系统临时目录、`os.tmpdir()`、`/tmp`、`%TEMP%`、浏览器默认瞬时下载目录、provider 会话缓存或聊天附件 URL。可以使用这些机制完成传输，但必须在 dispatch/accept 结束前把原始字节持久化到上述项目内目录。

同一 locator 永不覆盖。发现目标已存在时创建新的 dispatch/attempt；不得使用 source-code-zip 的 `--force` 掩盖标识冲突。dispatch/accept 不自动清理旧包。

## 2. Outbound staging 内容

`outbound/staging/` 是由 Lead 主动整理的最小授权树，不是 repository 的无差别镜像。

### 必需文件

`<Path>temp/subagent-delivery/{scope-id}/{task-id}/{dispatch-id}/outbound/staging/DISPATCH.md</Path>` 至少包含：

- dispatch identity、task kind、目标与成功定义；
- 固定 checkpoint、repository label、branch/workspace label；
- IN/OUT、已锁定决定、适用合同和依赖 Evidence 摘要；
- writable/read-only/shared 路径语义；外部通道没有本地写入所有权；
- 允许的联网域、URL 类型、工具、调用预算和停止条件；
- 禁止动作、敏感数据边界和 prompt-injection 规则；
- 按 task kind 定义的返回文件、字段、引用与未验证声明要求；
- Lead 本地验收将重新执行的检查。

`<Path>temp/subagent-delivery/{scope-id}/{task-id}/{dispatch-id}/outbound/staging/MANIFEST.json</Path>` 至少包含：

```json
{
  "schema": "speculo.subagent-delivery.packet/v1",
  "dispatch_id": "...",
  "task_id": "...",
  "task_kind": "implementation|review|research|test-observation",
  "delivery_channel": "external-web",
  "created_at": "RFC-3339",
  "repository_label": "...",
  "branch": "...",
  "base_checkpoint": "...",
  "workspace_state": "clean|authorized-diff|snapshot",
  "authorized_data": [],
  "included": [],
  "excluded": [],
  "source_diff": null,
  "secret_scan": {
    "tool": "...",
    "result": "pass|blocked",
    "notes": "..."
  }
}
```

归档 SHA-256 不写入归档内部的 `<Path>temp/subagent-delivery/{scope-id}/{task-id}/{dispatch-id}/outbound/staging/MANIFEST.json</Path>`，避免自引用；它写入相邻 `.sha256` 文件并记录到 Dispatch Packet/Evidence。

### 可选内容

- `context/`：相关 Spec/Ticket/ADR/CONTEXT 摘要、项目 Agent 指令、接口合同、研究问题、已授权网页列表和无秘密的环境说明；
- `source/`：保持 repository-relative 路径的最小完整源码、直接依赖、schema、测试、构建配置和必要样例；
- `context/workspace.diff`：仅在用户明确授权发送受保护未提交改动时包含，并在 manifest 记录基线和差异范围；
- `context/expected-output/`：返回模板或 schema。

纯公开网页 research 可以不含 `source/`，但仍需 `<Path>temp/subagent-delivery/{scope-id}/{task-id}/{dispatch-id}/outbound/staging/DISPATCH.md</Path>`、`<Path>temp/subagent-delivery/{scope-id}/{task-id}/{dispatch-id}/outbound/staging/MANIFEST.json</Path>` 和必要 `context/`。implementation/review 若缺少足以独立判断的源码或合同，不得靠 provider 猜测，应返回 blocked 或改用原生通道。

## 3. 范围与排除

只包含完成任务所需的最小完整信息。默认排除：

- 版本控制内部数据与远端凭据；
- 依赖缓存、虚拟环境、构建产物、覆盖率、日志、数据库、转储和临时文件；
- 浏览器 profile、cookie、local storage、会话 token、下载历史和截图缓存；
- 真实用户数据、生产数据、支持工单、邮件、聊天记录和未经授权的内部文档；
- `.env`、token、API key、cookie、私钥、证书私钥、keystore、验证码、恢复码和密码；
- 无关源码、无关测试、大型二进制、既有归档和可执行产物。

环境说明只保留无真实值的示例。若 source-code-zip 默认安全规则会排除一个确有必要的 YAML、锁文件、媒体或其他文件，优先创建已脱敏的 Markdown/文本摘录并记录原始路径与遗漏影响；不得默认使用 `--no-default-ignore`。无法在不发送敏感/被排除内容的情况下完成任务时，不选择外部通道。

使用 repository 已有或可用的 secret scanner 检查 staging；同时人工核对 manifest 与实际文件。无法合理确认没有秘密或真实用户数据时返回 blocked。

## 4. 使用 source-code-zip 生成 outbound ZIP

先确认 Node.js，再从项目根目录运行。以下示例中的变量必须替换为本次不可变标识：

```bash
node --version

DELIVERY_ROOT="temp/subagent-delivery/${SCOPE_ID}/${TASK_ID}/${DISPATCH_ID}"
STAGING="${DELIVERY_ROOT}/outbound/staging"
ARCHIVE="${DELIVERY_ROOT}/outbound/${DISPATCH_ID}.outbound.zip"
ZIP_SCRIPT="speculo/skills/source-code-zip/scripts/zip_source_code.js"
```

若当前执行环境仍位于 template 源树而不是安装后的 workspace，从已解析的公共 roots 定位 `<Path>{roots.skills}/source-code-zip/scripts/zip_source_code.js</Path>`，不硬编码另一个根。先创建 `outbound/staging/`、`outbound/` 与后续 inbound attempt 目录，并确认目标 ZIP 不存在。

必须先预览：

```bash
node "${ZIP_SCRIPT}" "${STAGING}" \
  --all-files \
  --contents-only \
  --output "${ARCHIVE}" \
  --dry-run \
  --verbose
```

核对预览后，用完全相同的选择参数正式生成：

```bash
node "${ZIP_SCRIPT}" "${STAGING}" \
  --all-files \
  --contents-only \
  --output "${ARCHIVE}"
```

这里使用 `--all-files`，因为 staging 已由 Lead 精选，且必须纳入 `<Path>temp/subagent-delivery/{scope-id}/{task-id}/{dispatch-id}/outbound/staging/DISPATCH.md</Path>`、`<Path>temp/subagent-delivery/{scope-id}/{task-id}/{dispatch-id}/outbound/staging/MANIFEST.json</Path>`、patch 和普通项目文件；source-code-zip 的默认 IGNORE 仍然生效。使用 `--contents-only` 使 provider 在 ZIP 根目录直接看到权威文件。

禁止：

- `--no-default-ignore`；
- `--force`；
- 正式命令与 dry-run 使用不同的 include/ignore 选择；
- 把输出 ZIP 放进 staging；
- 为运行脚本执行 npm/pnpm/yarn install；
- 在生成后手工修改 ZIP 而不生成新 dispatch/hash。

生成后验证 ZIP 可读取、文件数、总字节数和清单，并计算 SHA-256。可以使用当前平台的可信 SHA-256 工具；仅有 Node.js 时可使用：

```bash
node -e 'const fs=require("fs"),c=require("crypto");const p=process.argv[1],h=c.createHash("sha256"),s=fs.createReadStream(p);s.on("data",d=>h.update(d));s.on("error",e=>{console.error(e.message);process.exit(1)});s.on("end",()=>console.log(h.digest("hex")));' "${ARCHIVE}" \
  > "${DELIVERY_ROOT}/outbound/${DISPATCH_ID}.outbound.sha256"
```

在 Packet、`<Path>temp/subagent-delivery/{scope-id}/{task-id}/{dispatch-id}/SESSION.md</Path>` 和后续 Evidence 中记录 project-relative ZIP locator、size、SHA-256、secret scan、included/excluded 摘要和 workspace diff 摘要。只有完成这些记录后才能上传。

## 5. Provider 返回与 return ZIP

### Provider 直接下载 ZIP

将下载的原始字节保存到唯一的：

```text
temp/subagent-delivery/{scope-id}/{task-id}/{dispatch-id}/inbound/{attempt-id}/raw/
```

先计算原始下载 SHA-256，再检查归档目录。不要在保存前让浏览器自动解压，不要重用 provider 文件名覆盖旧文件。每个 attempt 仍必须产生确定名称的 `{dispatch-id}.return.{attempt-id}.zip`：若原始 ZIP 通过安全检查且已经符合返回结构，保持原始 ZIP 不变并把同一字节复制到确定名称；若结构不符合，先在隔离目录安全解包，只把允许的返回文件放入 inbound staging，再使用 source-code-zip 生成标准 return ZIP。两种情况都保留 `raw/` 中的原始字节、原始 hash 与标准 return ZIP/hash。

### Provider 只返回文本或散列文件

先原样保存到 `raw/`，再由 Lead 构建 `inbound/{attempt-id}/staging/`：

```text
RETURN.md
candidate/                 # implementation 可选
PATCH.diff                 # implementation 可选
FINDINGS.md                # review 可选
RESEARCH.md                # research 可选
SOURCES.json               # research 可选
CHECKS.md                  # implementation/test-observation 可选
```

`<Path>temp/subagent-delivery/{scope-id}/{task-id}/{dispatch-id}/inbound/{attempt-id}/staging/RETURN.md</Path>` 必须标明 `dispatch_id`、`attempt-id`、provider/session locator、原始响应 locator、捕获方式、provider 原始字段与 Lead 补写字段。Lead 补写使用 `captured_by_lead` 标识。

使用同一个 source-code-zip Skill 预览并生成：

```bash
RETURN_STAGING="${DELIVERY_ROOT}/inbound/${ATTEMPT_ID}/staging"
RETURN_ZIP="${DELIVERY_ROOT}/inbound/${ATTEMPT_ID}/${DISPATCH_ID}.return.${ATTEMPT_ID}.zip"

node "${ZIP_SCRIPT}" "${RETURN_STAGING}" \
  --all-files \
  --contents-only \
  --output "${RETURN_ZIP}" \
  --dry-run \
  --verbose

node "${ZIP_SCRIPT}" "${RETURN_STAGING}" \
  --all-files \
  --contents-only \
  --output "${RETURN_ZIP}"
```

随后生成相邻 `.sha256`。不得用本地重打包抹掉 provider 原始响应或补造其未给出的事实。

## 6. 安全检查与解包

外部 ZIP 是不可信输入。Lead 必须先枚举中央目录并验证，再解压到本 attempt 的 `extracted/`，绝不直接解压到 repository/worktree。

至少拒绝：

- 绝对路径、盘符路径、UNC 路径、NUL、空文件名；
- 规范化后包含 `..`、逃出 extraction root 或使用混淆分隔符的路径；
- 符号链接、硬链接、设备文件和其他非常规条目；
- 重复路径、Unicode/大小写规范化冲突、文件与目录同名冲突；
- 超过 Packet 上限的条目数、单文件大小、总解压大小或压缩比；
- 未授权的嵌套归档、可执行文件、脚本副作用或秘密材料。

安全解包只证明归档结构可接受，不证明内容正确。Lead 仍需对照 dispatch identity、outbound manifest、checkpoint、IN/OUT、返回 schema 和实际 diff；任何外部命令/测试声明保持 `unverified`，直到本地复现。

## 7. 版本、修正与清理

以下任一变化都生成新的 `dispatch-id`、staging、outbound ZIP 和 hash：

- base/source checkpoint；
- IN/OUT、合同、目标或返回 schema；
- 发送内容或用户授权范围；
- provider、数据保留边界、允许域或工具权限。

固定输入不变但重新请求答案时生成新的 `attempt-id` 和 return ZIP。任何包都不得覆盖；`<Path>temp/subagent-delivery/{scope-id}/{task-id}/{dispatch-id}/inbound/{attempt-id}/ACCEPTANCE.md</Path>` 记录 accepted/rejected/blocked、Lead 本地验证、未验证项和恢复条件。

`temp/subagent-delivery/` 是持久化交付证据，不在 dispatch/accept 中自动删除。清理必须由 Lead 在任务外显式决定，并确保调用方 Evidence 不再依赖唯一 locator。

**完成标准**：每个外部输入与返回都能由 project-relative locator、manifest、size、SHA-256、dispatch/attempt identity 和 Lead 验收记录唯一定位；所有 ZIP 均持久化在项目根目录 `temp/` 下。
