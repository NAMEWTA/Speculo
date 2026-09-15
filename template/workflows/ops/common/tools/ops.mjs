#!/usr/bin/env node
/** OPS entry point: Node >=22, no third-party packages. */
import { main } from "./opslib/cli.mjs";
process.exit(main(process.argv.slice(2)));
