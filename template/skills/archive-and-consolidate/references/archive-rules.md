# Archive Rules

归档是破坏性目录移动，调用方必须先展示完整计划并取得明确确认。

## 共同预检

对每个候选 change 执行：

- change 名称符合日期 kebab 规则：`^\d{4}-\d{2}-\d{2}-[a-z0-9]+(-[a-z0-9]+)*$`（`YYYY-MM-DD-<kebab-topic>`）。格式校验来源与路径解析步骤相同；已有不带日期前缀的历史 change 标注为遗留，不阻塞但记录警告。
- `.status.json` 可解析，`change_status` 字段存在且值为 `completed`。
- 源位于 `changes_root/<change>` 且真实存在。
- 目标位于 `archive_root/<YYYY-MM>/<change>`（YYYY-MM 从 change 名称提取），目标目录不存在。
- Workflow `status.json` 与 change 状态一致：change 出现在 `active` 数组中。
- 若 worktree 模式：已合并回目标分支并清理；未合并则记录 `blocked`。
- **任一预检失败阻塞整批操作**（批量原子性）。

## 归档移动步骤

1. 创建 `archive_root/<YYYY-MM>/` 月目录（如不存在）。
2. 将 `changes_root/<change>/` 整个目录移动到 `archive_root/<YYYY-MM>/<change>/`。使用原子移动（mv/rename），不用复制后删除。
3. 从 workflow `status.json#active` 数组中移除该 change 条目。
4. 更新已移动的 `.status.json`：
   - `change_status: archived`
   - `archived: true`
   - `archive_path`: 项目根相对路径，指向归档位置
5. 若 `changes_root/` 目录变空，保留空目录和 `.gitkeep`（如存在）。

## 冲突处理

| 冲突 | 处理 |
|------|------|
| 目标已存在 | `blocked`——永不覆盖归档；需手动解决 |
| `.status.json` 不可解析或格式错误 | `blocked`——整批阻塞 |
| change 不在 `status.json#active` 中 | `blocked`——状态不一致 |
| change 名称不含日期前缀（遗留） | 警告但不阻塞；从文件修改时间推断 YYYY-MM |
| 归档月目录创建失败（权限） | `blocked`——报告具体错误 |

## 重读验证

归档执行后逐项验证：

1. 源路径不存在（移动成功）。
2. 目标路径完整存在，内容与移动前一致。
3. Workflow `status.json#active` 已移除该 change。
4. 归档目录 `.status.json` 字段一致（`change_status: archived`、`archived: true`、`archive_path` 正确）。
5. 验证失败时报告已完成/未完成清单，不猜测成功。

完成标准：源不存在、目标完整、active 索引已移除、归档状态字段一致。
