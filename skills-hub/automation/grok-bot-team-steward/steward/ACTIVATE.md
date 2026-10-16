# 激活管家

路径约定：执行或转发示例前，将 `/workspace` 替换为本轮已确认工作区、技能路径替换为实际 SKILL.md 所在目录。未完成替换就不发送命令；不得新建根目录来迎合模板。
仅在用户明确要求创建或配置管家时执行本文件。仅加载技能、比较快照不创建 Bot、不修改 profile、不联系其他 Bot。已有管家先复用，不创建第二个管家。下列 `/workspace/grok-bot-team-steward/` 是部署示例，实际技能路径以本轮 SKILL.md 所在目录为准。

当前机器和新机器走同一套。差别只是激活之后那句话。

本技能夹的标准位置：

```
/workspace/grok-bot-team-steward/SKILL.md
```

## 当前机器（第一次快照）

1. 新建 Bot。Bot actions → Edit Profile。Name=`管家`，Title=`Grok Bot 团队管家`。Description 贴同目录 `STEWARD-PROFILE.md` 里 Description 那一整段。
2. 把本技能夹放到 `/workspace/grok-bot-team-steward/`。
3. 对管家说：

```
读取 /workspace/grok-bot-team-steward/SKILL.md
以及同目录 references/、templates/、steward/。
把这份技能保存为名为 grok-bot-team-steward 的私有技能并启用给自己。
然后按 snapshot 模式，把当前账号全部 Bot、组织架构、技能、例行任务、记忆和对话
持久化到 /workspace/grok-bot-team-YYYY-MM-DD/ 。
先盘点花名册给我确认，再写文件。不要发明角色，不要写密钥。
```

4. 确认花名册后让它跑完。下载或推送 dated 目录。

## 新机器（按快照初始化）

1. 安装并登录 Grok Bot。
2. 把 dated 目录放到 `/workspace/grok-bot-team-YYYY-MM-DD/`。不要改名。
3. 把本技能夹放到 `/workspace/grok-bot-team-steward/`。
4. 同样新建「管家」，贴同一段 Description。
5. 按快照 `connectors.md` 在 Settings → Plugins 连接插件。
6. 对管家说：

```
读取 /workspace/grok-bot-team-steward/SKILL.md
以及同目录 references/、templates/、steward/。
保存并启用技能 grok-bot-team-steward。
然后按 restore 模式读取 /workspace/grok-bot-team-YYYY-MM-DD/ 。
先只读预览花名册、GAPS、DROP-LIST 和未连接插件。
我确认「按这份建」之后再创建空白 Bot。
PROFILE 逐字粘贴。不要 Duplicate。routine 一律暂停。
不要宣称官方聊天记录已经恢复。
```

7. 按对照表验收。两次成功试跑后再启用指定 routine。

## 不要做的事

- 不要把本技能夹当成快照
- 不要把两天的快照解压进同一个文件夹
- 不要跳过预览直接说「你看着办」
- 不要指望登录态和官方聊天时间线一起回来
