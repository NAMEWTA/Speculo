# HTML 报告格式

架构审查渲染为一个独立的 HTML 文件，存放在操作系统临时目录中。Tailwind 和 Mermaid 均来自 CDN。Mermaid 处理图形状的图表；手工构建的 div 和内联 SVG 处理更具编辑性的可视化（质量图、横截面图）。混合使用两者 — 不要所有事情都依赖 Mermaid，否则会变得千篇一律。

`{{config.defaults.report_language}}` 占位符由 runtime-context 输出的 `config` 对象填充，值来自 `speculo/config.json` 的 `defaults.report_language` 字段；若 config 文件不存在，默认值为 `"en"`。Tailwind 和 Mermaid 均来自 CDN。Mermaid 处理图形状的图表；手工构建的 div 和内联 SVG 处理更具编辑性的可视化（质量图、横截面图）。混合使用两者 — 不要所有事情都依赖 Mermaid，否则会变得千篇一律。

## 脚手架

```html
<!doctype html>
<html lang="{{config.defaults.report_language}}">
  <head>
    <meta charset="utf-8" />
    <title>Architecture review — {{repo name}}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script type="module">
      import mermaid from "https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs";
      mermaid.initialize({ startOnLoad: true, theme: "neutral", securityLevel: "loose" });
    </script>
    <style>
      /* Tailwind 无法很好覆盖的小型自定义层：
         虚线接缝线、手绘感箭头等。 */
      .seam { stroke-dasharray: 4 4; }
      .leak { stroke: #dc2626; }
      .deep { background: linear-gradient(135deg, #0f172a, #1e293b); }
    </style>
  </head>
  <body class="bg-stone-50 text-slate-900 font-sans">
    <main class="max-w-5xl mx-auto px-6 py-12 space-y-12">
      <header>...</header>
      <section id="candidates" class="space-y-10">...</section>
      <section id="top-recommendation">...</section>
    </main>
  </body>
</html>
```

## 页头

仓库名称、日期和一个紧凑的图例：实线框 = 模块，虚线 = 接缝，红色箭头 = 泄漏，粗黑框 = 深模块。无介绍段落 — 直接进入候选。

## 候选卡片

图表承担主要分量。文字稀疏、平实，并使用来自 `/codebase-design` skill 的术语，不刻意修饰。

每个候选是一个 `<article>`：

- **标题** — 简短，命名深化方案（例如"Collapse the Order intake pipeline"）。
- **徽章行** — 推荐强度（`Strong` = 翡翠绿，`Worth exploring` = 琥珀色，`Speculative` = 石板灰），外加一个依赖类别标签（`in-process`、`local-substitutable`、`ports & adapters`、`mock`）。
- **文件** — 等宽字体列表，`font-mono text-sm`。
- **Before / After 图表** — 核心。两列，并排。参见下方模式。
- **Problem** — 一句话。痛点是什么。
- **Solution** — 一句话。改变了什么。
- **Wins** — 要点，每个不超过 6 个词。例如 "Tests hit one interface"、"Pricing logic stops leaking"、"Delete 4 shallow wrappers"。
- **ADR 标注**（如适用）— 一行，放在琥珀色调的框中。

无需解释段落。如果图表需要一段文字才能理解，重新画图。

## 图表模式

选择适合候选的模式。混合使用它们。不要让每个图表看起来都一样 — 多样性本身就是目的的一部分。

### Mermaid 图表（依赖/调用流的常用工具）

当重点是"X 调用 Y 调用 Z，看看这有多混乱"时，使用 Mermaid `flowchart` 或 `graph`。用 Tailwind 风格卡片包裹它，这样不会显得突兀。使用 classDef 将泄漏边缘着红色，深模块着深色。序列图适合展示"before：6 个往返；after：1 个"。

```html
<div class="rounded-lg border border-slate-200 bg-white p-4">
  <pre class="mermaid">
    flowchart LR
      A[OrderHandler] --> B[OrderValidator]
      B --> C[OrderRepo]
      C -.leak.-> D[PricingClient]
      classDef leak stroke:#dc2626,stroke-width:2px;
      class C,D leak
  </pre>
</div>
```

### 手工绘制的框线图（当 Mermaid 的布局难以驾驭时）

模块用带边框和标签的 `<div>` 表示。箭头用绝对定位在相对容器上的内联 SVG `<line>` 或 `<path>` 元素表示。当你希望"after"图表看起来像一个粗边的深模块，内部元素灰显时使用 — Mermaid 不会以合适的权重渲染这种效果。

### 横截面图（适合分层浅度）

堆叠水平条（`h-12 border-l-4`）来展示调用经过的各层。Before：6 个薄层，每个都不做什么。After：一个厚条，标注合并后的职责。

### 质量图（适合"接口与实现一样宽"的场景）

每个模块两个矩形 — 一个表示接口表面积，一个表示实现。Before：接口矩形几乎和实现矩形一样高（浅）。After：接口矩形短，实现矩形高（深）。

### 调用图坍缩

Before：嵌套框呈现的函数调用树。After：同一棵树坍缩成一个框，内部调用在其内部以淡化形式显示。

## 样式指导

- 偏向编辑风格，而非企业仪表盘风格。宽松的留白。标题可选择衬线字体（`font-serif` 与 stone/slate 搭配效果很好）。
- 色彩使用克制：一种强调色（翠绿或靛蓝），加上红色用于泄漏，琥珀色用于警告。
- 保持图表约 320px 高，使 before/after 能够舒适地并排放置而无需滚动。
- 使用 `text-xs uppercase tracking-wider` 用于图表内的模块标签 — 它们应读起来像示意图，而非 UI。
- 唯一的脚本是 Tailwind CDN 和 Mermaid ESM 导入。除此之外报告是静态的 — 没有应用代码，除了 Mermaid 自身的渲染之外没有交互。

## 顶部推荐部分

一张更大的卡片。候选名称，一句话说明为什么，指向其卡片的锚链接。这就够了。

## 语气

平实的英语，简洁 — 但架构名词和动词直接来自 `/codebase-design` skill。简洁不是偏离的借口。

**完全使用：** module、interface、implementation、depth、deep、shallow、seam、adapter、leverage、locality。

**绝不替代：** component、service、unit（代替 module）· API、signature（代替 interface）· boundary（代替 seam）· layer、wrapper（代替 module，当你的意思是 module 时）。

**符合风格的表达方式：**

- "Order intake module is shallow — interface nearly matches the implementation."
- "Pricing leaks across the seam."
- "Deepen: one interface, one place to test."
- "Two adapters justify the seam: HTTP in prod, in-memory in tests."

**Wins 要点**用术语表命名收益：*"locality: bugs concentrate in one module"*、*"leverage: one interface, N call sites"*、*"interface shrinks; implementation absorbs the wrappers"*。不要写 *"easier to maintain"* 或 *"cleaner code"* — 这些术语不在术语表中，不值得留下。

不模糊其词，不清喉咙，不说"值得注意的是……"。如果一句话可以变成一个要点，就变成要点。如果一个要点可以删除，就删除它。如果一个术语不在 `/codebase-design` 术语表中，在发明新术语之前先用术语表中已有的。
