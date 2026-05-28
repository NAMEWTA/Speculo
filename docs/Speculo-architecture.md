# Speculo Framework
> 以结构化文档驱动 AI Coding 的标准化赋能体系

**版本：** v1.0  
**更新日期：** 2026-05-25  
**格式支持：** Markdown · JSON · XML

---

## 一、设计理念

Speculo 项目 是SDD（Specification-Driven Development AI）以**结构化文档作为单一真相来源**，通过物理形式的渐进式披露组织内容，驱动 AI 完成标准化、可复用的编码与写作工作流。

**三个核心原则：**

1. **渐进式披露** — 每个命令按阶段拆分为多个独立文件，AI 按需加载，避免上下文过载
2. **关注点分离** — workflows 定义"如何做"，templates 提供"做什么的骨架"，skills 提供原子能力
3. **产物持久化** — 每次工作流执行产生的结构化产物，以时间戳形式永久留存于 `.speculo/`

---

## 二、完整目录结构

```
Speculo/
├── commands/    
├── workflows/                                   # SDD工作流中枢
│   ├── dev/                                    # 开发类命令
│   │   ├── 00-GO.md                            # 入口：命令总览 & 执行指引
│   │   ├── 01-prd/
│   │   │   ├── 01-prd.md                      # 入口：命令总览 & 执行指引
│   │   │   ├── prd-core.md                    # Step 1：核心内容填写规范
│   │   │   └── prd-review.md                  # Step 2：评审阶段规范
│   │   ├── 02-design/
│   │   │   ├── 02-design.md                   # 入口：设计命令总览
│   │   │   ├── design-arch.md                 # 架构设计规范
│   │   │   └── design-api.md                  # API 设计规范
│   │   ├── 03-implement/
│   │   │   ├── 03-implement.md
│   │   │   ├── implement-core.md
│   │   │   └── implement-checklist.md
│   │   ├── 04-test/
│   │   │   ├── 04-test.md
│   │   │   ├── test-unit.md
│   │   │   └── test-e2e.md
│   │   └── 05-review/
│   │       ├── 05-review.md
│   │       ├── review-code.md
│   │       └── review-security.md
│   │
│   ├── doc/                                    # 写作类命令
│   │   ├── 00-GO.md                            # 入口：命令总览 & 执行指引
│   │   ├── 01-readme/
│   │   │   ├── 01-readme.md
│   │   │   └── readme-structure.md
│   │   ├── 02-changelog/
│   │   │   ├── 02-changelog.md
│   │   │   └── changelog-format.md
│   │   └── 03-api-doc/
│   │       ├── 03-api-doc.md
│   │       ├── api-doc-endpoint.md
│   │       └── api-doc-schema.md
│   │
│   └── ops/                                    # 运维 / 发布类命令（可扩展）
│   │   ├── 00-GO.md                            # 入口：命令总览 & 执行指引
│   │   ├── 01-release/
│   │   │   ├── 01-release.md
│   │   │   └── release-checklist.md
│   │   └── 02-deploy/
│   │       ├── 02-deploy.md
│   │       └── deploy-rollback.md
│
├── templates/                                  # 模板集合（与 workflows 一一对应）
│   ├── dev/                                    # 开发类模板（平铺）
│   │   ├── prd-template.md
│   │   ├── prd-review-template.md
│   │   ├── design-arch-template.md
│   │   ├── design-api-template.xml
│   │   ├── implement-template.md
│   │   ├── test-unit-template.md
│   │   ├── test-e2e-template.md
│   │   └── review-template.md
│   │   └── dev-status-template.json
│   │
│   ├── doc/                                    # 写作类模板（平铺）
│   │   ├── readme-template.md
│   │   ├── changelog-template.md
│   │   └── api-doc-template.xml
│   │   └── doc-status-template.json
│   │
│   └── ops/                                    # 运维类模板（平铺）
│       ├── release-template.md
│       └── deploy-template.md
│       └── ops-status-template.json
│
├── skills/                                     # 原子 Skill（零依赖，可内部自己独立调用，不依赖Speculo框架）
│   ├── refactor/
│   ├── test-gen/
│   ├── doc-gen/
│   ├── code-review/
│   ├── sql-optimize/
│   └── api-design/
│
└── .speculo/                                     # 项目持久化产物
    ├── dev/
    │   ├── 2026-05-25-user-auth/              # 格式：YYYY-MM-DD-<change-name>
    │   │   ├── tasks/
    │   │   │   ├── T01.md
    │   │   │   ├── T02.md
    │   │   │   ├── T03.md
    │   │   │   └── T04.md
    │   │   ├── tasks.md
    │   │   ├── prd.md
    │   │   ├── design.md
    │   │   ├── data-model.md
    │   │   └── review-notes.md
    │   └── 2026-05-20-payment-flow/
    │       ├── prd.md
    │       └── design.md
    ├── doc/
    │   └── 2026-05-24-api-v2-docs/
    │       ├── readme.md
    │       └── api-doc.md
    └── ops/
    │   └── 2026-05-18-v2.1.0-release/
    │       └── release-checklist.md
    └── archive/
        ├── dev/
        └── doc/
        └── ops/
    └── ops-status.json
    └── doc-status.json
    └── dev-status.json
    └── STATUS.json
    └── KNOWLEDGES/   
        └── AGENTS.md    — 知识库INDEX以及基础通用知识
        └── ARCHITECTURE.md    — 项目级系统架构
        └── CONTEXT.md    — 项目共享上下文
        └── LESSONS.md    — 跨任务失败知识库
        └── RULES.md      — 项目级别通用规则
```

