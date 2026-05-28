# Deploy Execute — 部署执行规范

本阶段把发版工作流产出的版本制品**实际推送到目标环境**，并完整记录执行轨迹。AI 在执行 `phase=deploy` 时读本文件作为操作手册。

## 一、上下文与产物

- **输入**：本 change 的 `release-checklist.md`；项目 `.speculo/.config/{RULES.md, ARCHITECTURE.md}`；环境配置基线（如 `.env.<env>` 或部署配置仓库）
- **产物**：`deploy.md`（基于 `../_templates/deploy-template.md`）
- **边界**：本阶段**仅执行部署**；发版后观测归 `../03-monitor/`，事故响应归 `../04-incident/`

## 二、章节填写引导

### 环境
- **目标环境名**：`prod` / `staging` / `canary-1` / `dev` 等
- **集群 / 命名空间**：k8s namespace、AWS region、Vercel project 等具体定位
- **配置基线**：使用哪份配置文件（路径 + commit hash），含哪些 feature flag 状态
- **部署窗口**：开始时间 / 预计结束时间 / 变更审批人

### 部署内容
- **版本号**：与 `release-checklist.md` 中 `version` 一致
- **涉及服务**：本次部署影响的服务清单（含未变更但需重启的关联服务）
- **配置变更**：env / secret / feature flag / 路由表变更清单
- **schema 变更**：是否触发，对应 migration 文件路径与状态

### 执行结果
按部署步骤顺序记录：

1. **步骤**：可机械执行的命令
2. **输出**：实际命令输出（贴关键片段，超长可摘要 + 完整日志归档）
3. **耗时**：单步耗时
4. **状态**：`success` / `warning` / `error`

收尾给出**总体结果三档**：
- `success`：所有步骤 success，无 warning 或已知接受 warning
- `partial`：部分服务部署成功、部分未达预期；标明哪部分待跟进
- `failed`：关键步骤失败；按 `deploy-rollback.md` 立即回滚

## 三、部署模式建议（按环境）

| 环境 | 推荐模式 | 后续衔接 |
|------|---------|---------|
| `dev` / `staging` | 全量替换 | `../03-monitor/` 短窗口（如 15min） |
| `prod` 小规模 | 滚动升级（rolling） | `../03-monitor/` 标准窗口（如 60min） |
| `prod` 大规模或敏感 | Canary（5% → 25% → 100%） | 每档 Canary 后进入 `../03-monitor/` |

Canary 推进决策点写入 deploy.md "## Canary 推进决策" 段（若适用）。

## 四、长操作处理

构建、镜像推送、滚动升级、Canary 等待等长操作建议异步追踪：
- 工具支持 `run_in_background` 等机制时，启动后继续监督而不阻塞主推理
- 不支持时，分段执行 + 阶段性贴出输出
- 任何长操作必须有"超时退出"判定（如等待健康检查 ≤10 分钟）

## 五、与 RULES.md 联动

`.speculo/.config/RULES.md` 可能规定：
- 部署窗口（如禁止周五下午部署 prod）
- 必须的审批流程
- 禁用的命令（如禁止 `kubectl delete pod -A`）
- 必须的回滚预案就绪状态

任一违规 → 不部署，回 `../01-release/` 或等审批。

## 六、完成准则（机器可验证）

- `grep -c '\[TODO:' deploy.md` = 0
- 文件含 `## 环境` / `## 部署内容` / `## 执行结果` 三个标题
- "环境" 段含环境名、集群/namespace、配置基线引用
- "部署内容" 段含本 change 的 `version` 字段（与 release-checklist 一致）
- "执行结果" 段含 ≥1 个 ` ``` ` 代码块（命令输出），并标"总体结果"字段为 `success` / `partial` / `failed`
- `deploy_env` / `deploy_result` / `schema_migrated` 写入 `.status.json`
- 若 `deploy_result ∈ {partial, failed}`：必须显式衔接 `../04-incident/`
