# Clash Verge Rev：先识别版本，再处理持久配置

## 定位与只读检查

常见候选为 macOS `~/Library/Application Support/io.github.clash-verge-rev.clash-verge-rev`、Windows `%APPDATA%\io.github.clash-verge-rev.clash-verge-rev`、Linux `$XDG_DATA_HOME/io.github.clash-verge-rev.clash-verge-rev`（缺省 `~/.local/share/...`）。旧目录、便携版和多配置实例可能共存；通过运行进程、GUI 配置路径及文件结构确认，不取第一个命中。

旧实现使用 verge.yaml、config.yaml、profiles.yaml、dns_config.yaml 和 profiles 下的 rules/merge。这里只将它们作为识别线索，不保证所有版本适用。读 profiles 的 current、对应 item、option.rules/merge 引用；校验路径在配置根内且没有越界符号链接。订阅只读组名/类型，不输出 URL、password、secret。

## 修改方式与迁移

优先用版本支持的 GUI 扩展/导入、模式与 TUN 开关。不得为了模板方便关闭现有系统代理。确需离线文件修改时先让用户正常退出，确认相关写入进程已停止，备份逐项文件；不 kill 客户端，也不边运行边竞写 verge.yaml/config.yaml。没有已验证 schema 就交付 GUI 修改步骤，不猜造 UID 或 profile 引用。

历史字段 `enable_tun_mode`、`enable_system_proxy`、`enable_dns_settings` 与 profile_dns_settings 只在实际版本存在并确认作用时使用。保留系统代理原状态；规则模式为 rule；TUN stack 保留已有兼容值，不按操作系统盲填 gvisor/mixed。助手路径存在不代表服务运行、权限足够或路由接管。

rule 扩展中的 prepend/append/delete 与 Merge 中的内核配置不是同一层。新域名规则放在会提前截获该流量的规则之前；不随意改已有进程规则、局域网例外和 MATCH 的业务含义。`find-process-mode` 仅在需要且当前内核支持进程规则时处理，不视为覆盖 node 启动脚本路径的保证。

DNS 界面、profile 覆写、merge 和生成配置可能有优先级；逐层查看当前版本实际生成结果。不要全段覆盖 DNS，不添加占用 53 端口的监听器，不把 foreign DoH 的地址当成 DNS 经过代理的证据。

在已确认存在这些字段的版本上：`dns_config.yaml` 是覆写内容，`profile_dns_settings.<uid>.enabled` 按订阅决定它是否替换该订阅的 `dns`。全局 `enable_dns_settings: false` 仍可以让当前订阅单独启用覆写。订阅文件里的国内 resolver 会留在原文中，开关关闭或换到未启用的订阅时重新生效。生成配置可能丢掉 `use-system-hosts`、空 `fallback` 或 `prefer-h3`；`/configs` 常不含 `dns`，以生成后的完整配置为准。服务程序的 runtime 目录可能拒绝直接写入，应让客户端自己重新生成，不把生成文件当成可手改的源。

覆写页在进程仍运行时可能保留旧表单。GeoIP 国家码缺省时界面显示 CN；回退域名框也可能仍显示上一次的 `google`/`facebook`/`youtube`。回退服务器框同样可以残留阿里或其他国内 DoH，而磁盘上的 `fallback` 已经是空列表。此时保存会把屏幕上的旧值写回 `dns_config.yaml`，并把每次查询同时发给这些解析器。改覆写前先退出客户端，或重新打开该页并与磁盘逐项对照后再保存。四个输入框不含 `default-nameserver`、`respect-rules`、`nameserver-policy`、`fallback-filter`、模式和 `dns-hijack`；这些仍要在生成文件里核对。

生成的 `clash-verge.yaml` 可能去掉引号、空 `fallback`、`prefer-h3`、`use-system-hosts`，并把 `use-hosts` 写成 `true`。Mihomo v1.19.32 的 YAML 解析器只在 `#` 前有空白时把后续内容当注释，所以没有空格的 `url#百分号编码组名` 仍是一个标量。组名里一旦出现空格、换行，或生成器把片段拆开，`direct-nameserver` 会变成直连拨号。读回生成文件，确认片段仍在且 `#` 前没有空白；丢失时按 [DNS 工作流](dns-workflow.md) 把 `direct-nameserver` 留空，不手改正在使用的生成文件。内核日志还要显示业务查询走保护组。模式、TCP 53 劫持和 `strict-route` 不属于这四个输入框，也不能用它们声称同网段路由器 DNS 已被接管。

## 生效与回滚

生成的 clash-verge.yaml 只读，不直接编辑；生成文件正确仍不等于活动内核已加载。刷新后在 GUI/已有 controller 查模式、规则顺序、TUN 和单次目标连接链。受影响的旧连接只在用户同意时关闭/重试；不清空所有会话。

TUN 接管必须结合路由、真实请求与异常断开测试。未验证接管时保持原代理路径；不声称关闭系统代理是防泄漏措施。任何字段被客户端丢弃或配置回滚都标记失败/未验证并停止。

回滚前检查本轮后是否有用户修改，冲突时停止覆盖。恢复原字段、原文件权限和原先不存在状态，重新加载并验证；不能靠写回文件就宣称网络已恢复。


## 本轮 DNS 计划的接入

按 [DNS 工作流](dns-workflow.md) 生成候选，只在本版本实际支持的规则/覆写/DNS 管理层应用。`candidate_fragment` 不是订阅全文；`rules_extension` 与内核 `dns`/`tun` 是不同产物，不放错层。现有 DNS 策略 map 要经批准替换；递归 Merge 的空对象可能保留旧策略，不能只看导入成功。

先在私有目录保存原状态，确认 schema 和各覆写层的执行顺序，使用隔离完整候选检查。读回最终生成配置后再跑 audit，尤其检查 nameserver-policy、proxy-server-nameserver-policy、fallback、direct-nameserver 和 URL 的代理组后缀没有被 GUI 删除或还原。未加引号本身不删除片段；`#` 前出现空白才会把组名变成注释。未知格式仅交付 GUI 操作计划，不写 SQLite 或臆造字段。

不因为启用 TUN 就关闭旧系统代理；不得替用户改节点密码、subscription URL、DNS 监听端口或系统区域。原生系统 DNS/IPv6 与浏览器更改读对应参考并分阶段实施，失败按 [事务与验收](acceptance.md) 停止/回滚。DNS 测试通过不能替代真实 Claude Code 连接链和服务响应。
