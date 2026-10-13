# TypeScript / JavaScript CLI

- 入口只负责参数解析、配置、依赖装配、调用应用服务和映射退出码。
- 参数、环境和配置文件在边界验证；优先结构化 argv API，不自行拼 shell。
- stdout 为机器/用户主输出，stderr 为诊断；可脚本化输出提供稳定格式或 `--json`。
- `--help`、版本、错误示例和非零退出码行为稳定且可测试。
- 交互提示在非 TTY/CI 中有明确行为；不得永久等待隐藏输入。
- signal、取消、临时文件、锁、子进程和 stream 在退出前清理。
- 路径解析在明确 root 内，支持 Windows/macOS/Linux 的项目目标范围。
- 命令 handler 可单元测试；真实进程测试覆盖 argv、cwd、env、stdio、exit code 和信号。
- 发布时验证 `bin`、shebang、权限、exports、产物与最低 Node 版本。
