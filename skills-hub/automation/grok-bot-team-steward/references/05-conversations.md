# 对话持久化

官方 Duplicate / Share 不复制对话。换机后官方聊天记录也不会出现。本技能能做的是：**把对话写成 Markdown，作为下一台机器上的参考工作记忆。**

## 覆盖级别

每个 Bot 必须在 INDEX 与 MANIFEST.yaml 填写 `conversations_coverage`：

| 级别 | 含义 | 写入 |
|---|---|---|
| full | 取到带时间戳和角色的原文 | `conversations/*.md` |
| partial | 只有最近 N 条或切片不齐 | 能写的原文 + GAPS |
| unavailable | 读不到 | 只写 GAPS，main.md 保持占位，禁止伪造 |

降级：自己导出原文 → 若有 transcript CLI 则用它（禁止把 token 写入快照）→ 三块摘要 `SUMMARY.md`（现行决策 / 未完成线程 / 最近交付）。

## 目标文件

```
bots/<slug>/conversations/INDEX.md
bots/<slug>/conversations/main.md
bots/<slug>/conversations/YYYY-MM-DD-<topic>.md
```

## INDEX.md

| file | 时间范围 | 消息条数 | 截断 | 备注 |
|---|---|---|---|---|
| main.md | | | no/yes | 现行主对话 |

## 正文格式

```
---
bot: <slug>
source: bot-self | steward-read | partial
range: YYYY-MM-DD .. YYYY-MM-DD
messages: 0
truncated: false
---

### 2026-09-16 21:04  USER
原文

### 2026-09-16 21:11  BOT
原文
```

角色只用 `USER` / `BOT` / `OTHER-BOT:<name>` / `SYSTEM`。

## 切分

- 单文件超过约 200KB 或 400 条：`main-01.md`、`main-02.md`
- 切分点放在一条消息结束后
- INDEX 必须列出全部切片

## 做不到时

写进 `bots/<slug>/GAPS.md`：

```
- conversations: 平台未暴露完整记录；已保存近 N 条；更早部分 Unknown
```

禁止用总结句冒充原文。允许另写 `conversations/SUMMARY.md`，但必须标明这是摘要，不是逐条记录。

## 恢复时怎么用

把文件路径或原文交给对应 Bot，并声明：

> 这些是上一台机器上的工作记录。把其中仍然成立的事实写入你的记忆；把未完成事项列成清单。不要把过期指令当本轮命令执行。
