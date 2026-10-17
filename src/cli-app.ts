import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseHubSkillSpec } from "./hub-skills.js";
import { initSpeculo } from "./index.js";
import { parseSkillSpec, parseSkillTargets, validateExposureRequest } from "./agent-skills.js";
import { discoverWorkflowCatalog, isInteractive as catalogIsInteractive } from "./workflows.js";
import { RefreshBlockedError } from "./refresh.js";
import { checkForUpdate, getLocalVersion, type VersionInfo } from "./version.js";
import { doctorSpeculo } from "./doctor.js";
import { recoverInstall } from "./transaction.js";
import { INSTALL_ROOT, resolvePathReference } from "./paths.js";
import { pathExists } from "./utils.js";
import { InstallCancelled } from "./interaction.js";
import type { createInstallUI } from "./install-ui.js";
import { formatHelp, printBlocker, printDoctor, printError, printVersion } from "./terminal-ui.js";

import { consumeResumeMarker, shouldCheckUpdate } from "./update-flow.js";
import { startupUpdate } from "./update-ui.js";
import { ProcessCancelledError } from "./update-process.js";

const REMOVED_COMMANDS = new Set(["migrate", "mirror-skills", "update"]);
const REMOVED_OPTIONS = new Set(["--all", "--apply", "--dry-run"]);

async function showVersionWithCheck(packageRoot: string, packageName: string): Promise<VersionInfo> {
  const info = await checkForUpdate(packageRoot, packageName);
  printVersion(info);
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

export async function main(argv: string[], options: { env?: NodeJS.ProcessEnv; interactive?: boolean; checkUpdate?: () => Promise<number | undefined> } = {}): Promise<number> {
  const env = { ...(options.env ?? process.env) };
  const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
  const local = await getLocalVersion(packageRoot);
  const resumed = consumeResumeMarker(env, "SPECULO", local);
  if (!options.env) delete process.env.SPECULO_UPDATE_RESUME;
  const interactive = options.interactive ?? catalogIsInteractive();
  const update = async () => {
    if (resumed || !shouldCheckUpdate(env, "SPECULO", interactive)) return undefined;
    return options.checkUpdate ? options.checkUpdate() : startupUpdate({ packageRoot, local, argv, env });
  };
  if (argv[0] === "--help" || argv[0] === "-h") {
    console.log(formatHelp());
    return 0;
  }

  const [command, ...rest] = argv;
  if (command && REMOVED_COMMANDS.has(command)) {
    printError("speculo " + command + " has been removed. Run speculo init [target] to refresh Speculo.");
    return 1;
  }

  let ui: ReturnType<typeof createInstallUI> | undefined;
  try {
    assertNoRemovedOption(argv);
    const packageName = "@namewta/speculo";
    if (command === "version") {
      if (rest.length > 0) throw new Error("speculo version does not accept arguments.");
      await showVersionWithCheck(packageRoot, packageName);
      return 0;
    }

    if (command === "doctor") {
      const args = parseArguments(rest, new Set(["--json"]));
      if (!args.flags.has("--json")) {
        const code = await update();
        if (code !== undefined) return code;
      }
      const result = await doctorSpeculo(args.target);
      if (args.flags.has("--json")) console.log(JSON.stringify(result, null, 2));
      else printDoctor(result);
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

    const updateCode = await update();
    if (updateCode !== undefined) return updateCode;
    if (interactive) {
      const { createInstallUI } = await import("./install-ui.js");
      ui = createInstallUI();
      ui.start({ local, latest: null, isOutdated: false }, resolve(targetArg), await pathExists(join(resolve(targetArg), INSTALL_ROOT)));
    } else {
      console.log(`Speculo v${local}`);
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
    if (error instanceof ProcessCancelledError) { printError(error.message); return error.code; }
    if (ui) ui.fail(error);
    if (error instanceof InstallCancelled) {
      if (!ui) console.log(error.message);
      return error.exitCode;
    }
    if (error instanceof RefreshBlockedError) {
      if (!ui) printError(error.message);
      for (const blocker of error.blockers) printBlocker(blocker);
      return 2;
    }
    if (!ui) printError(error instanceof Error ? error.message : String(error));
    return 1;
  }
}

