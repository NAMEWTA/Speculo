# Source Code ZIP：预览后打包源码

[手册首页](../README.md) · [Command 目录](README.md) · [源入口](../../template/commands/source-code-zip/COMMAND.md)

**业务 ID：** `command/source-code-zip`

## 什么时候用

需要把项目源码交给另一个工具、网页 AI 或协作者，且希望排除依赖、构建产物和敏感文件。打包成功不等于已经向外部发送，也不意味着包一定满足所有分析需求。

## 怎样调用

```text
明确调用 command/source-code-zip，打包我指定的项目目录。
先 dry-run，说明实际纳入和排除的文件，再生成 ZIP；保留默认敏感文件忽略规则。
```

输入必须是目录，带空格的路径要加引号。使用包内 Node 脚本，无第三方依赖；只有 `node` 不存在时才回退 `nodejs`，不安装 npm、Python 或 zip 工具。

## 手动检查示例

从已安装项目根执行，最后的 `.` 是要打包的项目目录：

```bash
node .agents/speculo/commands/source-code-zip/scripts/zip_source_code.js . --dry-run --verbose
```

确认预览后：

```bash
node .agents/speculo/commands/source-code-zip/scripts/zip_source_code.js .
```

默认输出在源目录旁，名为 `<目录名>.code.zip`。自定义输出、过滤、覆盖和压缩参数以[脚本参考](../../template/commands/source-code-zip/references/cli-reference.md)为准。

## 检查哪些内容

默认忽略包括 `.env`、YAML、依赖目录、构建产物、归档与密钥等。YAML 可能包含项目分析需要的配置，因此要核对“缺了什么”；不能为了省事直接关闭所有默认过滤。额外纳入文件需要明确内容与风险，`--no-default-ignore` 只有用户明确理解后要求才用。

完成报告给出真实 ZIP 路径、纳入文件数、输入大小、生成结果和未打包项。将 ZIP 上传到外部服务是另一个动作，按实际请求处理。
