# 模拟报告，不是用户电脑检测结果

windows、macos、linux 中的日期报告由 `tests/make_examples.py` 在隔离临时目录中生成。应用身份、系统元数据与磁盘容量为明确标注的模拟值；没有读取实际 Windows 注册表、macOS Applications 或用户真实 Home。

示例展示 PATH 重复/失效、多个 Java 命中、配置多处出现、Maven 本地唯一产物保护、Cargo 配置保护、少数旧缓存隔离候选、多个 Node 锁文件、版本 pin、下载目录里的源码位置风险和手动卸载步骤。

只提供报告、公开 JSON 和环境建议，不提供可拿去执行的示例审批或私密 plan。报告中的“候选”并没有被清理。扫描日期取生成脚本运行时，实际工作运行后会使用当时电脑的本地日期。

重新生成示例可在 work 根执行 `python3 tests/make_examples.py`。这是测试数据生成器，不是对真实电脑做卫生检测的入口。真实检测使用 `scripts/hygiene.py audit`。
