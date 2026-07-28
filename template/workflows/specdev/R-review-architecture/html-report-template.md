# HTML 报告模板

架构审查渲染为单个自包含 HTML 文件，写入操作系统临时目录。Tailwind 和 Mermaid 均来自 CDN。Mermaid 处理图形状图表（调用图、依赖关系、序列）；手工构建的 div 和 inline SVG 处理编辑性可视化（质量图、横截面、坍缩动画）。混合使用两者——不要所有图表都用 Mermaid，多样性本身就是目的。

`{{config.defaults.report_language}}` 占位符由运行时解析为 `speculo/config.json` 的 `defaults.report_language` 字段值；若配置文件不存在则默认为 `"en"`。

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

仓库名称、日期，以及紧凑图例：实线框 = 模块，虚线 = 接缝，红色箭头 = 泄漏，粗黑框 = 深模块。无介绍段落——直接进入候选列表。

## 候选卡片

每个候选渲染为一个 `<article>` 元素。图表承担主要分量——文字稀疏、平实，使用 `<Path>{roots.workflows}/specdev/I-implement/codebase-design-glossary.md</Path>` 中的术语，不刻意修饰。

卡片结构：

- **标题** — 简短命名深化方案（如"合并 Order 接收管线"）
- **徽章行** — 推荐强度（`Strong` = 翠绿、`Worth exploring` = 琥珀、`Speculative` = 石板灰）+ 依赖类别标签（`进程内`、`本地可替换`、`端口与适配器`、`mock`）
- **文件** — 等宽字体列表，`font-mono text-sm`
- **Before / After 图表** — 核心。两列并排，见下方图表模式
- **Problem** — 一句。当前架构的摩擦是什么
- **Solution** — 一句。改变什么
- **Wins** — 要点，每项 ≤6 词。用术语表命名收益："局部性：bug 集中在一个模块"、"杠杆：一个接口，N 个调用点"、"接口缩小；实现吸收包装器"
- **ADR 标注**（如适用）— 一行，琥珀色调框中

不要写"更易维护"或"更清晰的代码"——这些术语不在 `<Path>{roots.workflows}/specdev/I-implement/codebase-design-glossary.md</Path>` 术语表中。如果图表需要一段文字才能理解，重新画图。

## 图表模式

选择适合候选的模式。混合使用。不要让每个图表看起来都一样。

### Mermaid 图表（依赖/调用流）

当重点是"X 调用 Y 调用 Z，看这多混乱"时使用 `flowchart` 或 `graph`。用 Tailwind 风格卡片包裹。使用 classDef 将泄漏边缘着红色、深模块着深色。序列图适合展示"before：6 个往返；after：1 个"。

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

### 手工框线图（Mermaid 布局难以驾驭时）

模块用带边框和标签的 `<div>` 表示。箭头用绝对定位在相对容器上的 inline SVG `<line>` 或 `<path>` 表示。当希望"after"图表呈现为一个粗边深模块、内部灰显时使用——Mermaid 不会以合适的视觉权重渲染这种效果。

### 横截面图（分层浅度）

堆叠水平条（`h-12 border-l-4`）展示调用经过的各层。Before：6 个薄层各做极少。After：一个厚条标注合并后的职责。

### 质量图（接口与实现一样宽）

每个模块两个矩形——一个表示接口表面积，一个表示实现。Before：接口矩形几乎和实现矩形一样高（浅）。After：接口矩形短，实现矩形高（深）。

### 调用图坍缩

Before：嵌套框呈现的函数调用树。After：同一棵树坍缩成一个框，内部调用在其内部以淡化形式显示。

### 模块关系图（接缝对比）

Before：模块 A 和 B 紧耦合，虚线穿越表示接缝泄漏。After：一个深模块包裹 A 和 B 的内部，干净接口对外暴露。使用 inline SVG 绘制两个并列场景。

## 样式指导

- 偏向编辑风格而非企业仪表盘。宽松留白。标题可选用衬线字体（`font-serif` 与 stone/slate 搭配）
- 色彩克制：一种强调色（翠绿或靛蓝）+ 红色用于泄漏 + 琥珀用于警告
- 图表高度约 320px，使 before/after 并排舒适放置无需滚动
- 模块标签用 `text-xs uppercase tracking-wider`——应读作示意图而非 UI
- 唯一脚本是 Tailwind CDN 和 Mermaid ESM import——其余全部静态，无应用代码

## 最佳推荐

一张更大的卡片。候选名称，一句说明为什么，指向其卡片的锚链接。

## 语气

平实、简洁——架构名词和动词直接来自 `<Path>{roots.workflows}/specdev/I-implement/codebase-design-glossary.md`。简洁不是偏离的借口。

**完全使用：** module、interface、implementation、depth、deep、shallow、seam、adapter、leverage、locality。

**绝不替代：** component、service、unit（代替 module）· API、signature（代替 interface）· boundary（代替 seam）· layer、wrapper（代替 module 当实际指 module 时）。

**符合风格的表达：**
- "Order 接收模块是浅层的——接口几乎与实现匹配。"
- "Pricing 跨越接缝泄漏。"
- "深化：一个接口，一个测试点。"
- "两个适配器证明接缝：生产用 HTTP，测试用内存。"

不模糊其词，不说"值得注意的是……"。如果一句话可以变成要点，就变成要点。如果一个要点可以删除，就删除它。如果一个术语不在 `<Path>{roots.workflows}/specdev/I-implement/codebase-design-glossary.md` 术语表中，在发明新术语之前先用术语表中已有的。
