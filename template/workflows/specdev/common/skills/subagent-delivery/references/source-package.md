# Source Package

外部 Agent 需要固定附件、私有上下文或受保护的未提交改动，且用户已授权目标 provider 与内容范围时加载。包位于调用方授权的临时位置；SpecDev 只在 Goal Plan 或 Evidence 记录可迁移 locator、manifest 摘要和 hash。

## 范围与排除

包应包含理解、修改和验证 Ticket 所需的最小完整源码、直接依赖、构建配置、锁文件、schema、测试、项目 Agent 指令，以及 Spec/Ticket/ADR/CONTEXT 的相关摘录。

排除版本控制内部数据、依赖缓存、构建产物、日志、数据库、转储、浏览器状态、真实用户数据、环境文件、token、cookie、私钥、证书私钥、验证码和恢复码。环境说明只保留无真实值的示例。

## 生成与核对

优先从已提交 checkpoint 生成；包含受保护工作区改动时，manifest 必须列出基线和差异范围。使用仓库已有或可用的密钥扫描器，随后验证包可解压、文件清单、字节数和 SHA-256。

Manifest 至少记录 repository、branch、checkpoint、工作区状态、包 locator、size、SHA-256、secret scan、included、excluded 和 workspace diff。源码变化后生成新 locator 和 hash，不覆盖旧包或沿用旧 manifest。

**完成标准**：包可完整读取，来源与范围可复现，不包含凭据、运行状态或真实用户数据。
