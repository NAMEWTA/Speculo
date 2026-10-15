# 示例：从 Brief 到 18 秒视频和本地草稿

[Media 教程](../../workflows/media.md) · [示例与工具](../README.md)

这是一份原创、静音、使用虚构账号的学习示例。它展示 B → V → P 的材料关系，没有线上发布，也没有复制第三方媒体、配方或字体文件。

## 先认识这些文件

| 文件 | 用途 |
|---|---|
| [brief.json](brief.json) | 明确内容与视频规格 |
| [master.md](master.md) | 共享母稿 |
| [shot-plan.json](shot-plan.json) | 三个镜头的计划 |
| [scene.html](scene.html) | 可编辑的确定性画面源 |
| [draft-request.example.json](draft-request.example.json) | 未批准的草稿请求起点 |
| [observed-render-report.json](observed-render-report.json) | 一次真实运行的渲染记录 |
| [observed-self-review.json](observed-self-review.json) | 同次运行的助手自评 |
| [observed-draft-report.json](observed-draft-report.json) | 同次本地导出的观测记录 |

前三类观测文件是保存的证据，不是可以直接复用的当前批准。大型帧和视频二进制不提交到 Git，需要在自己的环境重新生成。

## 哪些是真实执行，哪些是模拟

保存的观测来自 2026-10-10 使用 Python Playwright、预装 Chromium 和 FFmpeg 的一次本地运行：640×360、12 fps、18 秒、216 帧，三个镜头共九张静帧。该次运行真实生成了预览，观察静帧与时间序列，检查非顺序时间回放和 FFprobe 信息，并在记录审核后生成 final.mp4，没有加载外部资源。

审核是**助手自评**，不是独立人工批准或实时人工播放评估。静音是明确选择，audio_sync 只检查静音合同，不证明旁白同步。静帧与确定性回放也不证明任意运动质量。哈希记录这一次运行，不承诺不同浏览器/编码器版本得到相同二进制。

P 真实执行了本地媒体复制和重复导出，但使用的是**模拟测试批准**。不代表真实用户授权、账号、登录、上传、发布或平台表现；第五项保持 not-authorized。仓库中的 draft 请求没有批准，必须重新取得对应实际输入的确认才可导出。

## 第一步：检查环境和输入

需要 Python 3.10+、Python Playwright、预装 Chromium、Node、FFmpeg 和 FFprobe。脚本不安装或下载依赖。先审查 scene.html；禁止网络访问不意味着可以安全执行任意敌意 HTML。

从 Speculo 仓库根运行：

```bash
node template/workflows/media/common/tools/media-tools.mjs check-brief docs/media/example/brief.json
```

## 第二步：生成预览

```bash
python3 template/workflows/media/media-v-video/scripts/render_preview.py \
  --brief docs/media/example/brief.json \
  --plan docs/media/example/shot-plan.json \
  --html docs/media/example/scene.html \
  --output media-preview-run --reviewed-html
```

输出必须是新目录。打开生成的 preview.mp4 和全部静帧，实际检查画面、时序和内容。

## 第三步：基于本次结果审核

从当前 workflow 的审核模板创建 `media-preview-run/review.json`。填写本次 render-report 中的 input_digest、真实预览/静帧 SHA256、观察到的检查和分数。不要直接拿 observed-self-review.json 当作本次审核。

最终模式使用同一输入，增加 `--mode final --review media-preview-run/review.json`，并选择一个新的输出目录。门禁会检查当前输入、实际预览与静帧字节、预览时长、每镜三张合格静帧、检查项及每项评分不低于 8；脚本不会替你填分。

## 第四步：导出本地草稿

用 draft-request.example.json 起草请求，替换为真实内容、目标别名和本次媒体路径。让 `media/publish-draft` 根据实际 source root 执行 fingerprint-draft，展示方向、平台账号、标题、终稿四项确认及绑定摘要。

取得真实确认后才执行 export-draft，输出正文、媒体副本和清单。第五项只有 not-authorized 或 external-human-handoff，导出不会发布。

## 第五步：理解复盘边界

本例没有发布，平台指标是 null，原因是未发布。可以复盘内容一致性和制作过程，并提出“下一轮只改变第一个镜头 Hook”的假设；不能证明增长效果，也不能在一个示例后晋升永久模板。真正模板沉淀还需要 3–5 条可比较的真实运行和用户确认。
