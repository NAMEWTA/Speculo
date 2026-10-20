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

一个内容包只有一个 content_id 和共享事实。所有变体保留 claim/source 对应，改表达不改事实。许可、来源、实际工具版本与授权放在原 owned provenance/report 中，通过工件依赖连接；清单不能代替真实文件。

## 可检查的产物承诺

每个 Change 使用 `<Path>{roots.workflows}/media/common/assets/artifacts-template.json</Path>` 建立 artifacts.json；字段合同为 `<Path>{roots.workflows}/media/common/schemas/artifacts.schema.json</Path>`。开始制作前只登记本次已承诺的产物，不预填成功、不强制全部媒体分支。每行记录稳定 id、唯一 Work owner、kind、root（change/media）、安全相对 path、正整数 version、sha256、evidence_kind 与 depends_on。依赖项引用同清单的 id/version/sha256，不复制上游状态；来源与授权记录作为原 owned 工件被引用。

未生产产物的 sha256=null、evidence_kind=unverified；读回真实文件后用 media-tools fingerprint-artifact ROOT RELATIVE_FILE 取摘要。更新产物递增 version，原消费者保留旧依赖身份直到重新检查或重做。不能为通过检查删除承诺、把成片改叫工程或伪造新版批准；用户确实缩减范围时在 source/LOG 保留原因和范围变更。

context是可更新的永久真值，历史Change不得永久追随它的当前字节。I/R的交付证据分别放在Change内context-snapshot/、knowledge-snapshot/，保留原路径和版本来源；这些只是当时证据快照，不作为新的永久真值。active可检查root=media的当前文件，completed只引用可保留的Change内产物，避免合法更新档案让无关历史Change全部失效。

运行 media-tools check-artifacts CHANGE_ROOT 核对唯一owner/路径、无环依赖、版本、文件字节及完成承诺；validate-media --state-root 会一并检查。已在 works_run 的 Work 必须拥有至少一个产物且其所有承诺已实际产生；completed 要求本次全部承诺已执行、无缺件或漂移。active 的尚未开始 Work 可保留 null。检测返回产物 id/owner，由该 owner 处理；不要覆盖人工改动或重做无关媒体。

kind区分 prompt/image-request、image、video-project、video-preview、video-final、local-draft 与 document/data/report。H 默认只承诺 prompt/JSON，不强求图片；V 只获工程交付时不得登记已渲染成片。image检查实际PNG/JPEG/WebP文件签名，仍须实际观看质量；其他图像格式需另有真实验收器后扩展，不能改扩展名冒充。已承诺视频文件必须读回真实媒体、关联当前渲染报告且经 ffprobe 核验；本地草稿包核对 publication_performed=false、正文和全部复制媒体摘要。目录、状态字段或报告文字不能冒充这些文件。结构及字节检查不证明审美、事实正确或真实用户批准。

视频先保存分镜，每镜三张不同时间静帧；先15–30秒预览（总长不足15秒则整片），核对字体溢出、字幕遮挡、画幅、节奏、音画同步；自评分逐项至少8/10，无阻塞才整片渲染。技术编码、审美自评和人工审批是三种不同证据。

成片依赖唯一实际render-report.json，该报告再依赖实际review和生产输入；brief.json、plan、HTML及声明音频/字体/素材分别登记为原owner工件。消费者重读这些输入，核对报告input_digest及每项文件摘要、版本和规格，不能用缺失字段相等或任意JSON代替生产输入。

review依赖实际preview和每镜三张image工件。最终渲染和成片交付共用validateReviewEvidence：完整执行原review的字体/字幕/画幅/节奏/同步/确定性检查、逐项8/10门槛与零blocker，再回读预览和静帧的真实安全路径、文件摘要，检查预览编码规格/时长及图像签名。final报告的review摘要、源摘要和execution_digest与这些依赖一致才可交付；仅有渲染报告中的引用不算通过。审核仍须实际观测，结构和文件核验不认证评分者身份、不替用户自批。

P 导出包含正文、媒体副本、输入摘要与四项批准及第五项交接状态。同包复用；人工改动报 drift；多渠道逐一登记，不因一处失败重跑已完成渠道。母稿/媒体变更使旧批准失效。
