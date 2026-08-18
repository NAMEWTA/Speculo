# Canonical isolated-runtime and persistence contract

## 1. 定义

Canonical 是把多文件能力语义编译为网页 AI 平台可孤立运行的单个 Markdown 文档。它必须同时实现两种独立性：

- **定义独立**：不需要源仓库、源文件、配套能力文件或维护者知识；
- **运行可恢复**：产生规范化持久化工件，能够暂停、恢复、交接和审计。

“网页孤立”只禁止源实现泄漏，不允许删除原能力的状态和工件合同。

## 2. 输入与输出

### 编译输入

一个静态能力入口及其静态文本依赖闭包。规则、模板和脚本可以用于理解行为，但运行时状态、历史产物、归档、备份、敏感信息和无关二进制资产不得内联。

### Canonical 输出

- 无 frontmatter 的普通 Markdown；
- 只依赖本文、当前对话、用户材料和平台实际能力；
- 全文恰好一次 `https://github.com/NAMEWTA/Speculo`；
- 没有其他 URL；
- 没有源仓库路径、源文件名、root alias、内部脚本或 provenance；
- 包含 `ai-workspace/` 便携持久化合同；
- 平台不能写文件时仍输出完整可保存文件包；
- 不伪造写入、校验、恢复或跨会话记忆。

目录说明文件也遵守同一 URL 和隔离规则，并必须解释统一持久化布局。

## 3. 允许与禁止

### 唯一允许的项目归属

```text
https://github.com/NAMEWTA/Speculo
```

每份文档恰好一次。

### 绝对禁止的源实现引用

- 项目名称或内部体系名称，允许地址中的文本除外；
- `.agents/`、`template/`、`speculo/`、`.speculo/`；
- `{roots.*}`、`<Path>`、安装目录、root alias；
- 源入口路径、依赖路径、源文件名和内部文件 stem 的显式引用；
- 内部脚本、CLI、构建命令和本地安装步骤；
- 源状态 schema、源 ID、源结果码和源路由名；
- manifest、hash、生成时间、依赖清单和 HTML provenance；
- 源文件 XML 标签、源码附录、“参考内容”拼接区；
- 任何其他 URL；
- `[TODO]`、空占位符或未完成提示。

### 明确允许且必须保留的运行语义

- canonical 自己定义的 `ai-workspace/` 相对路径；
- `status.json`、`.status.json` 和便携状态字段；
- canonical 运行时生成的 Markdown、JSON、YAML 或其他文本工件；
- change、阶段、active、blocked、completed 等自然运行状态；
- 恢复、所有权、写入顺序、验证和失败回滚规则；
- 生成工件的 YAML frontmatter；
- 用户项目中的相对代码路径，前提是它来自用户材料或实际探索，而不是源能力仓库路径。

Canonical 文档本身仍不得使用 YAML frontmatter。

## 4. 统一便携目录

默认持久化根：

```text
ai-workspace/
```

公共结构：

```text
ai-workspace/
├── status.json
├── changes/
│   └── YYYY-MM-DD-<topic>/
│       ├── .status.json
│       ├── source.md
│       ├── LOG.md
│       └── <owned artifacts>
├── knowledge/
│   ├── decisions/
│   ├── context/
│   └── research/
└── archive/
```

规则：

1. 所有路径为正斜杠相对路径；
2. 不得出现 `..`、空路径段、反斜杠或机器绝对路径；
3. `{change}` 使用 `YYYY-MM-DD-<kebab-topic>`，冲突时追加最小数字后缀；
4. `status.json` 是 active change 索引，不替代权威工件；
5. `.status.json` 保存单次 change 的阶段、owned artifacts、blockers 和更新时间；
6. `source.md` 保存原始请求与不可丢失上下文；
7. `LOG.md` 只追加高价值决定、替代关系和恢复所需事件；
8. 不同能力只能写自己拥有的工件和共享状态中的对应条目；
9. 完成后保留 change 历史，不自动删除；归档需要显式规则或授权。

能力可以增加自己的目录和文件，但必须全部位于该根下并在文档中明确 ownership。

## 5. 最小状态合同

全局状态至少表达：

```json
{
  "schema_version": 1,
  "active": [
    {
      "change": "2026-08-18-example",
      "capability": "能力名称",
      "phase": "active",
      "updated_at": "2026-08-18T00:00:00Z"
    }
  ]
}
```

change 状态至少表达：

```json
{
  "schema_version": 1,
  "change": "2026-08-18-example",
  "status": "active",
  "current_capability": "能力名称",
  "phase": "active",
  "owned_artifacts": [],
  "updated_at": "2026-08-18T00:00:00Z",
  "blockers": []
}
```

每份能力必须给出自己的合法 phase 和 completed 条件。未知字段在读取—合并—写入时保留；不得覆盖其他能力的 active 条目。

