#!/usr/bin/env node
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { initSpeculo, updateSpeculo } from "./index.js";

function usage(): string {
  return [
    "Usage:",
    "  speculo init [target]",
    "  speculo update [target]",
    "",
    "Commands:",
    "  init    Install .speculo, commands, skills, and workflows under speculo/. Fails on conflicts.",
    "  update  Replace commands, skills, and workflows under speculo/. Keeps .speculo untouched."
  ].join("\n");
}

async function main(argv: string[]): Promise<number> {
  const [command, targetArg, extra] = argv;

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
      const result = await initSpeculo(target, { packageRoot });
      console.log(`Speculo initialized in ${result.target}`);
      for (const copied of result.copied ?? []) {
        console.log(`copied ${copied}`);
      }
      return 0;
    }

    if (command === "update") {
      const result = await updateSpeculo(target, { packageRoot });
      console.log(`Speculo updated in ${result.target}`);
      for (const updated of result.updated ?? []) {
        console.log(`updated ${updated}`);
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
