# 可选工具

这些工具辅助读取资料和导出文件，不决定求职流程。`SKILL_DIR` 是本技能目录；输入和输出均由当前任务选择。

## 知识库索引

Python 标准库即可运行。索引记录路径、摘要和文件哈希，可随时重建；它不是经历事实的最终依据。

```bash
python3 "$SKILL_DIR/scripts/ingest_kb.py" --kb-root /path/to/notes --out /path/to/output/sources.json
```

只对用户指定范围运行；工具不修改源文件。二进制只登记，较大的文本只给短摘要，重要事实仍需回读原文件。
索引和输出放在知识库之外，避免下次扫描把自己的结果当成新来源。不要把含个人资料的索引提交到公共仓库。

## 简历渲染

```bash
python3 "$SKILL_DIR/scripts/render_resume.py"   --md /path/to/resume.md --css "$SKILL_DIR/assets/resume.css"   --out-dir /path/to/new-output
```

支持 Markdown 标题、段落与项目符号，不是完整 Markdown 渲染器。使用新的输出目录，脚本会写固定的 `resume-tailored.*` 文件名。
HTML 始终生成；`python-docx` 提供 DOCX，`weasyprint` 提供 PDF。两项可选库都缺失时退出码为 3，HTML 仍可用。
`render-status.json` 是这次实际导出结果，不是工作流状态。检查具体格式是否写出和页面效果；需要更复杂版式时使用宿主已有文档工具。
