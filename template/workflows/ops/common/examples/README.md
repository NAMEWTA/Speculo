# 输入示例

这些文件是结构示例，不是可直接部署的生产参数。0 的主机指纹/镜像摘要、example.invalid、REPLACE、示例密码必须根据真实探测与项目清单替换。环境示例版本仅展示固定版本语法，不推荐使用该版本，更不声称它是最新或仍受支持。

register 和 credential 是本地登记请求；compose-app、shared-allocation 是 spec；binding 是放入 spec.bindings 的单个对象。凭据管理员/应用分离。实际共享分配要求 provider 已完成部署并登记 service.compose_service 与 administrator credential；不能只复制示例便声称分配成功。

真实无网络演练使用 common/tools/demo-local.mjs --output 新空目录，会自动构造自包含示例与一次精确 demo 批准，严禁把该批准自动化用于生产。
