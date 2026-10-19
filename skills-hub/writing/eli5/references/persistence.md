# 保存与校验补充合同

保存、恢复、写入失败与无工具导出遵守[核心合同](../SKILL.md#8-保存与恢复核心合同)；本文件仅补充校验细节，不额外授予权限。所有示例为合成数据，不是用户进度。

## 状态一致性

status/phase/mode的取值与对应关系见核心合同；除blocked/completed外，其余phase属于active。普通授课用teaching，准备中不表示已发布。时间用带时区的ISO 8601字符串。

current_artifact在preparing/blocked可为null，其余阶段需有合法eli5/相对路径且列入owned_artifacts。owned_artifacts不含共享source.md或LOG.md全文件所有权；公共文件只更新自己条目。路径遵守核心合同的相对路径与越界限制。

suspended_artifacts和abandoned_artifacts是可选的路径数组，均须由eli5拥有，不能交叉、不能与当前活动工件混淆。suspended表示未放弃的待继续批次；非空时不能标completed。abandoned表示用户明确放弃，原文仍留存，不能自动恢复或伪装成已提交。

全局active可含多个主题或其他能力。当前change的eli5未结束时应有且仅有一个索引条目，并与change状态的phase/updated_at一致；完成后该条目不存在。单change不能有另一个活动写者。校验器只读取，不负责合并、锁或更新这些文件。

## 执行证据文件格式

使用Markdown加YAML frontmatter，`test_evidence`指向它：

```yaml
record_type: execution
executed_at: '2026-10-16T16:00:00+08:00'
environment: '真实环境与版本；不得照抄示例'
steps: '实际执行的命令或可重现步骤'
inputs: '真实测试输入或可定位文件'
observations: '真实输出、错误或观察；不能仅写预期'
limitations: '未覆盖的条件与不能推广之处'
```

正文附必要原始输出及脱敏说明。未执行的计划用record_type: design，不能成为tested的执行证据。格式符合execution依然不能证明记录真实、实验充分或结果成功；运行失败也是实际执行，结论须如实说明。

## 关闭答卷的原文保护

按[tutor合同](../SKILL.md#tutor)保存完整ready快照并核对候选前缀字节，不能只比较答案摘要；保留元数据、Q/A、空白、Unicode和换行。

学生原文中出现“Response: ready”或“## Teaching”时，用代码围栏明确它是答案内容，并在source中保留其原始输入。代码围栏中的文本不能被当作协议。全空白ready不能通过；是否真的由用户作答与明确提交仍要读取原始消息，不能由格式脚本认证。

## CLI示例

教学不依赖Python；可选校验器需Python 3.10+、PyYAML 6.x，依赖见[requirements.txt](../scripts/requirements.txt)，不自动安装或联网。

命令行参数可以是实际绝对路径；工件内部路径字段仍必须相对change。

```bash
python scripts/validate.py --skill-dir /actual/eli5
python scripts/validate.py --artifact /actual/change/eli5/lessons/LESSON-001-topic.md
python scripts/validate.py --artifact /actual/closed.md --ready-snapshot /actual/ready.md
python scripts/validate.py --question-map /actual/change/eli5/question-map.json --change-root /actual/change
python scripts/validate.py --state /actual/change/.status.json --global-status /actual/ai-workspace/status.json --change-root /actual/change
```

关闭explore同时传--question-map；要核对文件存在性另传--change-root。工具输出`not_checked`列出未执行的检查；`ok=true`只表示所选结构检查未发现错误。它不代表文件已经发布、没有并发冲突或用户已经掌握。

没有写入权限时继续安全的独立讲解；并发冲突、部分写入失败与完整FILE bundle导出按核心合同处理，不推进未发布状态。
