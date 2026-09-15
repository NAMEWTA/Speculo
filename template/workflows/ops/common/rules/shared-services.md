# 公共服务生命周期

Project.kind 为 app 或 shared-service；mysql-main/minio-main/redis-main 与 APP 同级。Allocation 是 provider 内的逻辑资源及 owner/data_group/environment/application credential；Binding 是某部署对该 allocation 的端点/网络/凭据引用。

同 APP 的多机副本可引用同一 allocation；不同 APP 默认不同数据库、桶、ACL 和账号。跨 owner 必须 shared_owners 显式批准；跨环境不靠相同账号自动打通。数字 Redis DB/key prefix 不是独立恢复或资源隔离的证明。

内置 MySQL/Redis 分配针对受管 Compose provider：管理员与应用账号必须不同，账号名必须与明文账本一致；MySQL 只授本库权限，Redis 只授被批准 key 范围并验证 ACL SAVE。MinIO 使用指定 mc 版本客户端；其创建用户命令短暂暴露应用密码给特权本机进程查看者，必须显式 allow_secret_argv，不隐瞒该风险。需要避开此风险时采用外部已分配并验证的资源。

已经存在的未知数据库/用户/桶不自动接管；existing 需要真实授权范围与实际探测。计划记录具体版本和端点；任何密码轮换都不复用原 allocation 创建批准。未知产品不猜安装/备份命令。

更新 APP 不升级 provider；退役 APP 不删除 provider、数据、逻辑资源、账号或网络。provider 有 active 消费者时不能退役。维护 provider 必须列全受影响消费者并获确认；控制端和相关服务器文档同步。

单 APP 数据恢复与公共实例恢复分开。备份能力不足即阻塞该承诺；不能用共享实例快照覆盖其他 APP 的新数据。迁移单独定义复制、追平、切换、验证和保留旧端点；工作流不假装原子跨主机提交。