---

## 三、模块说明

### 3.1 commands/ — 命令入口

命令入口目录，用于存放用户直接调用的命令定义。

**目录规则：**
- 提供用户可见的命令接口
- 与 `workflows/` 目录协同工作

---

### 3.2 workflows/ — 命令中枢

命令是 AI 执行工作流的核心驱动单元，采用**物理形式的渐进式披露**进行内容组织。

**目录规则：**
- 每个命令独占一个文件夹，以 `NN-command-name/` 编号命名
- 文件夹内的入口文件编号与文件夹编号保持一致，如 `02-design/` → `02-design.md`
- 入口文件之后的子文件，按执行阶段顺序命名，无需再编号

**渐进式披露逻辑：**

```
NN-command.md          ← AI 首先读取：命令是什么、适用场景、完整执行步骤索引
  └─ command-phase1.md ← Step 1 的详细规范与填写要求
  └─ command-phase2.md ← Step 2 的详细规范与填写要求
  └─ ...
```

**命令分类：**

| 分类 | 路径 | 用途 |
|------|------|------|
| dev | `workflows/dev/` | 软件开发全生命周期 |
| doc | `workflows/doc/` | 文档写作与维护 |
| ops | `workflows/ops/` | 发布、部署与运维 |

---

### 3.3 templates/ — 模板集合

模板为每个命令提供可直接填写的内容骨架，与 `workflows/` 保持 **1:1 对应关系**。

**目录规则：**
- 按命令分类平铺存放，类目下无需再建子目录层级
- 文件命名格式：`<command-name>-template.<ext>`
- 支持格式：`.md`（通用）、`.xml`（需结构化约束的场景）、`.json`（状态模板）

**对应关系示意：**

```
workflows/dev/01-prd/prd-core.md      →   templates/dev/prd-template.md
workflows/dev/02-design/design-api.md →   templates/dev/design-api-template.xml
workflows/doc/03-api-doc/             →   templates/doc/api-doc-template.xml
```

**状态模板：**

| 文件 | 说明 |
|------|------|
| `dev-status-template.json` | 开发类工作流状态模板 |
| `doc-status-template.json` | 文档类工作流状态模板 |
| `ops-status-template.json` | 运维类工作流状态模板 |

---

### 3.4 skills/ — 原子 Skill

Skill 是**完全独立的原子能力单元**，零依赖、无需任何外部上下文即可调用。

**目录规则：**
- 每个 skill 独占一个文件夹，以功能命名
- 可内部独立调用，不依赖 Speculo 框架

**现有技能：**
- `refactor/` — 代码重构
- `test-gen/` — 测试生成
- `doc-gen/` — 文档生成
- `code-review/` — 代码审查
- `sql-optimize/` — SQL 优化
- `api-design/` — API 设计

---

