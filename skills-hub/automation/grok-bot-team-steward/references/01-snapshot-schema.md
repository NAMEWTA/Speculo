# 快照目录规范

路径约定：执行或转发示例前，将 `/workspace` 替换为本轮已确认工作区、技能路径替换为实际 SKILL.md 所在目录。未完成替换就不发送命令；不得新建根目录来迎合模板。
以下 `/workspace` 为默认工作区示例，用户明确指定其他工作区时替换前缀。重复到同分钟时使用命名脚本增加序号，不覆盖已有目录。

目标路径：

```
/workspace/grok-bot-team-YYYY-MM-DD/
```

同日第二次：

```
/workspace/grok-bot-team-YYYY-MM-DD-HHMM/
```

YYYY-MM-DD 用导出开始时用户本地日期。HHMM 用 24 小时制。

## 完整树

```
grok-bot-team-YYYY-MM-DD/
├── README.md                 给下一台机器上的管家读的入口
├── INIT.md                   无技能包时也能开工的恢复口令
├── RESTORE.md                本快照自带验收
├── MANIFEST.md               文件清单 + 完整性
├── MANIFEST.yaml             机读清单
├── CHANGELOG.md
├── CHARTER.md                团队宪章
├── ROSTER.md                 花名册
├── ORG.md                    组织与交接
├── connectors.md             连接器（无密钥）
├── GAPS.md                   全队级缺失
├── DROP-LIST.md              明确带不走的东西
├── meta/
│   ├── CREATED.md
│   ├── COMPLETED.md
│   ├── SOURCE.md
│   ├── SANITIZER.md
│   └── RESTORE-NOTES.md      仅恢复时写
├── bots/
│   └── <slug>/
│       ├── PROFILE.md
│       ├── agent-spec.md
│       ├── MEMORY.md
│       ├── routines.md
│       ├── skills.md
│       ├── GAPS.md
│       ├── conversations/
│       │   ├── INDEX.md
│       │   ├── main.md
│       │   └── YYYY-MM-DD-<topic>.md
│       └── attachments/      可选
├── rooms/
│   └── <room-slug>.md
├── skills/
│   └── <skill-id>/
│       └── SKILL.md
├── routines/
│   └── <routine-id>.md
└── shared/
    ├── shared-memory.md
    └── workspace-map.md
```

## slug 规则

- Bot / room / skill / routine 的目录名：`[a-z0-9]+(-[a-z0-9]+)*`
- 中文显示名放在对应 md 的 `name` 字段
- 同一快照内 slug 唯一

## 每个文件最低字段

见技能包 `templates/snapshot/`。缺字段时写 `Unknown`，不要编造。

## MANIFEST.md 必含

- snapshot_id（目录名）
- created_at / completed_at
- steward_name
- bots_count / rooms_count / skills_count / routines_count
- 文件表：path、role、source（bot-self | steward | user）、complete（yes | partial | missing）
- gaps_summary
