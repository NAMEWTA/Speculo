# 逻辑原型

用于验证状态、算法、规则和交互因果。先读取 <Path>{roots.workflows}/specdev/P-prototype/logic-template.md</Path>。P 拥有 <Path>{roots.state}/specdev/changes/{change}/prototypes/LOGIC-NNN/</Path>，ID 最小未用；不修改生产代码或创建 branch/worktree。

1. 选择当前问题的最小纯逻辑，明确初始状态、输入、状态转换、不变量、非法输入及希望验证的决定；有缺口先返回 G。
2. 写 logic.md 作为决定和证据记录；生成 index.html，所有 CSS/JS 内联，无远程字体、CDN、网络调用或外部文件依赖。使用内存状态，reset 回到同一初始状态。
3. 提供可见状态、自由操作、带解释的引导场景与 reset；场景包括正常、边界和非法输入。不要用动画或精美 UI 替代规则反馈。
4. 在实际浏览器离线验证上述场景，记录观察和失败；静态脚本校验不能冒充浏览器观察。通过后 status=ready、verification=passed，保存 SHA-256 摘要。
5. 运行 SpecDev --stage prototype，返回产物与已确认/未确认决定，路由 G/S/T。网页只是原型，不能自动复制为生产实现或把模拟结果当作后端真实行为。

记录按 <Path>{roots.workflows}/specdev/common/schemas/logic-prototype.schema.json</Path> 校验。不能运行浏览器时保持 draft/blocked，报告可运行文件与未验证项。
