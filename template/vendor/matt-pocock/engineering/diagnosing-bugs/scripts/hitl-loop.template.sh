#!/usr/bin/env bash
# 人在回路（Human-in-the-loop）重现循环。
# 复制此文件，编辑下面的步骤，然后运行它。
# Agent 运行脚本；用户在其终端中按照提示操作。
#
# 用法：
#   bash hitl-loop.template.sh
#
# 两个辅助函数：
#   step "<指令>"          → 显示指令，等待按 Enter
#   capture VAR "<问题>"   → 显示问题，读取响应到 VAR
#
# 结束时，捕获的值以 KEY=VALUE 格式打印，供 agent 解析。

set -euo pipefail

step() {
  printf '\n>>> %s\n' "$1"
  read -r -p "    [Enter when done] " _
}

capture() {
  local var="$1" question="$2" answer
  printf '\n>>> %s\n' "$question"
  read -r -p "    > " answer
  printf -v "$var" '%s' "$answer"
}

# --- 在下方编辑 ---------------------------------------------------------

step "Open the app at http://localhost:3000 and sign in."

capture ERRORED "Click the 'Export' button. Did it throw an error? (y/n)"

capture ERROR_MSG "Paste the error message (or 'none'):"

# --- 在上方编辑 ---------------------------------------------------------

printf '\n--- Captured ---\n'
printf 'ERRORED=%s\n' "$ERRORED"
printf 'ERROR_MSG=%s\n' "$ERROR_MSG"
