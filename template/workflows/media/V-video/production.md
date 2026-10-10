# 视频执行与验收

简单讲解用Canvas/HTML+CSS+SVG；字幕复用可选Remotion/HyperFrames；数学演示选Manim；复杂三维可选WebGL/Three.js；生成艺术可选p5.js并固定随机源。不整包安装工具合集，不为使用工具而增加复杂度。

render_preview.py只处理已审查的本地HTML、完整brief与shot-plan。需要已有Node、Python Playwright、Chromium、FFmpeg/ffprobe；不会安装、下载、转录或调用模型。HTML只用离线内联资源，window.render(t)须确定且支持非顺序时间；浏览器拦截请求不等于任意代码沙箱。

先运行preview：每镜三张静帧、确定性检查、15–30秒预览。根据真实观测填写review-template，包含当前input_digest、实际preview/stills字节摘要、逐项检查和至少8/10自评。final模式重新核对真实媒体与源摘要才渲染；输出目录须不存在，不覆盖旧产物，失败保留report。

技术报告仅证明截帧/编码/探测，不能自动给视觉8分。spoken音画同步需要实际听看；silent的明确选择不能被描述为通过了语音同步测试。交付工程、分镜、静帧、自检、preview与最终媒体；无工具就标未渲染。
