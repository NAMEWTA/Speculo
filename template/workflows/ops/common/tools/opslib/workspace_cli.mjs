/** Additive workspace commands. Legacy CLI semantics remain owned by cli.mjs. */
import { isAbsolute } from "node:path";
import { OpsError } from "./core.mjs";
import { readBoundedJson, readRegistry, route, statePath } from "./workspace.mjs";
import { checkServer } from "./server_checks.mjs";
import { generateFleet } from "./fleet.mjs";
import { authorizeTask, prepareTask, runTask } from "./tasks.mjs";
import { discoverServer, confirmServerRoot } from "./onboarding.mjs";
import { initializeHostSpec, connectionSpec } from "./host_recipes.mjs";
import { writeJson } from "./core.mjs";

export const COMMANDS = Object.freeze(["workspace-help", "route", "server-discover", "server-root-confirm", "server-initialize-spec", "server-connection-spec", "server-check", "fleet", "task-plan", "task-authorize", "task-run"]);
const options = {
  "server-discover": ["server", "connection-file"],
  "server-root-confirm": ["server", "discovery", "root", "by", "statement"],
  "server-initialize-spec": ["server", "output"],
  "server-connection-spec": ["server", "connection-file", "output"],
  route: ["scope", "server", "project"],
  "server-check": ["server", "profile", "min-free-mib", "min-memory-mib"],
  fleet: ["stale-hours"], "task-plan": ["file"],
  "task-authorize": ["task", "digest", "by", "statement", "ack-destructive"], "task-run": ["task"], "workspace-help": [],
};
export function workspaceCommand(argv) {
  const rest = [...argv];
  for (let i = rest.length - 1; i >= 0; i--) if (rest[i] === "--state") rest.splice(i, 2);
  return COMMANDS.includes(rest[0]) ? rest[0] : null;
}
export function parseWorkspaceArgs(argv) {
  const command = workspaceCommand(argv);
  if (!command) throw new OpsError("unknown workspace command");
  const args = [...argv], out = { command };
  args.splice(args.indexOf(command), 1);
  const allowed = new Set(["state", ...options[command]]);
  while (args.length) {
    const flag = args.shift();
    if (!flag.startsWith("--") || !allowed.has(flag.slice(2))) throw new OpsError(`unknown ${command} argument: ${flag}`);
    const key = flag.slice(2);
    if (Object.hasOwn(out, key)) throw new OpsError(`duplicate argument: ${flag}`);
    const value = args.shift();
    if (!value || value.startsWith("--")) throw new OpsError(`${flag} needs a value`);
    out[key] = value;
  }
  if (command !== "workspace-help" && !out.state) throw new OpsError("--state is required and must be absolute");
  return out;
}
const required = (args, key) => { if (!args[key]) throw new OpsError(`--${key} is required`); return args[key]; };
const list = (v) => v ? v.split(",") : [];
function integer(value, fallback) {
  if (value === undefined) return fallback;
  if (!/^[1-9][0-9]*$/.test(value) || !Number.isSafeInteger(Number(value))) throw new OpsError("threshold must be a positive integer");
  return Number(value);
}
export async function main(argv = process.argv.slice(2)) {
  try {
    const args = parseWorkspaceArgs(argv);
    if (args.command === "workspace-help") {
      process.stdout.write(JSON.stringify({ commands: options, usage: "node ops.mjs --state ABSOLUTE_STATE COMMAND [options]",
        workflow: "I controller; S server access; H server baseline; D project deployment; V local inventory",
        task: "task-plan -> record existing explicit user authorization once via task-authorize -> task-run; no per-step reconfirmation; no automatic retry",
        legacy: "All other commands retain the original plan/approve/apply contracts" }, null, 2) + "\n");
      return 0;
    }
    const state = statePath(args.state);
    // Keep the existing complete schema/semantic validator authoritative in the installed runtime.
    const { load } = await import("./model.mjs");
    load(state);
    let result;
    switch (args.command) {
      case "server-discover": result = discoverServer(state, required(args, "server"), readBoundedJson(required(args, "connection-file"))); break;
      case "server-root-confirm": result = confirmServerRoot(state, required(args, "server"), required(args, "discovery"), required(args, "root"), required(args, "by"), required(args, "statement")); break;
      case "server-initialize-spec":
      case "server-connection-spec": {
        const output = required(args, "output");
        if (!isAbsolute(output)) throw new OpsError("--output must be absolute");
        const spec = args.command === "server-initialize-spec" ? initializeHostSpec(state, required(args, "server"))
          : connectionSpec(state, required(args, "server"), readBoundedJson(required(args, "connection-file")));
        writeJson(output, spec, { exclusive: true });
        result = { status: "generated-not-executed", spec_path: output, next: "plan -> exact approve -> apply; root selection is not installation authorization" };
        break;
      }
      case "route": result = route(readRegistry(state), { scope: required(args, "scope"), server_ids: list(args.server), project_ids: list(args.project) }); break;
      case "server-check": result = await checkServer(state, required(args, "server"), { profile: args.profile ?? "base",
        minFreeMiB: integer(args["min-free-mib"], 1024), minMemoryMiB: integer(args["min-memory-mib"], 256) }); break;
      case "fleet": result = generateFleet(state, { staleHours: integer(args["stale-hours"], 24) }); break;
      case "task-plan": {
        const file = required(args, "file");
        if (!isAbsolute(file)) throw new OpsError("--file must be an absolute task request path");
        result = await prepareTask(state, readBoundedJson(file)); break;
      }
      case "task-authorize": result = authorizeTask(state, required(args, "task"), required(args, "digest"), required(args, "by"), required(args, "statement"), args["ack-destructive"] ?? null); break;
      case "task-run": result = await runTask(state, required(args, "task")); break;
    }
    process.stdout.write(JSON.stringify(result, null, 2) + "\n");
    return ["blocked", "failed", "partial", "unknown", "stale", "docs_pending", "interrupted"].includes(result.status) ? 2 : 0;
  } catch (error) {
    process.stderr.write(JSON.stringify({ status: "blocked", error: error.message || String(error) }) + "\n");
    return 2;
  }
}
