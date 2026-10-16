# 渲染

`render_resume.py` 始终写 `resume-tailored.html` 和 `render-status.json`。

- 装了 `python-docx` 才写 docx
- 装了 `weasyprint` 才写可选中文字的 PDF
- 两者都没有时退出码 3。HTML 仍可用浏览器打印

不要用截图冒充 PDF。CSS 是单栏、无图标、无表格。联系方式必须在 Markdown 正文里，不要放进 CSS 页眉。
