# Artifact and handoff contract

| Work | 必需输入 | 可选输入 | owned 输出 | 消费者 / 返回路径 |
|---|---|---|---|---|
| I | 用户定位、受众、账号别名 | 已有档案、指定依赖目录 | creator.md、context/INDEX.md、dependency-report.json | B/H/V/P；缺关键档案先确认 |
| B | 主题/结论/受众/材料 | 对标与档案 | brief.json、sources.md、claims.json、master.md | V/H/P；缺证据回研究 |
| D | 实际可访问、有权分析的对标 | 拆解角度 | deconstruction.md | B/V；没材料不编时间轴 |
| V | 完整 brief、旁白、真实音频或明确 silent、transcript、镜头表 | 可编辑工程 | video/ 工程、每镜3静帧、预览、审核、成片清单 | P；规格回B；预览失败只修相关镜头 |
| H | 内容、已选画风、完整已审查配方包 | 精确标题、比例、参考缓存 | visual/prompt.txt 或 request.json、provenance.json | V/P；配方/锚点缺失停止 |
| P | 核验母稿、媒体、渠道账号、版本绑定确认 | 当前平台限制来源 | drafts/ 完整本地包和交接清单 | 人工交接/R，不发布 |
| R | 人工数据或明确缺失原因、评论 | 旧模板 | retro.md、next-brief.md、模板候选 | 下一轮B；经确认才永久写入 |

一个内容包只有一个 content_id 和共享事实。所有变体保留 claim/source 对应，改表达不改事实。资产记录 sha256、depends_on、许可、来源与实际工具版本；清单不能代替真实文件。

视频先保存分镜，每镜三张不同时间静帧；先15–30秒预览（总长不足15秒则整片），核对字体溢出、字幕遮挡、画幅、节奏、音画同步；自评分逐项至少8/10，无阻塞才整片渲染。技术编码、审美自评和人工审批是三种不同证据。

P 导出包含正文、媒体副本、输入摘要与四项批准及第五项交接状态。同包复用；人工改动报 drift；多渠道逐一登记，不因一处失败重跑已完成渠道。母稿/媒体变更使旧批准失效。
