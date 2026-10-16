# FlClash：禁止猜写持久化格式

候选目录包括 macOS 的 `~/Library/Application Support/FlClash` 与 `com.follow.clash`、Windows 对应 `%APPDATA%` 目录、Linux 的 XDG 配置目录。大小写、便携模式、版本和安装渠道会改变位置；使用 GUI/活动进程确认真实实例。

旧实现见到 shared_preferences.json 或 database.sqlite，以及 currentProfileId、patchClashConfig、vpnProps、addedRules、standardOverwrite、overrideDns 等字段。这些只是历史线索，不是跨版本写入协议。无法验证具体字段含义、当前订阅与合并顺序时停止自动修改；不能只因列名像规则就向 SQLite 写入。

优先使用客户端支持的规则覆写导入与设置界面。离线改文件前要求用户正常退出并确认相关进程已停止；保留字节、权限、原先不存在状态。仅复制 SQLite 主文件可能遗漏 WAL：数据库备份须使用对应的事务一致性备份方式，或确认正常关闭及 checkpoint；不得删除 -wal/-shm 来强行“修复”。

不覆盖订阅、节点、密钥或现有脚本；字符串内嵌 JSON 也必须经版本验证后按原结构保存。原版 prepend/append/delete 不是可直接写入任意 addedRules 字段的数据格式。未知 delete 语义就保留并报告冲突，不能发明禁用字段。

规则模式、TUN、DNS override 分别设置并读回，保持已有 stack 与系统代理状态；不盲目关闭 IPv6、监听 53 或替换全部 DNS。无助手/权限时只诊断，不自动安装特权组件。

重开后核对运行内核而非仅存储文件；检查单次目标连接对应规则及最终节点。多个覆写脚本的先后次序必须通过生成配置和实际连接验证。修改不生效或被覆写就恢复本轮改动，不循环竞写。

所有诊断、DNS/IPv6 与 crash 验收按主入口的诊断参考执行；该参考不承诺某一版本的内部 schema。


## 本轮 DNS 计划的接入

按 [DNS 工作流](dns-workflow.md) 生成候选，只在本版本实际支持的规则/覆写/DNS 管理层应用。`candidate_fragment` 不是订阅全文；`rules_extension` 与内核 `dns`/`tun` 是不同产物，不放错层。现有 DNS 策略 map 要经批准替换；递归 Merge 的空对象可能保留旧策略，不能只看导入成功。

先在私有目录保存原状态，确认 schema 和各覆写层的执行顺序，使用隔离完整候选检查。读回最终生成配置后再跑 audit，尤其检查 nameserver-policy、proxy-server-nameserver-policy、fallback、direct-nameserver 和 URL 的代理组后缀没有被 GUI 删除/还原，也没有因为未加引号而变成注释。未知格式仅交付 GUI 操作计划，不写 SQLite 或 臆造字段。

不因为启用 TUN 就关闭旧系统代理；不得替用户改节点密码、subscription URL、DNS 监听端口或系统区域。原生系统 DNS/IPv6 与浏览器更改读对应参考并分阶段实施，失败按 [事务与验收](acceptance.md) 停止/回滚。DNS 测试通过不能替代真实 Claude Code 连接链和服务响应。
