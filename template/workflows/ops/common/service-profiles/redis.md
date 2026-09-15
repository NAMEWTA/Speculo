# redis 服务档案

提供者独立 redis-main 项目，service_type=redis，service.compose_service 指向实际服务。数据在 data/redis/instance；ACL 文件配置为 data/redis/acl/users.acl（service.acl_persistence 必须完全匹配），容器 ACL 写入路径必须映射到这个项目数据目录，不能将 ACL SAVE 写到只读 config。

每个 APP 使用不同 ACL username、prefix 和凭据；禁用/限制危险管理命令，内置分配使用受限命令类别。必须核验真实客户端兼容性、ACL SAVE 和新账号认证。prefix/数字 DB 不等于独立内存/CPU/备份恢复边界；要求强隔离时部署专用实例。

持久化 AOF/RDB 属于业务数据不是可随意清理的日志。公共实例恢复影响所有消费者，需要整体维护批准。
