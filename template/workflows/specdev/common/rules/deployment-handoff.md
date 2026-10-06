# SpecDev 与 OPS 的交付引用

只有用户要求把当前开发成果交给 OPS 部署，或 OPS 收到开发交付时读取。使用既有 Evidence、部署 spec、task Plan 与双边回执，不创建全局交付状态、镜像 Ticket 或自动部署 Work。

## 开发侧：Evidence 中记录事实

由 SpecDev Lead 在当前 Evidence 的交付小节记录：change/Ticket 稳定 ID、权威 Spec/AC 与验收证据 locator、实际代码 revision、可交付构件 digest、已运行检查/未测项、所需目标/环境及兼容、配置、迁移、备份恢复和发布约束。用户未指定目标或构件不存在时明确缺口，不虚构 OPS Host 或已部署结果。交付数量保持用户要求。

对可部署构件使用实际字节或已验证镜像摘要；代码 revision 不能替代构件 digest。必要引用带来源位置、验证时间/摘要；不复制 Spec/Ticket 正文、不输出秘密。变更完成只证明开发合同，不证明部署完成。

## 运维侧：独立验证目标和授权

D 从原 OPS 网关取得真实 Controller、server_ids、project_id、environment/instance 与授权，核对交付源码/构件和当前验收证据。缺失、漂移或不符合部署约束时阻塞部署，不能据此改写开发完成事实。

沿用现有 spec 字段：`resource_updates.projects[].source` 保存真实 type/location/revision，`deployments[].notes` 以字符串记录 change/Ticket、Evidence locator 与 digest/验收约束；部署目标、备份和恢复仍使用原字段。不要添加 schema 不支持的顶层 handoff/status 字段。任务中需要执行或引用的本地构件/脚本按原 `input_paths` 冻结；普通文档指针不是执行权限。

执行、健康与文档回执由 OPS D 已激活入口中明确指向的任务授权、持久化与恢复合同拥有；由 OPS 执行方读取并验证，不从 SpecDev 路径解析器展开其他工作流的根。没有交付请求时，本分支不增加开发侧必读材料或部署门。

## 回传而非代写

OPS 返回原 task/Run/Release/receipt locator、observed revision/version、实际健康与双边文档结果、未验证项。`unknown`、`failed`、`docs_pending` 保持真实状态；V 失败单独报告，不重跑业务。

OPS 不修改 SpecDev Ticket、Map、Goal Plan 或状态。若用户要求回填，由原 SpecDev Lead 核对回执后在已有 Evidence 追加指针；已完成旧 Evidence 与归档只读时创建原流程允许的新记录或 change，不覆盖历史。开发验收与运维部署各自拥有完成结论。
