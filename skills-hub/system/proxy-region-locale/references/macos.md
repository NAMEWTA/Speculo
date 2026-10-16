# macOS 时区与区域

先 `sw_vers`、`uname -m` 和当前用户确认目标，不把历史机器版本当兼容保证。优先系统支持的界面和命令；不关闭 SIP。读取或写入遇权限限制时停止该项。

## 只读与快照

通过 `systemsetup -gettimezone`（可能要求管理员）、`readlink /etc/localtime`、`defaults read -g AppleLanguages`、`defaults read -g AppleLocale` 获取必要字段。当前用户、系统登录窗口与浏览器偏好分开。只备份本轮要改的键；全局 export 可以保留作证据，但回滚不自动整域 import 覆盖用户其他设置。

保存时区和自动时区原状态、原语言列表与输入源。只改当前用户区域时，不写 `/Library/Preferences/.GlobalPreferences.plist`。对系统范围的修改另行确认授权，不能把一次 sudo 授权扩展成所有偏好写入。

## 时区

从 `systemsetup -listtimezones` 核验名称；纽约示例为 America/New_York。用户要求固定时区且授权关闭自动时区时，优先通过当前系统设置完成；不要盲写私有 timed 数据库或废弃的 selected_city 标识。

```bash
sudo systemsetup -settimezone America/New_York
```

执行后核对 `systemsetup -gettimezone` 与 localtime 链接；退出码或 stderr 任一单项均不足以证明成功。权限失败不反复提权。不要更换 NTP 或修改 Calendar 事件；应用独立时区只在用户要求时处理。

## 语言、格式与输入法

目标语言置于 AppleLanguages 第一位，其他原值保留；AppleLocale 是字符串，例如 en_US。示例不是可直接覆盖的语言数组。使用当前系统的区域默认，再尊重用户已有日期、24 小时、度量、温度与纸张偏好；“改地区”不自动抹掉用户格式定制。

不根据国家推断键盘，不删除已有拼音/IBus 类输入源，不使用收缩语言列表的方法。没有授权不改登录窗口、听写语言或所有用户偏好。修改后读回字段；GUI 语言可能需要用户重登录，不能凭 defaults 写入宣布界面已改变。

## 浏览器与 NTP

浏览器语言只处理用户明确指定、已停止运行且确认的 Profile。保留 JSON 原键/格式，不把 Default 当成当前 Profile。不改变 Apple ID、App Store 国家或网站登录态。

`systemsetup -getusingnetworktime`、`-getnetworktimeserver` 为只读信息；某次 sntp 探测不等于持续同步状态。没有证据就标记未验证，不手设日期、不重启、不杀浏览器。
