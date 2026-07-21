#!/usr/bin/env node
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { initSpeculo } from "./index.js";
import { migrateSpeculo } from "./migrate.js";

function usage(): string {
  return [
    "Usage:",
    "  speculo init [--all] [target]",
    "  speculo migrate [--apply] [target]",
    "",
    "Commands:",
    "  init       Install or refresh Speculo core assets and selected workflow packages.",
    "             Existing workflow state under speculo/.speculo/ is never overwritten.",
    "  migrate    Preview migration from v2 or transitional v3 state to the current v3 contract.",
    "             Pass --apply to perform the staged, rollback-safe migration.",
    "",
    "Options:",
    "  --all      Select every workflow and fully refresh all assets during init.",
    "  --apply    Apply a migration; without this flag migrate is always dry-run.",
  ].join("\n");
}

async function main(argv: string[]): Promise<number> {
  const allFlag = argv.includes("--all");
  const applyFlag = argv.includes("--apply");
  const positional = argv.filter(
    (argument) => argument !== "--all" && argument !== "--apply"
  );
  const [command, targetArg, extra] = positional;

  if (!command || command === "--help" || command === "-h") {
    console.log(usage());
    return command ? 0 : 1;
  }

  if (extra) {
    console.error("Unexpected argument: " + extra);
    console.error(usage());
    return 1;
  }

  const target = resolve(targetArg ?? ".");
  const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

  try {
    if (command === "init") {
      if (applyFlag) {
        throw new Error("--apply is only valid with `speculo migrate`.");
      }
      const result = await initSpeculo(target, {
        packageRoot,
        all: allFlag,
      });
      console.log(
        result.mode === "init"
          ? "Speculo initialized in " + result.target
          : "Speculo updated in " + result.target
      );
      for (const item of result.copied ?? result.updated ?? []) {
        console.log("  " + (result.mode === "init" ? "copied " : "updated ") + item);
      }
      return 0;
    }

    if (command === "migrate") {
      if (allFlag) {
        throw new Error("--all is only valid with `speculo init`.");
      }
      const result = await migrateSpeculo(target, {
        packageRoot,
        apply: applyFlag,
      });
      if (!result.legacyDetected) {
        console.log("No legacy Speculo state detected in " + result.target);
        return 0;
      }

      console.log(
        result.applied
          ? "Speculo state migrated in " + result.target
          : "Speculo migration preview for " + result.target
      );
      for (const action of result.actions) {
        const mapping = action.from
          ? action.from + (action.to ? " -> " + action.to : "")
          : action.detail;
        console.log("  " + action.kind + " " + mapping);
      }
      if (!result.applied) {
        console.log("Dry-run only. Re-run with --apply to perform this migration.");
      }
      return 0;
    }

    if (command === "update") {
      console.error("Warning: `speculo update` is deprecated. Use `speculo init`.");
      const result = await initSpeculo(target, {
        packageRoot,
        all: true,
      });
      console.log("Speculo updated in " + result.target);
      return 0;
    }

    console.error("Unknown command: " + command);
    console.error(usage());
    return 1;
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    return 1;
  }
}

process.exitCode = await main(process.argv.slice(2));
