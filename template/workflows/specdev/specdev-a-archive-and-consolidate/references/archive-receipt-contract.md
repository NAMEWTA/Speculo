# 移动结果回读合同

只在 confirmed 归档实际需要移动时读取；独立审计、无候选、未获批计划不创建此证据。总回执仍由原调用方唯一持有，不新增业务状态或第二份报告。

直接 A 默认在原 <Path>{roots.state}/specdev/changes/{change}/archive-receipt.md</Path> 使用唯一 `<a id="archive-{change}"></a>` 段。Command 的总报告拥有对应对象段时，在 change README 添加唯一导航：

```markdown
## Archive Receipt

Receipt: project:<项目内报告相对路径>#archive-<change>
```

`Receipt` 的 locator 可为 `change:<对象内相对路径>#<anchor>` 或 `project:<项目内相对路径>#<anchor>`；默认是 `change:archive-receipt.md#archive-{change}`。对象内 locator 随对象移动，project locator 始终从明确 projectRoot 解析；不得从方法根、当前工作目录或时间猜测。只导航，不复制回执。

## 对象结果段

唯一 anchor 下记录这些真实字段（字段名固定，值不得保留占位）：

```markdown
<a id="archive-<change>"></a>
## 对象移动结果

Change: <稳定 change 名称>
Owner: <原完成/取消 owner>
Operation: <原操作唯一标识或会话 locator>
Approval: <change:或project:原具体批准定位，可带anchor>
Approval-SHA256: <批准所在整文件原始字节摘要>
Source: changes/<change>
Target: changes/archive/<change>
Result: moved
Integrity: <change:或project:实际移动清单JSON文件>
Integrity-SHA256: <清单整文件原始字节摘要>
Time: <实际 ISO-8601 时间>
```

Approval 指向真实请求/批准的不可变记录，先核对目标、动作、范围和 owner，字段和摘要本身不创造授权。Source/Target 是 SpecDev 数据根内相对路径。原批准文件不能使用还会追加日志的总回执；回执引用它。

Integrity JSON 为 `{ "entries": [...] }`，每项有对象内 `path`、`type`（`file | directory | symlink`）、整数权限位 `mode`；file 另有原始字节 `sha256`，symlink 另有原始 `target`。完整覆盖 change 其他路径，仅排除清单自身和本次原可追加回执，不能借排除遗漏业务文件。移动前保存实际清单；目标回读验证文件、目录、模式和链接不变，不跟随链接扩大移动范围。

A7 实际移动后把 Result 记为 moved，运行 `--stage archived` 及其他适用消费者，允许原 owner 按原批准补本次验证和回执。此阶段未封存。全部检查通过后 A8 在原段记 `Result: verified`，运行 `--stage archived --sealed` 后才宣布封存；失败保留 moved 与真实恢复点，不写 verified。封存后回执和历史正文一起只读，后续纠错使用外部补充记录。
