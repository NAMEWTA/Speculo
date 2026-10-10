# Media workflow — issue #81 implementation

本包把创作者初始化、研究简报、对标拆解、手绘提示词、代码视频、本地草稿和复盘做成可安装工作流。实现依据是实际 issue #81 与仓库基线 `335b39424ddead5d5699f7ba8ae5fcf701ddbbd6`，不是上一版未读到 issue 的泛化草案。本期不实现真实发布，不登录、上传、保存Cookie或绑定计费模型。

## 安装与七个 Work

```bash
speculo init . --workflows media
```

安装不是激活。Agent先被动读取INDEX，用户明确选择后才读README和Work。交互式安装可选择将Media投影为七个pointer Skills；它们引用真实Work，不复制方法。静态资产在speculo/workflows/media，运行数据在speculo/.speculo/media，实际工具使用项目roots解析。

| Work | 交付 | 必要门禁 |
|---|---|---|
| I-init-setup | 档案/依赖报告 | 只检测，用户确认档案；不自动安装 |
| B-brief | 三类Hook、brief、sources、claims、母稿 | 缺规格不渲染，待核验事实不进终稿 |
| D-deconstruct | Hook/Narrative/Visual/Rhythm时间轴 | 实际材料可访问，不复制独特表达 |
| V-video | 可编辑源、三静帧/镜、预览、审核、成片 | 正确音频顺序，15–30秒预览，逐项>=8 |
| H-hand-drawn | 原样prompt/正式JSON | 21套菜单，完整已审查原包，默认不生图 |
| P-publish-draft | 正文/实际媒体副本/清单 | 四项版本确认，第五项人工交接；无发布接口 |
| R-retro | 单变量实验/下一轮简报/模板候选 | 缺失null，3–5条相似真实运行后再建议固化 |

I/R是永久知识网关，五类模板为Hook、旁白、镜头、字幕、视觉。其他Work只提交候选。brief.json为结构化真值，sources.md/claims.json由它派生；master.md引用主张，不维护第二套矛盾事实。

## 工具与复现

以下从仓库根运行；安装后换成解析后的workflow路径。

```bash
node template/workflows/media/common/tools/media-tools.mjs detect
node template/workflows/media/common/tools/media-tools.mjs style-menu
node template/workflows/media/common/tools/media-tools.mjs check-brief docs/media/example/brief.json
node template/workflows/media/common/tools/media-tools.mjs check-video docs/media/example/brief.json docs/media/example/shot-plan.json docs/media/example
node template/workflows/media/common/tools/validate-media.mjs --workflow-root template/workflows/media
node --test template/workflows/media/common/tests/media-tools.test.mjs
```

手绘的fingerprint-skill取得用户审查目录的摘要；render-prompt读取JSON：skillRoot、reviewedDigest、style、variables以及可选subject/title/text/aspect。它仅执行原始渲染器，强制HAND_DRAWN_OFFLINE=1，stdout逐字节保留，来源另存。摘要不是安全审计，目录变化要重新审查。上游check_skill.py会下载参考图，I不能把它当只读检测。实际上游完整包/锚点/图像模型未在本项目演示中运行，单元测试用明确标记的原创脚本夹具。

fingerprint-draft REQUEST [SOURCE_ROOT]给出待确认输入摘要。export-draft REQUEST EXISTING_OUTPUT_ROOT [SOURCE_ROOT]核对批准与字节，原子导出正文、媒体副本与package.json。同包复用，源字节/账号变化旧批准失效，人工修改停止覆盖。四项批准记录不是认证系统，宿主必须如实取得人工决定，不能由Agent自批。

## 状态、恢复与验证

全局active/completed索引合法Change名；completed包含completed/cancelled终态；current_work只放Change。未知字段/版本拒绝且原样保留，不自动迁移。CLI在staging执行自己拥有的Media验证代码，不运行安装目录脚本；已有runtime按原字节保留。测试覆盖单独安装、7个指针、刷新与无效状态拒绝。

导出锁不会清理别人的锁；中断留下证据需核实原owner后恢复。本地锁与重读是协作漂移防护，不是针对恶意并发文件系统的沙箱。无渲染能力交完整工程并标未渲染，无数据写null及原因；任何失败不假装产出成功。

## 四份网页独立入口

`template/canonical/canonical-media-content.md`、`canonical-media-visual.md`、`canonical-media-video.md`、`canonical-media-operations.md`从同一专业方法源生成；不要手工修改。每份仅一个项目归属URL，无内部roots/安装依赖，包含ai-workspace持久化、恢复、完整FILE导出。视觉入口带21套选择元数据和锚点门禁，但不复制第三方配方；精确复用需要用户提供原完整配方/参考。

```bash
node scripts/generate-media-canonical.mjs
node scripts/generate-media-canonical.mjs --check
pnpm check
```

生成器同时重建唯一AUTO-INDEX；已纳入generate-canonical/validate-assets。无文件工具时交付完整可保存包并注明未落地，不伪造跨会话记忆。

## 对照与边界

外部Skill逐项用途/许可/平台/key在workflow common/rules/external-skills.md。非商用、未知许可不能被本项目MIT覆盖；不整包安装，不vendor。某些上游当前支持与issue描述有差异时分别注明，如剪映原生macOS与另行Windows FFmpeg路线不是同一能力。

[18秒实跑案例](example/README.md)记录B→V→P，并区分实际浏览器/FFmpeg执行、助手自评与模拟审批。18项Node场景是本地合同测试；4项项目集成测试由pnpm test/CI执行。完整项目和跨平台结果以对应PR的实际CI为准，不能用本地单元成功代替。

| #81验收 | 落点 |
|---|---|
| 单一可安装包、被动发现、激活与runtime隔离 | INDEX/README/manifest/runtime-contract/七个Work |
| 结构、风险、永久知识与刷新保留 | schemas、包验证、CLI-owned状态验证和安装测试 |
| 视频规格、三静帧、15–30秒预览、8分门禁 | media-tools、render_preview.py、实跑案例 |
| 21画风、原样提取、不默认生图 | 菜单、reviewedDigest、离线原渲染器封装、夹具测试 |
| 本地草稿与五个人工确认点 | 版本摘要、媒体副本、重复导出和漂移测试 |
| 对标/运营/模板闭环 | D/R、缺失值规范、单变量实验、I/R写入网关 |
| 同步注册/首页/生成物 | 披露和永久知识白名单、README/README-ZH/AGENTS、包脚本 |

未改src/manifest.ts：当前基线该文件是哈希工具，没有issue所称的workflow表。发现逻辑已经扫描目录，也无需改src/workflows.ts。没有发布版本、merge或关闭issue。
