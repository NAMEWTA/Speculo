# 视频源、时间线与本地渲染

## 选择制作方式

先复用项目已有剪辑或动画工程。HTML/CSS/SVG 适合文本、卡片、图表和界面式讲解；Canvas 或其他图形工具适合程序化画面；Remotion、Manim 或现有编辑器可以继续使用。制作方式由内容、可编辑性和实际可用工具决定，不强制所有视频转换为同一框架。

有旁白时用实际音频和已核对的文字组织镜头。字幕时间、停顿、音乐与转场需要在真实时间线上观察，不能由脚本文字长度推断同步已正确。需要前后段留白或补静音时明确说明，避免把没有旁白的时段包装成完整配音。

## HTML 时间线

本目录提供 [独立渲染器](../scripts/render_preview.py) 与 [可运行两秒样例](../examples/timeline.html)。HTML 应定义 `window.render(t)`，其中 `t` 为从零开始的秒数；函数可以返回 Promise，渲染器会等待它。

每次调用按绝对时间设置全部变化属性，让任意顺序的时间跳转得到相同画面。使用 `t` 推导动画，不依赖连续调用次数、真实时钟、未固定的随机数或持续运行的 CSS 动画。需要 CSS/Web Animations 时暂停动画并从 `t` 设置进度。涉及视频素材时，在 `render(t)` 中等待相应帧真正就绪。

字体、图片、脚本和样式使用本地相对资源或内嵌内容；渲染期间不加载远程资源。先查看要执行的源，这个工具用于可信本地工程，不是运行陌生 HTML 的安全沙箱。它不会使用已登录的浏览器资料。

## 依赖

需要 Python 3.10+、Python Playwright、Chromium，以及提供 H.264/AAC 编码的 FFmpeg 与 ffprobe。使用的 Playwright 基础 API 可在 1.40+ 使用；仓库的真实产物验证固定安装 1.55.0。渲染脚本本身不安装软件或下载浏览器，依赖准备由所处环境完成。

在合适的 Python 环境中可以安装：

```bash
python -m pip install playwright==1.55.0
python -m playwright install chromium
```

Linux 缺系统依赖时，按环境权限使用 Playwright 官方的 `install --with-deps chromium`，并通过系统包管理器准备 FFmpeg。已有 Chromium 可用 `--chromium /path/to/chromium` 指定。安装位置与依赖隔离沿用当前项目约定。

API 依据：[Playwright Page](https://playwright.dev/python/docs/api/class-page)、[BrowserContext](https://playwright.dev/python/docs/api/class-browsercontext)；固定依赖：[Playwright 1.55.0](https://pypi.org/project/playwright/1.55.0/)。

## 调用

从本 Work 目录执行，`--output` 必须是尚不存在的位置：

```bash
python scripts/render_preview.py \
  --html examples/timeline.html \
  --output /tmp/speculo-video-example \
  --duration 2 --width 640 --height 360 --fps 24
```

为实际项目指定自己的源、尺寸、时长和音频：

```bash
python scripts/render_preview.py \
  --html /path/to/project/video.html \
  --output /path/to/project/renders/revision-2 \
  --duration 48 --width 1080 --height 1920 --fps 30 \
  --audio /path/to/project/narration.wav \
  --sample-times 0,8,16,24,32,40,47.9
```

| 参数或产物 | 行为 |
| --- | --- |
| `--duration`、`--fps` | 以整帧覆盖所需时长；实际时长为向上取整的帧数除以帧率，报告同时记录请求与实际值 |
| `--width`、`--height` | 输出画面尺寸；H.264 `yuv420p` 要求正偶数 |
| `--audio` | 使用实际音频流；短音频尾部补静音，长音频截到画面时长；未提供时输出无声视频 |
| `--sample-times` | 自选关键静帧及回放检验时间；默认开头、中间、最后一帧，不要求固定每镜三张 |
| `--keep-frames` | 另外保留全部逐帧 PNG；默认只保留所选静帧与 MP4，清理编码用临时帧 |
| `--check-inputs` | 检查普通参数、路径、真实音频与依赖；不启动浏览器、不写产物、不声称已渲染 |
| `preview.mp4`、`stills/*.png` | 实际编码的视频与采样图；文件名不代表质量验收或发布批准 |
| `render-report.json` | 本次技术事实：源和已观察本地资源的哈希、参数、采样回放结果、工具版本和 ffprobe 结果；不是业务状态文件 |

只要短预览就给较短时长；要完整成片就给完整时长与源。无需额外的 `brief.json`、`video-plan.json`、`--mode final`、评分或审批摘要。内容要求与分镜可以留在已有创作记录中，不作为这个工具的强制输入。

## 工具验证与人工观察

渲染器等待字体和图像，检查采样时间的 A→B→A 回放，拒绝页面错误和失败资源，验证实际编码尺寸、时长与音频存在性，并检查观察到的本地输入是否改变。这些检查不证明所有时间都确定，也不判断讲解、字幕、字体回退或审美质量。

实际打开静帧与视频，检查镜头边界、长文字、遮挡、黑屏、素材、节奏和声音；对照实际旁白确认音画同步。源或素材改变后，旧结果不能证明新输出已通过。失败可能留下本次新建目录里的部分产物；它们不具有成功报告，不作为完整成片交付。

## 真实产物验证入口

从本 Work 目录运行：

```bash
python scripts/verify_render.py --output /tmp/speculo-render-verification
```

它经真实 CLI 渲染两段两秒视频（一段无声、一段带音频），独立检查 PNG 尺寸、帧变化、24 帧视频、时长、可完整解码的音视频和非静音样本；还验证本地 CSS、任意时间回放、缺失时间线、远程资源失败及不覆盖原目录。保留的产物可用于实际查看。

只有 Python 与 ffprobe 时可以运行 `python scripts/verify_render.py --inputs-only`。这个模式检查真实音频探测、输入错误与不覆盖行为，明确不包含 PNG/MP4 渲染验证；不能把它报告为完整渲染通过。
