# Windows 时区与区域

使用原生 PowerShell，先检查可用 cmdlet 与当前权限；查询和当前用户设置不一律要求管理员。系统级写入需要相应授权，拒绝就停止，不改注册表绕过管理策略。

## 快照

在当前用户私有目录创建唯一 GUID 子目录，检查 ACL，保存本轮字段。时间/语言对象可用 Export-Clixml 保留结构，另外保存 JSON 供审查；恢复时逐项验证对象和版本，不盲目导入执行内容。区分原先不存在的值。备份可能含用户偏好，不上传仓库。

只读 `Get-TimeZone`、`Get-WinUserLanguageList`、`Get-Culture`、`Get-WinSystemLocale`、`Get-WinHomeLocation`；不要导出整个注册表。当前用户区域不授权系统 locale 或所有用户修改。

## 时区

ID 必须出现在 `Get-TimeZone -ListAvailable` 或 `tzutil /l`。纽约示例为 Eastern Standard Time；不要传入 America/New_York，也不要用 `_dstoff` 关闭夏令时。

```powershell
Set-TimeZone -Id 'Eastern Standard Time'
Get-TimeZone
```

固定时区时按当前版本设置界面/管理政策关闭自动时区，保存原状态；不盲改 tzautoupdate 注册表、不停 W32Time、不改计划任务或 NTP。

## 语言与格式

目标已在 Get-WinUserLanguageList 中时移动原对象到首位，保留 InputMethodTips。目标不存在才建立新对象，按原顺序追加其他语言。新增语言包属于安装操作，单独授权，不因设置区域而下载语言包。

```powershell
$Existing = @(Get-WinUserLanguageList)
$List = New-WinUserLanguageList -Language 'en-US'
$Current = $Existing | Where-Object LanguageTag -eq 'en-US' | Select-Object -First 1
if ($Current) { $List[0] = $Current }
foreach ($Lang in $Existing) {
  if ($Lang.LanguageTag -ne 'en-US') { [void]$List.Add($Lang) }
}
# 仅在用户已授权 en-US 语言列表调整后执行：
Set-WinUserLanguageList -LanguageList $List -Force
Get-WinUserLanguageList
```

仅格式授权时使用 Set-Culture 并读回，不自动改语言列表。Home Location、UI 语言和非 Unicode 程序使用的系统 locale 是不同概念。`Set-WinSystemLocale` 只在用户要求该系统设置时执行；系统 locale 的生效可能需要重启，不能承诺仅重登录就完成。不要自动重启。

保留用户日期/数字/输入法定制；GeoID 用当前系统资料确认，不把美国 244 写到所有国家。不改变 Microsoft 账号或商店国家。

## 验收

逐项读回，输入法丢失或列表被缩短就恢复本轮值。浏览器按实际 Profile 且关闭状态处理。`w32tm /query /status` 只读，失败不意味着应重新配置 NTP。分别报告已保存、待登录、待重启、未验证。
