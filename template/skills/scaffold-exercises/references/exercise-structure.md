# Exercise Structure

## 目录命名

章节目录位于 `exercises/` 下，格式：

```text
XX-section-name/
```

示例：

```text
01-retrieval-skill-building/
```

练习目录位于章节目录下，格式：

```text
XX.YY-exercise-name/
```

示例：

```text
01.03-retrieval-with-bm25/
```

规则：

- 章节编号 = `XX`
- 练习编号 = `XX.YY`
- 名称使用 dash-case，小写字母和连字符
- 练习编号必须匹配所属章节编号

## 练习变体

每个练习至少需要以下一个子文件夹：

- `problem/`：带 TODO 的学生工作区
- `solution/`：参考实现
- `explainer/`：概念材料，不含 TODO

创建桩时，除非计划另有说明，默认使用 `explainer/`。

## 必需文件

每个变体文件夹都需要一个 `readme.md`。

`readme.md` 必须：

- 非空
- 包含真实内容，即使只有标题和一句描述
- 没有失效链接

最小桩：

```md
# Exercise Title

这里写描述。
```

如果子文件夹包含代码，还需要一个超过 1 行的 `main.ts`。只有 `readme.md` 的练习桩可以是 readme-only。

## 示例

计划：

```text
Section 05: Memory Skill Building
- 05.01 Introduction to Memory
- 05.02 Short-term Memory (explainer + problem + solution)
- 05.03 Long-term Memory
```

创建：

```text
exercises/05-memory-skill-building/05.01-introduction-to-memory/explainer/readme.md
exercises/05-memory-skill-building/05.02-short-term-memory/explainer/readme.md
exercises/05-memory-skill-building/05.02-short-term-memory/problem/readme.md
exercises/05-memory-skill-building/05.02-short-term-memory/solution/readme.md
exercises/05-memory-skill-building/05.03-long-term-memory/explainer/readme.md
```
