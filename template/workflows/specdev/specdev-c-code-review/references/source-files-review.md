# 本地文件只读审查

仅用于明确指定文件的只读请求，不替代用户要求的 PR、commit、range 或 baseline 比较，也不冒充 I 的最终 diff 审查。

1. 用下列只读调用固定 projectRoot、用户指定路径和实际原始字节摘要，多个文件重复 `--file`。它不调用 Git、不创建状态，拒绝空范围、重复文件/别名、非文件及越界路径；内部符号链接保留所选路径和实际目标。读取必要直接调用方、测试与适用标准，并把扩展范围及理由列入输入。若文件在审查中变化，重验受影响结论，不沿用原快照结果。无 Git 时如实说明没有 commit/log，不能借外层仓库或伪造 SHA。
2. 将 `review_mode: source-files`、`source_snapshot`（项目相对路径及 SHA256）、规范/标准来源、review_context 和真实独立 reviewer 身份与派遣方式交给 <Path>{roots.workflows}/specdev/common/skills/code-review/SKILL.md</Path>。来源发现将 commit 引用步骤记为 not-applicable；其余来源与独立审查要求照常。
3. 规范缺失只阻塞依赖规范的判断，标准轴独立进行；按原规则确认规范缺失后才标记 skipped:no-spec。工具或独立 reviewer 缺失如实报告，不得用实现者自审宣称双轴已完成。
4. 返回固定文件/摘要、两轴结果、实际验证、限制和下一步。会话结果不创建 change、CR、配置或状态文件，不改源文件、永久知识或远程系统。若后来要求正式 diff 审查，转回 C 的真实固定点分支。

本分支的文件摘要只证明输入未变，不证明语义审查质量、用户授权或整个 change 完成。

```bash
node <Path>{roots.workflows}/specdev/common/tools/validate-specdev.mjs</Path> --review-scope --repo <project-root> --mode source-files --file <project-relative-file>
```
