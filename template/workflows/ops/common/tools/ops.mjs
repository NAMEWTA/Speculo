#!/usr/bin/env node
/** OPS entry point: Node >=22.22.3 <25, no third-party packages. */
import { workspaceCommand } from "./opslib/workspace_cli.mjs";
const argv = process.argv.slice(2);
const { main } = await import(workspaceCommand(argv) ? "./opslib/workspace_cli.mjs" : "./opslib/cli.mjs");
process.exitCode = await main(argv);
