# 消费者交易与服务 / commerce-service

当任务包含「服务详情、日期与人数选择、预约确认」时使用。目标平台：desktop / web / mobile；密度起点：touch。这些是候选推荐条件，不替代当前项目与用户选择。

## 任务骨架

图片详情、服务包含项、日期/时段/人数、即时总额、不可用选项、库存冲突、模拟确认。

## 预览与复用

[打开离线原型](../templates/commerce-service.html)。此 HTML/CSS/JS 为 Speculo 原创的虚构任务 fixture。所有交互只改本页内存，刷新重置，不发送请求、不付款、不创建真实记录。

复制页面时同时复制所有被引用的本地 CSS/JS/图片及 attribution，保持相对路径闭合。原样板的共享 styles/scripts/assets 不能丢失；新增模板共享 [样式](assets/prototypes.css) 和 [交互](assets/prototypes.js)。复用照片同时保留 [原资产署名](../research-snapshot/ui-gallery/assets/ATTRIBUTION.md)。

## 视觉组合

可选参考：[airbnb](../visual-references/airbnb.md), [stripe](../visual-references/stripe.md)。先选一个主布局和一个主视觉方向，再按 [组合协议](../composition.md) 记录辅助参考的具体角色、覆盖范围与拒绝原因。默认不提问颜色细枝末节，先形成可比较 HTML，由用户确认最终方案。

## 不适用

专业IDE；未经授权真实付款。不要为了套模板改变需求、信息架构、交付数量或已确认项目约束。

## 验证场景

用相同任务和数据比较候选；检查 390px/1440px、长中文、200% 缩放、键盘/focus、reduced motion，以及适用的空/加载/失败/权限/恢复状态。检查界面可见的业务反馈，不用按钮绑定存在代替成功路径。样板验证不替代生成 change 原型的验证；生产行为仍须另验。
