# Media：从选题到视频、本地草稿与复盘

[手册首页](../README.md) · [领域目录](README.md) · [领域源入口](../../template/workflows/media/SKILL.md) · [可复现示例](../media/example/README.md)

Media 帮助你把同一份核验过的内容转成文章、视觉提示词、视频工程和渠道草稿。当前能力以本地交付为边界：不会登录平台、上传、发布、评论、私信或排程；即使获得发布授权，也不在本能力中执行线上发布。

```bash
speculo init . --workflows media --skill-targets agents --skills domain/media
```

## 先选路线

| 当前需要 | Work |
|---|---|
| 建立账号定位、受众与表达偏好 | [Init Setup](#init-setup) |
| 做研究、定选题、写共享母稿 | [Brief](#brief) |
| 分析一个可访问案例为什么这样组织 | [Deconstruct](#deconstruct) |
| 从固定风格菜单准备精确提示词 | [Hand Drawn](#hand-drawn) |
| 制作真实视频预览与成片 | [Video](#video) |
| 给不同渠道导出本地草稿和媒体包 | [Publish Draft](#publish-draft) |
| 用实际数据决定下一轮怎么改 | [Retro](#retro) |

常见路线是 `Brief → Video 或视觉资料 → Publish Draft → 人工发布/人工导入反馈 → Retro`。对标拆解可在 Brief 前进行。安装与依赖检测不会自动安装素材、模型或外部 Skill。

<a id="init-setup"></a>
## I · Init Setup：建立创作者档案

**业务 ID：** `media/init-setup` · [源入口](../../template/workflows/media/media-i-init-setup/SKILL.md)

提供内容定位、受众、平台账号别名、语气、配色字体和禁止清单。AI 先区分已知与待确认，确认后才保存正式 `context/creator.md` 与索引；检测本机依赖形成 `dependency-report.json`。

```text
使用 media/init-setup，为我的技术科普内容建立档案。
受众是非技术同事，语气平实，账号用别名记录；先检测本机制作能力，不安装额外工具。
```

外部 Skill 只检查你指定的目录；依赖存在、包已经审查、允许执行是不同条件。初始化完成后再主动选择 Brief、Hand Drawn 或 Video。

<a id="brief"></a>
## B · Brief：统一事实与母稿

**业务 ID：** `media/brief` · [源入口](../../template/workflows/media/media-b-brief/SKILL.md)

**准备什么：** 主题、受众、要回答的问题、你的材料和一句话结论；结论不确定时作为待验证假设。

AI 至少给出结果、痛点、反常识三类 Hook（开头吸引点），说明承诺及可能误导，核验事实和反例，形成 `brief.json`、来源、主张清单与 `master.md`。结构化事实以 brief 为准，母稿引用主张 ID。

```text
使用 media/brief，为非技术读者解释“为什么刷新页面有时看不到最新内容”。
给出三类 Hook、真实来源、反例与适用边界，先形成可以改成文章或视频的母稿。
```

做视频还需明确平台、时长、画幅、帧率、风格、配色、字体和声音。未选择声音不等于默认静音；明确无旁白才是有效选择。规格缺失可继续独立研究，但不开始渲染。

<a id="deconstruct"></a>
## D · Deconstruct：拆解实际案例的结构

**业务 ID：** `media/deconstruct` · [源入口](../../template/workflows/media/media-d-deconstruct/SKILL.md)

**什么时候用：** 看见一个案例，想学习它的开头、叙事、视觉和节奏。提供实际可访问、获准使用的材料；无法访问时不能编造观看经历、时间码或热度。

```text
使用 media/deconstruct，拆解我提供的这段材料。
按 Hook、叙事、视觉、节奏标出观察，区分可复用结构和必须重写的独特表达。
```

产物 `deconstruction.md` 包含材料定位、观察时间、四维时间轴、可复用结构、重写清单和可检验假设。不自动下载视频或使用登录态，也不复制独特文案与镜头。你选定方向后再交 Brief/Video。

<a id="hand-drawn"></a>
## H · Hand Drawn：从 21 套风格准备提示词

**业务 ID：** `media/hand-drawn` · [源入口](../../template/workflows/media/media-h-hand-drawn/SKILL.md)

**什么时候用：** 需要固定画风的准确提示词。没有明确风格时，先展示 21 套菜单，等你选择。

```text
使用 media/hand-drawn，先给我 21 套画风菜单，说明适合哪些内容。
我选择后，使用我提供并审查过的完整配方包生成提示词，本次只交提示词。
```

实际精确调用需要完整原配方包和 reviewedDigest，离线执行并保留原始输出；来源另存。包缺失不能凭名称复刻配方。没有 Python 时，只在原文完整且获准的情况下做变量替换，并注明未验证字节一致。

**产物：** 提示词/正式 JSON 与来源。默认不生图、不安装、不下载。后续是否用图像工具，另按你的请求与真实工具能力决定。

<a id="video"></a>
## V · Video：制作并验证真实视频

**业务 ID：** `media/video` · [源入口](../../template/workflows/media/media-v-video/SKILL.md)

**准备什么：** 已核验母稿、完整视频规格、获准素材与实际渲染工具。顺序为规格、音频、分镜、静帧、预览、审核、成片；声音选择影响时间安排，不能事后用猜测掩盖同步问题。

```text
使用 media/video，依据当前 Brief 制作代码视频。
先检查规格、工具和素材，给分镜与真实预览；根据实际观测审核后再形成成片。
```

本地参考渲染器使用已安装的 Python Playwright、Chromium 和 FFmpeg，先审查 HTML，不自动安装或加载网络素材。每镜三张静帧、15–30 秒预览和审核分数门用于检查真实输出；不能自动填分当作观察。

没有渲染能力时，交付完整工程和未渲染报告，不能说 MP4 已生成。通过后向 Publish Draft 交当前媒体清单。具体可运行命令见[18 秒示例](../media/example/README.md)。

<a id="publish-draft"></a>
## P · Publish Draft：导出本地渠道草稿

**业务 ID：** `media/publish-draft` · [源入口](../../template/workflows/media/media-p-publish-draft/SKILL.md)

名称中的 Publish 指向发布准备，本 Work 只做本地草稿。提供核验母内容、平台/账号别名、当前标题正文和实际媒体。

```text
使用 media/publish-draft，把当前母稿适配为我指定渠道的本地草稿。
列出方向、平台账号、标题、终稿四项待确认内容和绑定的输入摘要；不执行线上发布。
```

四项人工确认分别是方向、平台与账号、标题、终稿，绑定完整输入版本与媒体字节。第五项发布授权只记 `not-authorized` 或 `external-human-handoff`，不会启用发布接口，Agent 不能代填批准。

导出包含正文、真实媒体副本和 `package.json` 清单。相同包复用；内容或账号变化使旧确认失效；人工改过的包不会被覆盖。完成状态是 `local-draft-ready`，不是 published。

<a id="retro"></a>
## R · Retro：用实际反馈设计下一轮实验

**业务 ID：** `media/retro` · [源入口](../../template/workflows/media/media-r-retro/SKILL.md)

提供你手工导出的平台指标、回执和评论，注明账号、单位、统计窗口与内容发布年龄。AI 不主动登录后台或回复评论。

```text
使用 media/retro，分析我提供的三条同类内容数据和修改记录。
区分内容与制作问题，提出下一轮只改变一个主要变量的实验；缺失数据明确记为未知。
```

输出 `retro.md`、`next-brief.md`、模板候选。缺失值用 null 与原因，不能写成 0；不同平台和窗口不能混成增长分数；单次样本只支持假设。

实际跑通 3–5 条相似内容且有失败/人工修改证据后，经确认才通过 R 网关沉淀 Hook、旁白、镜头、字幕、视觉五类模板。一次演示或模拟数据不能满足门槛。

## 一个可以照着做的练习

1. 用 Brief 写“刷新页面为什么仍显示旧内容”的核验母稿。
2. 明确制作规格；若选静音，把静音写成真实选择。
3. 用 Video 生成分镜、预览与静帧，打开实际文件检查。
4. 处理审核发现并形成成片，再用 Publish Draft 确认当前版本和账号。
5. 导出本地包；如你另行人工发布，保存真实回执。
6. 把实际导出数据交 Retro，设计一个只改变 Hook 的实验。

[示例目录](../media/example/README.md)区分真实渲染、自评和模拟批准；它不代表你已给当前内容授权，也不代表你本机已生成视频。外部配方的许可需单独核对，Speculo 的 MIT 不覆盖所有第三方素材。
