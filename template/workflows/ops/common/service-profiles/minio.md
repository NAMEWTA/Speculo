# minio 服务档案

提供者独立 minio-main 项目，service_type=minio，service.endpoint 是实际管理员端点；对象数据在 data/minio/objects，实例卷数和恢复方式根据真实拓扑确定，不机械套单盘模板。

内置分配使用用户指定并核验版本的 mc client_path，以 MC_HOST_ops 进程环境传管理员凭据；每 APP 一个桶、最小桶策略和应用身份。mc admin user add 的新应用密码位于子进程参数，需 allow_secret_argv=true 显式确认特权进程查看风险；不接受该边界时使用既有资源的实际验证模式。

删除 APP 不删除桶或公共实例。桶级恢复需实际版本/复制/版本控制策略，不能把复制 APP 根当作对象数据备份。
