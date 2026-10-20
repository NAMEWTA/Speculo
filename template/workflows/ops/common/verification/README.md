# OPS 验证入口与项目业务配方

这份索引说明每个入口能验证什么；它不是本次环境已经通过的报告。实际运行记录保存在原 Task / Run / 项目 Evidence，包含源码或 engine 摘要、输入版本、目标身份、工具版本、命令、退出码、回执与未运行项，不建第二套状态账本。

| 入口 | 可证明的范围 |
|---|---|
| common/tools/validate-ops.mjs --package-check | 源包静态资产与初始化种子可用，不接目标 |
| common/tools/validate-ops.mjs --self-check | 已安装静态资产完整，不猜运行根、不要求静态 _state |
| common/tools/validate-ops.mjs --state-root ABSOLUTE_STATE | 明确运行资源状态满足当前合同 |
| common/tests/test_resource_contracts.mjs | 共享合法 / 非法资源关系，独立执行器验证不改输入 |
| common/tests/test_ops_workspace.mjs | 范围、冻结授权、未知结果、脱敏检查与离线视图；适配器注入不代表实机验收 |
| common/tests/test_ops.mjs | 临时本地目标上的实际动作、业务计数、双端文档读回和恢复边界 |
| common/tests/test_ops_bootstrap.mjs、test_ops_onboarding.mjs | 固定引导、根确认与恢复；测试注明本地或模拟 SSH 范围 |

维护者应在实际安装包上重复对应 CLI，源码函数导入通过不能替代安装入口。systemd、Docker、真实 SSH、Windows 常驻行为与具体数据库恢复，仍需具有相应权限的真实目标验收。

## 项目业务验证

D 在准备部署规格时按需使用本配方。H 验证主机变更及受影响消费者；项目业务判断归项目 owner 和 D。HTTP / TCP / 文件检查继续保留，不能仅凭存活就宣布业务正确。

1. 从当前 Spec / Ticket 的验收条件定位项目已有测试或 Skill。选择一条能读回真实结果的业务路径，固定待验版本。
2. 项目 owner 编写一个 Node 标准库或项目既有依赖可运行的脚本，包含依赖诊断、驱动真实业务、结果与必要副作用读回、清理自身测试数据。明确失败和不可自动补偿项。没有 UI 不要求浏览器；不了解数据库恢复就不生成万能恢复命令。
3. 在可丢弃或已有授权的环境运行脚本，并用已知错误结果证明它会失败。只生成脚本时保持 unverified，不能自填 observed。
4. 用 <Path>{roots.workflows}/ops/common/tools/business-verification.mjs</Path> 读取项目自有 JSON 配方，得到部署 files / health 片段和任务 input_paths。该工具只读文件、输出片段，不执行脚本、不形成批准。把片段并入当前 D spec；脚本依赖及夹具全部加入 input_paths，部署依赖文件仍由项目构件拥有。
5. 现有任务冻结输入，现有编译器生成 verify-command，执行器保存退出码和业务输出。任何测试数据写入、联网或清理都必须在本次原授权中；不因它叫验证就扩大范围。
6. 代码、输入、执行器、目标身份或相关依赖变化，重验受影响结论。业务动作未知时不重放；仅文档失败使用原 docs-only 恢复。脚本成功输出不代替真正的用户批准。

配方 JSON 字段：schema_version=1、script（控制端绝对路径）、target（既有files允许的相对脚本路径，默认artifact/verify-business.mjs）、args（显式无秘密参数）、inputs（其他需冻结的绝对输入）、success_pattern（业务成功输出）、timeout（1–300 秒）、node（目标已有 Node 可执行文件，默认 node）。artifact/由原编译器放到本次release并使用{{artifact}}定位；其他允许目录使用{{root}}。参数可使用现有{{data}}等模板；版本值由项目当前已批准规格提供，不能凭空推断。
