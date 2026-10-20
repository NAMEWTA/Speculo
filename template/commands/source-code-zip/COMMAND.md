---
id: source-code-zip
description: Create a requested source ZIP using the bundled Node script and its ignore rules; do not install dependencies.
---

# Source Code ZIP

先确认 node 可用，只有 node 不存在时才回退 nodejs。使用本包 `scripts/zip_source_code.cjs`；无第三方依赖，不安装 npm/Python/zip 工具。`.cjs` 在普通目录和 `type: module` 工程中都明确使用 CommonJS。

## 入口与路径

从当前目录向上寻找字面路径 `.agents/speculo/.speculo/workspace.json`。已安装时验证 `path_base`、schema 和 roots 后，再读取 `<Path>{roots.config}</Path>`，通过现有 resolver 把 `<Path>{roots.commands}/source-code-zip/scripts/zip_source_code.cjs</Path>` 解析为绝对文件路径 `ZIP_SCRIPT`。配置缺失时可使用本脚本固定默认值，但在回执说明；无效 workspace 不猜测根。

没有安装时允许独立打包：使用宿主已提供或用户明确指定的脚本绝对路径，不创建 workspace/config，不把 cwd 下的 `scripts/` 当成本包。无法定位脚本就报告缺失；独立模式在会话交付，不创建依赖 roots 的调用报告。源目录、输出位置与脚本位置分别核对，源/输出的相对输入以本次调用目录解析后固定为绝对路径。

已安装项目可运行：

```bash
ZIP_SCRIPT="$(speculo resolve --path '{roots.commands}/source-code-zip/scripts/zip_source_code.cjs')"
```

以下示例中的 `ZIP_SCRIPT` 均是已核对的绝对路径；从子目录或其他 cwd 执行也不改变脚本定位。

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
node "$ZIP_SCRIPT" "/path/to/project" --dry-run
```

查看每个项目被排除的原因：

```bash
node "$ZIP_SCRIPT" "/path/to/project" \
  --dry-run \
  --verbose
```

正式创建：

```bash
node "$ZIP_SCRIPT" "/path/to/project"
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


需要自定义过滤、额外文件、输出位置、覆盖、压缩或排障时读取 [参数与行为参考](references/cli-reference.md)。执行前核对目标目录和忽略策略，交付 ZIP 路径、清单/统计及未打包项。默认过滤包括锁文件、YAML 和大部分非源码资产，因此默认 ZIP 不承诺是完整可复建工程；用户需要这些材料时按原参数合同明确调整，不静默改默认过滤。

## 调用报告

需要持久化本次报告时使用 <Path>{roots.state}/commands/source-code-zip/{date}-{scope}-{topic}[-NN].md</Path>。复用当前授权和产物合同，不为只读调用自动创建状态；不覆盖历史报告。
