#!/usr/bin/env bash
# Print the next snapshot directory name under /workspace.
set -euo pipefail
BASE="${1:-/workspace}"
DAY="$(date +%F)"
CAND="${BASE}/grok-bot-team-${DAY}"
if [[ ! -e "$CAND" ]]; then
  printf '%s\n' "$CAND"
  exit 0
fi
HM="$(date +%H%M)"
CAND="${BASE}/grok-bot-team-${DAY}-${HM}"
n=2
while [[ -e "$CAND" ]]; do
  CAND="${BASE}/grok-bot-team-${DAY}-${HM}-${n}"
  n=$((n + 1))
done
printf '%s\n' "$CAND"
