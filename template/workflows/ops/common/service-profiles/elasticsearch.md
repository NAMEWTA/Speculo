# elasticsearch 服务档案

提供者是独立 elasticsearch 项目（或用户选定的 kebab ID），`service_type` 用实际产品名，不伪装成内置分配 adapter。image 固定摘要。数据在 `data/elasticsearch/data`，日志在 `logs/elasticsearch`；容器内 data/logs 路径按所用镜像 VOLUME 显式 bind，禁止匿名卷。

官方 Elasticsearch 8 会在启动时写 `elasticsearch.keystore`（临时文件 `elasticsearch.keystore.tmp`）。把 config/data/logs bind 到项目目录后：

- 容器用户必须能写 data 与实际 keystore 目录；不要把 keystore 放进只读 config bind。
- 仅当镜像仍必须写容器根文件系统时，才允许 `read_only: false`，并提供不少于 12 字符的 `writable_root_justification`。默认仍是只读根。
- `config/` 与 `*.conf`/`*.yml` 默认文件模式 0644，供非 root 镜像用户读取；config/env bind 必须 `read_only: true`。

生产健康检查不能只用 docker-proxy 上的 TCP。Compose 服务应声明 `healthcheck`；`compose --wait` 之后执行器要求 `State.Status=running`、非 OOMKilled/Restarting，若存在 Health 则必须 `healthy`。

没有内置集群分配/账号 adapter。跨项目访问通过 existing + 实际授权探测，或专用 host/project 脚本；不能把「能 compose up」写成已具备逻辑资源恢复能力。备份使用该版本可验证的 snapshot/仓库工具；单 APP 回滚不得恢复整个集群。
