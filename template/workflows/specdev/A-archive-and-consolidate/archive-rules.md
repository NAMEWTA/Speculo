# 归档规则

归档是破坏性目录移动——将已完成变更从 `changes/` 移动到 `archive/`。调用方必须先展示完整计划并取得明确确认，方可执行。

## 共同预检

对每个候选 change 执行以下预检，**任一项失败则整批阻塞**（批量原子性）：

1. **名称格式**：change 名称符合 `^\d{4}-\d{2}-\d{2}-[a-z0-9]+(-[a-z0-9]+)*$`（`YYYY-MM-DD-<kebab-topic>`）。不含日期前缀的遗留 change 标注警告但不阻塞，从文件修改时间推断 YYYY-MM。
2. **状态可解析**：`.status.json` 可解析，`change_status` 字段存在且值为 `completed`。
3. **源存在**：源目录 `<Path>{roots.state}/specdev/changes/{change}/</Path>` 真实存在。
4. **目标不冲突**：目标目录 `<Path>{roots.state}/specdev/archive/<YYYY-MM>/<change>/</Path>` 不存在（YYYY-MM 从 change 名称提取）。
5. **状态一致**：workflow `<Path>{roots.state}/specdev/status.json</Path>` 的 `active` 数组中包含该 change（或不包含但 change 自身状态为 completed——此时记录警告但不阻塞）。
6. **worktree 已合并**：若使用了 worktree 隔离模式，确认已合并回目标分支并清理；未合并则记录 `blocked`。

## 归档移动步骤

确认执行后，按以下顺序操作：

1. 创建 `<Path>{roots.state}/specdev/archive/<YYYY-MM>/</Path>` 月目录（如不存在）。
2. 将 `<Path>{roots.state}/specdev/changes/{change}/</Path>` 整个目录原子移动到 `<Path>{roots.state}/specdev/archive/<YYYY-MM>/<change>/</Path>`。使用 mv/rename，不用复制后删除。
3. 从 `<Path>{roots.state}/specdev/status.json</Path>` 的 `active` 数组中移除该 change。
4. 更新已移动的 `.status.json`：
   - `change_status: "archived"`
   - `archived: true`
   - `archive_path`: 指向归档位置的相对路径
5. 若 `changes/` 目录变空，保留空目录和 `.gitkeep`。

## 冲突处理

| 冲突 | 处理 |
|------|------|
| 目标已存在 | `blocked`——永不覆盖归档；需手动解决 |
| `.status.json` 不可解析或格式错误 | `blocked`——整批阻塞 |
| change 不在 `status.json#active` 中且自身状态非 completed | `blocked`——状态不一致 |
| change 名称不含日期前缀（遗留） | 警告但不阻塞；从文件修改时间推断 YYYY-MM |
| 归档月目录创建失败（权限） | `blocked`——报告具体错误 |

## 重读验证

归档执行后逐项验证：

1. 源路径不存在（移动成功）。
2. 目标路径完整存在，内容与移动前一致。
3. `<Path>{roots.state}/specdev/status.json</Path>` 的 `active` 数组已移除该 change。
4. 归档目录 `.status.json` 字段一致（`change_status: archived`、`archived: true`、`archive_path` 正确）。
5. 验证失败时报告已完成/未完成清单，不猜测成功。

**完成标准**：源不存在、目标完整、active 索引已移除、归档状态字段一致。
