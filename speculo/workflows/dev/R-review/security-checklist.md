# 安全与可靠性清单

服务 `R-review.md` 的 **Engineering 维度**。审查 diff 是否引入安全漏洞或运行时风险时读取本文。每条命中都要同时说明**可利用性（exploitability）**与**影响（impact）**，并按下方"严重度提示"定级。

## 输入 / 输出安全

- **XSS**：不安全的 HTML 注入、`dangerouslySetInnerHTML`、未转义模板、`innerHTML` 赋值
- **注入**：通过字符串拼接或模板串构造的 SQL / NoSQL / 命令 / GraphQL 注入
- **SSRF**：用户可控 URL 在无 allowlist 校验下访问内部服务
- **路径穿越**：用户输入未经清洗进入文件路径（`../` 攻击）
- **原型污染**：JavaScript 中用用户输入做不安全的对象合并（`Object.assign`、带用户输入的展开）

## 认证 / 授权（AuthN/AuthZ）

- 读写操作缺少租户或归属（ownership）校验
- 新端点没有 auth guard 或 RBAC 约束
- 信任客户端传入的 role / flag / ID
- 越权访问（IDOR —— 不安全的直接对象引用）
- 会话固定或弱会话管理

## JWT 与令牌安全

- 算法混淆攻击（期望 `RS256` 却接受 `none` 或 `HS256`）
- 弱密钥或硬编码密钥
- 缺少 `exp` 过期或未校验
- 敏感数据放进 JWT payload（token 是 base64，不是加密）
- 不校验 `iss`（签发者）或 `aud`（受众）

## 密钥与 PII

- API key、token、凭据出现在代码 / 配置 / 日志
- 密钥进入 git 历史，或环境变量暴露给客户端
- 过度记录 PII 或敏感载荷
- 错误信息缺少数据脱敏

## 供应链与依赖

- 未锁版本的依赖，允许恶意更新
- 依赖混淆（私有包名冲突）
- 从不可信源或 CDN 引入且无完整性校验
- 含已知 CVE 的过期依赖

## CORS 与响应头

- 过宽的 CORS（带 credentials 时 `Access-Control-Allow-Origin: *`）
- 缺少安全响应头（CSP、X-Frame-Options、X-Content-Type-Options）
- 暴露内部头或堆栈信息

## 运行时风险

- 无界循环、递归调用或大块内存缓冲
- 外部调用缺少超时、重试或限流
- 请求路径上的阻塞操作（async 上下文中的同步 I/O）
- 资源耗尽（文件句柄、连接、内存）
- ReDoS（正则表达式拒绝服务）

## 密码学

- 弱算法（用于安全目的的 MD5、SHA1）
- 硬编码 IV 或 salt
- 只加密不认证（ECB 模式、无 HMAC）
- 密钥长度不足

## 竞态条件（Race Conditions）

竞态是引发间歇性故障和安全漏洞的隐蔽缺陷，重点关注：

### 共享状态访问
- 多线程 / 协程 / 异步任务无同步地访问共享变量
- 并发修改全局状态或单例
- 无正确加锁的惰性初始化（double-checked locking 问题）
- 在并发上下文使用非线程安全集合

### 先检查后行动（TOCTOU）
- `if (exists) then use` 无原子操作
- `if (authorized) then perform`，而授权可能变化
- 文件存在性检查后再做文件操作
- 余额检查后扣减（金融操作）
- 库存检查后下单

### 数据库并发
- 缺少乐观锁（`version` 列、`updated_at` 校验）
- 缺少悲观锁（`SELECT FOR UPDATE`）
- 无事务隔离的 read-modify-write
- 非原子的计数器自增（应用 `UPDATE SET count = count + 1`）
- 并发插入触发唯一约束冲突

### 分布式系统
- 共享资源缺少分布式锁
- 领导选举竞态
- 缓存失效竞态（写后读到脏数据）
- 缺少正确排序的事件顺序依赖
- 集群操作的脑裂

### 需要标记的危险模式
```
# 危险模式：
if not exists(key):       # TOCTOU
    create(key)

value = get(key)          # read-modify-write
value += 1
set(key, value)

if user.balance >= amount:  # 先检查后行动
    user.balance -= amount
```

### 追问
- "两个请求同时进入这段代码会怎样？"
- "这个操作是原子的，还是可被打断？"
- "这段代码访问了哪些共享状态？"
- "高并发下它的行为如何？"

## 数据完整性

- 缺少事务、部分写入或状态更新不一致
- 持久化前校验薄弱（类型强转问题）
- 可重试操作缺少幂等性
- 并发修改导致的丢失更新（lost update）

## 严重度提示

- 可被利用的安全漏洞、数据丢失风险、敏感信息泄露 → **P0**（阻断合并）
- 需特定条件触发但影响显著的安全 / 可靠性缺陷 → **P1**
- 纵深防御缺口、低影响硬化项 → **P2**
