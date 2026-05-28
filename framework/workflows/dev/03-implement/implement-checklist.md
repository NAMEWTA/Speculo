# Implement Checklist — 实现完成度检查清单

本清单在 Execute phase 提交前与提交后各跑一次。AI 在执行 `phase=execute` 时读本文件作为机械化自查表。

## 一、通用清单（每个任务必跑）

- [ ] 实际改动文件与 `tasks/T0N.md` 的 `write_files` 一致（`git diff --name-only HEAD` 比对）
- [ ] verify 命令退出码 0，输出已贴入 `tasks/T0N.md` 或 `implement.md`
- [ ] 代码改动伴随测试改动（新增功能 → 新测试；bug 修复 → 回归测试）
- [ ] 引用的外部库/字段在文档或代码中实际存在（grep 验证）
- [ ] 沿用已有抽象，未重复造同类轮子（grep 验证）
- [ ] 与 `../../../.speculo/.config/RULES.md` 无冲突，违规需在 implement.md 显式声明并经用户审批
- [ ] commit message 符合下方规范

## 二、提交规范

### 基本格式

```
<type>(<scope>): <subject>

<body — 必要时解释为何，避免重复 diff 可见的"做了什么">
```

- `<type>`：`feat` / `fix` / `refactor` / `test` / `docs` / `chore` 之一
- `<scope>`：本 change 的标识（如 `T01-add-auth-middleware`）
- `<subject>`：祈使句，首字母小写不含句号

### 可选 Git Trailer（项目可在 `.speculo/.config/CONVENTIONS.md` 启用）

```
Constraint: <塑造本决策的活跃约束>
Rejected: <考虑过但拒绝的方案> | <拒绝理由>
Directive: <对未来修改者的警告或指令>
Confidence: high | medium | low
Scope-risk: narrow | moderate | broad
Not-tested: <未被测试覆盖的边缘场景>
```

琐碎提交（拼写、格式）可跳过 Trailer。

## 三、破坏性变更高门槛清单（触发条件任一即激活）

触发条件：
- 删除 ≥5 行代码
- 删除 / 重命名公共导出（API、函数、类型、组件）
- 删除文件
- 改变对外 API 接口（参数、返回、错误码）

激活后必做：
- [ ] grep 项目内引用图：`grep -rn '<目标名>'` 全仓库，列出所有引用点
- [ ] 反问用户：列出引用点 + 拟改动方案 + 影响评估，等待用户显式确认
- [ ] 添加回归测试覆盖被改动接口的既有用法
- [ ] commit message 使用 `BREAKING CHANGE: ...` footer 或 `!` 标记
- [ ] 在 `implement.md` "关键改动说明" 段单独列出本破坏性变更与迁移路径

## 四、Schema / 数据库变更清单（触发条件：改 ORM / migration / schema 文件即激活）

激活后必做：
- [ ] 同次提交附带迁移文件（不允许"下次再补"）
- [ ] 列出 schema diff（before / after 字段对照表）
- [ ] 生成**可逆**迁移：含 up 与 down 两个方向
- [ ] 验证 down 迁移在本地可执行（贴出执行输出）
- [ ] 检测数据库凭据未硬编码（grep 验证不含明文 password / token）
- [ ] 在 `implement.md` "关键改动说明" 段写明 schema 影响与回滚步骤

## 五、提交前 diff 边界 verify（强制）

```bash
git diff --name-only HEAD
```

输出的文件列表必须是以下两者之一：
- 完全落在 `tasks/T0N.md` 的 `write_files` 范围内
- 越界文件已在 `implement.md` 文末"## 计划外改动声明"段说明（含原因 + 用户审批）

二者皆不满足 → 回滚越界改动后再提交。

## 六、完成准则（本清单本身的机器可验证退出）

- 上方每个"通用清单"勾选项已在 `implement.md` "完成度检查" 段勾选或显式标注 N/A + 理由
- 若 `breaking_changes=true`：第三节清单全部勾选
- 若 schema 变更：第四节清单全部勾选
- `git diff --name-only HEAD` 已执行且越界检查通过
