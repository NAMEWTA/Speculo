#!/usr/bin/env node
/** Execute deterministic disposable artifact fixtures through the actual CLI
 * installation and its shipped tools. This is NOT a host/model observer. */
import { spawnSync } from "node:child_process";
import { lstat, mkdir, mkdtemp, readFile, readdir, readlink, realpath } from "node:fs/promises";
import { dirname, join, relative, resolve, sep } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";
import { canonicalJSON, evidencePath, safeRelative } from "./lib/evaluation-evidence.mjs";
import { evaluateScenarios } from "./evaluate-scenarios.mjs";
import {
  STAMP, PARENT, SOURCE, CHILD, LEARNING, LESSON, HOMEWORK, REVIEW, ORIGINAL, sha, json, readJson, put, putJson,
  relocationFixture, learningEvidenceFixture, lessonMetadata, lessonBody, markdown, homeworkFixture, retentionFixture,
  consultationFixture, mediaFixture, expiredPlanFixture,
} from "../test/fixtures/artifact-workspaces.mjs";

const repository = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const RUNNER = "installed-cli-artifacts-v1";
const installWrites = [".agents", "AGENTS.md", "CLAUDE.md", ".gitignore"];
const portable = path => path.split(sep).join("/");
const within = (path, prefix) => path === prefix || path.startsWith(prefix + "/");

/** Includes directories/modes and link identities, never follows a link. */
export async function fixtureInventory(root, { filesOnly = false, exclude = [] } = {}) {
  const values = {};
  async function visit(base = "") {
    for (const entry of (await readdir(join(root, base), { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name, "en"))) {
      const path = base ? base + "/" + entry.name : entry.name;
      if (exclude.some(prefix => within(path, prefix))) continue;
      const full = join(root, path), stat = await lstat(full);
      if (stat.isSymbolicLink()) values[path] = { kind: "symlink", target: await readlink(full), mode: stat.mode & 0o777 };
      else if (stat.isDirectory()) {
        if (!filesOnly) values[path] = { kind: "directory", mode: stat.mode & 0o777 };
        await visit(path);
      } else if (stat.isFile()) values[path] = { kind: "file", mode: stat.mode & 0o777, sha256: sha(await readFile(full)) };
      else values[path] = { kind: "special", mode: stat.mode & 0o777 };
    }
  }
  await visit(); return values;
}

async function makeContext(repo, artifactRoot, scenario, trace) {
  const caseRoot = await evidencePath(artifactRoot, scenario.id), project = join(caseRoot, "project");
  await mkdir(project, { recursive: true });
  const assets = join(project, ".agents/speculo"), cli = join(repo, "dist/src/cli.js"), names = new Set();
  const event = (kind, payload) => trace.push({ schema_version: 1, sequence: trace.length + 1, scenario_id: scenario.id, kind, payload });
  async function run(name, script, args, allowedWrites = []) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name) || names.has(name) || allowedWrites.some(path => !safeRelative(path))) throw new Error("invalid/duplicate fixture step");
    names.add(name);
    const before = await fixtureInventory(project), startedAt = new Date().toISOString();
    const result = spawnSync(process.execPath, [script, ...args], { cwd: project, env: { ...process.env, CI: "true", SPECULO_NO_UPDATE: "1" }, encoding: "utf8", timeout: 60_000, maxBuffer: 16 * 1024 * 1024, shell: false });
    const after = await fixtureInventory(project), finishedAt = new Date().toISOString();
    const changes = [...new Set([...Object.keys(before), ...Object.keys(after)])].sort().filter(path => canonicalJSON(before[path] ?? null) !== canonicalJSON(after[path] ?? null)).map(path => ({ path, before: before[path] ?? null, after: after[path] ?? null }));
    const forbidden = changes.filter(change => !allowedWrites.some(prefix => within(change.path, prefix)));
    const effect = forbidden.length ? "undeclared-local-write" : changes.length ? "declared-local-write" : "read-only";
    const record = { schema_version: 1, source: "disposable-artifact-harness", name, executable: process.execPath, script, script_sha256: sha(await readFile(script)), args, cwd: project, started_at: startedAt, finished_at: finishedAt, exit_code: result.error || !Number.isInteger(result.status) ? null : result.status, signal: result.signal, spawn_error: result.error?.message ?? null, effect, inventory_scope: "fixture project only; transient operations, external effects and process reads are not observed", allowed_writes: allowedWrites, changes, forbidden_changes: forbidden };
    await put(join(caseRoot, "logs", name + ".stdout.txt"), result.stdout ?? "");
    await put(join(caseRoot, "logs", name + ".stderr.txt"), result.stderr ?? "");
    await putJson(join(caseRoot, "logs", name + ".process.json"), record);
    if (result.error || !Number.isInteger(result.status)) {
      event("evidence", { name: "spawn-failed", step: name, error: record.spawn_error ?? result.signal });
      throw new Error(name + ": process did not complete; no successful exit is inferred");
    }
    event("tool", { name, exit_code: result.status, effect, source: "disposable-artifact-harness", process: "logs/" + name + ".process.json", forbidden_paths: forbidden.map(change => change.path) });
    return { ...result, json: () => JSON.parse(result.stdout) };
  }
  async function install(workflow) {
    const result = await run("install", cli, ["init", project, ...(workflow ? ["--workflows", workflow] : ["--core-only"]), "--hub-skills", "none", "--skill-targets", "none"], installWrites);
    if (result.status !== 0) throw new Error("actual CLI installation failed: " + result.stderr);
  }
  const snapshot = async (name, root, exclude = []) => putJson(join(caseRoot, name), await fixtureInventory(root, { filesOnly: true, exclude }));
  const copy = async (from, to) => put(join(caseRoot, to), await readFile(from));
  return { caseRoot, project, assets, cli, event, run, install, snapshot, copy, state: workflow => join(assets, ".speculo", workflow), tool: path => join(assets, "workflows", path), writeScope: path => portable(relative(project, path)) };
}

