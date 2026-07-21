---
id: archive-and-consolidate
type: command
name: Archive and Consolidate
description: >
  归档已完成 change，从归档中提取知识合并到 _state/ 知识 store（ADR/、CONTEXT.md、DOMAIN.md、LESSONS.md、RULES.md），
  并清理过时/重复知识。默认 dry-run，需用户确认后执行。取代 finalize 和 knowledge-prune 的归档与清理能力。
keywords: [archive, consolidate, knowledge, cleanup, adr, 归档, 知识合并, 清理, 收尾]
---

# Archive and Consolidate 命令

## 报告

统一写入：`speculo/.speculo/commands/archive-and-consolidate/<YYYY-MM-DD>-<workflow>-<scope>[-NN].md`。

报告必须记录：`mode`（dry-run 或 executed）、选中的 workflow、归档计划、合并计划、清理候选、用户确认状态和最终结果。

## 模式

### archive-single

归档并合并单个已完成 change 的知识。

1. 读取 `../skills/archive-and-consolidate/SKILL.md`，执行路径解析（Step 0），解析 `speculo/config.json`（不存在时静默降级）。
2. 选择一个 `change_status: completed` 的 change。
3. 执行 Step 1-5：扫描 stores、扫描 change、生成归档计划、生成合并计划、生成清理候选。
4. 默认 dry-run：将完整计划写入报告文件，展示摘要并等待用户显式确认。
5. 确认后以 mode=`confirmed` 执行 Step 7-8：归档移动、合并写入、清理、重读验证。
6. 执行结果作为补遗追加到原报告。

### archive-batch

批量归档并合并所有已完成 change 的知识。

1. 读取 `../skills/archive-and-consolidate/SKILL.md`，执行路径解析。
2. 扫描目标 workflow 下所有 `change_status: completed` 的 change。不接受 active 或 broken 状态。
3. 执行 Step 1-5：扫描 stores、逐 change 扫描、批量预检、合并计划、清理候选。
4. 批量原子性：任一预检失败阻塞整批。
5. 默认 dry-run：将完整计划写入报告文件，展示摘要并等待用户显式确认。
6. 确认后逐项执行：归档移动 → 合并写入 → 清理 → 重读验证。失败时报告已完成/未完成清单。

## 完成标准

- 报告文件位于 command 专属目录，scope 可从文件名判断。
- 所有状态、目录和索引变更均已重读验证。
- 未确认或 mode=`dry-run` 时无任何文件修改。
- 合并写入的每条知识有来源 change 标注。
- 每个清理候选有分类和理由。
