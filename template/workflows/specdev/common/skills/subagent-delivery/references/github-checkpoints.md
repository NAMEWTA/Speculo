# GitHub Checkpoint

GitHub 仓库、Issue、PR 或分支是源码事实来源时加载。所有派单、源码包、修正和验收绑定精确 commit SHA，不使用浮动的“最新代码”。

## 建立基线

1. 解析 repository、目标 branch、remote、访问身份和获授权写入目标；
2. 使用非 shallow clone，或证明现有 clone 具备任务所需历史；
3. 读取项目 Agent 指令、构建清单、锁文件、CI 和相关源码/测试；
4. 记录 local HEAD、tracking ref、远程 SHA 和工作区状态；
5. 工作区有受保护改动时使用独立 worktree 或经批准的 checkpoint，不覆盖现有改动。

```text
REPO_CHECKPOINT repository=<owner/repo> branch=<branch>
local_head=<sha> tracking_head=<sha> remote_head=<sha>
working_tree=<clean|protected-changes> kind=<baseline|local|pushed|verified>
```

## 漂移与远程动作

远程推进后先比较旧、新 SHA 的改动路径和影响，再决定重放、重派或拒绝旧交付。commit、push、PR、merge 各自只在授权矩阵允许时执行；远程写入后重新读取远程 SHA，并在本地与远程一致时建立下一 checkpoint。

**完成标准**：每轮交付对应唯一 SHA；远程漂移和受保护改动不会静默改变基线。

