#!/usr/bin/env bash
# Human-in-the-loop reproduction loop. Copy and edit the steps, then let the
# Agent run the script while the user performs the prompted actions.

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

# Replace these example steps with the exact reproduction.
step "Open the affected screen and prepare the failing action."
capture ERRORED "Run the action. Did the exact symptom occur? (y/n)"
capture ERROR_MSG "Paste the exact error or observed output (or 'none'):"

printf '\n--- Captured ---\n'
printf 'ERRORED=%s\n' "$ERRORED"
printf 'ERROR_MSG=%s\n' "$ERROR_MSG"
