---
name: source-code-zip
description: Create a requested source ZIP using the bundled Node script and its ignore rules; do not install dependencies.
---

# Source Code ZIP

先确认 node 可用，只有 node 不存在时才回退 nodejs。使用 scripts/zip_source_code.js；无第三方依赖，不安装 npm/Python/zip 工具。

## 标准工作流

1. 确认用户提供的是目录路径，不是单个文件；路径含空格时必须加引号。
2. 先确认 `node --version` 能正常执行。
3. 默认先运行一次 `--dry-run`；目录较大、规则刚修改或可能包含敏感信息时，同时添加 `--verbose`。
4. 检查预览结果，确认 `.env`、YAML、依赖目录、构建产物、归档文件和密钥没有被纳入。
5. 正式创建 ZIP。
6. 报告 ZIP 的绝对路径、纳入文件数、输入总大小和生成结果。
7. 除非用户明确理解风险并提出要求，不得使用 `--no-default-ignore`。

推荐预览：

```bash
node scripts/zip_source_code.js "/path/to/project" --dry-run
```

查看每个项目被排除的原因：

```bash
node scripts/zip_source_code.js "/path/to/project" \
  --dry-run \
  --verbose
```

正式创建：

```bash
node scripts/zip_source_code.js "/path/to/project"
```

默认输出在源目录旁边：

```text
<目录名>.code.zip
```

例如：

```text
源目录：/work/my-app
输出：  /work/my-app.code.zip
```


需要自定义过滤、额外文件、输出位置、覆盖、压缩或排障时读取 [参数与行为参考](references/cli-reference.md)。执行前核对目标目录和忽略策略，交付 ZIP 路径、清单/统计及未打包项。
