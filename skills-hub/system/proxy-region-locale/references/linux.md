# Linux / WSL / 容器的时区与 locale

先读 `/etc/os-release`，检查 PID 1、systemd/DBus 可用性、当前用户与图形会话。发行版、glibc/musl、桌面、容器和 WSL 的管理方式不同，不能把 Ubuntu GNOME 命令当通用配置。

## 只读与作用域

读 `locale`、`locale -a`；systemd 可用时读 `timedatectl status`、`localectl status`。locale -a 中名称拼写可能归一化，以实际系统接受值验证。不把工具存在当服务可用。

图形设置仅操作已确认用户的实际会话总线。没有会话或 schema 就跳过桌面项；不得假造 GUI_UID 或冒用当前聚焦用户。容器修改不代表宿主生效。

## 时区

systemd 管理的系统在 `timedatectl list-timezones` 中验证 IANA ID 后，按授权 `timedatectl set-timezone "$IANA_TZ"` 并读回。保持 RTC 约定不变，不执行 set-local-rtc、不手设时钟。

无 systemd 的系统先查发行版支持的管理方式；不能因为 timedatectl 不存在就写固定 Ubuntu 路径。WSL、只读容器或不可变系统停在计划；宿主时区和容器 TZ 环境分别处理。权限拒绝后不改 /etc/localtime 绕过。

## locale 与语言

仅改时区时不碰 locale。生成 locale、安装界面语言包、更改系统 LANG 与改变用户桌面语言是不同动作。目标 locale 已存在优先复用；不存在时根据发行版确认生成/安装方式并取得具名授权。不要直接 apt-get install -y 通配语言包，不自行修改 locale.gen 正则。

systemd/localectl 管理的系统可在授权后 `localectl set-locale "LANG=$LOCALE"`；保留 LC_* 的既有用户覆盖，解释 LANG、LC_ALL、LC_* 的优先级。不要设置全局 LC_ALL 来强制所有格式。无 localectl 时使用发行版文档，不能伪装为已完成。

## 键盘、桌面、纸张

语言、国家不决定物理键盘。仅在用户明确要求布局时使用该系统列出的控制台/XKB 布局；两者名称不保证相同。不在 DBus Access denied 后直接改 /etc/default/keyboard。保留输入法对象和顺序；读回不符则恢复本轮项。

GNOME gsettings、AccountsService、天气、定位、纸张和浏览器 managed policy 都有独立作用域，默认不改。真正需要时先 introspect / list-keys 核对 schema、类型和当前用户会话，读取本轮键值作备份；不存在或拒绝就停止。不能为了时区同步关闭全部定位或改变天气城市。

格式以目标 locale 的本机 libc 输出为准，同时保留用户定制。libpaper、桌面格式与 LANG 可能不同，报告差异而不是强制覆盖所有层。

## 回滚与验收

使用新的权限受限目录保存本轮原文件、owner/mode、哈希与原先不存在状态；只恢复本轮字段，冲突停止。新会话才完整继承 LANG；不自动重启 gdm、不关闭用户浏览器。

NTP 使用已安装服务的只读状态；单个候选源失败不代表整个系统失步。不要更换 NTP、改路由或 DNS 来完成区域任务。所有未测桌面、容器宿主同步和生效状态明确列为未验证。
