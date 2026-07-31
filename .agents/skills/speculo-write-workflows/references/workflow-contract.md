# Workflow authoring contract

## 包结构

```text
template/workflows/<workflow>/
  INDEX.md
  <Letter>-<work>/
    <Letter>-<work>.md
    <branch>.md
  common/
    README.md              # 可选总览，存在时必须有用途
    rules/
    schemas/
    tools/
    skills/<name>/SKILL.md
  _state/                  # 初始化种子，不是 runtime root
```

目录按需要存在。`common` 和 `_state` 的具体内容由 INDEX 和 init 实现决定；不为整齐创建空层级。

## INDEX 是入口合同

INDEX 必须让 Agent 在不加载全部 work 的情况下知道：

- workflow 的身份和目标；
- workflow/static root 与 state root；
- 权威工件链和冲突裁决；
- 初始化与恢复协议；
- 状态 schema；
- 写入 namespace；
- 副作用边界；
- work 索引；
- 包级验证命令。

完整骨架见 `index-template.md`，它是清单而不是强制文字模板。

## `_state` 的语义

`template/workflows/<workflow>/_state/` 只保存安装/初始化所需的种子，例如 `status.json`、空目录占位或 schema 示例。安装后实际状态位于：

```text
{roots.state}/<workflow>/
```

INDEX 和 works 绝不把 `{roots.workflows}/<workflow>/_state/` 当作运行时写入路径。Init 代码负责从种子创建 runtime state；没有生成者的 seed 不应存在。

## 状态 schema

每个 workflow 独立版本化。INDEX 逐字段说明：

- 名称和 JSON 类型；
- 必需/可选；
- owner；
- 初始化值；
- 更新时机；
- 枚举或格式；
- 与 change `.status.json` 的关系。

Schema 变化无需兼容旧版本时，直接提高版本、更新种子、全部 works、validator 和文档，并删除旧字段分支。

## 生命周期

至少定义：

- workflow 初始化；
- change 选择或创建；
- work 开始；
- work 完成/阻塞/取消；
- workflow 恢复；
- change 完成；
- 归档（若支持）。

每个转换有唯一 owner 和可验证前置条件。状态是工件真实情况的索引，不替代工件本身。

## Work 图

为每个 work 建立：

| 字段 | 含义 |
|---|---|
| id | 状态和调用使用的语义 id |
| entry | 静态入口 `<Path>` |
| leading word | 独立职责 |
| required inputs | 缺失即阻塞 |
| optional inputs | 可跳过 |
| outputs | 唯一 owned 工件 |
| state transitions | 可修改字段 |
| next routes | 成功、阻塞、返回上游 |

所有 required input 必须由入口、前置 work 或外部摄入产生。所有输出必须有消费者或明确长期价值。

## Common

- `common/rules`：多个 work 使用的平级规范；无独立调用过程。
- `common/schemas`：机器校验的结构合同。
- `common/tools`：确定性验证/转换脚本。
- `common/skills`：至少两个 work 需要独立调用、拥有自身 description 和过程的能力。

一个文件只有一个调用方时，移回调用方目录。跨 workflow 共享能力进入 `template/skills`，不复制到多个 common。

## AUTO-INDEX

INDEX 中保留且只保留一对：

```markdown
<!-- AUTO-INDEX-START -->
...
<!-- AUTO-INDEX-END -->
```

生成器扫描当前目录下符合 `^[A-Z]-` 的 work 目录，读取同名入口 frontmatter 的 `name` 和 `description`，按目录名排序，重建列表。Person 等简化 workflow 也使用同一算法。

## Validation

包级验证覆盖：

- INDEX frontmatter 与目录一致；
- work 目录/入口/frontmatter 一致；
- AUTO-INDEX 与真实 works 一致；
- 静态 `<Path>` 目标存在；
- state 路径不指向 `_state`；
- namespace 有 owner；
- JSON seed 和 schema 可解析；
- tools 的 `--self-check` 或样例通过；
- 无失效旧 id。
