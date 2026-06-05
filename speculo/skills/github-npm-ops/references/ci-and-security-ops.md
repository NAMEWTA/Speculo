# CI 排障与安全告警巡检

两部分内容：

1. CI 失败的结构化排障流程（与发布专用的 release workflow 相区分）
2. 安全告警（Dependabot、secret scanning、code scanning）的巡检节奏与响应模板

## CI 排障

### 第一步：拿到日志

```bash
# 列最近失败的 run
gh run list --status failure --limit 10 \
  --json databaseId,displayTitle,headBranch,conclusion,event

# 查单次失败的完整日志
gh run view <databaseId> --log-failed

# 只看失败步骤的摘要（更快）
gh run view <databaseId> --log-failed 2>&1 \
  | grep -E "##\[error\]|Error:|FAIL|error TS" | head -40
```

### 第二步：判定是真实失败还是 flaky

- **真实失败**：代码层面的 bug、依赖变更、lint 违规、测试逻辑错误
- **Flaky**：网络抖动、时序竞争、外部服务临时 500、测试隔离不够

判别方法：

1. 在相同 commit 上 `gh run rerun <id> --failed`，连续失败 2 次 = 真实
2. 查看测试名是否出现在历史 flaky 列表里
3. 看错误是否与环境相关（如 DNS、超时）

### 第三步：真实失败的修复

按错误类型对应：

| 错误类型        | 典型信号                          | 处理方向                                   |
| --------------- | --------------------------------- | ------------------------------------------ |
| Lint            | `error TS*` / `Parsing error`     | 在本地 `pnpm lint --fix`，推新 commit      |
| 类型            | `Type 'X' is not assignable`      | 修类型定义，或在必要处用类型守卫           |
| 测试逻辑        | 断言失败、期望值不匹配             | 检查最近是否改了被测行为，更新测试或代码   |
| 环境依赖        | `command not found` / 版本不符    | 对齐 `setup-node` 版本与 `packageManager`  |
| 依赖冲突        | peer dep 警告 + 运行时错误         | 检查 lockfile 变更，pin 冲突的 transitive  |
| 构建产物        | `Cannot find module './dist/...'` | 确认构建步骤在测试/发布前执行              |

### 第四步：Flaky 的处理

- **临时**：加 retry（`jest.retryTimes(2)` 或 vitest 的 `retry`）
- **中期**：在 issue 里记录 flaky 模式，打 `flaky-test` 标签
- **长期**：重构测试用例（解耦外部服务、用 fake clock、隔离共享状态）

**避免**：无脑 `gh run rerun` 把失败掩盖掉。Flaky 积累会慢慢腐蚀对 CI 的信任。

### CI 性能优化

查询 workflow 耗时：

```bash
gh run list --workflow ci.yml --limit 20 \
  --json databaseId,conclusion,createdAt,updatedAt \
  --jq '.[] | "\(.databaseId) \((.updatedAt | fromdate) - (.createdAt | fromdate))s"'
```

常见加速手段：

- 缓存 `~/.pnpm-store` / `node_modules/.cache`
- 分离 lint / test / build 到并行 job
- Matrix 测试（多 Node 版本）加 `fail-fast: false` 让其他 cell 跑完
- 把重测试移到 nightly schedule 而不是 PR

## 安全告警巡检

GitHub 提供三类安全告警，都可以通过 `gh api` 查询。

### Dependabot（依赖漏洞）

```bash
# 列所有未解决告警
gh api repos/{owner}/{repo}/dependabot/alerts \
  --jq '.[] | select(.state=="open") | {severity: .security_advisory.severity, pkg: .security_vulnerability.package.name, summary: .security_advisory.summary}'

# 按严重性过滤
gh api repos/{owner}/{repo}/dependabot/alerts \
  --jq '.[] | select(.security_advisory.severity=="critical" or .security_advisory.severity=="high")'
```

响应节奏：

- **critical**：24h 内评估；有 fix 版本就立即升级，无则评估临时缓解（移除依赖、关闭受影响功能）
- **high**：一周内处理
- **medium / low**：入 backlog，定期批量清

Dependabot 自动开 PR 时，标签是 `dependencies`：

```bash
# 看当前自动 PR
gh pr list --label "dependencies" --state open \
  --json number,title,createdAt,mergeable
```

安全升级的 PR 审查要点：

1. 看 diff 是否只是版本 bump（无其它改动）
2. CI 绿 → 大多数可以合
3. major 版本要看 release notes，可能有 breaking change

可考虑给 `dependabot.yml` 配自动合并策略（低风险的 patch/minor）。

### Secret Scanning

```bash
# 所有 secret 泄露告警
gh api repos/{owner}/{repo}/secret-scanning/alerts \
  --jq '.[] | select(.state=="open") | {type: .secret_type, location: .locations_url}'
```

告警响应（**关键操作立即做完**）：

1. **先撤销**：在对应服务（npm、AWS、Stripe...）作废泄露的 secret
2. **再修复**：从 git history 里清除（可能需要 force push 或让上游 rotate）
3. **最后标记**：在 GitHub UI 将告警标记为 `resolved`

**不要**在撤销前 force push：secret 可能已被爬虫抓走，只靠 git history 清理不安全。

### Code Scanning（CodeQL 等）

```bash
gh api repos/{owner}/{repo}/code-scanning/alerts \
  --jq '.[] | select(.state=="open") | {rule: .rule.id, severity: .rule.security_severity_level, path: .most_recent_instance.location.path}'
```

处理优先级与 Dependabot 一致，但更偏代码层面（SQL 注入、XSS、不安全反序列化等）。

### 巡检节奏

**每周**（推荐周一）：

```bash
# 一次性看三类告警
echo "=== Dependabot ==="
gh api repos/OWNER/REPO/dependabot/alerts \
  --jq '[.[] | select(.state=="open")] | length'

echo "=== Secret scanning ==="
gh api repos/OWNER/REPO/secret-scanning/alerts \
  --jq '[.[] | select(.state=="open")] | length'

echo "=== Code scanning ==="
gh api repos/OWNER/REPO/code-scanning/alerts \
  --jq '[.[] | select(.state=="open")] | length'
```

记录在维护者的周报中，critical/high 数量单独标出。

### 回复 public 报告的安全问题

若有人在 public issue 里报了漏洞：

1. **立即** 引导到 private 渠道（Security Advisory 或邮箱）
2. 关闭 issue 并删除敏感细节
3. 在私有渠道跟进，准备 advisory 草稿

```markdown
感谢报告。为了保护用户，请通过 GitHub Security Advisory（
https://github.com/OWNER/REPO/security/advisories/new）或发邮件至
security@example.com 提交详情。本 issue 将被关闭以避免扩散。
```

## CI 与安全的联动

发布 workflow 失败需要结合 CI 与安全一起看：

- Workflow 在 `pnpm audit` 步骤失败 → 先看 Dependabot 告警
- Publish 被拒（`E403`）且 token 刚生成 → 检查是否有 secret scanning 告警提示 token 已泄露
- CI 在 `npm install` 阶段网络错误 → 区分 npm registry 抖动 vs CI 节点出口异常
