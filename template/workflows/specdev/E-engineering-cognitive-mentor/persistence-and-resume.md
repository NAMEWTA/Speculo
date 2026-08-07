# 持久化与恢复协议

本协议是工程认知导师 Work 的状态与落盘权威。它细化 Speculo 全局持久化契约，不改变其他 Work 的工件职责。

## 1. 根与 change 解析

1. 从当前工作目录向上寻找唯一的 Speculo 工作区声明（`.speculo` 下的 workspace 配置）；
2. 第一个唯一命中的目录为 project root；多个候选或用户指定目录冲突时停止并消歧；
3. `path_base` 必须为 `project-root`；
4. 读取 roots 后，将 Work 路径解析为 `<Path>{roots.workflows}/specdev/E-engineering-cognitive-mentor/</Path>`，状态路径解析为 `<Path>{roots.state}/specdev/</Path>`；
5. 用户指定 change 优先；否则唯一 active change 直接使用；没有 active change 时按 `YYYY-MM-DD-<kebab-topic>` 创建；多个 active change 不得猜测。

若 `<Path>{roots.state}/specdev/config.json</Path>` 不存在，先进入 `<Path>{roots.workflows}/specdev/I-init-setup/I-init-setup.md</Path>`。

## 2. 状态文件

全局状态：`<Path>{roots.state}/specdev/status.json</Path>`。

change 状态：`<Path>{roots.state}/specdev/changes/{change}/.status.json</Path>`。

主产物：`<Path>{roots.state}/specdev/changes/{change}/engineering-cognitive-mentor.md</Path>`。

跨 Work 决策日志：`<Path>{roots.state}/specdev/changes/{change}/LOG.md</Path>`。

### 开始

- 在 `active` 中找到或创建当前 change；
- `current_work` 已是 `specdev/engineering-cognitive-mentor` 时恢复，为 null 时设置为该 id；指向其他 Work 时停止并要求先完成显式 handoff；
- `<Path>{roots.state}/specdev/changes/{change}/.status.json</Path>` 的 `current_work` 同步设置为相同值；
- 全局索引不创建逐次调用日志；开始时间与恢复阶段由主产物 frontmatter、MLOG 和 `<Path>{roots.state}/specdev/changes/{change}/.status.json</Path>` 承载。

### 等待用户或跨会话暂停

- 保持 `current_work` 为本 Work；
- 更新主产物 `updated_at`、`current_phase`、`next_question`、`unresolved_questions` 与 `last_mlog_id`；
- 每轮在回复前先落盘，确保用户即使中断也可恢复。

等待用户回答不是 blocked，不应把 change 标为 blocked。

### 正常关闭

- 将本 Work id 以去重方式加入 active change 的 `works_run`；
- active change 的 `current_work` 与 `<Path>{roots.state}/specdev/changes/{change}/.status.json</Path>` 的 `current_work` 设为 null；
- 不改变整个 change 的 `change_status`，除非用户明确结束或外部阻塞确实影响整个 change；
- 主产物 `status` 写为 `completed`，记录 `closed_at` 与理解确认状态。

### 外部阻塞

只有缺少权限、不可访问资料、必须等待第三方结果或存在互斥权威冲突时才标 blocked：

- 主产物 `status: blocked`；
- 记录 blocker、已知事实、所需输入和恢复条件；
- 保留 `current_work` 作为唯一恢复指针；
- change 是否设为 blocked 取决于该阻塞是否阻止整个 change，不自动扩大。

### 用户取消

- 主产物 `status: cancelled`；
- 保存当前综合和完整 MLOG；
- 清空全局与 change 状态的 `current_work`，但不将本 Work 加入 `works_run`；
- 不删除工件或日志。

## 3. 主产物幂等初始化

主产物不存在时，使用 `<Path>{roots.workflows}/specdev/E-engineering-cognitive-mentor/mentor-report-template.md</Path>` 创建。

主产物已存在时：

- 不重新生成或覆盖；
- 读取 frontmatter、当前综合、未决问题和最后一个 `MLOG`；
- 可补齐缺失的可选章节，但不得重排或改写历史日志；
- 未识别的新字段原样保留；
- schema version 1 缺失可选字段时按空值读取，在真实更新时补齐。

## 4. 每轮落盘顺序

每次有实质交互时按以下顺序写入：

1. 追加新的 `MLOG-###`；
2. 更新主产物的当前综合、证据表、方案表和未决问题；
3. 若有高影响决定，摘要追加全局 `LOG-###`；
4. 更新主产物 frontmatter 的阶段、状态、理解状态、时间和最后日志编号；
5. 更新 `<Path>{roots.state}/specdev/changes/{change}/.status.json</Path>` 的 `updated_at`；
6. 返回用户回复。

写入中断时，以已追加的 MLOG 为恢复锚点；不得为同一用户回合重复追加。可以用时间、上一条 MLOG 和用户输入摘要检测重复。

## 5. MLOG 与全局 LOG 的职责

### MLOG：详细、Work 专属

主产物中的 MLOG 保存：用户问题摘要、导师问题、用户回答、解释、证据变化、误解修正、方案比较、理解确认和下一焦点。

### 全局 LOG：高影响、跨 Work

只有满足以下任一条件才追加到 `<Path>{roots.state}/specdev/changes/{change}/LOG.md</Path>`：

- 用户确认或拒绝会改变产品行为、范围、验收、架构边界、迁移、安全或重大风险的选择；
- 某项结论阻止或允许进入 Spec、Ticket、Goal Plan 或 Implement；
- 先前跨 Work 决策被替代；
- 需要其他 Work 恢复时必须知道的阻塞或 handoff。

全局 LOG 条目使用 `<Path>{roots.workflows}/specdev/G-grill-with-docs/log-format.md</Path>`，并在“事实与来源”或“后续”中引用对应 `MLOG-###` 与主产物完整路径。

普通教学解释、低影响偏好和用户的每个追问不得复制到全局 LOG。

## 6. 恢复读取顺序

跨会话恢复时按顺序读取：

1. `<Path>{roots.state}/specdev/status.json</Path>`；
2. `<Path>{roots.state}/specdev/changes/{change}/.status.json</Path>`；
3. `<Path>{roots.state}/specdev/changes/{change}/engineering-cognitive-mentor.md</Path>`；
4. 其中列出的权威输入与外部引用；
5. `<Path>{roots.state}/specdev/changes/{change}/LOG.md</Path>` 中与 MLOG 关联的高影响条目；
6. 按当前模式加载所需专项协议。

恢复后先向用户简短说明：当前模式、已确认结论、未决问题和下一焦点。不要重新复述全文或重新询问已回答问题。

## 7. 工件冲突

冲突按 `<Path>{roots.workflows}/specdev/common/rules/artifact-contract.md</Path>` 裁决。

- 用户最新明确决定优先；
- 主产物是教学综合与详细 MLOG 的权威，不是产品行为或架构决定的最终权威；
- 若主产物与 ADR、Spec 或 Ticket 冲突，指出冲突并移交真正拥有该决定的 Work 修订；
- 代码事实可以证明旧解释过时，但不能静默改写用户目标；
- 所有替代通过新 MLOG 和必要的全局 LOG 记录，不删除旧内容。

## 8. 敏感信息

不得将令牌、密码、密钥、完整个人数据、内部凭证、生产连接串或未脱敏客户数据写入 Speculo 状态。日志只保存脱敏摘要和安全的来源指针。
