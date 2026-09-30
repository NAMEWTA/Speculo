# OPS 工作空间重构：验证记录

基线：60389759ede9f8c4f14b2f7e70da614dfe574ece。以下结果仅描述本次实际执行，不等于真实服务器或生产部署验收。

## 本地环境与范围

使用检索得到的固定版本源文件及改动覆盖集，不是完整仓库 checkout。本地 Node 为 v22.16.0，低于项目声明的 >=22.22.3 <25；未安装 pnpm 或项目依赖。因此不能以本地结果宣称整个 Speculo build/check 已通过。完整仓库集成测试通过 PR 的既有 CI 使用项目支持的 Node 版本运行。下方单独记录已取得的 CI 证据，最终状态以 PR #74 最新提交的检查为准。

## 已执行

| 检查 | 实际结果 |
| --- | --- |
| `node --test template/workflows/ops/common/tests/test_ops_workspace.mjs` | 32 项：31 pass、0 fail、1 skipped；跳过项为需要完整旧 model/planner/execution 的真实网关集成测试 |
| 对覆盖集中的所有 `.mjs` 执行 `node --check` | 退出码 0 |
| 原仓库 `generate-index.mjs` 重建 OPS README | 生成 5 个 Work；第二次运行无变化；`--check` 退出码 0 |
| 3 个新 JSON Schema 的 Draft 2020-12 结构检查 | 全部通过 |
| 演示 inventory.json 对 fleet-view schema 校验（包含 date-time format） | 通过 |
| Chromium / Playwright 页面交互 | 9 项通过；无 JavaScript/CSP 错误，无外部 HTTP/HTTPS 请求 |

单元测试覆盖明确范围路由、错误/重复参数、路径穿越与链接拒绝、重复 JSON 键、孤立资源、SSH 公钥检查、基线状态与过期、一次任务授权、缺失批准、执行器/账本/输入/资源修订漂移、编译范围扩大、隐藏资源变更、未冻结源码、破坏性操作（包括非 uninstall 操作内的退役请求）、失败停止、禁止重放、投影敏感字段排除、HTML 注入防护、视图读回摘要及锁冲突。

浏览器验证：初始服务器/项目/部署计数 4/4/5；服务器到项目筛选；项目到两台服务器反向查询；项目与服务器交集；空结果状态；文本查询；展开 16 项检查；390px 窄屏无页面水平溢出；无脚本/CSP 错误或外部请求。发现并修复了长摘要造成的窄屏页脚溢出。

环境策略阻止直接 `file://` 导航（ERR_BLOCKED_BY_ADMINISTRATOR），未更改该策略；页面通过同一 HTML 的浏览器内存加载完成交互验证。因而“离线单文件已生成且无外部依赖”已验证，“本环境直接 file:// 打开”未验证。演示中的机器、地址、项目和状态均为虚构，没有连接真实服务器。

## 已取得的完整仓库 CI 证据

[PR #74](https://github.com/NAMEWTA/Speculo/pull/74) 使用原有 CI，不降低校验门槛。

首次运行 [36670865164](https://github.com/NAMEWTA/Speculo/actions/runs/36670865164) 的真实集成测试发现示例及测试夹具的 mkdir 动作缺少必需 reason。已在 4b868d11bc347e6c9e9542b8904eda6a772a1a75 补齐，未删除或放宽原 spec 校验。

第二次运行 [36671473458](https://github.com/NAMEWTA/Speculo/actions/runs/36671473458) 的 Node 24 日志确认：仓库测试 197/197 通过、0 跳过；独立 OPS 子测试 196/196 通过、0 跳过，包含原执行器、bootstrap 和新工作区测试。Windows 安装检查也已通过。真实 workspace 集成测试已通过原 model/planner/approval/apply，在专用临时目录执行 H mkdir、验证双边记录并生成资产视图；不再只有模拟适配器证据。

第二次运行在测试之后的资产校验停止：INDEX.md 缺少固定的“Work 激活”标题。本次修正该标题，并按渐进读取校验合同补齐 activation-and-memory.md 指针；原校验器和 CI 顺序保持不变。该次运行整体仍为失败，不把测试全通过等同整个 check 通过。修正后的完整 CI 结论在 PR 最新提交检查及交付验证补充中记录。

根 test/ops-workflow.test.ts 已纳入五 Work 发现、安装结果、records 刷新字节/权限保留检查，并保留原资源验证、审批和 legacy 测试。未移动历史 Run/Release。完整验收还包括 pnpm validate-assets、pnpm verify-bin 与生成物一致性门，必须分别以实际执行状态为准。

## 未执行与限制

未连接用户 Linux/Windows/macOS 服务器；未实测首次 SSH 信任、公钥分发、sudo、systemd、Docker Engine/Compose、数据库分配或备份恢复、真实 APP 部署/迁移。没有服务器凭据或授权的真实目标，不能声称这些已经完成。

没有变更 main、发布 npm/tag、修改用户状态或搬迁历史 Run/Release。新增执行器/schema 会改变 engine_digest；旧未知现场必须先 inspect-run，再按恢复协议处理，不能绕过原批准校验。
