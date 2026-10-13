# Electron 运行时

仅在依赖、入口和构建配置明确识别 Electron 时使用。

## 进程边界

- main、preload、renderer 使用独立入口和类型/构建环境；renderer 不继承 Node 权限。
- 默认保持 `contextIsolation`，关闭不必要的 `nodeIntegration`；安全配置以项目 Electron 版本官方建议为准。
- preload 只暴露最小、具名、类型化 API；不直接暴露 `ipcRenderer`、fs 或任意执行能力。
- IPC channel 是 public security contract：验证 sender、channel、payload、权限和响应；不信任 renderer 输入。
- BrowserWindow、tray、session、shortcut、listener 和 child process 有唯一所有者和销毁路径。

## 数据与更新

- 文件路径、协议 handler、deep link、下载和外部 URL 均验证；外部导航使用 allowlist。
- 自动更新、签名、安装权限和回滚按目标平台与发布系统生成，不编造通用命令。
- main/renderer 共享 schema 或 generated types 时验证生成 freshness 和运行时数据。

## 测试

- 纯 IPC handler 和 domain logic 单元测试；
- preload contract 与 main/renderer 集成测试；
- 权限、窗口生命周期、安装包和平台差异使用实际 Electron/目标 OS 测试。

官方依据：[Electron Security](https://www.electronjs.org/docs/latest/tutorial/security)、[Electron Context Isolation](https://www.electronjs.org/docs/latest/tutorial/context-isolation)。
