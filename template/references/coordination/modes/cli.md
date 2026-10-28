# CLI 交互与调用

仅在按 <Path>{roots.references}/coordination/coordination-contract.md</Path> 为当前任务选中 `mode: cli` 时读取；选择可来自当前请求、已批准安排、项目偏好或主 Agent 在已授权范围内的任务相关判断，当前宿主本身是 CLI 不触发本分支。直接使用当前选定且已获允许的 AI CLI，不依赖 Herdr/Orca。初始化只保存偏好，不安装工具或启动任务；plan 不执行调用。实际使用前复用已知工具与调用方式，缺失时先从现有事实和当前帮助确认，涉及目标或权限的未决选择才询问；读取其当前帮助、已安装技能或对应方式的官方指南。项目可保存 `interaction: headless | interactive`；当次请求优先，不默认其中任何一种。工具名、模型和参数由当前实际接口确定，不使用 Speculo 固定的引擎适配代码。

1. 确认工具可用、工作目录、调用方式、输入输出和当前用户已给出的权限。选择 `headless` 时使用该 CLI 实际支持的非交互接口；选择 `interactive` 时使用宿主实际支持的终端/会话能力。缺少选定接口、工具、登录或能力时停止该工具操作并报告，按共享合同允许的 fallback 处理；强制指定的工具或方式则阻塞相关阶段，不擅自切换交互方式或 Herdr。不自行改变账户、安装工具或添加绕过权限的参数。
2. 依照 <Path>{roots.references}/coordination/task-brief.md</Path> 准备任务；按 session-files.md 区分即时只读返回与持久交接；后者派遣前保存 TASK、指定 REPORT 位置。两者均提供真实 Work 入口、必要输入和提问/通知通道。若工作副本不能读取入口，先提供允许范围内的实际文件，不凭描述猜测内容。
3. 通过当前宿主可用的执行工具调用该 CLI。优先使用结构化 argv 或可靠的参数传递；任务正文通过工具支持的 stdin、文件或会话输入，不拼接不可信 shell 片段。
4. 实际命令、交互方式与工作区保留在原执行证据。持久 TASK 投递后冻结，执行者写 REPORT 并返回任务标识、状态、报告位置和一句话摘要；即时只读任务返回对应 call/task 的结构化结果。只有文本返回时由 Lead 按 <Path>{roots.references}/coordination/session-files.md</Path> 原样捕获。进程退出后记录真实退出码，仍运行或未知时据实记录；没有可靠提供的模型、用量或成本写为未知。原始日志仅在确认属于本任务执行者且地址准确时，写成 REPORT 的可选 `Session log` 行；无法准确取得则省略该行，不猜缓存路径，不另建文件，也不因缺日志阻塞独立可验证的交付。
5. 交互提示、等待、取消和恢复按该 CLI 当前指南处理。调用结果不明先查询，不把缺日志解释为没有执行，也不重复可能已经发生的外部动作。

CLI 退出码只说明调用结果。Lead 仍按 <Path>{roots.references}/coordination/result-and-recovery.md</Path> 检查真实候选、测试、findings 和完成门。该方式不要求 Speculo 常驻服务或专用 runner。