const handlers = {
  async "artifact-install-refresh"(c) {
    await c.install("learning");
    await put(join(c.state("learning"), "context/user-notes.md"), ORIGINAL);
    await c.snapshot("before.json", c.state("learning"));
    await c.run("refresh", c.cli, ["init", c.project], installWrites);
    await c.snapshot("after.json", c.state("learning"));
    await c.run("doctor", c.cli, ["doctor", c.project, "--json"]);
  },
  async "artifact-install-unsupported-state"(c) {
    await c.install(null);
    const path = join(c.assets, ".speculo/install.json"), state = await readJson(path);
    state.schema_version = 0; await putJson(path, state);
    await c.snapshot("before.json", c.project);
    await c.run("reject-refresh", c.cli, ["init", c.project], installWrites);
    await c.snapshot("after.json", c.project);
  },
  async "artifact-install-foreign-lock"(c) {
    await c.install(null);
    await put(join(c.project, ".agents/.speculo-install.lock"), "foreign fixture lock\n");
    await c.snapshot("before.json", c.project);
    await c.run("reject-locked-refresh", c.cli, ["init", c.project]);
    await c.snapshot("after.json", c.project);
  },
  async "artifact-core-dispatch"(c) {
    await c.install(null);
    const scope = ".agents/speculo/.speculo/coordination", session = "20261018T080000Z", task = "001-handoff";
    await put(join(c.project, scope, "sessions", session, task, "TASK.md"), `---\nschema_version: 2\nsession: "${session}"\ntask: "${task}"\nkind: handoff\n---\n\n${["Goal", "Inputs", "Workspace and Scope", "Acceptance", "Return"].map(title => `## ${title}\nExplicit disposable task; no business-state mutation.\n`).join("\n")}`);
    await c.snapshot("before.json", c.project);
    await c.run("validate-dispatch", join(c.assets, "references/coordination/scripts/validate-dispatch.mjs"), ["--repo", c.project, "--scope-root", scope, "--session", session, "--task", task, "--stage", "dispatch"]);
    await c.snapshot("after.json", c.project);
  },
  async "artifact-specdev-closure"(c) {
    await c.install("specdev");
    const change = join(c.state("specdev"), "changes/2026-10-19-direct");
    await put(join(change, "README.md"), "# Direct fixture\nOutcome: active\n<a id=\"scope\"></a>\n## Scope\nRead-only verification fixture.\n<a id=\"acceptance\"></a>\n## Acceptance\n- [ ] AC-1 keeps the declared read scope.\n<a id=\"verification\"></a>\n## Verification\nActual implementation is pending.\n## Next Step\nRun the scoped check.\n");
    const tool = c.tool("specdev/common/tools/validate-specdev.mjs");
    await c.snapshot("before.json", c.state("specdev"));
    await c.run("validate-spec", tool, ["--repo", c.project, "--stage", "spec", change]);
    await c.run("reject-active-archive", tool, ["--repo", c.project, "--stage", "archive-ready", change]);
    await c.snapshot("after.json", c.state("specdev"));
  },
  async "artifact-specdev-unsupported-state"(c) {
    await c.install("specdev");
    const change = join(c.state("specdev"), "changes/2026-10-19-direct");
    await put(join(change, "README.md"), "# Unsupported authority fixture\nOutcome: active\n");
    await put(join(c.state("specdev"), "status.json"), '{"schema_version":0,"original":"preserve bytes"}\r\n');
    await c.snapshot("before.json", c.state("specdev"));
    await c.run("reject-unsupported-state", c.tool("specdev/common/tools/validate-specdev.mjs"), ["--repo", c.project, "--stage", "spec", change]);
    await c.snapshot("after.json", c.state("specdev"));
  },
  async "artifact-learning-relocation-lock"(c) {
    await c.install("learning"); const root = await relocationFixture(c.assets), tool = c.tool("learning/common/tools/relocate-learning.mjs");
    const args = ["--state-root", root, "--parent", PARENT, "--source", SOURCE];
    const plan = await c.run("relocation-plan", tool, args);
    await put(join(root, ".consolidate.lock"), "foreign fixture lock\n");
    await c.snapshot("before.json", root, ["transactions", "locks"]);
    await c.run("reject-foreign-lock", tool, [...args, "--apply", "--expect-digest", plan.json().plan_digest], [c.writeScope(join(root, "transactions"))]);
    await c.snapshot("after.json", root, ["transactions", "locks"]);
  },
  async "artifact-learning-relocation-recovery"(c) {
    await c.install("learning"); const root = await relocationFixture(c.assets, true), tool = c.tool("learning/common/tools/relocate-learning.mjs");
    const args = ["--state-root", root, "--parent", PARENT, "--source", SOURCE], writes = [c.writeScope(root)];
    await c.snapshot("before.json", root, ["transactions", "locks"]);
    const plan = await c.run("relocation-plan", tool, args);
    const applied = await c.run("relocation-apply", tool, [...args, "--apply", "--expect-digest", plan.json().plan_digest], writes);
    const manifest = applied.json().manifest, moved = join(root, "changes", PARENT, "children", SOURCE);
    for (const [file, label] of [[join(root, "status.json"), "moved-status.json"], [join(root, "locations.json"), "moved-locations.json"], [join(moved, ".status.json"), "moved-source.json"], [join(moved, "children", CHILD, ".status.json"), "moved-child.json"], [manifest, "prepared-and-applied-manifest.json"]]) await c.copy(file, label);
    await c.run("validate-moved-state", c.tool("learning/common/tools/validate-learning.mjs"), ["--state-root", root]);
    await c.run("resume-applied", tool, ["--state-root", root, "--resume", manifest], writes);
    await c.run("rollback", tool, ["--state-root", root, "--rollback", manifest], writes);
    await c.run("rollback-again", tool, ["--state-root", root, "--rollback", manifest], writes);
    await c.snapshot("after.json", root, ["transactions", "locks"]);
  },
  async "artifact-learning-budget"(c) {
    await c.install("learning"); const f = await learningEvidenceFixture(c.assets), tool = c.tool("learning/common/tools/validate-learning.mjs");
    await c.run("validate-budget", tool, ["--state-root", f.root]);
    await put(join(f.change, LESSON), markdown({ ...lessonMetadata(), time_budget: [{ segment: "invalid", minutes: 80 }] }, lessonBody));
    await c.snapshot("before.json", f.root);
    await c.run("reject-budget", tool, ["--state-root", f.root]);
    await c.snapshot("after.json", f.root);
  },
  async "artifact-learning-submission"(c) {
    await c.install("learning"); const f = await learningEvidenceFixture(c.assets), tool = c.tool("learning/common/tools/validate-learning.mjs");
    await put(join(f.change, HOMEWORK), homeworkFixture());
    await c.run("validate-submission", tool, ["--state-root", f.root]);
    await put(join(f.change, HOMEWORK), homeworkFixture().replace("用户原始回答", "外来改动后的回答"));
    await c.snapshot("before.json", f.root);
    await c.run("reject-answer-drift", tool, ["--state-root", f.root]);
    await c.snapshot("after.json", f.root);
  },
  async "artifact-learning-retention"(c) {
    await c.install("learning"); const f = await learningEvidenceFixture(c.assets), tool = c.tool("learning/common/tools/validate-learning.mjs");
    Object.assign(f.state.mastery, { overall: "retention_verified", retention: "passed", evidence: [REVIEW] });
    await putJson(join(f.change, ".status.json"), f.state);
    await c.run("reject-missing-review", tool, ["--state-root", f.root]);
    await put(join(f.change, REVIEW), retentionFixture());
    await c.run("validate-retention", tool, ["--state-root", f.root]);
    await put(join(f.change, REVIEW), retentionFixture("2026-10-16T12:00:00.000Z"));
    await c.snapshot("before.json", f.root);
    await c.run("reject-premature-review", tool, ["--state-root", f.root]);
    await c.snapshot("after.json", f.root);
  },
  async "artifact-person-isolation"(c) {
    await c.install("person"); const tool = c.tool("person/person-m-mao-zedong-cognitive-os/scripts/consultation-state.mjs");
    const root = c.state("person"), global = await readJson(join(root, "status.json")); global.extension = "retained"; await putJson(join(root, "status.json"), global);
    for (const [suffix, type] of [["consultation-one", "决策方法"], ["consultation-two", "团队/组织问题"]]) {
      const f = await consultationFixture(c.assets, suffix); f.state.problem_type = type; await f.save();
      const args = ["--state-root", root, "--change", f.change, "--candidate", f.candidate];
      const checked = await c.run("validate-" + suffix, tool, args);
      await c.run("publish-" + suffix, tool, [...args, "--publish", "--expect-digest", checked.json().candidate_sha256], [c.writeScope(root)]);
    }
    await c.snapshot("before.json", root);
    await c.run("refresh", c.cli, ["init", c.project], installWrites);
    await c.snapshot("after.json", root);
  },
  async "artifact-person-phase-gate"(c) {
    await c.install("person"); const f = await consultationFixture(c.assets), tool = c.tool("person/person-m-mao-zedong-cognitive-os/scripts/consultation-state.mjs");
    const args = ["--state-root", f.root, "--change", f.change, "--candidate", f.candidate];
    const checked = await c.run("validate-activation", tool, args);
    await c.run("publish-activation", tool, [...args, "--publish", "--expect-digest", checked.json().candidate_sha256], [c.writeScope(f.root)]);
    f.state.phase = "diagnosing"; await f.save();
    await c.snapshot("before.json", f.root);
    await c.run("reject-missing-phase-evidence", tool, [...args, "--publish", "--expect-digest", sha(await readFile(f.candidate))]);
    await c.snapshot("after.json", f.root);
  },
  async "artifact-ops-resource-state"(c) {
    await c.install("ops"); const root = c.state("ops"), tool = c.tool("ops/common/tools/validate-ops.mjs");
    await c.run("validate-resource-state", tool, ["--state-root", root]);
    const state = await readJson(join(root, "status.json")); state.schema_version = 0; await putJson(join(root, "status.json"), state);
    await c.snapshot("before.json", root);
    await c.run("reject-resource-state", tool, ["--state-root", root]);
    await c.snapshot("after.json", root);
  },
  async "artifact-ops-expired-approval"(c) {
    await c.install("ops"); const f = await expiredPlanFixture(c.assets), tool = c.tool("ops/common/tools/ops.mjs");
    await c.run("validate-expired-fixture", tool, ["--state", f.root, "validate", "--file", f.path, "--schema", "plan"]);
    await c.snapshot("before.json", f.root);
    await c.run("reject-expired-approval", tool, ["--state", f.root, "approve", "--run", f.run, "--digest", sha(canonicalJSON(f.plan)), "--by", "SIMULATED FIXTURE", "--statement", "No user authorization: exercise rejection of this disposable expired fixture"]);
    await c.snapshot("after.json", f.root);
  },
  async "artifact-media-article"(c) {
    await c.install("media"); const f = await mediaFixture(c.assets);
    await c.snapshot("before.json", f.root);
    await c.run("validate-article", c.tool("media/common/tools/media-tools.mjs"), ["check-artifacts", f.change]);
    await c.run("validate-media-state", c.tool("media/common/tools/validate-media.mjs"), ["--state-root", f.root]);
    await c.snapshot("after.json", f.root);
  },
  async "artifact-media-drift"(c) {
    await c.install("media"); const f = await mediaFixture(c.assets), tool = c.tool("media/common/tools/media-tools.mjs");
    await c.run("validate-original", tool, ["check-artifacts", f.change]);
    await put(join(f.change, "master.md"), "Human edit must survive the rejected check.\r\n");
    await c.snapshot("before.json", f.root);
    await c.run("reject-artifact-drift", tool, ["check-artifacts", f.change]);
    await c.snapshot("after.json", f.root);
  },
  async "artifact-media-owner"(c) {
    await c.install("media"); const f = await mediaFixture(c.assets);
    f.manifest.artifacts[0].owner = "media/video"; await putJson(join(f.change, "artifacts.json"), f.manifest);
    await c.snapshot("before.json", f.root);
    await c.run("reject-foreign-owner", c.tool("media/common/tools/media-tools.mjs"), ["check-artifacts", f.change]);
    await c.snapshot("after.json", f.root);
  },
  async "artifact-media-draft"(c) {
    await c.install("media"); const tool = c.tool("media/common/tools/media-tools.mjs"), root = join(c.project, "draft-fixture"), request = join(root, "request.json"), output = join(root, "drafts");
    await mkdir(output, { recursive: true }); await put(join(root, "image.txt"), "Actual local copy fixture; not an image quality claim.\n");
    const draft = { schema_version: 1, content_id: "fixture", revision: 1, channel: "local", account: "fictional-test", title: "Original local draft", body: "Synthetic draft fixture", media: ["image.txt"], sources: [], claims: [], approvals: [], publication_authorization: "not-authorized" };
    await putJson(request, draft);
    const fingerprint = await c.run("fingerprint-draft", tool, ["fingerprint-draft", request, root]);
    await c.run("reject-unapproved-draft", tool, ["export-draft", request, output, root]);
    draft.approvals = ["direction", "platform", "title", "final"].map(gate => ({ gate, approved: true, by: "SIMULATED FIXTURE; no user authorization", at: STAMP, digest: fingerprint.json().digest }));
    await putJson(request, draft);
    const exported = await c.run("export-local-draft", tool, ["export-draft", request, output, root], [c.writeScope(output)]);
    const path = exported.json().path;
    await c.copy(join(path, "package.json"), "draft-package.json"); await c.copy(join(path, "draft.md"), "draft.md"); await c.copy(join(path, "media/1-image.txt"), "copied-media.txt");
    await c.run("reuse-local-draft", tool, ["export-draft", request, output, root]);
  },
};

export async function runArtifactScenarios({ repoRoot = repository, outputRoot, scenarioIds = [] } = {}) {
  const repo = await realpath(repoRoot), scenarios = await readJson(join(repo, "test/fixtures/scenarios.json"));
  const available = scenarios.filter(scenario => scenario.execution?.runner === RUNNER);
  if (new Set(scenarioIds).size !== scenarioIds.length || scenarioIds.some(id => !available.some(scenario => scenario.id === id))) throw new Error("unknown, duplicate or non-executable artifact scenario");
  if (available.some(scenario => !Object.hasOwn(handlers, scenario.id)) || Object.keys(handlers).some(id => !available.some(scenario => scenario.id === id))) throw new Error("artifact scenario registry and installed runner disagree");
  const selected = available.filter(scenario => !scenarioIds.length || scenarioIds.includes(scenario.id));
  if (!selected.length) throw new Error("no executable artifact scenarios selected");
  const cli = join(repo, "dist/src/cli.js");
  if (!(await lstat(cli)).isFile()) throw new Error("build the real CLI before executing artifact scenarios");
  let output;
  if (outputRoot) {
    output = resolve(outputRoot);
    // A fresh directory only. Never clear, reuse or replace a user-selected tree.
    await evidencePath(dirname(output), output.split(sep).at(-1));
    await mkdir(output);
  } else output = await mkdtemp(join(await realpath(tmpdir()), "speculo-artifact-scenarios-"));
  const artifactRoot = join(output, "artifacts"); await mkdir(artifactRoot);
  const trace = [], errors = [], inputs = [];
  for (const path of [...new Set(selected.flatMap(scenario => scenario.instruction_paths ?? []))].sort()) inputs.push({ path, sha256: sha(await readFile(await evidencePath(repo, path))) });
  await putJson(join(output, "inputs.json"), { kind: "working-tree-input-digests", authenticated: false, instructions: inputs });
  await putJson(join(output, "fixtures.json"), selected);
  for (const scenario of selected) {
    const context = await makeContext(repo, artifactRoot, scenario, trace);
    try { await handlers[scenario.id](context); }
    catch (error) { errors.push({ id: scenario.id, error: error.message }); await put(join(context.caseRoot, "runner-error.txt"), error.stack ?? String(error)); }
  }
  await put(join(output, "trace.jsonl"), trace.map(event => JSON.stringify(event)).join("\n") + "\n");
  const evaluation = await evaluateScenarios(selected, trace, artifactRoot, { require: "artifacts" });
  const result = {
    ...evaluation, ...(errors.length ? { status: "blocked-artifact-runner", artifact_gates_passed: false, exit_code: 2 } : {}),
    output_root: output, runner: RUNNER, model_executed: false, observer_authenticated: false, publication_authorized: false,
    coverage: { registry_cases: scenarios.length, selected_artifact_cases: selected.length, not_run: scenarios.filter(scenario => !selected.includes(scenario)).map(scenario => ({ id: scenario.id, status: "not-evaluated", reason: scenario.execution?.runner === RUNNER ? "not selected" : "requires a real host/model observation; no observer run supplied" })) },
    evidence_scope: "actual installed CLI/tool subprocesses and before/after fixture file inventories; test harness inputs, not model behavior; unreported transient reads/writes, external effects, semantic quality and publication are not certified",
    runner_errors: errors,
  };
  await putJson(join(output, "result.json"), result);
  return result;
}

export function parseArtifactRunnerArgs(args) {
  const options = { scenarioIds: [] };
  for (let i = 0; i < args.length; i++) {
    const key = args[i], value = args[++i];
    if (!["--output", "--scenario"].includes(key) || !value || value.startsWith("--")) throw new Error("usage: run-artifact-scenarios.mjs [--output NEW_DIRECTORY] [--scenario ID ...]");
    if (key === "--output") { if (options.outputRoot) throw new Error("duplicate --output"); options.outputRoot = value; }
    else options.scenarioIds.push(value);
  }
  return options;
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try { const result = await runArtifactScenarios(parseArtifactRunnerArgs(process.argv.slice(2))); console.log(JSON.stringify(result, null, 2)); process.exitCode = result.exit_code; }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
