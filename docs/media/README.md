# Media 示例与工具参考

Media 的完整新手教学已统一到 [Media 领域指南](../workflows/media.md)，包括七个 Work 的使用场景、输入、操作与完成标准。

本目录保留[18 秒本地视频示例](example/README.md)：可编辑 Brief、母稿、分镜、HTML 和一次运行的观测记录。它用于理解与复现 B → V → P，区分真实渲染、自评与模拟批准，不表示已经在你的环境执行。

从仓库根可运行以下只读检查：

```bash
node template/workflows/media/common/tools/media-tools.mjs detect
node template/workflows/media/common/tools/media-tools.mjs style-menu
node template/workflows/media/common/tools/media-tools.mjs check-brief docs/media/example/brief.json
node template/workflows/media/common/tools/validate-media.mjs --workflow-root template/workflows/media
```

安装项目中使用 workspace 解析后的对应方法路径。渲染与导出需要实际输入、工具及授权，完整步骤见示例；不要把示例中的模拟批准复制为真实批准。

其他入口：[本地草稿](../workflows/media.md#publish-draft) · [视频制作](../workflows/media.md#video) · [Canonical 单文件](../canonical.md) · [第三方许可](../provenance/THIRD-PARTY-NOTICES.md)