## 6. change 选择与恢复

固定顺序：

1. 使用用户显式指定的合法 change；
2. 未指定时，读取全局状态并筛选当前能力的 active change；
3. 恰好一个候选则恢复；
4. 多个候选则列出并停止；
5. 没有候选则创建新 change。

恢复必须先读取 `.status.json` 和该能力的权威工件。对话记忆、模型摘要和用户口头说“继续”都不能替代文件证据。

状态与工件冲突时保持 blocked，列出冲突和恢复动作；不得凭感觉选择新旧版本。

## 7. 写入与提交顺序

每次状态变化遵守：

```text
形成完整候选工件
→ 依据文内门禁自检
→ 替换正式工件
→ 更新 change .status.json
→ 最后更新全局 status.json
→ 返回写入证据
```

平台支持原子替换时使用临时同目录文件后替换；不支持时仍必须先完成候选内容和自检，再声明需要保存。任一步失败都不能提前推进后续状态。

共享日志采用追加或读—合并—写，不覆盖未知内容。并发编辑存在时，写入前重读受影响文件，检测基线变化。

## 8. 平台能力双模式

### 可写模式

实际创建和更新文件，返回：

- change；
- 当前 phase；
- 写入的完整相对路径；
- 验证门禁及结果；
- 阻塞项或下一步。

只有工具确认成功后才能写“已持久化”。

### 导出模式

平台不能直接写文件时，每个状态变化回复都必须包含完整文件包：

````markdown
## 持久化交付

- 持久化状态：需要保存
- change：<change>
- 更新文件：<完整列表>

### FILE: ai-workspace/status.json
```json
<完整内容>
```

### FILE: ai-workspace/changes/<change>/.status.json
```json
<完整内容>
```

### FILE: ai-workspace/changes/<change>/<artifact>.md
```markdown
<完整内容>
```
````

要求：

- 输出完整文件，不只给 diff；
- 文件顺序稳定：全局状态、change 状态、source、主工件、共享日志、其他工件；
- 明确说明尚未实际写入；
- 下一轮先读取用户保存后重新提供的文件；
- 不以“对话里我记住了”继续。

运行时文件不是第二份能力定义，因此不违反单文件 canonical 的定义独立性。

## 9. 语义覆盖合同

私有编译记录必须覆盖：

1. 目的、适用与不适用；
2. 必需输入、可选输入和权威顺序；
3. 主流程和不可改变顺序；
4. 产物所有权与目录结构；
5. 全局状态与 change 状态；
6. 暂停、恢复、重入和提前回答；
7. 平台可写与不可写模式；
8. 写入顺序、验证、失败和冲突；
9. 完成、阻塞、交接和归档边界；
10. 防谄媚、防虚假平衡、防提前完成和高风险门禁。

私有记录不进入成品。

## 10. 文档结构

推荐结构：

```markdown
# 能力名称

项目地址：https://github.com/NAMEWTA/Speculo

## 定位
## 适用范围
## 输入与权威
## 持久化输出合同
## 执行协议
## 工件格式
## 暂停与恢复
## 异常与高风险边界
## 质量自检
## 使用方式
```

多轮能力必须明确首次回复、停止点、恢复文件和禁止提前输出的内容。

## 11. 机械审计

审计器至少拒绝：

- 缺失或重复的允许 URL；
- 任意其他 URL；
- 项目名称或内部体系名称；
- canonical 自身 frontmatter；
- 源内部路径、root alias、源文件名和内部脚本；
- manifest、hash、生成元数据和 XML 来源包装；
- 缺失 `ai-workspace/`；
- 缺失 `status.json` 或 `.status.json`；
- 缺失不可写平台的完整 FILE bundle 规则；
- 便携路径中的 `..`、反斜杠、双斜杠或机器绝对路径；
- 未完成占位符；
- 过短、无一级标题或明显无产物合同的文档。

机械审计不能证明语义完整；语义完整由覆盖清单和场景演练保证。

## 12. 阻塞条件

出现任一情况停止交付：

- 静态依赖缺失或无法解析；
- 关键行为只能靠源仓库引用表达；
- 产物 ownership、目录或恢复键无法确定；
- 网页版只在对话中保留状态，没有持久化文件或完整导出；
- 平台不可写时只输出摘要、diff 或不完整片段；
- 状态会覆盖其他能力或无法安全合并；
- 关键顺序、门禁、暂停、恢复或完成标准丢失；
- 目录中混有旧版无持久化成品。

## 13. 权威与可重复性

同一源版本和同一编译决策应产生稳定文本。成品不嵌入 manifest、hash 或时间戳。源能力始终是唯一业务权威；canonical 只能从源重新编译，不能反向修改源规则。
