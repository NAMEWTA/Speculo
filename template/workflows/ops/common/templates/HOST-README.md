# 主机总入口

此文件是内容合同，不含真实密码；实际生成器依据成功回执填入真实值，不把占位符当交付。

## host_id、实际身份、登录账号、host_root、根确认回执、更新 UTC 时间

区分已登记、目录存在、双边文档已验证、项目运行环境就绪。新根由用户指定或接受实际登录主目录下 ops；已有根标记既有登记，换账号不换根。

## 服务一览表

主机、服务（含 APP / 共享服务 / WireGuard / Nginx / 探测单元）、访问地址、账号（服务端不写密码）、版本、最近验证时间、持久化或配置路径。未写入 host_services 或部署账本的入口下次交付不会出现。

## 公网访问内网（若已登记 public_ingress）

映射表、四层条件、新开公网 HTTP 服务步骤、禁止暴露的端口。入口与出口不是同一条连接。

## 说明

各主机级服务的 ListenPort / 隧道地址 / 配置路径 / 规范，以及 APP 备份恢复摘要。完整启停命令在项目 README，不把项目全文拼进主机总册。

## 通用规范、知识与部署总册索引

`docs/standards/DEPLOYMENT-STANDARD.md`；`knowledge/host-services.json`；`knowledge/public-ingress.json`；`DEPLOYMENTS.md`。
