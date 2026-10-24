# 会话来源与回读

本协议用于 R 的日常报告与汇总复核。报告不是原始事件；不能用多次转述证明问题多次发生。

## 登记与范围

RETRO v3 的 sessions 为本次实际使用的会话表。每项包含 id（S-001）、host、真实 session_id、locator、captured_until、availability（available/unavailable/unknown）。采集截止点在生成本报告前固定；不把本报告或汇总生成的结论循环当作一手证据。没有可识别会话时保留 unknown 与 null，不编造 ID；仍可使用真实项目/change 证据。

source 的 kind=session 时，locator 为 session:<host>:<session_id>，session_ref 指向 sessions.id，anchor 记录 start_line/end_line、原事件 timestamp，以及可用的 event_id。非会话文件也可通过 session_ref/anchor 说明本会话如何产生它，但文件证据与会话证据不能互相冒充。每项保留可回读原文快照、quote 和 sha256；摘要校验不证明因果或宿主真实性。

一份报告可含多会话；同一会话可被多份报告引用。按宿主、session ID 和事件锚点合并重复事件，必要时核对重叠区间及原文；同一会话中的不同事件仍分别计数。fork 已知存在复制历史时核对 parent 来源，不能将复制的祖先事件重复计数。

## Codex 只读定位

先使用当前宿主提供的真实 thread/session ID，用户明确历史会话则使用其 ID。解析实际 CODEX_HOME（未设置时为用户的 .codex），不写死用户绝对路径。用 <Path>{roots.workflows}/specdev/specdev-r-retro/scripts/session-evidence.mjs</Path>：

```bash
node <session-tool> locate --log-root <codex-data-root> --session <actual-id> --repo <project>
node <session-tool> read --log-root <codex-data-root> --session <actual-id> --repo <project> --locator <host-relative-jsonl> --from-line <first> --to-line <last> --cutoff <ISO-8601>
```

定位只在 sessions/archived_sessions 中匹配指定 ID，并核对 session_meta 的 ID 和项目。多候选不自动选最新；按时间/来源消歧。read 必须传明确区间和截止点，默认输出上限 65536 字节；结果包含实际覆盖、原始 JSONL 行与片段摘要。退出 2 表示区间/输出不完整，不能写成完整核验。路径越界、链接、身份不符、错误 JSONL 或无时间事件停止该片段读取。校验器只检查报告内来源结构，不自动根据报告字符串读取外部路径。

日志可追加，摘要绑定提取片段而非整个仍在增长的文件。日志移动时以真实会话 ID 重新定位；未找到时记录 unavailable，使用已保存片段并声明缺口，不新建假的原日志。不将会话全量复制进仓库；凭据和无关私人资料不保存，脱敏必须标明且不能冒充未修改原文。

## 汇总中的深挖

先固定报告和发现，再按问题回读引用事件与相邻上下文；因果缺口、相反证据或高影响决定需要时扩大至该指定会话的完整相关过程。仅明确需要时跨会话检索，不默认扫描所有历史。保留“永久条目 → RETRO/F-ID → E-ID → 会话及锚点”的链；已封存报告不回写，来源失效记录在新报告/维护回执。

其他宿主沿同样的 ID、定位、截止点和片段合同；无文件访问时使用用户提供的真实导出并说明限制，不声称访问了本机日志。
