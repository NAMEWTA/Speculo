#!/usr/bin/env bash
# Print paths that look like they contain secrets. Does not print the secrets.
set -euo pipefail
ROOT="${1:-.}"
if [[ ! -d "$ROOT" ]]; then
  echo "usage: scrub.sh /workspace/grok-bot-team-YYYY-MM-DD" >&2
  exit 2
fi
rg_bin="$(command -v rg || true)"
pattern='(sk-[A-Za-z0-9_-]{10,}|xoxb-|ghp_|github_pat_|AKIA[0-9A-Z]{8,}|Bearer [A-Za-z0-9._-]{12,}|BEGIN [A-Z ]*PRIVATE KEY|refresh_token|api[_-]?key\s*[:=])'
if [[ -n "$rg_bin" ]]; then
  "$rg_bin" -l -I -n --hidden -g '!.git' -e "$pattern" "$ROOT" || true
else
  grep -RIl -E "$pattern" "$ROOT" || true
fi
echo "# also skip these filenames if present"
find "$ROOT" \( -name '.env' -o -name 'auth.json' -o -name '*cookie*' -o -name 'credentials.json' \) -print
