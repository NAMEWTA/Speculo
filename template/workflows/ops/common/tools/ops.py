#!/usr/bin/env python3
"""OPS entry point: Python >=3.10, no third-party packages."""
import sys
if sys.version_info < (3,10):
    raise SystemExit("OPS requires Python >=3.10; run bootstrap.sh or bootstrap.ps1 --probe first.")
from opslib.cli import main
if __name__=="__main__":raise SystemExit(main())
