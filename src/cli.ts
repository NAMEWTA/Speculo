#!/usr/bin/env node
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { initSpeculo } from "./index.js";
import { RefreshBlockedError } from "./refresh.js";
import { checkForUpdate, formatVersionBanner, type VersionInfo } from "./version.js";
import { doctorSpeculo } from "./doctor.js";
import { recoverInstall } from "./transaction.js";
import { resolvePathReference } from "./paths.js";

const REMOVED_COMMANDS = new Set(["migrate", "mirror-skills", "update"]);
const REMOVED_OPTIONS = new Set(["--all", "--apply", "--dry-run"]);

function usage(): string {
  return [
    "Usage:",
    "  speculo [init] [target]",
    "  speculo version",
    "  speculo doctor [target] [--json]",
    "  speculo recover [target] --transaction <id>",
    "  speculo resolve [target] --path <reference>",
    "  speculo init [target] [--workflows <id,id> | --core-only]",
    "",
    "Commands:",
    "  init      Install or directly refresh Speculo assets and selected workflow packages.",
    "  version   Print the current Speculo version and check for updates.",
    "  doctor    Validate installation integrity and report recovery evidence (read-only).",
    "  recover   Explicitly roll back an interrupted transaction, or finish committed cleanup.",
    "  resolve   Resolve a Path reference to a contained local path (read-only; no shell).",
    "  Non-interactive init: core-only on first install; existing supported workflows on refresh.",
  ].join("\n");
}

function isInteractive(): boolean {
  return process.stdin.isTTY === true;
}

async function showVersionWithCheck(packageRoot: string, packageName: string): Promise<VersionInfo> {
  const info = await checkForUpdate(packageRoot, packageName);
  console.log(formatVersionBanner(info));
  return info;
}

async function confirmContinue(): Promise<boolean> {
  if (!isInteractive()) return true;
  const { confirm } = await import("@inquirer/prompts");
  return confirm({ message: "是否继续运行 speculo init？", default: true });
}

function assertNoRemovedOption(argv: string[]): void {
  const option = argv.find((argument) => REMOVED_OPTIONS.has(argument));
  if (option) throw new Error(option + " has been removed. Run speculo init [target] to refresh Speculo.");
}

function parseArguments(argv: string[], booleanFlags = new Set<string>(), valueFlags = new Set<string>()): { target: string; flags: Set<string>; values: Map<string, string> } {
  let target: string | undefined;
  const flags = new Set<string>(), values = new Map<string, string>();
  for (let i = 0; i < argv.length; i++) {
    const value = argv[i];
    if (booleanFlags.has(value)) {
      if (flags.has(value)) throw new Error("Duplicate option: " + value);
      flags.add(value);
    } else if (valueFlags.has(value)) {
      if (values.has(value) || !argv[i + 1] || argv[i + 1].startsWith("--")) throw new Error("Missing or duplicate option value: " + value);
      values.set(value, argv[++i]);
    } else if (value.startsWith("-")) throw new Error("Unknown option: " + value);
    else if (target !== undefined) throw new Error("Unexpected argument: " + value);
    else target = value;
  }
  return { target: target ?? ".", flags, values };
}

async function main(argv: string[]): Promise<number> {
  if (argv[0] === "--help" || argv[0] === "-h") {
    console.log(usage());
    return 0;
  }

  const [command, ...rest] = argv;
  if (command && REMOVED_COMMANDS.has(command)) {
    console.error("speculo " + command + " has been removed. Run speculo init [target] to refresh Speculo.");
    return 1;
  }

  try {
    assertNoRemovedOption(argv);
    const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
    const packageName = "@namewta/speculo";
    if (command === "version") {
      if (rest.length > 0) throw new Error("speculo version does not accept arguments.");
      await showVersionWithCheck(packageRoot, packageName);
      return 0;
    }

    if (command === "doctor") {
      const args = parseArguments(rest, new Set(["--json"]));
      const result = await doctorSpeculo(args.target);
      if (args.flags.has("--json")) console.log(JSON.stringify(result, null, 2));
      else {
        for (const check of result.checks) console.log(`${check.ok ? "ok" : "fail"} ${check.id}: ${check.message}`);
        console.log(`scope: ${result.scope}; not checked: ${result.notChecked.join(", ")}`);
      }
      return result.healthy ? 0 : 2;
    }
    if (command === "recover" || command === "resolve") {
      const flag = command === "recover" ? "--transaction" : "--path";
      const args = parseArguments(rest, new Set(), new Set([flag]));
      const value = args.values.get(flag);
      if (!value) throw new Error(`${command} requires ${flag}`);
      if (command === "recover") console.log(JSON.stringify(await recoverInstall(args.target, value), null, 2));
      else console.log(await resolvePathReference(args.target, value));
      return 0;
    }
    const args = parseArguments(command === "init" ? rest : argv, new Set(["--core-only"]), new Set(["--workflows"]));
    if (args.flags.has("--core-only") && args.values.has("--workflows")) throw new Error("--core-only and --workflows are mutually exclusive");
    const requested = args.values.get("--workflows");
    if (requested !== undefined && !/^[a-z0-9-]+(?:,[a-z0-9-]+)*$/.test(requested)) throw new Error("--workflows requires comma-separated workflow ids");
    const selection = args.flags.has("--core-only") ? { workflowIds: [] } : requested === undefined ? undefined : { workflowIds: requested.split(",") };
    const targetArg = args.target;

    await showVersionWithCheck(packageRoot, packageName);
    if (!(await confirmContinue())) {
      console.log("已取消。");
      return 0;
    }

    const result = await initSpeculo(targetArg, { packageRoot, selection });
    console.log(result.mode === "init" ? "Speculo initialized in " + result.target : "Speculo refreshed in " + result.target);
    console.log("  replaced " + result.refresh.managedFiles + " managed files");
    console.log("  preserved " + result.refresh.preservedFiles + " runtime files");
    console.log(
      "  reconciled config: " + result.refresh.config.added + " added, " +
      result.refresh.config.updated + " updated, " + result.refresh.config.preserved + " preserved, " +
      result.refresh.config.removed + " removed",
    );
    if (result.refresh.structuredUpgrades > 0) console.log("  reconciled " + result.refresh.structuredUpgrades + " structured state files");
    if (result.refresh.backupPath) console.log("  retained targeted backup " + result.refresh.backupPath);
    for (const asset of result.assets.filter((asset) => asset.startsWith(".gitignore") || asset.startsWith("AGENTS") || asset.startsWith("CLAUDE"))) {
      console.log("  updated " + asset);
    }
    return 0;
  } catch (error) {
    if (error instanceof RefreshBlockedError) {
      console.error(error.message);
      for (const blocker of error.blockers) console.error("  " + blocker.code + " " + blocker.path + ": " + blocker.message);
      return 2;
    }
    console.error(error instanceof Error ? error.message : String(error));
    return 1;
  }
}

process.exitCode = await main(process.argv.slice(2));
