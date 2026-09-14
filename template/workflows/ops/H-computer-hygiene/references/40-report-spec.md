# 检测报告与产物规范

## 日期、位置与覆盖

以真正执行检测的电脑的本地日期生成文件名，不使用服务端交付日期，也不覆盖同日旧报告。`--output` 必须是当前 Ops change 的卫生运行根：

```text
<Path>{roots.state}/ops/changes/{change}/hygiene/runs/YYYY-MM-DD/HHMMSS-运行ID/</Path>
  YYYY-MM-DD.md
  YYYY-MM-DD.json
  YYYY-MM-DD.plan.json
  YYYY-MM-DD.environment.md
  # 以下为实际补证据/原生执行后才创建，不预填成功：
  YYYY-MM-DD.native-evidence.json
  YYYY-MM-DD.execution.md
```

`YYYY-MM-DD.md` 是主报告。JSON 为可审阅的原始只读盘点；plan 含少数缓存隔离候选和本机绝对路径，默认私密，仍落在同次运行目录。environment 是未执行的本机映射建议。Q 审批写入 `<Path>{roots.state}/ops/changes/{change}/hygiene/approvals/</Path>`。隔离 receipt 位于本机 `~/.speculo-hygiene/quarantine/`，属于主机 external mutation，不是 `{roots.state}`。不得把报告写进 `<Path>{roots.workflows}/ops/H-computer-hygiene/</Path>`。

## 必需章节

| 章节 | 内容要求 |
| --- | --- |
| 摘要 | 主机边界、系统/架构、候选数量、未执行声明、实际权限 |
| 覆盖与缺口 | 已检查/部分/未检查/不适用，授权根、预算、权限错误、链接与外部卷 |
| 处理清单 | ID、风险、确切证据、建议及是否需要确认 |
| PATH / 工具解析 | 当前进程顺序、失效/重复、多命中、版本是否真正查证 |
| 配置来源 | 允许的字段/行号、多个出现位置；不输出完整 profile 或认证配置 |
| 存储清单 | 目录类别、路径、来源、状态、逻辑大小、扫描完整性、保护与说明 |
| 项目 / 仓库 | Git 类型、状态未知项、锁文件/版本 pin、构建产物、工作区保全 |
| 应用 / 启动项 | 精确身份、安装范围、重复线索、加载/依赖未知、数据选择 |
| 下载资料 / 大文件 | 只列候选与复核前提，不将元数据候选当作内容重复 |
| Q 隔离计划 | 默认缓存、大小、为什么符合/不符合条件，强调不释放空间 |
| 原生清理 / 卸载 | 系统分流、工具版本核验、权限、不可逆影响和保留项 |
| 归一化 / 验收 / 回滚 | 当前声明、建议根、每生态方法、验证范围和失败恢复 |
| 证据 / 时效 / 隐私 | 采集时间、原生核验记录、官方入口是否真的访问、敏感路径说明 |

## 数据语义

`record_kind=LOCAL_MACHINE_AUDIT` 代表脚本对其执行主机进行检测，不代表已确定就是用户桌面主机。测试和示例必须用其他明确标签。`safety.subprocesses=0`、`network_requests=0` 只描述默认脚本没有发起这类调用，不是文件系统绝无网络挂载访问的保证。

`storage.status` 的 absent 表示该线索路径未发现；blocked 表示安全屏障阻止；metadata-only 表示仅外部/根位置元数据；partial 表示测量不完整；measured 表示在声明的规则和预算内完成。`P` 表示保护，不意味着内部全部文件一定有价值。

`observed_unique_logical_bytes` 是已测量文件按文件标识去重的逻辑大小，不等于候选可释放空间。`immediately_reclaimable_bytes_proven=null` 表示没有证明可立即回收的字节量，不能改写成 0 或全部缓存总和。系统快照/克隆/压缩/稀疏和打开文件等另列限制。

## 补证据与执行记录

原生核验仅保存允许的路径/版本/应用身份，不保存完整 stdout、密钥或带认证的 URL。保留原始扫描 JSON；新增证据另存并追加到主 Markdown。原始 plan 的哈希绑定不得因编辑报告而被伪造，发生真实存储变化需重新检测生成新计划。

实际执行记录逐项列授权 ID、操作、开始/结束时间、结果、跳过或错误、receipt/备份位置、空间测量口径、验证和回滚状态。没有执行就写“待确认”，不能写“清理完成”。

## 隐私

报告会将当前 Home 替换为 `~`，但这不是彻底匿名；应用、项目、目录名和其他账户路径都需分享前复核。计划/receipt 有绝对路径和本机绑定信息，不推荐上传到公开仓库。将报告与审批目录加入仓库忽略规则时需遵守真实仓库规范，不擅自修改根 `.gitignore`。
