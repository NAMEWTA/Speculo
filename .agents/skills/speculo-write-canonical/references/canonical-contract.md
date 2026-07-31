# Canonical compilation contract

## 输入

一个静态能力入口：

- `template/skills/<name>/SKILL.md`
- `template/commands/<id>.md`
- `template/workflows/<workflow>/INDEX.md`
- `template/workflows/<workflow>/<work>/<work>.md`

## 依赖发现

递归发现：

1. 相对 Markdown 链接：`[label](path)`；
2. `<Path>{roots.skills|commands|workflows|speculo|config}/...</Path>`；
3. 入口或 reference 中明确声明必须内联的 JSON/text 资源。

`{roots.state}` 路径是运行时数据说明，不跟随；`_state`、`.speculo` 实例、archive、changes、command reports、`.gitkeep`、系统文件和依赖目录不内联。

外部 URL 保留为 URL。若外部资源是执行能力必需知识，生成阻塞，除非用户明确接受它作为配套上传依赖。

## 闭包算法

- 使用规范化仓库相对路径作为去重 key；
- 入口入栈；
- 深度优先按文中出现顺序发现；
- 循环只记录一次，不重复正文；
- 每个静态引用解析失败即报错；
- 输出 manifest 包含源相对路径与 hash。

目录链接不自动内联整个目录；入口必须通过索引或明确清单列出所需文件，避免把无关资产打包。

## 内容转换

### Frontmatter

只移除文件开头、由第一行 `---` 开始并由下一独立 `---` 结束的 YAML block。正文中的水平线不删除。

### `<Path>`

替换为反引号包裹的内部路径表达，例如：

```text
<Path>{roots.state}/specdev/changes/{change}/spec.md</Path>
```

变为：

```text
`{roots.state}/specdev/changes/{change}/spec.md`
```

反引号表达保留变量和所有权信息，比猜测性自然语言改写更确定。

### 内部链接

指向已内联文件的链接替换为：

```text
参见下方 `<tag>`。
```

同一段中可保留原链接文字。锚点链接保持为文内锚点；图片和二进制资源不直接内联，需转换为文本资产或声明配套依赖。

### 非 Markdown

JSON 使用 `json` fenced code；JavaScript 使用 `javascript`；纯文本使用 `text`。XML 标签内部保留完整 fenced block。

## 标签

从源相对路径生成：

1. 去扩展名；
2. 路径段与非字母数字转为 `-`；
3. 小写并折叠连字符；
4. 若以数字开头，加 `source-`；
5. 冲突时从最近父目录向前增加路径段；仍冲突时加 `-2`、`-3`。

标签必须符合 XML name 的安全子集 `[a-z_][a-z0-9._-]*`。

## 输出结构

```markdown
# <能力标题>

<入口正文>

---

## 参考内容

<tag>

<来源正文>

</tag>
```

可以在文末加入 HTML comment manifest；不能加入影响能力行为的新规则。

## 阻塞条件

- 静态引用不存在或越出仓库；
- 必需外部知识未内联且未声明配套依赖；
- 标签无法唯一化；
- 输出仍含 `<Path>` 或 YAML frontmatter；
- 输出包含 runtime state 实例或敏感信息；
- 输出路径与任何源路径相同。

## 可重复性

相同源字节和相同入口必须产生相同输出。生成时间不写入正文；manifest 使用内容 hash，不使用当前时间。
