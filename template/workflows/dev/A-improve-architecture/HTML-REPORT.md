# HTML 报告格式

架构审查以单个**自包含 HTML 文件**渲染，写入 `speculo/.speculo/dev/<change>/architecture-review.html`（由入口 `A-improve-architecture.md` Phase 2 规定，**不写临时目录**）。Tailwind 和 Mermaid 均从 CDN 加载。Mermaid 可靠地处理图形状图表；手写 div 和内联 SVG 处理更具编辑性的可视化（质量图、横截面图）。两者混合使用——不要所有内容都依赖 Mermaid，否则会显得千篇一律。

## 脚手架

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Architecture review — {{repo name}}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script type="module">
      import mermaid from "https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs";
      mermaid.initialize({ startOnLoad: true, theme: "neutral", securityLevel: "loose" });
    </script>
    <style>
      /* small custom layer for things Tailwind doesn't cover cleanly:
         dashed seam lines, hand-drawn-feeling arrow heads, etc. */
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

仓库名称、日期和紧凑图例：实线框 = 模块，虚线 = 接缝，红色箭头 = 泄漏，深色粗框 = 深层模块。没有介绍段落——直接进入候选方案。

## 候选卡片

图表承担主要信息量。文字稀疏、平实，使用 `../../../vendor/codebase-design/SKILL.md` 的术语表词汇，不铺陈。

每个候选方案为一个 `<article>`：

- **标题**——简短，命名深化操作（例如「折叠订单接收流水线」）。
- **徽章行**——推荐强度（`Strong` = 翡翠绿，`Worth exploring` = 琥珀色，`Speculative` = 石板灰），外加一个依赖类别标签（`in-process`、`local-substitutable`、`ports & adapters`、`mock`）。
- **文件**——等宽字体列表，`font-mono text-sm`。
- **Before / After 图表**——核心部分。两列并排。见下方模式。
- **问题**——一句话。痛点是什么。
- **解决方案**——一句话。改变了什么。
- **收益**——项目符号，每条 ≤6 个字。例如「测试只需命中一个接口」「定价逻辑不再泄漏」「删除 4 个浅层包装器」。
- **ADR 提示**（如适用）——琥珀色背景框中的一行说明。

没有解释性段落。如果图表需要一段文字才能理解，那就重绘图表。

## 图表模式

选择适合候选方案的模式。混合使用。不要让每张图表看起来都一样——多样性本身就是目的之一。

### Mermaid 图（依赖/调用流的常用工具）

当要表达「X 调用 Y 调用 Z，看看这有多乱」时，使用 Mermaid `flowchart` 或 `graph`。用 Tailwind 风格的卡片包裹它，避免显得突兀。使用 classDef 将泄漏边着色为红色，将深层模块着色为深色。时序图适合表达「Before：6 次往返；After：1 次」。

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

### 手写框线箭头图（当 Mermaid 布局不理想时）

模块用带有边框和标签的 `<div>` 表示。箭头用绝对定位在相对容器上的内联 SVG `<line>` 或 `<path>` 元素表示。当你希望「After」图表呈现为一个粗边框的深层模块，内部变灰时，使用这种方式——Mermaid 无法渲染出正确的视觉重量。

### 横截面图（适合展示分层浅度）

堆叠水平条带（`h-12 border-l-4`）来展示调用经过的层级。Before：6 个薄层，每层几乎什么都不做。After：1 个粗条带，标注了合并后的职责。

### 质量图（适合展示「接口与实现一样宽」）

每个模块两个矩形——一个表示接口表面积，一个表示实现。Before：接口矩形几乎和实现矩形一样高（浅层）。After：接口矩形短，实现矩形高（深层）。

### 调用图折叠

Before：函数调用树，渲染为嵌套盒子。After：同一棵树折叠为一个盒子，内部现已内部化的调用在其中淡色显示。

## 样式指南

- 偏编辑风格，而非企业仪表盘风格。宽裕的留白。标题可选衬线字体（`font-serif` 与 stone/slate 配色搭配效果很好）。
- 颜色克制：一种强调色（翡翠绿或靛蓝）加红色表示泄漏，琥珀色表示警告。
- 图表高度保持在约 320px，以便 before/after 并排显示无需滚动。
- 图表内模块标签使用 `text-xs uppercase tracking-wider`——它们应该呈现为示意图风格，而非 UI 风格。
- 唯一的脚本是 Tailwind CDN 和 Mermaid ESM 导入。报告其余部分是静态的——没有应用代码，除 Mermaid 自身渲染外没有交互性。

## 首选推荐部分

一张较大的卡片。候选方案名称，一句说明原因的话，锚链接指向其卡片。仅此而已。

## 语气

平实中文，简洁——但架构名词和动词直接来自 `../../../vendor/codebase-design/SKILL.md`。简洁不是偏离术语表的借口。

**精确使用：** 模块（module）、接口（interface）、实现（implementation）、深度（depth）、深（deep）、浅（shallow）、接缝（seam）、适配器（adapter）、杠杆（leverage）、局部性（locality）。

**绝不替换：** 组件 / 服务 / 单元（表示 module）· API / 签名（表示 interface）· 边界（表示 seam）· 层 / 包装器（表示 module，当你的意思是 module 时）。

**符合风格的表述：**

- 「订单接收模块是浅的——接口几乎和实现一样复杂。」
- 「定价逻辑在接缝处泄漏。」
- 「深化：一个接口，一处可测。」
- 「两个适配器证明了接缝：生产用 HTTP，测试用内存。」

**收益项目符号**用术语表词汇命名收益：「局部性：bug 集中在一个模块」「杠杆：一个接口，N 个调用点」「接口缩小，实现吸收包装器」。不要写「更易维护」或「更干净的代码」——这些词不在术语表中，不应出现。

不模棱两可，不开场白，不写「值得注意的是……」。如果一句话可以变成项目符号，就变成项目符号。如果一个项目符号可以删掉，就删掉。如果一个词不在 `../../../vendor/codebase-design/SKILL.md` 术语表中，在发明新词之前先找一个术语表中有的词。
