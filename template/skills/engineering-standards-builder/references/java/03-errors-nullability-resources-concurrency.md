# Java：错误、空值、资源与并发

## Exception

- checked/unchecked 选择遵循模块现有 public contract；不要把所有异常统一包装为无信息 RuntimeException。
- 只在可恢复、映射协议或增加边界上下文时 catch；保留 cause。
- 领域错误、HTTP/RPC 映射、用户消息和日志分层。
- 不 catch `Throwable` 或吞掉中断/取消；确需边界捕获时恢复 interrupt 状态并安全终止。
- public API 文档化可观察失败和 retry/idempotency 语义。

## Nullability

- 在 module/package 层采用一致 annotation/analysis 体系；工具不一致时不要混合多套含义。
- 外部/反射/ORM 边界验证 null；内部模型优先用构造不变量和精确类型。
- 不通过到处 `Objects.requireNonNull` 掩盖边界设计问题。
- `Optional`、nullable annotation、空集合按语义使用，不用 sentinel 值。

## 资源与事务

- `AutoCloseable` 资源使用 try-with-resources 或结构化 owner；关注 close failure 和 suppressed exception。
- stream、JDBC、HTTP client response、file channel、executor 和临时文件有关闭策略。
- transaction 边界位于用例/服务边界，明确 rollback 和外部副作用顺序；不要跨慢网络调用长期持有事务。
- 锁、线程池和 scheduler 不在每次请求临时创建且忘记关闭。

## 并发

- 共享状态明确同步、不可变或 confinement 策略。
- executor/线程/虚拟线程由应用边界管理；虚拟线程只有在项目 JDK、框架和阻塞模型适用时生成规则。
- Future/CompletionStage 定义失败、超时、取消和执行器；不在 common pool 隐式执行阻塞工作。
- 中断是取消信号，不静默清除。
- 并发测试覆盖 race、超时、重复提交和 shutdown。

## 官方依据

- [Java try-with-resources](https://docs.oracle.com/javase/tutorial/essential/exceptions/tryResourceClose.html)
- [Java concurrency APIs](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/concurrent/package-summary.html)
