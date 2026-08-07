---
name: speculo-write-canonical
description: 编译、重建或审计 Speculo canonical 单文件分发物；当任务涉及把 skill、command、work 或 workflow 的全部静态依赖内联、去除 Path/frontmatter 或验证自包含性时使用。
---

# Speculo Write Canonical

以**编译**为主导词。Canonical 是源能力的透明单文件构建产物，不是手工维护的第二事实源。

## 过程

### 1. 选择源入口

读取 [项目模型](../_shared/project-model.md)、[路径规则](../_shared/path-and-reference-rules.md)、[质量模型](../_shared/authoring-quality.md)、[Canonical contract](references/canonical-contract.md) 和 `../../../template/canonical/README.md`。用户提供参考内容时，先应用质量模型中的“参考内容复用”规则；然后确定一个入口：skill `SKILL.md`、command `.md`、workflow `INDEX.md` 或 work 入口。

**完成标准**：入口真实存在；输出位于 `template/canonical/`；源与输出不是同一文件；运行时 state 和历史产物不在源范围。

### 2. 构建传递静态依赖闭包

递归扫描入口和每个新发现文件中的相对 Markdown 链接与 `<Path>`。将 root alias 映射到 `template/`，跟随静态能力文件；记录动态 state 路径、外部 URL 和被排除资源。检测循环并去重，不只扫描入口一层。

**完成标准**：队列为空；每个引用被分类为“已内联、运行时说明、外部 URL、排除或阻塞”；所有未解析静态引用都阻塞生成。

### 3. 规范化每个源

按确定顺序读取所有文件：入口优先，其余按首次 DFS 发现。去除开头 YAML frontmatter；把 `<Path>` 标签替换为可读的反引号路径表达；把指向已内联文件的链接改为对应 XML 标签说明。JSON/text 资源保留原文并使用 fenced code block。

**完成标准**：每个源只出现一次；内容没有 frontmatter；每个内部引用指向唯一标签；路径变量的含义仍可理解。

### 4. 组装单文件

入口正文作为主体；其余源放在 `## 参考内容` 后，用由相对路径生成的唯一 XML 标签隔离。标签碰撞时加入父路径片段或稳定数字后缀。

**完成标准**：输出是普通 Markdown；无 `<canonical>`/`<source-file>` 外壳；每个依赖有且只有一个开闭标签；顺序可重复。

### 5. 运行生成器和审计

```bash
node .agents/skills/speculo-write-canonical/scripts/build-canonical.mjs \
  --repo . --entry <entry> --output template/canonical/<name>.md
```

检查无 YAML frontmatter、无 `<Path>`、无未解析内部 Markdown 链接、无运行时 state 内容，并再次生成比较 hash。

**完成标准**：两次生成字节一致；依赖 manifest 完整；任何外部配套能力都明确列为非内联外部依赖，而不是静默遗漏。

### 6. 更新与交付

Canonical 仅从源重建。源变化时更新输出和项目已有 canonical 测试/生成命令；不在 canonical 单独修复业务规则。

**完成标准**：源、生成命令和 canonical 同步；全仓不存在把 canonical 当权威源的反向引用。
