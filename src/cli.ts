#!/usr/bin/env node
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseHubSkillSpec } from "./hub-skills.js";
import { initSpeculo } from "./index.js";
import { parseSkillSpec, parseSkillTargets, validateExposureRequest } from "./agent-skills.js";
import { discoverWorkflowCatalog, isInteractive as catalogIsInteractive } from "./workflows.js";
import { RefreshBlockedError } from "./refresh.js";
import { checkForUpdate, formatVersionBanner, type VersionInfo } from "./version.js";
import { doctorSpeculo } from "./doctor.js";
import { recoverInstall } from "./transaction.js";
import { INSTALL_ROOT, resolvePathReference } from "./paths.js";
import { pathExists } from "./utils.js";
import { InstallCancelled } from "./interaction.js";
import type { createInstallUI } from "./install-ui.js";

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
    "  speculo init [target] [--workflows <all|none|id,id> | --core-only] [--hub-skills <selection>] [--skill-targets <targets>] [--skills <selection>]",
    "",
    "Commands:",
    "  init      Install or directly refresh Speculo assets and selected workflow packages.",
    "            --hub-skills: none|keep|all|<category/name,...>. Unchecked managed packages are uninstalled.",
    "            --skill-targets: agents|claude|agents,claude|none. --skills: none|keep|all|<business-id,id>.",
    "            Interactive: choose targets, then one shared selection: all, groups, custom, keep, or none.",
    "  version   Print the current Speculo version and check for updates.",
    "  doctor    Validate installation integrity and report recovery evidence (read-only).",
    "  recover   Explicitly roll back an interrupted transaction, or finish committed cleanup.",
    "  resolve   Resolve a Path reference to a contained local path (read-only; no shell).",
    "  Non-interactive init: core-only on first install; existing supported workflows on refresh.",
  ].join("\n");
}

async function showVersionWithCheck(packageRoot: string, packageName: string): Promise<VersionInfo> {
  const info = await checkForUpdate(packageRoot, packageName);
  console.log(formatVersionBanner(info));
  return info;
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

  let ui: ReturnType<typeof createInstallUI> | undefined;
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
    const args = parseArguments(command === "init" ? rest : argv, new Set(["--core-only"]), new Set(["--workflows", "--hub-skills", "--skill-targets", "--skills"]));
    if (args.flags.has("--core-only") && args.values.has("--workflows")) throw new Error("--core-only and --workflows are mutually exclusive");
    const requested = args.values.get("--workflows");
    if (requested !== undefined && !/^[a-z0-9-]+(?:,[a-z0-9-]+)*$/.test(requested)) throw new Error("--workflows requires comma-separated workflow ids");
    const selection = args.flags.has("--core-only") ? { workflowIds: [] } : requested === undefined ? undefined :
      { workflowIds: requested === "none" ? [] : requested === "all" ? [...(await discoverWorkflowCatalog(packageRoot)).keys()].sort() : requested.split(",") };
    let hubSkills = args.values.has("--hub-skills") ? parseHubSkillSpec(args.values.get("--hub-skills")!) : undefined;
    if (args.flags.has("--core-only")) {
      if (hubSkills && hubSkills.mode !== "none") throw new Error("--core-only conflicts with --hub-skills other than none");
      hubSkills = { mode: "none" };
    }
    const skills = args.values.has("--skills") ? parseSkillSpec(args.values.get("--skills")!) : undefined;
    const skillTargets = args.values.has("--skill-targets") ? parseSkillTargets(args.values.get("--skill-targets")!) : undefined;
    validateExposureRequest(skillTargets, skills);
    if (skillTargets?.length === 0 && hubSkills && (hubSkills.mode === "all" || hubSkills.mode === "set" && hubSkills.assetIds.length)) throw new Error("--hub-skills requires at least one --skill-targets destination");
    const targetArg = args.target;

    if (catalogIsInteractive()) {
      const { createInstallUI } = await import("./install-ui.js");
      ui = createInstallUI();
      ui.start(await checkForUpdate(packageRoot, packageName), resolve(targetArg), await pathExists(join(resolve(targetArg), INSTALL_ROOT)));
    } else {
      await showVersionWithCheck(packageRoot, packageName);
    }

    const result = await initSpeculo(targetArg, {
      packageRoot, selection, skillTargets, skills, hubSkills, promptExposure: !!ui,
      confirmInstall: ui?.confirm, onProgress: ui?.progress,
    });
    if (ui) { ui.finish(result); return 0; }
    console.log(result.mode === "init" ? "Speculo initialized in " + result.target : "Speculo refreshed in " + result.target);
    console.log("  replaced " + result.refresh.managedFiles + " managed files");
    console.log("  preserved " + result.refresh.preservedFiles + " runtime files");
    console.log(
      "  reconciled config: " + result.refresh.config.added + " added, " +
      result.refresh.config.updated + " updated, " + result.refresh.config.preserved + " preserved, " +
      result.refresh.config.removed + " removed",
    );
    console.log(`  Skills Hub: ${result.hub.created.length} installed, ${result.hub.updated.length} updated, ${result.hub.removed.length} removed, ${result.hub.conflicts.length} conflicts`);
    if (result.removedWorkflowIds.length) console.log(`  uninstalled workflows: ${result.removedWorkflowIds.join(", ")}; runtime data retained`);
    if (result.exposure.projected) console.log(`  projected ${result.exposure.projected} public entries`);
    for (const warning of result.warnings) console.log("  warning: " + warning);
    if (result.refresh.backupPath) console.log("  retained targeted backup " + result.refresh.backupPath);
    for (const asset of result.assets.filter((asset) => asset.startsWith(".gitignore") || asset.startsWith("AGENTS") || asset.startsWith("CLAUDE"))) {
      console.log("  updated " + asset);
    }
    return 0;
  } catch (error) {
    if (ui) ui.fail(error);
    if (error instanceof InstallCancelled) {
      if (!ui) console.log(error.message);
      return error.exitCode;
    }
    if (error instanceof RefreshBlockedError) {
      if (!ui) console.error(error.message);
      for (const blocker of error.blockers) console.error("  " + blocker.code + " " + blocker.path + ": " + blocker.message);
      return 2;
    }
    if (!ui) console.error(error instanceof Error ? error.message : String(error));
    return 1;
  }
}

process.exitCode = await main(process.argv.slice(2));
