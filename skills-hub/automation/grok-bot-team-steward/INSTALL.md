# 安装与迁移

本目录是独立技能，整体复制，不能只复制 SKILL.md 而丢掉 references/templates/scripts。终端安装入口：

```bash
npx @namewta/skills-hub -s grok-bot-team-steward -a codex --global
```

这是 AI CLI 的文件安装，不会创建 Grok Bot、获得账号连接或自动启动 routines。实际快照/恢复需要宿主提供对应 Grok 工具。

## 目录与第一次使用

以当前 SKILL.md 所在目录作为技能路径；快照写入用户明确指定的独立工作区。`/workspace` 仅是确实存在的托管环境示例，不在本机根目录强制创建。替换 steward 和模板中的路径占位后再发送。

先读 [技能入口](SKILL.md) 确定 activate/setup/snapshot/restore/diff。已有管家复用；仅明确要求设置才按 [设置流程](steward/SETUP-INSTRUCTIONS.md) 操作。安装本目录不是创建 Bot 或联系团队的授权。

## 导出与恢复

导出先盘点具名范围，再按 [导出协议](references/02-export-protocol.md) 建立未完成快照、脱敏和校验；完成前不得保留模板的 COMPLETED。只读比较直接读两份本地快照，不需要账号工具。

恢复先预览具名对象、连接器缺口和不可迁移资料。仅在已有相应授权时创建对象；令牌不进入目录，routines 保持暂停。以 [恢复验收](references/08-verification.md) 的实际证据为准。

向私有 Git 推送或上传快照属于额外数据分发，需符合用户指定交付范围；本地脱敏扫描不证明完全无秘密。
