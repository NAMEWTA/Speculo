# 视频执行与验收

简单讲解用Canvas/HTML+CSS+SVG；字幕复用可选Remotion/HyperFrames；数学演示选Manim；复杂三维可选WebGL/Three.js；生成艺术可选p5.js并固定随机源。不整包安装工具合集，不为使用工具而增加复杂度。

render_preview.py只处理已审查的本地HTML、完整brief与shot-plan。需要已有Node、Python Playwright、Chromium、FFmpeg/ffprobe，以及fc-match或shot-plan.font_files中明确的已审查字体文件；不会安装、下载、转录或调用模型。HTML只用离线内联资源，window.render(t)须确定且支持非顺序时间；浏览器拦截请求不等于任意代码沙箱。font_files只声明文件身份，HTML须已内联对应字体；系统字体记录请求family实际匹配文件，逐字形替代仍须观察。

实际CLI：python3 render_preview.py --brief BRIEF --plan PLAN --html HTML --output NEW_DIR --chromium CHROMIUM --mode preview --reviewed-html。路径先解析为明确本地路径。可先加 --check-inputs 只验当前CLI输入与输出位置；它不启动浏览器、不写产物，不代表已渲染。源码和安装目录均使用同一入口，不能以函数导入替代入口smoke。

先运行preview：每镜三张静帧、确定性检查、15–30秒预览。根据真实观测填写review-template v2，包含当前input_digest、execution_digest、实际preview/stills字节摘要、逐项检查和至少8/10自评。render-report v2记录渲染器和共享工具代码摘要、Python/Node/Playwright/Chromium/FFmpeg/ffprobe身份、平台与字体文件身份。final模式重新计算两类摘要并核对真实媒体才渲染；输出目录须不存在，不覆盖旧产物，失败保留report。旧报告保留历史含义，不能补写新版通过。

final报告另记录实际review文件摘要及其预览摘要，并在编码结束重读review防漂移。artifacts.json中final依赖渲染report，report依赖当前review、brief、plan和HTML/素材；review作为原V-owned报告保存。交付检查能追到实际审核文件，不把报告中的一句“已审核”当成文件存在证明。

输入变化重验依赖这些输入的产物；执行器、字体或工具链变化要求在新环境重做预览和相关技术/视觉审核。该环境变化本身不撤销仍绑定同一内容/账号/媒体字节的用户内容批准；新渲染媒体字节变化后，P按现有规则重新取得对应批准。技术review不能代替人工批准，也不能用自动8分绕过新环境审核。

维护者的真实入口回归位于 `<Path>{roots.workflows}/media/common/tests/test_media_render.mjs</Path>`：临时离线夹具、实际Python CLI、编码和读回报告，不自动生成质量review。MEDIA_RENDER_REQUIRED=1使缺依赖成为失败；MEDIA_RENDER_PYTHON和MEDIA_RENDER_CHROMIUM指定已有工具，MEDIA_WORKFLOW_ROOT可指向安装后的media目录。默认缺浏览器明确skip实际渲染，不能计为渲染通过。

技术报告仅证明截帧/编码/探测，不能自动给视觉8分。spoken音画同步需要实际听看；silent的明确选择不能被描述为通过了语音同步测试。交付工程、分镜、静帧、自检、preview与最终媒体；无工具就标未渲染。
