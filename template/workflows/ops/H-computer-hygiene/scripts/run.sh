#!/bin/sh
# Read-only audit wrapper. No sudo, installation, profile sourcing or cleanup.
set -eu
SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
exec python3 "$SCRIPT_DIR/hygiene.py" audit "$@"
