#!/usr/bin/env node
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { initSpeculo } from "./index.js";
import { RefreshBlockedError } from "./refresh.js";
import { checkForUpdate, formatVersionBanner, type VersionInfo } from "./version.js";
import { doctorSpeculo } from "./doctor.js";

const REMOVED_COMMANDS = new Set(["migrate", "mirror-skills", "update"]);
const REMOVED_OPTIONS = new Set(["--all", "--apply", "--dry-run"]);

function usage(): string {
  return [
    "Usage:",
    "  speculo [init] [target]",
    "  speculo version",
    "  speculo doctor [target]",
    "",
    "Commands:",
    "  init      Install or directly refresh Speculo assets and selected workflow packages.",
    "  version   Print the current Speculo version and check for updates.",
    "  doctor    Validate an installed Speculo 1.0 runtime (read-only).",
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
      if (rest.length > 1) throw new Error("speculo doctor accepts at most one target.");
      const result = await doctorSpeculo(rest[0] ?? ".");
      for (const check of result.checks) console.log(`${check.ok ? "ok" : "fail"} ${check.id}: ${check.message}`);
      return result.healthy ? 0 : 2;
    }

    const targetArg = command === "init" ? rest[0] : command;
    const extra = command === "init" ? rest[1] : rest[0];
    if (extra) throw new Error("Unexpected argument: " + extra);
    if (targetArg?.startsWith("-")) throw new Error("Unknown option: " + targetArg);

    await showVersionWithCheck(packageRoot, packageName);
    if (!(await confirmContinue())) {
      console.log("已取消。");
      return 0;
    }

    const result = await initSpeculo(targetArg ?? ".", { packageRoot });
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
