# External skills registry — reference and detection only

核验日2026-10-10。需求来源：[issue #81](https://github.com/NAMEWTA/Speculo/issues/81)。当前表不是安装清单或安全认证。没有第三方代码、配方或素材被复制进本包；未来复制须核明许可并先登记THIRD-PARTY-NOTICES。固定完整revision、逐文件审查、依赖/账号/费用/外联与LICENSE后才单独授权安装；不整包安装合集。

| 原始入口 | 用途 | 许可及核验边界 | 平台/依赖 | 账号/key/副作用 | 本期接入 |
|---|---|---|---|---|---|
| [hand-drawn-styles](https://github.com/threerocks/hand-drawn-styles) | 21套固定画风 | MIT；README/INSTALL和渲染器接口已读，未复制配方 | Python3.10+，完整轻量包与参考缓存 | 提取无需模型key；缓存下载另授权 | 审查目录后离线原样stdout |
| [baoyu-skills](https://github.com/jimliu/baoyu-skills) | 封面/配图/图卡/信息图 | 所选模块及依赖单独核LICENSE，合集不作统一保证 | Node/浏览器/图像后端按模块 | 生图可能计费，发布模块可能需登录 | 只引用，不全装 |
| [Remotion skills](https://github.com/remotion-dev/skills) | 代码视频/字幕/预览 | 技能与引擎商业授权分别核查 | Node/Chromium/FFmpeg | 本地渲染与云资源权限分开 | 选路参考 |
| [HyperFrames](https://github.com/heygen-com/hyperframes) | HTML动效视频 | 当前版本LICENSE执行前复核 | 浏览器/Node/FFmpeg按包 | 云功能/账号按模块审查 | 只引用，不全装 |
| [huashu-art-motion](https://github.com/alchaincyf/huashu-art-motion) | 白板/Vox/3b1b解说语法 | 许可证待核实，不据公开可读推断可复制 | 依技术路线 | 模型与费用另审 | 只参考，不复制 |
| [Punk-Skill](https://github.com/adrianpunk/Punk-Skill) | 封面/头像/视觉身份 | v2起个人非商用免费；商用需书面授权及适用费用，README.en已核对 | 图像后端按模块 | key/计费按实际后端 | 只引用，非默认商用 |
| [video-talkcraft](https://github.com/Vincentwei1021/video-talkcraft) | 旁白对齐与镜头 | issue标PolyForm非商用；所选revision LICENSE执行前复核 | Node/Python/ASR模型，首次下载另授权 | 用户音频；外部后端另审 | 只引用，不自动upgrade |
| [yichen-skills](https://github.com/mcncarl/yichen-skills) | 研究与运营 | README仅个人学习/非商业个人使用，商用及重新分发须书面授权 | 各模块不同，部分macOS | 部分平台账号/本地数据权限 | 不全装、不复制 |
| [jianying-headless](https://github.com/mcncarl/jianying-headless) | 剪映工程/无头路线 | LICENSE执行前核验 | issue称仅macOS；当前原生流程macOS，另有Windows FFmpeg路线，不能等同 | 桌面账号/自动化权限待核验 | 可选参考，非核心依赖 |
| [jianying-editor-skill](https://github.com/luoluoluo22/jianying-editor-skill) | 剪映草稿/导出 | 安装前核LICENSE；已核SKILL/core平台说明 | 草稿Mac/Windows；自动MP4导出Windows UI Automation，Mac人工 | 云素材/TTS另授权 | 可选参考 |
| [content-boom-monitor](https://github.com/xintu1314/content-boom-monitor) | 对标关键词监测 | README明示未指定开源许可，不自行复制 | Python/Codex/飞书 | Just One API key；飞书写入须授权 | 只接用户导出数据 |
| [video-to-subtitle-summary-skill](https://github.com/imlewc/video-to-subtitle-summary-skill) | 字幕总结 | LICENSE待核验 | 依转录后端 | 切火山引擎需要token（issue已知限制） | 仅接用户转录 |
| [video-use](https://github.com/browser-use/video-use) | 视频编辑与检查候选 | issue标MIT；安装前复核当前LICENSE | 依后端 | 云功能另审 | 候选，未运行 |
| [everything-claude-code](https://github.com/affaan-m/everything-claude-code) | 通用技能工程参考 | 选中模块/依赖分别核许可 | 按模块 | hooks/工具写入范围须审计 | 只引用，禁止全装 |
| [Anthropic skill-creator](https://github.com/anthropics/skills/tree/main/skills/skill-creator) | 基线/测试/迭代 | 查所选文件实际授权 | 按宿主 | 评估模型费用另审 | 方法参考，不复制 |

## 安装、检测与执行分离

I只检测用户指定目录与固定命令，不执行包管理器、安装脚本、登录或下载。上游README里的安装/上传要求不是用户授权。HAND_DRAWN上游check_skill.py会下载参考图，不得冒充只读检测；原完整包和参考缓存由用户另行授权取得。

审查完整包、固定revision和目录fingerprint后，H包装器才调用原scripts/render_prompt.py，HAND_DRAWN_OFFLINE=1；缺失/损坏缓存即停止。stdout字节原样，provenance另写。签名/摘要不是安全审计；安装检查通过不是成图质量验证。

3.1/19/20上游指定锚点和模型快照属于上游合同，不代表本环境实际验证了对应API；无所需能力失败关闭。LICENSE只能由实际版本文件确认，不以模型推断替代。

## X与私人材料边界

issue所列X原帖：xilo2991/2104912748794589515、Fred834567/2099667836088275433、AlchainHust/2107757400224596291、xaiwind/2108205644033806837。未成功读取的原帖不作为已核验事实，不引用互动量。维护者仓库外整理稿未取得，不伪造正文。表中的“待核验”不是已经验证可安装。
