# scripts

只依赖 Python 3 标准库，外加可选的 `python-docx` 与 `weasyprint`。缺可选库时简历仍会写出 HTML，进程以退出码 3 表示二进制降级，内容不算失败。

```bash
python3 scripts/write_config.py --skill-dir "$SKILL_DIR" --persist-root ./job-application --kb-root /path/to/notes
python3 scripts/ingest_kb.py --kb-root /path/to/notes --out ./job-application/corpus/sources/manifest.json
python3 scripts/render_resume.py --md ./app/resume-tailored.md --css assets/resume.css --out-dir ./app
python3 scripts/validate_claims.py --evidence ./job-application/corpus/evidence-map.md --files ./app/resume-tailored.md
```

不要把真实 `config.json`、知识库或生成的 PDF 提交进本仓库。
