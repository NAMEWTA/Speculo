# Generate Design Package

在候选已形成后使用。设计系统主文档是源；HTML/CSS/JS 是可运行投影，不能成为第二套未记录规则。

## 1. 生成候选页面

为每个候选创建 `<Path>{roots.state}/specdev/changes/{change}/prototypes/{design-id}/comparison/variants/{style-id}.html</Path>`。每页使用相同真实任务、数据和状态，差异集中在 shell、信息层级、操作入口、密度、token 与跨端策略。页面必须离线运行，不引用 CDN、远程字体或远程图片；可从 `<Path>{roots.workflows}/specdev/P-prototype/design-library/research-snapshot/ui-gallery/assets/</Path>` 复制已归属的本地资产。

每页至少展示默认、hover/focus、selected、loading、empty/error 中与任务相关的状态，并包含浅/深主题或明确说明为何只有单主题。图标按钮使用项目已有图标库；新项目可复制 design library 内的 Lucide 资产。

**完成标准**：2-4 个候选各有独立 HTML，使用同一任务语义，页面差异不只是颜色。

## 2. 生成 comparison 索引

`<Path>{roots.state}/specdev/changes/{change}/prototypes/{design-id}/comparison/index.html</Path>` 提供候选名称、适合原因、关键 token、迁移成本、拒绝风险和打开入口。桌面并排或分栏比较；窄屏改为顺序浏览，不把预览压成不可读小窗。索引只帮助比较，不在用户选择前偷偷设置赢家。

**完成标准**：所有候选均可从索引到达，返回路径明确，键盘可操作，390px 与 1440px 均无意外溢出。

## 3. 写入最终源码

用户确认后，在设计系统主文档的 `Prototype Sources` 中写入且只写入以下具名块：

````text
<!-- PROTOTYPE-FILE: final/index.html -->
```html
...
```
<!-- /PROTOTYPE-FILE -->
````

CSS 与 JS 分别使用约定的 final 目标。源码不得包含占位符、生产 secret、生产写操作或无法离线取得的依赖。HTML 必须使用相对引用连接物化后的 CSS 与 JS。

**完成标准**：三个块路径唯一、语言正确、代码完整，Markdown 单独阅读即可理解全部实现。

## 4. 物化与校验

运行：

```bash
node <Path>{roots.workflows}/specdev/P-prototype/tools/materialize-prototype.mjs</Path> \
  <Path>{roots.state}/specdev/changes/{change}/prototypes/{design-id}/design-system.md</Path>

node <Path>{roots.workflows}/specdev/P-prototype/tools/materialize-prototype.mjs</Path> \
  --check \
  <Path>{roots.state}/specdev/changes/{change}/prototypes/{design-id}/design-system.md</Path>
```

随后运行局部 validator、项目可用的 HTML/CSS/JS 检查和浏览器视口检查，把命令、退出码、关键输出与截图相对路径写入 `Validation and Handoff`。

**完成标准**：物化二次运行无 diff；最终页面离线可用；所有验收项有证据而不是口头断言。
