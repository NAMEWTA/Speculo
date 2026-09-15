#!/bin/sh
# First-stage controller/target bootstrap: POSIX shell only, no Python prerequisite.
set -eu
case "${1:---probe}" in
  --probe)
    printf 'OPS bootstrap inventory (read-only)\n'
    uname -srm
    for tool in ssh git node npm uv python3 python java docker volta curl wget sha256sum shasum; do
      if command -v "$tool" >/dev/null 2>&1; then printf '%s=%s\n' "$tool" "$(command -v "$tool")"; else printf '%s=missing\n' "$tool"; fi
    done
    printf 'No software installed. Review a version-pinned OS/package-manager installer before --apply.\n'
    ;;
  --apply)
    # Explicit file+digest approval, no curl|sh, eval, hidden downloads or "latest" installers.
    [ "$#" -eq 4 ] || { echo 'usage: bootstrap.sh --apply reviewed-script.sh SHA256 I-APPROVE-THIS-BOOTSTRAP' >&2; exit 2; }
    [ "$4" = 'I-APPROVE-THIS-BOOTSTRAP' ] || exit 2
    [ -f "$2" ] && [ ! -L "$2" ] || { echo 'Installer must be a reviewed regular file' >&2; exit 2; }
    if command -v sha256sum >/dev/null 2>&1; then actual=$(sha256sum "$2" | cut -d' ' -f1)
    elif command -v shasum >/dev/null 2>&1; then actual=$(shasum -a 256 "$2" | cut -d' ' -f1)
    else echo 'No SHA-256 implementation; bootstrap blocked' >&2; exit 2; fi
    [ "$actual" = "$3" ] || { echo 'Installer changed after review' >&2; exit 2; }
    printf 'Executing explicitly approved bootstrap sha256=%s\n' "$actual"
    /bin/sh "$2"
    command -v node >/dev/null 2>&1 || { echo 'Node still missing; not completed' >&2; exit 2; }
    ;;
  *) echo 'usage: bootstrap.sh --probe | --apply FILE SHA256 I-APPROVE-THIS-BOOTSTRAP' >&2; exit 2;;
esac
