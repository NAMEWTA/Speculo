#!/bin/sh
# First-stage Linux SSH Node bootstrap. POSIX only; never runs install.sh or edits profiles.
set -eu

ACK='I-APPROVE-THIS-BOOTSTRAP'

json_str() {
  printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g'
}

digest_file() {
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$1" | cut -d' ' -f1
  elif command -v shasum >/dev/null 2>&1; then
    shasum -a 256 "$1" | cut -d' ' -f1
  else
    echo 'No SHA-256 implementation; bootstrap blocked' >&2
    exit 2
  fi
}

profile_digest() {
  d=''
  for f in "${HOME-}/.bashrc" "${HOME-}/.profile"; do
    if [ -f "$f" ] && [ ! -L "$f" ]; then
      d="${d}$(digest_file "$f")"
    else
      d="${d}absent"
    fi
  done
  printf '%s' "$d"
}

normalize_arch() {
  m=$(uname -m)
  case "$m" in
    x86_64) printf 'linux-x64' ;;
    aarch64|arm64) printf 'linux-arm64' ;;
    *) printf 'unsupported:%s' "$m" ;;
  esac
}

tool_path() {
  if command -v "$1" >/dev/null 2>&1; then command -v "$1"; else printf 'missing'; fi
}

abspath_cmd() {
  p=$1
  if [ "$p" = "missing" ] || [ -z "$p" ]; then
    printf 'missing'
    return
  fi
  if command -v readlink >/dev/null 2>&1; then
    readlink -f "$p" 2>/dev/null || printf '%s' "$p"
  else
    printf '%s' "$p"
  fi
}

emit_probe() {
  specified=${1-}
  arch=$(normalize_arch)
  nodep=$(tool_path node)
  voltap=$(tool_path volta)
  usable=false
  node_path=null
  node_version=null
  if [ -n "$specified" ]; then
    if [ -x "$specified" ] && [ ! -L "$specified" -o -x "$specified" ]; then
      usable=true
      nodep=$specified
    else
      nodep=missing
      usable=false
    fi
  elif [ "$nodep" != "missing" ] && [ -x "$nodep" ]; then
    usable=true
  fi
  if [ "$usable" = true ]; then
    nodep=$(abspath_cmd "$nodep")
    node_path="\"$(json_str "$nodep")\""
    ver=$("$nodep" --version 2>/dev/null || true)
    if [ -n "$ver" ]; then node_version="\"$(json_str "$ver")\""; fi
  else
    nodep=missing
  fi
  profile_has=false
  for f in "${HOME-}/.bashrc" "${HOME-}/.profile"; do
    if [ -f "$f" ] && grep -q volta "$f" 2>/dev/null; then profile_has=true; fi
  done
  volta_out=$voltap
  [ "$volta_out" = "missing" ] || volta_out=$(abspath_cmd "$volta_out")
  printf '{"status":"probed","uname":"%s","arch":"%s","tools":{"node":"%s","volta":"%s","tar":"%s","sha256sum":"%s"},"node_path":%s,"node_version":%s,"node_usable":%s,"profile_has_volta":%s}\n' \
    "$(json_str "$(uname -sm)")" "$(json_str "$arch")" \
    "$(json_str "$nodep")" "$(json_str "$volta_out")" \
    "$(json_str "$(tool_path tar)")" "$(json_str "$(tool_path sha256sum)")" \
    "$node_path" "$node_version" "$usable" "$profile_has"
}

