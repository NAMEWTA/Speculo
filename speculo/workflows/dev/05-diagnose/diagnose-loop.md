# Diagnose Loop Phase

## 输入

- 用户描述的失败现象、日志、trace、性能症状或失败测试
- 可运行的测试、脚本、服务、CLI 或浏览器自动化
- Skill wrapper：`../../../skills/diagnose/SKILL.md`

## 产物

- `diagnosis.md`，由 `../_templates/diagnosis-template.md` 填写

## 填写引导

1. 读取 `../../../skills/diagnose/SKILL.md`。
2. 先建立快速、确定、可信的反馈循环。
3. 没有反馈循环时停止假设阶段，记录已尝试方法和需要用户提供的材料。
4. 复现后提出 3-5 个排序假设，并把每个假设写成可证伪预测。
5. 插桩必须映射到具体预测，并使用可清理的唯一调试标记。

## 边界

- 不在未复现或无可信反馈循环时进入修复。
- 不把无关日志批量加入代码。
- 不默认保留一次性调试脚本。

## 完成准则

- `diagnosis.md` 无残留 `[TODO:]`
- `.status.json` 已记录 `feedback_loop` 和 `hypothesis_status`
