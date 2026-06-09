# Asset Selection SOP

## 目标

把用户的“做一个能力”翻译成 Speculo 的正确资产形态：workflow、skill、command，或它们的组合。

## 判定规则

### 做 Workflow

选择 workflow，当能力满足任一条件：

- 多阶段交付，需要 phase 文件、产物模板和 `.status.json`
- 产物属于一次 change，需要写 `.speculo/<cat>/<change>/`
- 会跨多轮对话推进，或需要 `current_phase`、`phase_history`
- 是业务流程、开发流程、文档流程或运维流程

分类：

- `dev`：开发、PRD、TDD、review、docs-sync、诊断、issue 分解
- `doc`：文章、素材、文档写作、编辑、塑形
- `ops`：运维、发布、巡检、外部系统操作的多阶段流程

### 做 Skill

选择 skill，当能力满足任一条件：

- 是 command 或 workflow 可复用的原子能力
- 复制到其他项目仍能工作
- 需要 `references/` 渐进披露
- 不拥有独立持久化根目录；文件型持久化由调用方提供 `.speculo/...` 目标路径，或返回内容给调用方写入
- 是工具集成、领域知识、决策 SOP 或可复用操作手册

### 做 Command

选择 command，当能力满足全部条件：

- 单步动作或短流程
- 不需要 phase 状态机
- 产物只归档到 `.speculo/commands/<YYYY-MM-DD>-<cmd>-<topic>/`
- 可以调用 skill，但不需要 workflow 的 change 生命周期

### 做组合

- command 触发 skill：例如一次性报告、归档、状态聚合
- workflow 内嵌 skill：例如发布 workflow 调用 GitHub/npm 原子能力
- workflow 融合旧 skill：当旧 skill 只服务某个 workflow，不再作为根 skill 分发

## 反例

- 不要把多阶段、有状态的流程塞进 skill。
- 不要让 skill 自行选择 `.speculo/`、`temp/`、系统临时目录或项目根目录作为持久化位置。
- 不要为一次性命令创建 workflow。
- 不要把 workflow-only 方法保留为根 skill，除非会被多个入口复用。

## 输出决策

在实施前写清：

- 资产类型
- 目标路径
- 入口 id / alias
- 持久化路径
- 是否需要模板、references、scripts
- 需要同步的索引、文档和测试
