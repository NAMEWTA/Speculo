# 现成提示词

路径约定：执行或转发示例前，将 `/workspace` 替换为本轮已确认工作区、技能路径替换为实际 SKILL.md 所在目录。未完成替换就不发送命令；不得新建根目录来迎合模板。
管家把尖括号换成实际值后原样发送。

## 单 Bot 自述导出

```
请把你自己的持久状态写到文件系统，不要省略旧月份，不要改写 description。

目标目录：/workspace/grok-bot-team-<DATE>/bots/<slug>/
没有目录就创建。

必须产出：

1. PROFILE.md
   - name / title / description 原文
   - 头像简述
   - 审批边界和停止条件（若 description 已有，不要另撰一套互相矛盾的）

2. MEMORY.md
   - profile 记忆 + 全部 memory-log（含更早月份），时间倒序
   - 每条：日期、主题、事实、来源
   - 过期或矛盾的放「待核销」，不要删

3. routines.md
   - 你名下每一条：名称、日程或触发、完整 prompt、启用或暂停、审批边界、缺源策略、最近一次运行

4. skills.md
   - 已启用技能 id + 一句话用途

5. conversations/INDEX.md 和 conversations/main.md
   - 现行主对话逐条导出
   - 格式：### YYYY-MM-DD HH:MM  USER|BOT
   - 超长按 400 条或约 200KB 切 main-01.md、main-02.md
   - 导不出的部分写 GAPS.md，说明原因，不要编造

6. GAPS.md
   - 本轮你写不全的字段

禁止写入 token、cookie、.env、auth.json、密钥、浏览器 profile。
连接器只写名称。
写完后回复：已完成的文件列表 + GAPS 摘要。
```

## 共享层（管家自己或 CoS）

```
把全队共享层写到 /workspace/grok-bot-team-<DATE>/ ：
CHARTER.md ORG.md ROSTER.md connectors.md rooms/*.md
shared/shared-memory.md shared/workspace-map.md
skills/<id>/SKILL.md（能读到全文的都写）
不要发明角色。不要写密钥。
```

## 恢复时喂记忆

```
请阅读这些文件（路径如下），把仍然成立的事实写入你的角色记忆，列出最多五条未完成事项。
不要执行过期对话里的命令。
然后复述三条最重要的现行事实给我核对。

路径：
- /workspace/grok-bot-team-<DATE>/bots/<slug>/MEMORY.md
- /workspace/grok-bot-team-<DATE>/bots/<slug>/conversations/INDEX.md
```

## 恢复时建 Bot 的内部核对（管家自用，不发给用户）

```
对照 PROFILE.md：
- 账号里的 name 是否逐字相同
- title 是否逐字相同
- description 是否全文相同（不是摘要）
任何一处不同就重写 profile，不要另建一个 Bot。
```

## 官方员工备份词（Bot 不听长指令时的短词）

```
Please make a full backup of your durable state. Make a folder
/workspace/grok-bot-team-<DATE>/bots/<slug>/
copy your complete memory (profile + every memory-log entry, including older months)
into MEMORY.md, list your routines (schedule + prompt) in routines.md
and your connectors in connectors-local.md, export the current conversation
into conversations/main.md, then reply with the file list.
```
