# 路径与执行 Scope 合同

## 三类边界

每份项目计划必须区分 `source_root`、`deployment_root` 和无法由文件根约束的 `external_mutations`。source/deployment root 可以相同，但必须显式记录。global change 没有源码时 source root 可使用目标证据中的明确 sentinel，而不能伪造项目。

## 文件包含检查

执行前对每个路径：解析绝对路径和最近现有父目录真实路径；拒绝空值、`..`、NUL、未解析变量和 symlink 逃逸；确认 write set 位于 deployment/write roots；创建后再次重读真实路径。工具全局 cache/home 写入使用 deployment root 内隔离 cache，或登记为 external mutation。

## 外部 Mutation

Docker daemon resources、systemd/launchd、Kubernetes、数据库、DNS、证书、流量、防火墙、用户权限、计划任务和全局环境变量均属 external mutation。每项声明稳定 id、provider/target、当前/期望状态、权限、事故半径、preview 限制、apply、postcondition、rollback、verification 和 batch。

## 系统盘点层级

- L0：OS、架构、CPU/内存、挂载点、容量/inode、runtime 版本和工具可用性。
- L1：服务、进程、端口、工作目录、Docker/Compose/Kubernetes context 与资源关联。
- L2：只对用户一次批准的根列表做定向容量、权限或类型分析。

禁止递归扫描 `/`、用户 home、密钥目录、容器存储根或数据库数据目录。权限拒绝形成 observation gap，不通过提权绕过。
