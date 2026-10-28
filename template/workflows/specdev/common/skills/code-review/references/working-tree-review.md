# 未提交工作副本审查

I 的 Ticket 或 Direct Spec 未提交交付使用本分支；current 与 change worktree 均适用。它覆盖实际交付差异，不以 HEAD 代替未提交内容；C 的 source-files 仍只承诺指定文件阅读。

1. 停止相关 writer，回读实施前 Git 基线、原有 dirty 改动、当前授权写集与实际变更。确认项目 Git 根；无已存在的基线、冲突 index、不可读取文件或不支持的子模块时保持未验证，不伪造提交。
2. 调用以下只读工具。`--file` 可重复，使用已核对的完整交付文件清单，包含删除路径；不传时覆盖相对基线的全部实际变化和非忽略未跟踪文件。只读冻结不创建 commit、不暂存、不修改 index。
3. 保存完整返回值，审查 `working_snapshot` 的新增/修改/删除/类型及权限变化。`tracked_diff_command` 只展示 Git 已跟踪部分；新增文件读取快照对应实际字节，删除读取基线对象，二进制和符号链接分别检查实际格式/链接语义。不得因为 diff 为空忽略未跟踪新增。
4. 使用显式范围时回读 `excluded_paths`，在输入 exclusions 中说明原有用户改动、报告等排除依据；实现范围不能排除。审查输入、原报告和 Evidence 本身放在范围外，避免自引用。原有改动不自动成为本轮可写内容。
5. 按原风险策略由主 Agent 自查或交给真正独立 reviewer；结束及完成声明前重跑相同选择并核对全部范围内字节、模式、基线和 index。显式范围外新增的报告不使代码审查失效，但 Lead 仍须核实没有遗漏实现。发生范围内漂移、规范/标准/指令变化或新实现文件，重建输入并补审。

```bash
node <Path>{roots.workflows}/specdev/common/tools/validate-specdev.mjs</Path> --review-scope --repo <project-root> --mode working-tree --base <implementation-baseline-sha> --file <project-relative-file>
```

输出的 observed_head 只记录观察到的 Git HEAD，working_snapshot/input_sha256 才标识未提交内容。无法验证的二进制、生成物或外部环境如实报告，不宣称两轴或整个 change 已完成。

