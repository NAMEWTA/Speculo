# 证据与 Redaction

## 事实等级

- `observed`：实际命令、文件或 API 在明确时间得到；
- `declared`：来自配置或受信文档，尚未在目标验证；
- `inferred`：根据证据推断，必须写依据和 confidence；
- `user-confirmed`：用户决定或外部事实，记录确认范围。

机器观测至少包含 collector/tool、target、captured_at、result/error、redaction 和 evidence locator。权限不足、缺工具、超时与不支持形成结构化 gap，不以空数组掩盖。

## 敏感信息

Ops state、target profile、plan、verification state、journal、Markdown 投影和 HANDOFF 禁止保存密码、token、cookie、私钥、完整连接串、secret 环境值、未脱敏证书材料和含值原始输出。配置只记录 key、required、scope、provider/受控 source reference、version 和 presence。无法可靠脱敏的输出只保存命令、退出状态、摘要和受控外部 locator。

私密配置若确需生成，只能写入批准的 deployment root 或受控外部位置，并使用计划规定的最小权限；attempt 只记录 locator、mode/ACL 检查、内容摘要和“stdout/stderr 未回显”证明。私密文件不得复制到 Ops state、归档 change、永久知识或 HANDOFF。

## Attempt 与复盘证据

每个 mutation/rollback 记录 attempt、profile/plan/approval摘要、actor、target、cwd、Gate、typed operation、时间、退出、前后条件、输出摘要/摘要值、未运行项、偏差和残余风险。journal 每行按 journal-event v1 保存，不写原始 secret output。错误使用稳定脱敏 signature；RETROSPECTIVE 引用 attempt/verification evidence，不复制无界日志。

成功必须由 postcondition、目标重读和 verification state 证明。命令 exit 0、进程 running、容器 healthy 或一次 HTTP 200 只能关闭对应检查，不能单独证明系统稳定；业务 probe 使用自身允许 HTTP/业务码，稳定性使用有上限的连续成功窗口。
