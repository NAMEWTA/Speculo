# mysql 服务档案

提供者是独立 mysql-main 项目，service_type=mysql，method=compose，service.compose_service 必须是实际服务名。image 固定摘要。数据在 data/mysql/instance，容器 /var/lib/mysql 显式 bind；镜像声明的其他 VOLUME 必须根据实际 inspect 映射。创建目录的 uid/gid 与所用镜像一致，不猜所有版本相同。

管理员凭据登记 provider.credential_refs；应用库用 Allocation(resource_kind=database)，应用账号 username/password 必须在账本中真实匹配。内置分配只允许明确本库权限，默认 SELECT/INSERT/UPDATE/DELETE；迁移用户需要 DDL 时显式授予本库所需权限，不授全局管理员。

已存在未知库/用户拒绝覆盖；密码不自动重置。数据备份使用该版本可验证的一致性逻辑/物理工具；单 APP 回滚不得恢复整个实例。
