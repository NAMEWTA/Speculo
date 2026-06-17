#!/usr/bin/env node
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { initSpeculo } from "./index.js";

function usage(): string {
  return [
    "Usage:",
    "  speculo init [--all] [target]",
    "",
    "Commands:",
    "  init    Install speculo assets under speculo/. If speculo/ does not exist,",
    "          copies .speculo, commands, skills, and workflows with conflict detection.",
    "          If speculo/ already exists, refreshes commands, skills, and workflows",
    "          while preserving .speculo/ user state.",
    "",
    "Options:",
    "  --all   Install/update all workflows without interactive selection.",
    "          When omitted in a terminal, an interactive menu lets you pick",
    "          which workflows to install or refresh."
  ].join("\n");
}

async function main(argv: string[]): Promise<number> {
  // Parse --all flag (can appear anywhere in argv)
  const allFlag = argv.includes("--all");
  const positional = argv.filter(a => a !== "--all");
  const [command, targetArg, extra] = positional;

  if (!command || command === "--help" || command === "-h") {
    console.log(usage());
    return command ? 0 : 1;
  }

  if (extra) {
    console.error(`Unexpected argument: ${extra}`);
    console.error(usage());
    return 1;
  }

  const target = resolve(targetArg ?? ".");
  const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

  try {
    if (command === "init") {
      const result = await initSpeculo(target, { packageRoot, all: allFlag });
      if (result.mode === 'init') {
        console.log(`Speculo initialized in ${result.target}`);
        for (const copied of result.copied ?? []) {
          console.log(`  copied ${copied}`);
        }
      } else {
        console.log(`Speculo updated in ${result.target}`);
        for (const updated of result.updated ?? []) {
          console.log(`  updated ${updated}`);
        }
      }
      return 0;
    }

    if (command === "update") {
      console.error("Warning: `speculo update` is deprecated. Use `speculo init` instead.");
      const result = await initSpeculo(target, { packageRoot, all: true });
      console.log(`Speculo updated in ${result.target}`);
      for (const updated of result.updated ?? []) {
        console.log(`  updated ${updated}`);
      }
      return 0;
    }

    console.error(`Unknown command: ${command}`);
    console.error(usage());
    return 1;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    return 1;
  }
}

const exitCode = await main(process.argv.slice(2));
process.exitCode = exitCode;
