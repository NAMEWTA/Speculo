# Migration SOP

## 目标

把外部技能、旧 workflow、参考项目资产或临时目录内容，迁移成符合当前 Speculo 规范的 workflow、skill 或 command。

## 读取顺序

1. 读取本 skill 对应资产类型的 `references/`（`workflow-authoring-sop.md` / `skill-authoring-sop.md` / `command-authoring-sop.md` / `persistence-contract-sop.md`），规范已内化，不读仓库 `docs/`。
2. 读取目标分类或同类资产的入口文件，对齐真实写法。
3. 读取参考项目或源技能的 README / index，确定源材料边界。
4. 只读取与本次迁移相关的源文件，不批量导入无关内容。

## 提取原则

保留源材料中的：

- 核心行为
- 触发条件
- 输入输出
- 铁律和边界
- 失败恢复
- 有价值的模板和检查表

压缩或删除：

- 来源项目宣传语
- 安装说明
- 与 Speculo 无关的目录说明
- 已被当前规范替代的元数据
- 重复内容

## 规范化规则

### 路径

把旧路径改成当前 Speculo 路径：

- change 产物：`speculo/.speculo/<cat>/<change>/`
- command 产物：`speculo/.speculo/commands/<YYYY-MM-DD>-<cmd>-<topic>/`
- 项目规则：`speculo/.speculo/.config/RULES.md`
- 项目经验：`speculo/.speculo/.config/LESSONS.md`
- 项目上下文：`speculo/.speculo/.config/context/`
- 项目 ADR：`speculo/.speculo/.config/adr/`

不要创建新的项目根 state 文件，除非当前规范明确允许。

### Frontmatter

把外部 frontmatter 收敛成 Speculo 最小集：

- workflow：`id`、`category`、`name`、`description`、`keywords`
- skill：`id`、`type: skill`、`name`、`description`
- command：`id`、`type: command`、`name`、`description`、`keywords`

### 渐进披露

大段背景放入：

- workflow phase 文件
- workflow `_templates/`
- skill `references/`
- command 内联模板

不要把长 reference 塞进入口文件。

## 融合规则

多个源技能融合为一个原子 skill 时：

- 入口 `SKILL.md` 只保留统一触发、输入输出和主流程
- 源技能细节按主题拆到 `references/`
- 去掉源技能之间互相引用的旧路径
- 合并重复铁律，保留更严格者
- 明确调用方负责持久化

多个源技能融合进 workflow 时：

- 把 workflow-only 方法内置到 workflow 目录
- 不再作为根 skill 分发
- 每个源技能能力变成 phase、内置指引或模板

## 索引与测试

迁移完成后同步：

- 分类 `00-INDEX.md`
- `speculo/.speculo/<cat>-status.json` 初始骨架
- `speculo/.speculo/archive/<cat>/.gitkeep`
- 项目若有 docs quick reference / architecture / adopting 等索引，按需更新
- CLI tests 的 asset copying 断言

## 残留扫描

按源项目情况扫描旧绑定，例如：

```bash
rg "\.specforge|\.docs-sync-state|docs/adr/|根目录.*CONTEXT" speculo docs
```

扫描命令应随迁移来源调整，目标是确认旧规范没有回流。
