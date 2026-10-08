#!/bin/sh
# Read-only Linux account and root inspection. Never sudo, mkdir or install here.
set -eu
[ "$(uname -s)" = Linux ] || { echo 'Linux discovery adapter required' >&2; exit 2; }
emit() { printf '%s=' "$1"; printf '%s' "$2" | od -An -v -tx1 | tr -d ' \n'; printf '\n'; }
account=$(id -un)
uid=$(id -u)
if command -v getent >/dev/null 2>&1; then
  record=$(getent passwd "$uid")
else
  record=$(awk -F: -v uid="$uid" '$3 == uid { print }' /etc/passwd)
fi
[ "$(printf '%s\n' "$record" | wc -l | tr -d ' ')" = 1 ] || { echo 'Ambiguous account database entry' >&2; exit 2; }
[ "$(printf '%s' "$record" | cut -d: -f1)" = "$account" ] || { echo 'Account database mismatch' >&2; exit 2; }
home=$(printf '%s' "$record" | cut -d: -f6)
case "$home" in /*) ;; *) echo 'Account home is not absolute' >&2; exit 2;; esac
machine=''
for p in /etc/machine-id /var/lib/dbus/machine-id; do
  if [ -r "$p" ]; then machine=$(cat "$p"); [ -z "$machine" ] || break; fi
done
[ -n "$machine" ] || { echo 'Stable machine identity unavailable' >&2; exit 2; }
node=$(command -v node 2>/dev/null || true)
version=''
if [ -n "$node" ]; then version=$("$node" --version 2>/dev/null || true); fi
emit machine "$machine"
emit system Linux
emit username "$account"
emit uid "$uid"
emit home "$home"
emit node "$node"
emit node_version "$version"
root=${1-}
if [ -n "$root" ]; then
  cursor=$root
  while :; do
    [ ! -L "$cursor" ] || { echo 'Symlink root traversal rejected' >&2; exit 2; }
    if [ -e "$cursor" ] && [ ! -d "$cursor" ]; then echo 'Root ancestor is not a directory' >&2; exit 2; fi
    [ "$cursor" != / ] || break
    cursor=$(dirname -- "$cursor")
  done
  cursor=$root
  while [ ! -e "$cursor" ]; do cursor=$(dirname -- "$cursor"); done
  writable=false
  if [ -w "$cursor" ] && [ -x "$cursor" ]; then writable=true; fi
  present=false
  nonempty=false
  owner=''
  if [ -d "$root" ]; then
    present=true
    [ -r "$root" ] || { echo 'Selected root cannot be inspected by the login account' >&2; exit 2; }
    entries=$(find "$root" -mindepth 1 -maxdepth 1 -print -quit) || { echo 'Selected root inspection failed' >&2; exit 2; }
    if [ -n "$entries" ]; then nonempty=true; fi
    for rel in .ops-host.json _host _runtime docs knowledge README.md DEPLOYMENTS.md; do
      [ ! -L "$root/$rel" ] || { echo 'Managed path is a symlink' >&2; exit 2; }
    done
    if [ -e "$root/.ops-host.json" ]; then
      [ -f "$root/.ops-host.json" ] && [ "$(wc -c < "$root/.ops-host.json")" -le 16384 ] || { echo 'Invalid root owner marker' >&2; exit 2; }
      owner=$(cat "$root/.ops-host.json")
    fi
  fi
  emit root_exists "$present"
  emit root_writable "$writable"
  emit root_nonempty "$nonempty"
  emit root_owner "$owner"
fi
