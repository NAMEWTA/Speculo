# Herdr 编排

仅在用户为当前任务明确选择 Herdr 时读取；选择可来自同范围仍有效的会话授权。plan 只说明接入步骤，不安装、不启动。Herdr 选择不隐含 worktree、模型或拓扑选择。

## 按需安装项目 Skill

当前 Lead 负责首次接入，项目根由调用 Work 已验证的 projectRoot 确定，不取 pane cwd 或方法安装根。

1. 检查项目 `<Path>{roots.skills}/herdr/SKILL.md</Path>`（标准布局为项目 `.agents/skills/herdr/SKILL.md`）。存在且为有效 `name: herdr` 的完整 Skill 时先读取并复用，核对来源和兼容性；不因上游更新静默覆盖。符号链接、同名非 Skill、无效内容或归属冲突时保留原文件，仅阻塞安装分支，说明冲突位置与恢复方式。
2. 缺失时从指定上游 [Herdr SKILL.md](https://github.com/NAMEWTA/wta-skills-hub/blob/main/skills/automation/herdr/SKILL.md) 获取 Skill。先解析 main 的实际 revision，再从该 revision 下载 `skills/automation/herdr/` 的完整内容；当前上游为单文件，未来若有相对资源依赖须完整获取，不能只保存 GitHub HTML 页面。
3. 使用宿主可用的 Skill 安装器并显式指定项目 `.agents/skills/` 为目标；没有安装器时用宿主下载和文件工具完成同一流程。先在临时位置检查 UTF-8 Markdown、YAML frontmatter、`name: herdr`、引用闭包及路径，再以不覆盖方式安装。保留上游原文、frontmatter、许可和文件模式，不重写命令或权限参数。下载/校验失败时不留下半成品正式目录；目标期间发生变化时停止，不覆盖重试。
4. 安装后回读实际 Skill，核对内容摘要与候选一致，在当前 Work 已有 Evidence/报告或会话结果中记录上游 URL、revision、内容 SHA-256、目标和结果。没有报告就不为安装制造 change 或 receipt。此 Skill 是项目第三方资产，不加入 Speculo 的投影清单，也不由 init/refresh 更新或删除。

用户选择并要求使用 Herdr 时可完成上述项目本地安装；持久配置本身不是新安装授权。安装 Skill 不等于安装 Herdr 二进制、登录账户或启动服务。缺少网络或写权限时只阻塞 Herdr 分支，给出原目标和缺失条件；重试前重新检查目标，不能自动换另一种执行方式。

## 运行与返回

安装或复用后必须读取项目内 Skill，再检查 `HERDR_ENV=1`；不满足就停止 Herdr 控制，说明需要从受管会话恢复。检查通过后读取本机 `herdr --help` 和所需命令组帮助，核对版本、来源、运行上下文与目标会话。不同 fork 或同名工具不推定兼容。宿主技能列表是否已刷新不替代读取真实项目文件；也不把安装成功报告成运行可用。

1. 遵守当前指南对 Herdr 环境和会话操作范围的要求。若当前环境无法控制目标，只阻塞此任务方式；不接管其他前台会话。
2. 根据用户指定的编程工具和模型，在指南支持的范围内选择调用。Herdr 是编排方式，不是模型；不得固化某家 CLI 的参数。
3. 使用实际返回的 pane/session 标识，确认对应项目和工作区，等待当前指南定义的就绪条件。不要默认切换用户焦点。
4. 每个任务使用能明确归属的目标会话，并按 <Path>{roots.references}/coordination/task-brief.md</Path> 提供输入。有 change 时提供已保存 TASK 和准确 REPORT 位置，准确确认日志绝对路径后，由 Lead 在可选 session-locator.json 中只记录 path，冻结 TASK 不补写运行信息；独立工作区先核对文件可读写。前一任务尚未结束时，不将其活动或 idle 信号误认成新任务的完成。
5. 通过工具当前支持的返回读取方式取得结果。有文件交接时按 <Path>{roots.references}/coordination/session-files.md</Path> 交回 REPORT 及“任务标识、状态、报告位置、一句话摘要”；只能返回文本时由 Lead 原样捕获并标明来源。执行 CLI 的原始日志能确认属于本任务执行者且地址准确时，由 Lead 将绝对路径写入定位文件；不把 pane 标识或终端输出冒充 JSONL，无法核验时省略地址，不影响独立可验证的交付。输入、提问和通知仍遵守工具原生接口。
6. 超时或投递结果不明时先检查原目标，不盲目重发。取消按当前工具说明进行；不要宽泛结束所有 pane 或服务。

任务完成、会话空闲、会话保留是不同事实。只有确认本任务不会继续冲突写入，并由 Lead 完成原验收，才释放业务占用、更新原 Evidence 和继续下一任务。