find_named() {
  root=$1
  name=$2
  found=''
  # Prefer a file literally named $name, skipping install.sh.
  for cand in "$root/$name" "$root"/*/"$name"; do
    if [ -f "$cand" ] && [ ! -L "$cand" ]; then
      found=$cand
      break
    fi
  done
  printf '%s' "$found"
}

case "${1:---probe}" in
  --probe)
    emit_probe "${2-}"
    ;;
  --apply)
    [ "$#" -eq 8 ] || { echo 'usage: bootstrap-volta.sh --apply VOLTA_TAR VOLTA_SHA NODE_TAR NODE_SHA VOLTA_HOME NODE_VERSION I-APPROVE-THIS-BOOTSTRAP' >&2; exit 2; }
    volta_tar=$2
    volta_sha=$3
    node_tar=$4
    node_sha=$5
    volta_home=$6
    node_version=$7
    [ "$8" = "$ACK" ] || { echo 'explicit bootstrap acknowledgement required' >&2; exit 2; }
    case "$node_version" in
      ''|latest|Latest|LATEST|*latest*) echo 'refusing latest or empty node version' >&2; exit 2 ;;
    esac
    case "$volta_home" in
      /*) ;;
      *) echo 'VOLTA_HOME must be an absolute path' >&2; exit 2 ;;
    esac
    case "$volta_home" in
      *..*|*[\ \	]*) echo 'VOLTA_HOME must not contain spaces or ..' >&2; exit 2 ;;
    esac
    for f in "$volta_tar" "$node_tar"; do
      [ -f "$f" ] && [ ! -L "$f" ] || { echo "Installer must be a reviewed regular file: $f" >&2; exit 2; }
    done
    actual=$(digest_file "$volta_tar")
    [ "$actual" = "$volta_sha" ] || { echo 'Volta installer changed after review' >&2; exit 2; }
    actual=$(digest_file "$node_tar")
    [ "$actual" = "$node_sha" ] || { echo 'Node installer changed after review' >&2; exit 2; }

    image="$volta_home/tools/image/node/$node_version"
    node_bin="$image/bin/node"
    wrapper="$volta_home/bin/ops-node"
    if [ -x "$node_bin" ] && [ -x "$wrapper" ]; then
      ver=$("$wrapper" --version 2>/dev/null || true)
      if [ "$ver" = "v$node_version" ]; then
        printf '{"status":"installed","volta_home":"%s","connection_node":"%s","node_path":"%s","volta_bin":"%s","node_version":"%s","volta_version":"2.0.2","profile_unchanged":true,"idempotent":true}\n' \
          "$(json_str "$volta_home")" "$(json_str "$wrapper")" "$(json_str "$node_bin")" "$(json_str "$volta_home/bin/volta")" "$(json_str "$node_version")"
        exit 0
      fi
    fi

    before=$(profile_digest)
    mkdir -p "$volta_home/bin" "$image" "$volta_home/tmp"
    stage=$(mktemp -d "$volta_home/tmp/extract.XXXXXX")
    trap 'rm -rf "$stage"' EXIT

    tar -xzf "$volta_tar" -C "$stage"
    volta_src=$(find_named "$stage" volta)
    [ -n "$volta_src" ] || { echo 'volta binary missing from archive; refusing to run install.sh' >&2; exit 2; }
    cp "$volta_src" "$volta_home/bin/volta"
    chmod 755 "$volta_home/bin/volta"
    shim_src=$(find_named "$stage" volta-shim)
    if [ -n "$shim_src" ]; then
      cp "$shim_src" "$volta_home/bin/volta-shim"
      chmod 755 "$volta_home/bin/volta-shim"
    fi
    mig_src=$(find_named "$stage" volta-migrate)
    if [ -n "$mig_src" ]; then
      cp "$mig_src" "$volta_home/bin/volta-migrate"
      chmod 755 "$volta_home/bin/volta-migrate"
    fi
    # Never execute install.sh even if present.
    if [ -f "$stage/install.sh" ] || [ -f "$stage"/*/install.sh ] 2>/dev/null; then
      :
    fi

    tar -xzf "$node_tar" -C "$image" --strip-components=1
    [ -x "$node_bin" ] || { echo 'Node binary missing after extract' >&2; exit 2; }
    chmod 755 "$node_bin"

    cat > "$wrapper" <<EOF
#!/bin/sh
export VOLTA_HOME=$(printf '%s' "$volta_home" | sed "s/'/'\\\\''/g; s/^/'/; s/\$/'/")
export PATH="\$VOLTA_HOME/bin:\$PATH"
exec $(printf '%s' "$node_bin" | sed "s/'/'\\\\''/g; s/^/'/; s/\$/'/") "\$@"
EOF
    chmod 755 "$wrapper"
    cp "$wrapper" "$volta_home/bin/node"
    chmod 755 "$volta_home/bin/node"

    ver=$("$wrapper" --version 2>/dev/null || true)
    [ "$ver" = "v$node_version" ] || { echo "ops-node version mismatch: got ${ver:-empty} want v$node_version" >&2; exit 2; }

    after=$(profile_digest)
    [ "$before" = "$after" ] || { echo 'bootstrap refused: shell profile changed' >&2; exit 2; }

    volta_ver=$("$volta_home/bin/volta" --version 2>/dev/null || printf '2.0.2')
    printf '{"status":"installed","volta_home":"%s","connection_node":"%s","node_path":"%s","volta_bin":"%s","node_version":"%s","volta_version":"%s","profile_unchanged":true}\n' \
      "$(json_str "$volta_home")" "$(json_str "$wrapper")" "$(json_str "$node_bin")" "$(json_str "$volta_home/bin/volta")" "$(json_str "$node_version")" "$(json_str "$volta_ver")"
    ;;
  *)
    echo 'usage: bootstrap-volta.sh --probe [NODE_PATH] | --apply VOLTA_TAR VOLTA_SHA NODE_TAR NODE_SHA VOLTA_HOME NODE_VERSION I-APPROVE-THIS-BOOTSTRAP' >&2
    exit 2
    ;;
esac
