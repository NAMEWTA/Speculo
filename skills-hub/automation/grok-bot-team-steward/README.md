# Grok Bot 团队快照

本文件夹是技能，不是团队数据。入口与权限边界见 [SKILL.md](SKILL.md)，安装和迁移见 [INSTALL.md](INSTALL.md)。

支持 activate（只加载）、setup（明确设置管家）、snapshot（具名导出）、restore（预览后授权恢复）、diff（只读比较）。实际账号动作取决于宿主提供的工具；终端文件安装不会自动连接 Grok。

快照保存在用户确认的独立工作区，使用 `grok-bot-team-YYYY-MM-DD` 名称，重复命名增加时间/序号，不覆盖旧快照。不假定 `/workspace` 存在。

references 按任务加载；templates/snapshot 是输出骨架，不是可独立激活的子技能；scripts 是可选 Bash 辅助工具，依赖以各脚本帮助为准。
