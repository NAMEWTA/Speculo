# Review Security — 安全评审规范

本阶段对本 change 的代码改动做**OWASP 类别化安全审查**，覆盖注入、鉴权、数据暴露、依赖漏洞、日志脱敏五大方向。AI 在执行 `phase=security-review` 时读本文件作为安全审查手册。

## 一、上下文与产物

- **输入**：本 change 全部前置产物 + 代码 diff；项目根 `../../../.speculo/.config/RULES.md`
- **产物**：`review-security.md`（基于 `../_templates/review-security-template.md`）
- **覆盖目标**：识别本次改动引入或暴露的安全风险；产出可执行修复方向（不直接改代码）

## 二、五项强制扫描

### 扫描 1 · 注入（Injection）— A03:2021
- SQL / NoSQL / Command / LDAP / 模板注入
- 查找点：参数拼接到查询、shell 命令、模板字符串
- 关注点：用户输入是否经过参数化或安全转义

### 扫描 2 · 鉴权与会话（Auth & Session）— A01:2021 / A07:2021
- 鉴权漏洞：未保护的端点、权限提升、IDOR（不安全的对象直接引用）
- 会话漏洞：token 存储位置、过期处理、固定会话攻击
- 查找点：新增 / 修改的端点、`design-api.md` 中标 `auth: optional` 的接口

### 扫描 3 · 数据暴露（Sensitive Data Exposure）— A02:2021
- PII / 凭据 / token / 密钥被日志、错误响应、客户端缓存暴露
- 查找点：日志语句、错误处理、缓存配置、响应 schema

### 扫描 4 · 依赖漏洞（Vulnerable Components）— A06:2021
- 新增 / 升级的依赖是否含已知 CVE
- 依赖版本是否锁定（lockfile）
- 是否引入"非维护"依赖（最近一年无 commit）

### 扫描 5 · 日志与脱敏
- 是否对 PII / token / 凭据做脱敏（如手机号中间四位 mask）
- 是否避免在异常栈中暴露内部结构
- 是否区分 INFO / WARN / ERROR 级别合理

## 三、风险分类与格式

每条风险五要素：

> **风险 ID** · **OWASP 类别** · **严重度** · **位置** · **影响与复现**
>
> 例：`SEC-001` · `A03:Injection` · `critical` · `src/orders/search.ts:88` · "用户输入直接拼接到 SQL：复现路径 `POST /v1/orders/search { q: \"' OR 1=1--\" }` 可读取全表"

严重度：
- `critical`：可被远程利用 / 数据泄露 / 权限提升；决议必为"不通过"
- `high`：明显安全问题，应在本 change 修复
- `medium`：建议修复，可在后续 change 处理
- `low`：提示性建议

## 四、修复建议

每条风险对应一条修复方向：

> **风险 ID** · **修复方向**
>
> 例：`SEC-001` · "改用参数化查询（如 ORM 的 `where({q: q})` 或 prepared statement）；新增针对单引号注入的回归测试"

注意：
- 给方向不写完整代码（写代码是 `../03-implement/` 的工作）
- 若修复涉及架构调整，标"需回 `../02-design/`"

## 五、与 RULES.md 联动

- 项目 `RULES.md` 中关于密钥处理、敏感字段、依赖白名单的规定要逐条验证
- 触发的违规自动归为 `critical` 或 `high`

## 六、写回 LESSONS（与 phase 收尾联动）

任何 `critical` 或 `high` 风险，若属于可复用的安全模式（如"X 类输入未脱敏直接进日志"），抽象成 LESSONS 条目追加到 `../../../.speculo/.config/LESSONS.md`，供下次评审与实现阶段 grep。

## 七、评审决议两档

- **通过**：`critical=0` 且 `high=0`（或 `high` 已修复 / 经签字接受为已知风险）
- **不通过**：任一 `critical` 或 `high` 未修复

## 八、完成准则（机器可验证）

- `grep -c '\[TODO:' review-security.md` = 0
- 文件含 `## 评审决议` / `## 风险清单` / `## 修复建议` 三个标题
- "评审决议" 段含 `通过` / `不通过` 二者之一
- 风险清单含 OWASP 类别关键词至少 1 次（A01 / A02 / A03 / A04 / A05 / A06 / A07 / A08 / A09 / A10 任一）
- 每条风险含 `SEC-` 编号、severity、`文件:行号` 引用
- 修复建议条数 = 风险清单条数
- 若决议为"通过"：`critical_security_count` = 0
- `security_review_decision` 与 `critical_security_count` 写入 `.status.json`