### 3.5 .speculo/ — 项目持久化产物

每次执行工作流后，产物以**变更维度**统一归档，作为项目的知识资产沉淀。

**目录规则：**
- 路径格式：`.speculo/<category>/<YYYY-MM-DD-change-name>/`
- 变更名称使用小写中划线命名，简洁描述本次变更内容
- 每个变更目录内存放本次工作流所有阶段的产物文件

**产物来源：**

```
执行 workflows/dev/01-prd/  →  产物归档至 .speculo/dev/YYYY-MM-DD-<name>/prd.md
执行 workflows/dev/02-design/ →  产物归档至 .speculo/dev/YYYY-MM-DD-<name>/design-arch.md
```

**子目录说明：**

| 目录 | 说明 |
|------|------|
| `dev/` | 开发类工作流产物（PRD、设计、实现、测试、审查） |
| `doc/` | 文档类工作流产物（README、变更日志、API 文档） |
| `ops/` | 运维类工作流产物（发布、部署） |
| `archive/` | 已归档的历史产物，按分类存放 |
| `KNOWLEDGES/` | 项目级知识库 |
  - `AGENTS.md` — 知识库 INDEX 以及项目通用基础知识（技术栈、命名规范、团队约定等） |
  - `ARCHITECTURE.md` — 项目级系统架构（模块划分、数据流向、关键设计决策） |
  - `CONTEXT.md` — 项目共享上下文，让 AI 理解"我们当前在做什么，为什么这么做"。应记录：项目背景与目标、当前迭代的焦点领域、已知的技术债与瓶颈、处于进行中的功能与负责人、近期已完成的里程碑。每次需求切换或重大决策后应及时更新，保持与当前项目状态同步 |
  - `LESSONS.md` — 跨任务失败知识库（踩过的坑、注意事项、反模式记录） |
  - `RULES.md` — 项目级别通用规则，定义跨所有工作流的强制约束与偏好，让 AI 在每次执行任务时自动遵循。应包括：代码生成风格（如是否强制 useMemo/useCallback）、语言偏好（如注释使用中文/英文）、安全规范（如禁止特定 API 调用）、版本管理策略（如提交信息格式）等全局性约定 |

**状态文件：**

| 文件 | 说明 |
|------|------|
| `dev-status.json` | 开发类工作流执行状态 |
| `doc-status.json` | 文档类工作流执行状态 |
| `ops-status.json` | 运维类工作流执行状态 |
| `STATUS.json` | 全局状态汇总 |

---

## 四、格式使用规范

| 场景 | 推荐格式 | 原因 |
|------|----------|------|
| workflows 入口与阶段文件 | `.md` | 人类可读，渐进式组织，AI 友好 |
| templates 通用模板 | `.md` | 填写灵活，无结构强约束 |
| templates 结构化模板 | `.xml` | 需要字段完整性校验的场景 |
| templates 状态模板 | `.json` | 状态追踪，机器可解析 |
| skills 原子能力 | 目录结构 | 独立模块，可内部调用 |
| .speculo 归档产物 | `.md` | 与对应 template 格式保持一致 |
| .speculo 状态文件 | `.json` | 状态追踪与汇总 |

---

## 五、扩展指引

### 新增一个 Command

1. 在 `workflows/<category>/` 下新建 `NN-<name>/` 文件夹
2. 创建入口文件 `NN-<name>.md`，写明命令用途、适用场景、执行步骤索引
3. 按阶段创建子文件 `<name>-<phase>.md`
4. 在 `templates/<category>/` 下创建对应模板文件

### 新增一个 Skill

1. 在 `skills/` 下创建 `<skill-name>/` 目录
2. 在目录内实现独立的原子能力
3. Skill 无需与任何 command 绑定

### 归档一次变更产物

1. 在 `.speculo/<category>/` 下创建 `YYYY-MM-DD-<change-name>/` 目录
2. 将本次工作流各阶段产出的文件放入该目录
3. 文件命名与 templates 中对应模板保持语义一致

---

## 六、版本历史

| 版本 | 日期 | 说明 |
|------|------|------|
| v1.0 | 2026-05-25 | 初始架构设计，确立五层模块体系（commands、workflows、templates、skills、.speculo） |
