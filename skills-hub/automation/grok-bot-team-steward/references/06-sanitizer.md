# 脱敏

在写 MANIFEST 之前跑一遍。改写了什么只记字段名，不记原值。

## 扫描范围

快照内全部 `.md` `.txt` `.json` `.yaml` `.yml` `.env` `.csv`

## 必须处理

| 模式 | 处理 |
|---|---|
| `sk-` `xoxb-` `ghp_` `github_pat_` `AKIA` | 整段替换为 `[REDACTED-SECRET]` |
| `Bearer ` 后的 token | 同上 |
| `-----BEGIN .*PRIVATE KEY-----` | 删除整个块 |
| `password\s*[:=]` | 值替换 |
| `user:pass@host` | 换成 `user:[REDACTED]@host` |
| 个人手机 / 身份证 / 银行卡 | `[REDACTED-PII]` |
| cookie 头或 `auth.json` 整文件 | 不复制，只在 SANITIZER.md 记「已跳过路径」 |

## connectors.md

允许：Gmail、GitHub、Notion、Slack  
禁止：refresh token、workspace id 以外的密钥型 id（不确定就删）

## Share 链接

写入前重读对应 PROFILE。发现密钥就先改 PROFILE 再写链接。无法改的不写链接。

## meta/SANITIZER.md 模板

```
# sanitizer
- scanned_at:
- files_scanned:
- redactions: N（只写次数）
- skipped_files:
  - path — 原因
```
