# 原生额度状态栏契约

## Codex

配置 `tui.status_line`，候选顺序为 `model-with-reasoning`、`context-used`、`five-hour-limit`、`weekly-limit`、`context-window-size`。支持性以安装版本为准。五小时和周项目表达 **剩余**，对应服务端限额桶；不可用时原生界面可能省略。不能解析终端画面补值，也不能假设任意第三方提供同一限额窗口。

## Claude

独立 Node 渲染器只接受 stdin JSON；无配置、认证、钥匙串、会话正文读取，无网络、子进程、缓存或后台轮询。输入最多 256 KiB，读入 deadline 1 秒用于防止挂起；这不是周期任务。仅输出一行 ASCII，适应 COLUMNS；小屏优先保留 CTX / 5h / 7d，极窄屏可能截断。

| 输入 | 语义 |
|---|---|
| model.display_name / model.id | 模型显示名；过滤控制符 |
| effort.level | 可选推理等级，不猜测 |
| context_window.used_percentage | 当前上下文 **已用** 百分比 |
| context_window.current_usage = null | 初次响应前／压缩后可能发生；不显示残留百分比 |
| rate_limits.five_hour.used_percentage | 五小时 **已用**，显示时计算剩余 100 - used |
| rate_limits.seven_day.used_percentage | 周窗口 **已用**，显示时计算剩余 |
| *.resets_at | Unix **秒**，转换成本地日期和时间 |

真 0% 对应剩余 100%；不存在、null、错误类型、NaN、越界不能转成零。缺失显示 `--`，异常显示 invalid，已过去的重置时间显示 stale，不把过期数据伪装成实时额度。缺少重置时间但百分比有效时可显示百分比；提供了格式错误的重置时间则整项标记异常。

首次响应前、旧版、某些认证方式或第三方可能没有额度字段；两个窗口分别处理。字段缺失不证明账号是 API key，也不触发读取 OAuth、cookie 或非公开接口。费用、累计 token、订阅额度和上下文占用不混用，不用成本估算“倒推”余额。

## 部署与替换

计划将渲染器复制到目标配置根的内容寻址目录，并使用准确 Node 路径。相同内容不重写；同名内容冲突则阻断。先部署资源，后设置回调。保留 statusLine 的其他属性；现有 callback 只有经 `--replace-statusline` 进入新确认包才被替换，不串联执行未知旧程序。

升级技能本身不自动修改用户配置。新渲染器产生新 hash 路径，用户重新体检／确认后更新引用；旧资源与备份不自动清理，以免破坏回滚。不要把备份放到 skills 扫描路径，也不要引用临时 npx 缓存。

示例（非真实账号数据）：`Model | CTX used 32% | 5h left 59% | 7d left 37%`。用户应通过宿主正常提供的数据检查展示，不为了验收而额外发送计费请求。
