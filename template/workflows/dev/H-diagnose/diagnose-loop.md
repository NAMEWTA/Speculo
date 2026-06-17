# Diagnose Loop Phase

## 输入

- 用户描述的失败现象、日志、trace、性能症状或失败测试
- 可运行的测试、脚本、服务、CLI 或浏览器自动化
- `H-diagnose.md` 中的内置诊断指引（含独立使用协议与自初始化步骤）
- 同目录 `diagnose-guide.md`（含独立诊断时的信息采集协议）

### 独立进入时的上下文自采集

若无上游工作流产物（PRD、decision-log 等），在进入反馈循环构建前，按 `diagnose-guide.md` 的「独立诊断时的信息采集」执行以下快速自采集，**不要求用户先执行其他工作流**：

1. `git log --oneline -30` + 搜索错误关键符号 → 定位相关代码区域
2. 读取问题模块及其测试 → 理解预期行为
3. 检查 `speculo/.speculo/.config/` 下的项目规则与 ADR → 了解约束
4. 仅在代码库探索穷尽后，使用 `AskUserQuestion` 向用户索取无法从仓库获取的信息（复现环境、日志文件等）

## 产物

- `speculo/.speculo/dev/<change>/diagnosis.md`，由 `../_templates/diagnosis-template.md` 填写

## 填写引导

1. 遵循 `H-diagnose.md` 的内置诊断指引，并按需读取 `diagnose-guide.md`。
2. 先建立快速、确定、可信的反馈循环。
3. 没有反馈循环时停止假设阶段，记录已尝试方法和需要用户提供的材料。
4. 复现后提出 3-5 个排序假设，并把每个假设写成可证伪预测。
5. 插桩必须映射到具体预测，并使用可清理的唯一调试标记。
6. 性能回退先建立基线测量，再二分或假设检验；先测量，后修复。

## 边界

- 不在未复现或无可信反馈循环时进入修复。
- 不把无关日志批量加入代码。
- 不默认保留一次性调试脚本。

## 完成准则

- `diagnosis.md` 无残留 `[TODO:]`
- `.status.json` 已记录 `feedback_loop` 和 `hypothesis_status`
