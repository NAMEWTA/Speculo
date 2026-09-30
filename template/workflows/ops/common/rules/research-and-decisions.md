# GitHub 调研与采用边界

调研使用 GitHub 仓库搜索及固定提交原文，未安装第三方 Skill、未执行其脚本、未复制外部实现。以下材料用于方法选择，不构成部署授权或对第三方“生产可用”宣传的背书。

| 来源 | 实际读取内容 | 本次采用 | 不直接采用 |
| --- | --- | --- | --- |
| [Ansible inventory](https://github.com/ansible/ansible-documentation/blob/7c56be6c083a7f76842be01d16522e7e6309d9c8/docs/docsite/rst/inventory_guide/intro_inventory.rst) | managed nodes、inventory、按模式选择目标；what/where/when 分组 | 独立资源清单、显式目标选择、控制端与被管节点区分；保留 Project/Deployment 关系 | 不新引入 Ansible 运行依赖，不用 all/隐式分组扩展当前任务 |
| [Linux administration Skill](https://github.com/BagelHole/DevOps-Security-Agent-Skills/blob/0365f57a079b1332f95cf26e31dd2d5332a8399f/infrastructure/servers/linux-administration/SKILL.md) | 包管理、系统信息、文件系统和资源诊断 | 将检查清单按系统/资源/运行环境组织，固定版本且先诊断 | 不照搬 apt upgrade、格式化文件系统、广域清理或随意安装 |
| [SSH configuration Skill](https://github.com/BagelHole/DevOps-Security-Agent-Skills/blob/0365f57a079b1332f95cf26e31dd2d5332a8399f/infrastructure/servers/ssh-configuration/SKILL.md) | key/agent、指纹、客户端配置、公钥分发、轮换先验证新 key | 密钥/agent 优先、公钥认证单独验收、保留旧通道、接入失败明确阻塞 | 不默认无口令私钥，不自动清 agent，不照搬 sshd 算法清单/关闭密码登录，不隐式添加 ProxyJump 能力 |
| [Speculo 基线执行器](https://github.com/NAMEWTA/Speculo/tree/60389759ede9f8c4f14b2f7e70da614dfe574ece/template/workflows/ops/common/tools/opslib) | planner、execution、transport、agent、CLI 与 schema | 复用摘要批准、受限写集、身份验证、失败停止、双边回执 | 不重写已有安全底座，不移动历史 Run，不用可视化替代真实验收 |

## 设计取舍

一次授权的对象是有限任务与精确规格，不是“此后所有运维”。本次任务 runner 增加编译前/后的目标与修改集检查，保留原逐 Run 审批文件，但不要求每步由用户再次对话确认。它不是签名授权系统，也不是防御拥有控制端写权限的恶意管理员的沙箱。

离线 HTML 选择原生 HTML/CSS/JavaScript，无前端构建或网络依赖。读模型从 status 与受限证据白名单生成，而非引入第二套数据库。schema v3 不变、新投影 v1、新记录集中 records；这是兼容性重构，不是对既有历史证据的搬家。已有明文历史/真实 env 不自动清理。

第一版不宣称支持云资源发现、JumpHost 参数、首次密码自动登录、远程命令按钮、实时监控、数据库自动恢复或全量 CIS 合规评估。这些都需要独立适配与验收，不通过文档暗示已经实现。
