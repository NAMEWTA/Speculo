# RETRO 升级后的归档网关

A 唯一拥有移动与封存；R 提供原升级方案、具体批准和已验证执行回执。本分支不接管 Skill 写入，不创建 change，也不运行 change 的实现完成门或四类资产维护。授权须覆盖 PLAN 中固定的 archive_reports 及方案对象本身，已确认内容直接复用。

读取 <Path>{roots.workflows}/specdev/specdev-r-retro/references/records.md</Path> 的身份和定位合同，以及 <Path>{roots.workflows}/specdev/common/schemas/retro-archive.schema.json</Path>。以下复用 [原归档规则](archive-rules.md) 的无覆盖、完整性与恢复原则，源/目标替换为 retro 对象，不把报告当成 completed change。

## 预检与顺序

1. 回读 PLAN.md、approval.json 与实际确认原文，验证候选和批准摘要、执行 owner、实际 writer、相关 lock/pending/recovery；数据字段不是授权。运行独立校验器的升级 `--stage verified`，全部计划内 Skill 项通过才继续。
2. 固定 archive_reports 清单。每份报告均 completed，所有发现已有 adopt 且执行通过或 reject 且有明确理由；存在 defer 的报告继续现役。拒绝、无发现、证据不足报告也需要具体归档决定，不能因没有候选自动移动。仅复用仍然匹配原方案的证据。
3. 对全部待移动报告先运行 `--report <id> --upgrade-plan <upgrade-id> --stage archive-ready`。确认源与唯一目标、同文件系统、无覆盖能力、目录/模式/链接及稳定来源可解析，预检全部通过才开始批量移动。
4. 在每个原对象内创建 archive.json，保存实际字节、目录模式及链接清单。使用校验器导出的 `retroInventory(objectRoot)` 生成实际清单；它不跟随链接，只排除 archive.json 自身。不得手填摘要或漏掉候选、批准、证据及恢复材料。
5. 重验批准、源摘要、目标缺失及唯一 writer。使用宿主提供的同文件系统无覆盖移动，或可证明单 writer/隔离边界下的移动；不能靠“先检查再 rename”宣称并发无覆盖。跨文件系统不降级复制删除。整体移动至 <Path>{roots.state}/specdev/retro/archive/{retro}/</Path>，保持原目录名和正文。
6. 原回执 result=moved，从实际目标运行 `--stage archived`，确认源消失、唯一目标、清单、字节、模式、链接、原批准及来源可解析。通过后原回执记 verified，再运行 `--stage archived --sealed`。只有通过才封存；不能用目录已移动代替成功。
7. 全部获批报告封存后，最后对方案运行 `--upgrade <upgrade-id> --stage archive-ready`，按相同过程移动至 <Path>{roots.state}/specdev/retro/archive/{upgrade}/</Path> 并 sealed。仍有 defer 的报告留在现役；后续按报告/F-ID 定位本方案既往处置即可，不复制待办状态。

命令均使用 <Path>{roots.workflows}/specdev/common/tools/validate-retro.mjs</Path> 并传明确 `--repo`、`--method-root`、`--state-root`；最后一个是 specdev 的父数据根。报告的 archived 检查仍传 `--upgrade-plan`，方案本身不传。

## archive.json

记录 schema_version=1、id、对象原 owner、upgrade ID、source=`retro/<id>`、target=`retro/archive/<id>`、PLAN.md 摘要、approval.json 摘要、result=moved/verified、实际 time 与 entries。entries 每项为对象内 path、type=file/directory/symlink、整数 mode；file 另有 sha256，symlink 另有原始 target。归档前在隔离写集内固定清单，移动后复核；清单字段不替代真实移动观察。

## 恢复与冻结

普通批量操作不具有整体原子性。部分移动失败保留已落地事实，从源/目标和各自原回执继续；源和目标同时存在、摘要漂移或结果不明时停止该分支，不覆盖、不重复移动。方案对象必须最后归档，避免丢失未完操作的负责位置。

封存后报告、方案、候选和回执只读。后续 Skill 再次升级不改变已封存事实：历史验证核对当时获批候选、执行与归档清单，不要求当前 Skill 永远保持旧摘要。来源 change 移动依赖稳定 ID 解析；纠错另建后继记录，不能借恢复重写历史。
