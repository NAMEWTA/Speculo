import {attachReviewFixture} from './helpers/review-fixture.js';
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";
import { chmod, mkdir, mkdtemp, readFile, readdir, rm, writeFile as writeRaw } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";
import { describe, it } from "node:test";

import { writeDesignFixture } from "./helpers/design-fixture.js";

// Fixture writes keep the unique per-Ticket execution evidence while replacing prose.
const writeFile: typeof writeRaw = async (file, data, options) => {
  if (typeof file === "string" && /[\\/]evidence[\\/]T-\d{2,}\.md$/.test(file) && typeof data === "string") {
    const old = await readFile(file, "utf8").catch(() => "");
    const record = old.match(/^## Workspace Execution Record\n[\s\S]*?(?=^## |$(?![\s\S]))/m)?.[0];
    if (record && !/^## Workspace Execution Record\n[\s\S]*?```json/m.test(data)) { data = data.replace(/^## Workspace Execution Record\n[\s\S]*?(?=^## |$(?![\s\S]))/m, ""); data += `\n${record}`; }
  }
  return writeRaw(file, data, options);
};

const packageRoot = process.cwd();
import { DEFAULT_ROOTS } from "../src/paths.js";
const fixtureProject = (p:string):string => p.split(/[\\/]\.agents[\\/]speculo[\\/]/)[0];
const changeName = "2026-08-07-local-first";
const validator = join(
  packageRoot,
  "template/workflows/specdev/common/tools/validate-specdev.mjs",
);
const prototypeTemplate = join(
  packageRoot,
  "template/workflows/specdev/specdev-p-prototype/assets/design-system-template.md",
);
const prototypeMaterializer = join(
  packageRoot,
  "template/workflows/specdev/specdev-p-prototype/scripts/materialize-prototype.mjs",
);
const specTemplate = join(
  packageRoot,
  "template/workflows/specdev/specdev-s-spec/assets/spec-template.md",
);
const ticketsMapTemplate = join(
  packageRoot,
  "template/workflows/specdev/specdev-t-tickets/assets/tickets-map-template.md",
);
const ticketTemplate = join(
  packageRoot,
  "template/workflows/specdev/specdev-t-tickets/assets/ticket-template.md",
);

async function fixture(): Promise<string> {
  const parent = await mkdtemp(join(tmpdir(), "specdev-local-first-"));
  const root = join(parent, ".agents/speculo/.speculo/specdev/changes", changeName);
  await mkdir(root,{recursive:true});
  await writeFile(join(parent,".agents/speculo/.speculo/workspace.json"),JSON.stringify({schema_version:2,layout_version:"agents-v2",installation_id:"00000000-0000-0000-0000-000000000000",path_base:"project-root",roots:DEFAULT_ROOTS}));
  await writeConfig(root);
  return root;
}

async function controllerFixture(): Promise<string> {
  const root = await fixture();
  assert.equal(spawnSync("git", ["init", "-b", "main"], { cwd: fixtureProject(root) }).status, 0);
  return root;
}

async function writeConfig(root: string, maxImplementationAgents = 3, maxIntegrationAttempts = 3): Promise<void> {
  const configRoot = join(fixtureProject(root), ".agents/speculo/.speculo/specdev");
  await mkdir(configRoot, { recursive: true });
  await writeFile(join(configRoot, "config.json"), JSON.stringify({
    schema_version: 7,
    github: { include_external_prs: false, labels: {} },
    interaction_language: "zh-CN",
    artifact_language: "zh-CN",
    git: { default_branch: "main" },
    execution: {
      max_concurrent_implementations: maxImplementationAgents,
      max_integration_attempts: maxIntegrationAttempts,
      deep_ticket_human_approval: true,
      shared_path_owner: "explicit",
    },
    verification: { test: null, typecheck: null, lint: null, build: null },
    planning: {
      default_depth: "standard",
      require_ready_gate: true,
      require_evidence: true,
      ui_design_default_candidates: 3,
      ui_design_max_candidates: 4,
    },
  }, null, 2) + "\n");
}

async function writeStatus(root: string, status = "active", worktrees: unknown[] = []): Promise<void> {
  return writeNamedStatus(root, basename(root), status, null, worktrees);
}

async function writeNamedStatus(root: string, name: string, status = "active", currentWork: string | null = null, worktrees: unknown[] = []): Promise<void> {
  await mkdir(root, {recursive:true});
  await writeFile(join(root, "README.md"), `# ${name}\n\nOutcome: ${status === "blocked" ? "active" : status}\n\n## Ownership\nOwner: lead-session\nWork: ${currentWork ?? "specdev/implement"}\nEvidence: ownership.md\n\n## Next Steps\nUse the owning plan and its Ticket Evidence for implementation and acceptance.\n`);
  await writeFile(join(root, "ownership.md"), `Owner: lead-session\nWork: ${currentWork ?? "specdev/implement"}\nSource: simulated fixture authorization\n`);
  const evidence = join(root, "evidence");
  for (const file of await readdir(evidence).catch(() => [])) {
    if (!/^T-\d{2,}\.md$/.test(file)) continue;
    const path = join(evidence,file), text = await readFile(path,"utf8");
    await writeRaw(path,text.replace(/^## Workspace Execution Record\n[\s\S]*?(?=^## |$(?![\s\S]))/m,""));
  }
  for (const value of worktrees) {
    const record = value as any;
    await mkdir(evidence,{recursive:true});
    const path = join(evidence,`${record.ticket_id}.md`), text = await readFile(path,"utf8").catch(()=>"# Ticket Evidence\n");
    await writeRaw(path,`${text}\n## Workspace Execution Record\n\n\x60\x60\x60json\n${JSON.stringify(record,null,2)}\n\x60\x60\x60\n`);
  }
}

async function writeImplementationArtifacts(
  root: string,
  members: string[],
  options: {
    dependencies?: string[];
    serializations?: string[];
    status?: "ready" | "in_progress" | "blocked" | "completed";
    sourceMapRevision?: number;
  } = {},
): Promise<void> {
  const status = options.status ?? "ready";
  const ready = new Set(["ready", "in_progress"]).has(status);
  const tasks = members.map((member) => `${member}::T-01`);
  await writeFile(join(root, "implementation-map.md"), [
    "---",
    "schema_version: 1",
    "artifact: implementation-map",
    `change: ${basename(root)}`,
    `status: ${status}`,
    "revision: 1",
    `members: [${members.join(", ")}]`,
    `tasks: [${tasks.join(", ")}]`,
    `dependencies: [${(options.dependencies ?? []).map((value) => `"${value}"`).join(", ")}]`,
    `serializations: [${(options.serializations ?? []).map((value) => `"${value}"`).join(", ")}]`,
    "---",
    "## 1. Members and Source Authority",
    "members",
    "## 2. Composite Ticket Inventory",
    "tasks",
    "## 3. Implementation Super-DAG",
    "edges",
    "## 4. Conflict and Serialization",
    "locks",
    "## 5. Contract and Path Coverage",
    "coverage",
    "## 6. Revision Log",
    "revision 1",
  ].join("\n"));
  await writeFile(join(root, "implementation-plan.md"), [
    "---",
    "schema_version: 3",
    "artifact: implementation-plan",
    `change: ${basename(root)}`,
    `status: ${status}`,
    `source_map_revision: ${options.sourceMapRevision ?? 1}`,
    "orchestration: lead-directed",
    "lead: lead-session",
    "concurrent_implementation_limit: 3",
    "integration_attempt_limit: 3",
    "ticket_execution: auto",
    "max_parallel_tickets: 3",
    `ready_for_execution: ${ready}`,
    "---",
    "## 1. Outcome and Authority",
    "outcome",
    "## 2. Ready Frontier and Waves",
    "frontier",
    "## 3. Workspace and Dispatch Contract",
    "workspace",
    "## 4. Repository Integration Queue",
    "queue",
    "## 5. Gates and Aggregate Verification",
    "gates",
    "## 6. Conflict, Drift and Recovery",
    "recovery",
    "## 7. Progress and Decisions",
    "progress",
  ].join("\n"));
}

async function writeReadyChild(
  root: string,
  name: string,
  writablePath: string,
  options: { changeStatus?: "active" | "blocked" | "completed"; ticketStatus?: "ready" | "cancelled" } = {},
): Promise<void> {
  const changeStatus = options.changeStatus ?? "active";
  const ticketStatus = options.ticketStatus ?? "ready";
  await writeNamedStatus(root, name, changeStatus);

  let spec = (await readFile(specTemplate, "utf8")).replace(/\r\n?/g, "\n");
  spec = spec
    .replace("change: <YYYY-MM-DD-topic>", `change: ${name}`)
    .replace("skill_scan: unreviewed", "skill_scan: fixture inspected project roots; no applicable Skills")
    .replace("deliverable_policy: unreviewed", "deliverable_policy: fixture requires no additional quantified deliverables")
    .replace("status: draft", "status: ready")
    .replace("ready_for_tickets: false", "ready_for_tickets: true")
    .replace("\n存在高影响未决问题时，`ready_for_tickets` 必须为 `false`。", "");
  await writeFile(join(root, "spec.md"), spec);

  let map = (await readFile(ticketsMapTemplate, "utf8")).replace(/\r\n?/g, "\n");
  map = map
    .replace("change: <YYYY-MM-DD-topic>", `change: ${name}`)
    .replace("skill_scan: unreviewed", "skill_scan: fixture inspected project roots; no applicable Skills")
    .replace("deliverable_policy: unreviewed", "deliverable_policy: fixture requires no additional quantified deliverables")
    .replace("status: draft", ticketStatus === "ready" ? "status: ready" : "status: completed");
  await writeFile(join(root, "tickets-map.md"), map);

  let ticket = (await readFile(ticketTemplate, "utf8")).replace(/\r\n?/g, "\n");
  ticket = ticket
    .replace("change: <YYYY-MM-DD-topic>", `change: ${name}`)
    .replace("skill_scan: unreviewed", "skill_scan: fixture inspected project roots; no applicable Skills")
    .replace("deliverable_policy: unreviewed", "deliverable_policy: fixture requires no additional quantified deliverables")
    .replace("status: draft", `status: ${ticketStatus}`)
    .replace("ready: false", `ready: ${ticketStatus === "cancelled" ? "false" : "true"}`)
    .replace('expected_changes: ["<Path>src/example.ts</Path>"]', `expected_changes: ["<Path>${writablePath}</Path>"]`)
    .replace('writable_paths: ["<Path>src/example/**</Path>"]', `writable_paths: ["<Path>${writablePath}</Path>"]`)
    .replace("\n存在会改变行为、接口、数据、兼容、安全、范围、迁移或验收的问题时，frontmatter 中 `ready` 必须为 `false`。", "");
  await mkdir(join(root, "ticket"), { recursive: true });
  await writeFile(join(root, "ticket", "01-implementation.md"), ticket);

}

async function writeDesignPackage(
  root: string,
  status: "detecting" | "selecting" | "ready" | "blocked" = "ready",
  withComparison = true,
): Promise<string> {
  return writeDesignFixture(root, status, withComparison);
}

async function writeSourceAndTriage(root: string, externalAction = "pending-close"): Promise<void> {
  await writeFile(
    join(root, "source.md"),
    [
      "---",
      "schema_version: 1",
      "artifact: source",
      `change: ${changeName}`,
      "source_type: github-issue",
      "canonical_locator: https://github.com/owner/repo/issues/1",
      "captured_at: 2026-08-07T00:00:00Z",
      `content_sha256: ${"a".repeat(64)}`,
      "remote_state: open",
      "close_capability: supported",
      "---",
      "",
      "# Source",
      "",
      "## Capture Metadata",
      "metadata",
      "## Original Content",
      "body",
      "## Source Comments",
      "none",
      "",
    ].join("\n"),
  );
  await writeFile(
    join(root, "triage.md"),
    [
      "---",
      "schema_version: 3",
      "artifact: triage",
      "disposition: needs-triage",
      "verification: pending",
      "remote_actions: []",
      `change: ${changeName}`,
      "mode: intake",
      "source: <Path>{roots.state}/specdev/changes/{change}/source.md</Path>",
      "classification: bug",
      "risk: medium",
      "route: specdev/diagnose-bugs",
      "ready_for_implementation: false",
      "updated_at: 2026-08-07T00:00:00Z",
      "---",
      "",
      "# Triage",
      "",
      "## 当前判定",
      "observed",
      "## 未知项",
      "none",
      "## 路由",
      "diagnosis",
      "## 实施简报",
      "fixture evidence and bounded next steps",
      "## 打标回执",
      externalAction,
      "",
    ].join("\n"),
  );
  await writeFile(join(root, 'delivery.md'), `---
schema_version: 1
artifact: delivery
change: ${changeName}
external_action: ${externalAction}
publish: null
updated_at: 2026-08-07T00:00:00Z
---
## 来源完成回写
${externalAction}
## 发布投影
未请求
## 恢复
真实 fixture 回执
`);
}

function runValidator(root: string, stage?: string, repo?: string) {
  const args = [validator];
  if (stage) args.push("--stage", stage);
  if (repo) args.push("--repo", repo);
  args.push(root);
  return spawnSync(process.execPath, args, {
    encoding: "utf8",
  });
}

async function writeGoalPlan(
  root: string,
  implementationAgentLimit = 3,
  extraFrontmatter: string[] = [],
  extraBody = "",
  integrationAttemptLimit = 3,
): Promise<void> {
  let content = await readFile(
    join(packageRoot, "template/workflows/specdev/specdev-p-goal-plan/assets/goal-plan-template.md"),
    "utf8",
  );
  content = content.replace(/\r\n?/g, "\n");
  content = content
    .replace("change: <YYYY-MM-DD-topic>", `change: ${changeName}`)
    .replace("skill_scan: unreviewed", "skill_scan: fixture inspected project roots; no applicable Skills")
    .replace("deliverable_policy: unreviewed", "deliverable_policy: fixture requires no additional quantified deliverables")
    .replace("status: draft", "status: ready")
    .replaceAll("<owner-or-session-locator>", "lead-session")
    .replace("ticket_execution: auto", `ticket_execution: auto\nconcurrent_implementation_limit: ${implementationAgentLimit}\nmax_parallel_tickets: 3`)
    .replace("integration_attempt_limit: 3", `integration_attempt_limit: ${integrationAttemptLimit}`)
    .replace("ready_for_execution: false", "ready_for_execution: true");
  if (extraFrontmatter.length) {
    content = content.replace(
      "ready_for_execution: true\n---",
      `ready_for_execution: true\n${extraFrontmatter.join("\n")}\n---`,
    );
  }
  await writeFile(
    join(root, "goal-plan.md"),
    `${content}${extraBody}`,
  );
}

async function addControllerTicket(
  root: string,
  id: string,
  dependencies: string[] = [],
  ready = true,
): Promise<string> {
  const original = await readFile(join(root, "ticket", "01-implementation.md"), "utf8");
  const ticket = original.replaceAll("T-01", id)
    .replaceAll("src/upstream.ts", `src/${id.toLowerCase()}.ts`)
    .replace("blocked_by: []", `blocked_by: [${dependencies.join(", ")}]`)
    .replace("status: ready", `status: ${ready ? "ready" : "draft"}`)
    .replace("ready: true", `ready: ${ready}`);
  const file = join(root, "ticket", `${id.slice(2)}-implementation.md`);
  await writeFile(file, ticket);
  const mapPath = join(root, "tickets-map.md");
  await writeFile(mapPath, `${await readFile(mapPath, "utf8")}\n${id}: dependencies ${dependencies.join(", ") || "none"}; repeat DoR after upstream evidence.\n`);
  return file;
}

async function progressiveGoalFixture(): Promise<string> {
  const root = await controllerFixture();
  await writeReadyChild(root, changeName, "src/upstream.ts");
  await writeGoalPlan(root, 3);
  const file = join(root, "ticket", "01-implementation.md");
  await writeFile(file, (await readFile(file, "utf8")).replace("owner: unassigned", "owner: lead-session"));
  return root;
}

describe("SpecDev Goal routing and progressive readiness", () => {
  it("validates single-change draft and Ready Goals without parent artifacts", async () => {
    const root = await progressiveGoalFixture();
    try {
      const goalPath = join(root, "goal-plan.md");
      const readyGoal = await readFile(goalPath, "utf8");
      for (const content of [readyGoal, readyGoal.replace("status: ready", "status: draft").replace("ready_for_execution: true", "ready_for_execution: false")]) {
        await writeFile(goalPath, content);
        const before = await readdir(root);
        const result = runValidator(root, "goal-plan", fixtureProject(root));
        assert.equal(result.status, 0, result.stdout + result.stderr);
        assert.deepEqual(await readdir(root), before);
        assert.equal(await readFile(goalPath, "utf8"), content);
        assert.ok(!before.includes("implementation-map.md") && !before.includes("implementation-plan.md"));
      }
    } finally { await rm(fixtureProject(root), { recursive: true, force: true }); }
  });

  it("requires a valid single-change Goal only at the Goal stage", async () => {
    const root = await progressiveGoalFixture();
    try {
      const goalPath = join(root, "goal-plan.md");
      const readyGoal = await readFile(goalPath, "utf8");
      await rm(goalPath);
      assert.equal(runValidator(root, "tickets", fixtureProject(root)).status, 0);
      const missing = runValidator(root, "goal-plan", fixtureProject(root));
      assert.equal(missing.status, 1);
      assert.match(missing.stdout + missing.stderr, /missing Goal Plan/);
      assert.doesNotMatch(missing.stdout + missing.stderr, /implementation-(map|plan)/);
      const invalid = [
        readyGoal.replace("schema_version: 8", "schema_version: 5"),
        readyGoal.replace("artifact: goal-plan", "artifact: wrong"),
        readyGoal.replace("status: ready", "status: unknown"),
        readyGoal.replace("status: ready", "status: draft"),
        ...['"false"', '"true"', "null", "0", "false"].map(value => readyGoal.replace("ready_for_execution: true", `ready_for_execution: ${value}`)),
        readyGoal.replace("ready_for_execution: true\n", ""),
      ];
      for (const content of invalid) {
        await writeFile(goalPath, content);
        const result = runValidator(root, "goal-plan", fixtureProject(root));
        assert.equal(result.status, 1, content);
        assert.match(result.stdout + result.stderr, /goal-plan\.md:/);
        assert.doesNotMatch(result.stdout + result.stderr, /implementation-(map|plan)/);
      }
    } finally { await rm(fixtureProject(root), { recursive: true, force: true }); }
  });

  it("keeps incomplete parents in the parent branch, including entry-only and plan-only parents", async () => {
    const root = await fixture();
    const members = ["2026-09-08-api", "2026-09-08-ui"];
    try {
      await writeNamedStatus(root, changeName, "active", "specdev/goal-plan");
      for (const [index, member] of members.entries()) await writeReadyChild(join(dirname(root), member), member, `src/member-${index}/**`);
      await writeImplementationArtifacts(root, members);
      const directEntry = runValidator(root, "goal-plan");
      assert.equal(directEntry.status, 0, `parent Map entry: ${directEntry.stdout}${directEntry.stderr}`);
      const entry = (await readFile(join(packageRoot, "template/workflows/specdev/specdev-p-goal-plan/references/goal-tickets-map-template.md"), "utf8"))
        .replaceAll("<YYYY-MM-DD-goal>", changeName).replaceAll("{change}", changeName);
      await writeFile(join(root, "tickets-map.md"), entry);
      assert.equal(runValidator(root, "goal-plan").status, 0);
      const map = await readFile(join(root, "implementation-map.md"), "utf8");
      const plan = await readFile(join(root, "implementation-plan.md"), "utf8");
      for (const present of [["map"], ["plan"], ["entry"], ["entry", "plan"], ["entry", "map"]]) {
        for (const [name, file, content] of [["map", "implementation-map.md", map], ["plan", "implementation-plan.md", plan], ["entry", "tickets-map.md", entry]]) {
          if (present.includes(name)) await writeFile(join(root, file), content);
          else await rm(join(root, file), { force: true });
        }
        for (const stage of [undefined, "goal-plan"]) {
          const result = runValidator(root, stage);
          const output = result.stdout + result.stderr;
          assert.equal(result.status, 1, `${present}: ${output}`);
          for (const [name, file] of [["map", "implementation-map.md"], ["plan", "implementation-plan.md"]]) {
            if (!present.includes(name)) assert.ok(output.includes(`requires ${file}`), output);
          }
          assert.doesNotMatch(output, /missing Goal Plan|missing Spec|missing Tickets Map|missing Ticket directory/);
        }
      }
    } finally { await rm(fixtureProject(root), { recursive: true, force: true }); }
  });

  it("dispatches a Ready producer while its draft consumer waits for DoR", async () => {
    const root = await progressiveGoalFixture();
    try {
      const consumer = await addControllerTicket(root, "T-02", ["T-01"], false);
      const { analyzeMap } = await import(pathToFileURL(join(packageRoot, "template/workflows/specdev/common/tools/ticket-control.mjs")).href);
      const input = { mapPath: join(root, "tickets-map.md"), repoRoot: fixtureProject(root) };
      const before = await readFile(consumer, "utf8");
      let result = analyzeMap(input);
      assert.deepEqual(result.errors, []);
      assert.deepEqual(result.validation_errors, []);
      assert.deepEqual(result.suggested_batch, ["T-01"]);
      assert.match(JSON.stringify(result.blocked), /not Ready: draft/);
      assert.equal(result.authorization_checked, false);
      assert.equal(result.transaction_gateway_checked, false);
      assert.equal(await readFile(consumer, "utf8"), before);
      const validation = runValidator(root, "goal-plan", fixtureProject(root));
      assert.equal(validation.status, 0, validation.stdout + validation.stderr);

      await writeFile(consumer, before.replace("status: draft", "status: ready").replace("ready: false", "ready: true"));
      result = analyzeMap(input);
      assert.deepEqual(result.suggested_batch, ["T-01"]);
      assert.match(JSON.stringify(result.blocked), /dependency not successfully satisfied: T-01/);
      const goalPath = join(root, "goal-plan.md");
      await writeFile(goalPath, (await readFile(goalPath, "utf8")).replace("status: ready", "status: draft").replace("ready_for_execution: true", "ready_for_execution: false"));
      result = analyzeMap(input);
      assert.deepEqual(result.suggested_batch, []);
      assert.match(JSON.stringify(result.blocked), /Goal planning gate is not ready/);
    } finally { await rm(fixtureProject(root), { recursive: true, force: true }); }
  });

  it("retains owner, resource and serial Ticket gates with a draft consumer", async () => {
    const root = await progressiveGoalFixture();
    try {
      await addControllerTicket(root, "T-02", ["T-01"], false);
      const independentPath = await addControllerTicket(root, "T-03");
      const firstPath = join(root, "ticket", "01-implementation.md");
      const first = await readFile(firstPath, "utf8");
      for (const file of [firstPath, independentPath]) {
        await writeFile(file, (await readFile(file, "utf8")).replace("resource_claims: []", 'resource_claims: ["db:users"]'));
      }
      const { analyzeMap } = await import(pathToFileURL(join(packageRoot, "template/workflows/specdev/common/tools/ticket-control.mjs")).href);
      const input = { mapPath: join(root, "tickets-map.md"), repoRoot: fixtureProject(root) };
      let result = analyzeMap(input);
      assert.deepEqual(result.errors, []);
      assert.deepEqual(result.suggested_batch, ["T-01"]);
      assert.match(JSON.stringify(result.deferred), /semantic resource: db:users/);

      await writeGoalPlan(root, 3);
      const goal=join(root,"goal-plan.md"); await writeFile(goal,(await readFile(goal,"utf8")).replace("ticket_execution: auto","ticket_execution: serial"));
      await writeFile(firstPath, first.replace("status: ready", "status: in_progress"));
      result = analyzeMap(input);
      assert.deepEqual(result.errors, []);
      assert.deepEqual(result.suggested_batch, []);
      assert.deepEqual(result.in_flight, [{ id: "T-01", owner: "lead-session" }]);
      assert.match(JSON.stringify(result.deferred), /Ticket scheduling concurrency limit/);

      await writeFile(firstPath, first.replace("owner: lead-session", "owner: unassigned"));
      result = analyzeMap(input);
      assert.deepEqual(result.errors, []);
      assert.deepEqual(result.suggested_batch, ["T-03"]);
      assert.match(JSON.stringify(result.blocked), /implementation owner not assigned/);
    } finally { await rm(fixtureProject(root), { recursive: true, force: true }); }
  });

  it("accepts structurally valid draft consumers when creating a multi-change parent", async () => {
    const root = await fixture();
    const members = ["2026-09-08-api", "2026-09-08-ui"];
    try {
      await writeNamedStatus(root, changeName, "active", "specdev/goal-plan");
      for (const [index, member] of members.entries()) await writeReadyChild(join(dirname(root), member), member, `src/member-${index}/**`);
      await writeImplementationArtifacts(root, members);
      const file = join(dirname(root), members[1], "ticket", "01-implementation.md");
      await writeFile(file, (await readFile(file, "utf8")).replace("status: ready", "status: draft").replace("ready: true", "ready: false"));
      const result = runValidator(root, "goal-plan");
      assert.equal(result.status, 0, result.stdout + result.stderr);
      assert.doesNotMatch(result.stdout + result.stderr, /parent creation requires status=ready/);
    } finally { await rm(fixtureProject(root), { recursive: true, force: true }); }
  });

  it("reports invalid executable readiness locally and blocks its dependency closure", async () => {
    const root = await progressiveGoalFixture();
    try {
      const firstPath = join(root, "ticket", "01-implementation.md");
      const first = await readFile(firstPath, "utf8");
      await addControllerTicket(root, "T-02", ["T-01"]);
      await addControllerTicket(root, "T-03");
      const { analyzeMap } = await import(pathToFileURL(join(packageRoot, "template/workflows/specdev/common/tools/ticket-control.mjs")).href);
      for (const [status, ready] of [["ready", "false"], ["in_progress", "false"], ["review", "false"], ["ready", '"false"']]) {
        await writeFile(firstPath, first.replace("status: ready", `status: ${status}`).replace("ready: true", `ready: ${ready}`));
        const result = analyzeMap({ mapPath: join(root, "tickets-map.md"), repoRoot: fixtureProject(root) });
        assert.deepEqual(result.errors, []);
        assert.deepEqual(result.suggested_batch, ["T-03"]);
        assert.ok(result.validation_errors.some((error: any) => error.id === "T-01" && /executable Ticket must keep ready=true/.test(error.message)), JSON.stringify(result));
        assert.ok(result.blocked.some((node: any) => node.id === "T-02"));
      }
    } finally { await rm(fixtureProject(root), { recursive: true, force: true }); }
  });

  it("does not promote a draft consumer when its producer is successfully done", async () => {
    const root = await progressiveGoalFixture();
    try {
      const consumer = await addControllerTicket(root, "T-02", ["T-01"], false);
      const repo = fixtureProject(root);
      const firstPath = join(root,"ticket","01-implementation.md");
      await writeFile(firstPath,(await readFile(firstPath,"utf8")).replace("status: ready","status: done"));
      await writeFile(join(repo,".gitignore"),".agents/\n");
      await mkdir(join(root,"evidence"),{recursive:true});
      const evidence=join(root,"evidence/T-01.md");
      let text=await readFile(join(packageRoot,"template/workflows/specdev/specdev-i-implement/assets/evidence-template.md"),"utf8");
      text=text.slice(0,text.indexOf("## Workspace Execution Record"));
      await writeRaw(evidence,text);
      const review=attachReviewFixture(repo,root,"evidence/T-01.md");
      const context={schema_version:1,change:changeName,workspace_policy:"current",workspace_ref:"current",branch:"main",base_sha:review.input.scope.base_sha,owner:"lead-session",ticket_execution:"auto"};
      await writeFile(join(root,"README.md"),(await readFile(join(root,"README.md"),"utf8"))+`\n<a id="execution-context"></a>\n## Execution Context\n\n\x60\x60\x60json\n${JSON.stringify(context)}\n\x60\x60\x60\n`);
      const execution={schema_version:1,ticket_id:"T-01",workspace_context:"README.md#execution-context",implementation_owners:["native:implementer"],status:"verified",checkpoint:"evidence/T-01.md#review-input",verification:{status:"passed",evidence:"evidence/T-01.md#verification",e2e:{required:false,status:"not-required",reason:"fixture has no E2E",evidence:null}},attempts:1};
      const acceptance=[{id:"AC-001",result:"passed",method:"fixture",source:"reviewed-value.txt",observed:"fixture value changed"}];
      await writeRaw(evidence,(await readFile(evidence,"utf8"))+`\n## Workspace Execution Record\n\n\x60\x60\x60json\n${JSON.stringify(execution)}\n\x60\x60\x60\n\n<a id="verification"></a>\n## Actual verification\nResult: passed\nObserved: fixture inspected changed value\n\n## Acceptance Verification\n\n\x60\x60\x60json\n${JSON.stringify(acceptance)}\n\x60\x60\x60\n`);
      const { analyzeMap } = await import(pathToFileURL(join(packageRoot, "template/workflows/specdev/common/tools/ticket-control.mjs")).href);
      const input = { mapPath: join(root, "tickets-map.md"), repoRoot: repo };
      const before = await readFile(consumer, "utf8");
      let result = analyzeMap(input);
      assert.deepEqual(result.errors, []);
      assert.deepEqual(result.validation_errors, []);
      assert.deepEqual(result.done, ["T-01"]);
      assert.deepEqual(result.suggested_batch, []);
      assert.deepEqual(result.blocked, [{ id: "T-02", reasons: ["not Ready: draft"] }]);
      assert.equal(result.eligible_for_final_verification, false);
      assert.equal(await readFile(consumer, "utf8"), before);
      await writeFile(consumer, before.replace("status: draft", "status: ready").replace("ready: false", "ready: true"));
      result = analyzeMap(input);
      assert.deepEqual(result.errors, []);
      assert.deepEqual(result.suggested_batch, ["T-02"]);
    } finally { await rm(fixtureProject(root), { recursive: true, force: true }); }
  });
});

describe("SpecDev local-first contracts", () => {
  it("keeps INDEX passive and loads the root contract only after work activation", async () => {
    const workflowRoot = join(packageRoot, "template/workflows/specdev");
    const index = await readFile(join(workflowRoot, "SKILL.md"), "utf8");
    const activation = await readFile(join(workflowRoot, "common/rules/domain-runtime.md"), "utf8");
    const activationRef = "<Path>{roots.workflows}/specdev/common/rules/domain-runtime.md</Path>";

    for (const marker of [
      "## 永久知识",
      "{roots.state}/specdev/adr/",
      "{roots.state}/specdev/context/",
      "## 发现与激活",
      "common/rules/activation-and-memory.md",
    ]) {
      assert.match(index, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    }
    assert.doesNotMatch(index, /## (Work 条目|运行时根|持久化约定|启动协议|状态字段|路径分配|副作用边界)/);
    assert.doesNotMatch(index, /specdev\/(?:config|status)\.json|specdev\/changes\/\{change\}/);

    for (const section of ["启动顺序", "工件与能力", "写入边界", "验证与路由"]) {
      assert.match(activation, new RegExp(`## ${section}`));
    }
    assert.equal((index.match(/AUTO-INDEX-START/g) ?? []).length, 1);
    assert.equal((index.match(/AUTO-INDEX-END/g) ?? []).length, 1);
    assert.match(index, /specdev\/archive-and-consolidate[\s\S]*specdev\/wayfinder/);
    assert.match(activation, /common\/rules\/workflow-state-and-lifecycle\.md/);
    const stateContract = await readFile(join(workflowRoot,"common/rules/workflow-state-and-lifecycle.md"),"utf8");
    assert.match(stateContract, /Outcome/);
    assert.match(stateContract, /只读/);

    const workDirs = (await readdir(workflowRoot, { withFileTypes: true }))
      .filter((entry) => entry.isDirectory() && /^specdev-[a-z]-/.test(entry.name));
    assert.equal(workDirs.length, 16);
    for (const workDir of workDirs) {
      const entry = await readFile(join(workflowRoot, workDir.name, "SKILL.md"), "utf8");
      assert.match(entry, new RegExp(activationRef.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    }
  });

  it("defines independent Ticket scheduling and change workspace contracts", async () => {
    const plan=await readFile(join(packageRoot,"template/workflows/specdev/specdev-p-goal-plan/assets/goal-plan-template.md"),"utf8");
    const context=JSON.parse(await readFile(join(packageRoot,"template/workflows/specdev/common/schemas/execution-context.schema.json"),"utf8"));
    assert.match(plan,/schema_version: 8/);assert.match(plan,/ticket_execution: auto/);
    assert.doesNotMatch(plan,/ticket_workspace_policy:|integration_gate:|concurrent_implementation_limit: 3/);
    assert.deepEqual(context.properties.workspace_policy.enum,["current","worktree"]);
  });

  it("keeps optional discovery open and validates explicit required project Skill routing", async () => {
    const root = await fixture();
    const repo = fixtureProject(root);
    const mapPath = join(root, "tickets-map.md");
    try {
      assert.equal(spawnSync("git", ["init", "-b", "main"], { cwd: repo }).status, 0);
      await writeReadyChild(root, changeName, "src/example.ts");

      let result = runValidator(root, "tickets", repo);
      assert.equal(result.status, 0, result.stdout + result.stderr);

      const skillRelative = ".agents/skills/engineering-standards/SKILL.md";
      await mkdir(join(repo, dirname(skillRelative)), { recursive: true });
      await writeFile(join(repo, skillRelative), [
        "---",
        "name: engineering-standards",
        "description: project standards",
        "---",
        "# Project standards",
        "",
      ].join("\n"));

      const noSkillRow = "| ALL | 无（尚无已知必需方法，可选知识按需发现） | 当前任务范围 | 命中条件时 | 普通知识导航不构成执行义务 |";
      const skillRow = `| ALL | \`<Path>${skillRelative}</Path>\` | all project code | Map 后、Ticket 前 | required: apply project engineering standards |`;
      const originalMap = await readFile(mapPath, "utf8");
      const validMap = originalMap.replace(noSkillRow, skillRow);
      assert.notEqual(validMap, originalMap);
      await writeFile(mapPath, validMap);
      const invocation = { id: "engineering-standards", path: `<Path>${skillRelative}</Path>`, sha256: createHash("sha256").update(await readFile(join(repo, skillRelative))).digest("hex"), phase: "implement", operation: "apply project standards", inputs: ["Ticket implementation contract"], outputs: ["standards checks and evidence"], required: true, on_failure: "block-ticket" };
      const ticketPath = join(root, "ticket", "01-implementation.md");
      await writeFile(ticketPath, (await readFile(ticketPath,"utf8")).replace(/^---\n/, `---\nskill_bindings: ${JSON.stringify([invocation])}\n`));

      result = runValidator(root, "tickets", repo);
      assert.equal(result.status, 0, result.stdout + result.stderr);

      await writeFile(mapPath, validMap.replace(skillRelative, ".agents/skills/missing/SKILL.md"));
      result = runValidator(root, "tickets", repo);
      assert.equal(result.status, 1);
      assert.match(result.stdout + result.stderr, /project Skill does not exist under --repo/);

      await writeFile(mapPath, validMap.replace(skillRelative, "/tmp/project/SKILL.md"));
      result = runValidator(root, "tickets", repo);
      assert.equal(result.status, 1);
      assert.match(result.stdout + result.stderr, /machine-specific absolute paths are forbidden/);

      await writeFile(mapPath, validMap.replace("| ALL | `<Path>", "| T-02 | `<Path>"));
      result = runValidator(root, "tickets", repo);
      assert.equal(result.status, 1);
      assert.match(result.stdout + result.stderr, /references missing Ticket T-02/);

      const legacyMap = validMap.replace(/### 总体实施背景[\s\S]*?(?=## 2\. 执行清单)/, "");
      await writeFile(mapPath, legacyMap);
      result = runValidator(root, "tickets", repo);
      assert.equal(result.status, 1);
      assert.match(result.stdout + result.stderr, /missing '### 总体实施背景'/);
    } finally {
      await rm(fixtureProject(root), { recursive: true, force: true });
      await rm(repo, { recursive: true, force: true });
    }
  });

  it("validates a resumable parent implementation and its composite Ticket DAG", async () => {
    const root = await fixture();
    const changesRoot = dirname(root);
    const members = ["2026-08-05-api", "2026-08-06-profile"];
    try {
      await writeNamedStatus(root, changeName, "active", "specdev/goal-plan");
      await writeReadyChild(join(changesRoot, members[0]), members[0], "src/api/**");
      await writeReadyChild(join(changesRoot, members[1]), members[1], "src/profile/**");
      await writeImplementationArtifacts(root, members, {
        dependencies: [`${members[1]}::T-01 <- ${members[0]}::T-01`],
      });

      let result = runValidator(root, "goal-plan");
      assert.equal(result.status, 0, result.stdout + result.stderr);

      await writeImplementationArtifacts(root, members, {
        dependencies: [
          `${members[1]}::T-01 <- ${members[0]}::T-01`,
          `${members[0]}::T-01 <- ${members[1]}::T-01`,
        ],
      });
      result = runValidator(root, "goal-plan");
      assert.equal(result.status, 1);
      assert.match(result.stdout + result.stderr, /implementation super-DAG cycle/);
    } finally {
      await rm(changesRoot, { recursive: true, force: true });
    }
  });

  it("requires dependency or serialization for cross-change writable overlap", async () => {
    const root = await fixture();
    const changesRoot = dirname(root);
    const members = ["2026-08-05-api", "2026-08-06-profile"];
    try {
      await writeNamedStatus(root, changeName, "active", "specdev/goal-plan");
      await writeReadyChild(join(changesRoot, members[0]), members[0], "src/shared.ts");
      await writeReadyChild(join(changesRoot, members[1]), members[1], "src/shared.ts");
      await writeImplementationArtifacts(root, members);
      let result = runValidator(root, "goal-plan");
      assert.equal(result.status, 1);
      assert.match(result.stdout + result.stderr, /composite tasks .* have writable overlap without dependency or serialization/);

      await writeImplementationArtifacts(root, members, {
        serializations: [`${members[0]}::T-01 <> ${members[1]}::T-01`],
      });
      result = runValidator(root, "goal-plan");
      assert.equal(result.status, 0, result.stdout + result.stderr);
    } finally {
      await rm(changesRoot, { recursive: true, force: true });
    }
  });

  it("rejects missing or unready inputs, stale revisions, and duplicate parent ownership", async () => {
    const root = await fixture();
    const changesRoot = dirname(root);
    const members = ["2026-08-05-api", "2026-08-06-profile"];
    try {
      await writeNamedStatus(root, changeName, "active", "specdev/goal-plan");
      await writeReadyChild(join(changesRoot, members[0]), members[0], "src/api/**");
      await writeImplementationArtifacts(root, members);
      let result = runValidator(root, "goal-plan");
      assert.equal(result.status, 1);
      assert.match(result.stdout + result.stderr, /member change does not exist/);

      await writeReadyChild(join(changesRoot, members[1]), members[1], "src/profile/**");
      await writeFile(
        join(changesRoot, members[1], "spec.md"),
        (await readFile(join(changesRoot, members[1], "spec.md"), "utf8")).replace("status: ready", "status: draft"),
      );
      result = runValidator(root, "goal-plan");
      assert.equal(result.status, 1);
      assert.match(result.stdout + result.stderr, /Spec must have status=ready/);

      await writeReadyChild(join(changesRoot, members[1]), members[1], "src/profile/**");
      await writeImplementationArtifacts(root, members, { sourceMapRevision: 2 });
      result = runValidator(root, "goal-plan");
      assert.equal(result.status, 1);
      assert.match(result.stdout + result.stderr, /source_map_revision must equal Implementation Map revision/);

      await writeImplementationArtifacts(root, members);
      const competingParent = join(changesRoot, "2026-08-08-competing-parent");
      await writeNamedStatus(competingParent, basename(competingParent), "active", "specdev/goal-plan");
      await writeImplementationArtifacts(competingParent, members);
      result = runValidator(root, "goal-plan");
      assert.equal(result.status, 1);
      assert.match(result.stdout + result.stderr, /already belongs to unfinished parent implementation/);
    } finally {
      await rm(changesRoot, { recursive: true, force: true });
    }
  });

  it("rejects parent completion until actual members and aggregate Evidence finish", async () => {
    const root=await fixture(),changesRoot=dirname(root),members=["2026-08-05-api","2026-08-06-profile"];
    try {
      await writeNamedStatus(root,changeName,"completed");
      for(const [index,member] of members.entries())await writeReadyChild(join(changesRoot,member),member,`src/member-${index}/**`);
      await writeImplementationArtifacts(root,members,{status:"completed"});
      const result=runValidator(root,"goal-plan");
      assert.equal(result.status,1);assert.match(result.stderr,/members remain incomplete/);
      assert.match(result.stderr,/unfinished composite tasks/);assert.match(result.stderr,/requires evidence\/implementation-orchestration\.md/);
      // The actual positive completion chain and drift rejection use Git-backed member workspaces
      // and the published parent templates in specdev-change-workspace.test.ts.
    } finally { await rm(fixtureProject(root),{recursive:true,force:true}); }
  });

  it("keeps Direct Spec executable and separates planning from dispatch inputs", async () => {
    const implement = await readFile(
      join(packageRoot, "template/workflows/specdev/specdev-i-implement/references/implementation-procedure.md"),
      "utf8",
    );
    const delivery = await readFile(
      join(packageRoot, "template/references/coordination/task-brief.md"),
      "utf8",
    );

    for (const marker of [
      "工作区和协作方式分别选择",
      "不创建候选 checkout、不自动提交或合并",
      "evidence/direct-spec.md",
      "common/rules/code-commenting-rule.md",
      "{roots.state}/specdev/adr/",
      "{roots.state}/specdev/context/",
    ]) {
      assert.match(implement, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    }
    assert.match(delivery, /规划安排[\s\S]*尚未产生/);
    assert.match(delivery, /身份[\s\S]*能力与依赖[\s\S]*工具与模型[\s\S]*工作区与写集[\s\S]*权限与验收/);
    assert.match(delivery, /交付实际文件[\s\S]*result-and-recovery/);
    assert.doesNotMatch(delivery, /达到修正上限后/);
  });

  it("validates the Lead-directed Goal Plan independent execution policy contract", async () => {
    const root = await fixture();
    try {
      await writeStatus(root);
      await writeGoalPlan(root);
      let result = runValidator(root);
      assert.equal(result.status, 0, result.stdout + result.stderr);

      await writeConfig(root, 4);
      await writeGoalPlan(root, 4);
      result = runValidator(root);
      assert.equal(result.status, 0, result.stdout + result.stderr);

      await writeGoalPlan(root, 5);
      result = runValidator(root);
      assert.equal(result.status, 1);
      assert.match(result.stdout + result.stderr, /exceeds config max_concurrent_implementations 4/);

      await writeGoalPlan(root, 4, [], "", 4);
      result = runValidator(root);
      assert.equal(result.status, 1);
      assert.match(result.stdout + result.stderr, /exceeds config max_integration_attempts 3/);

      await writeGoalPlan(root, 3, ["coordination_mode: single-session"]);
      result = runValidator(root);
      assert.equal(result.status, 1);
      assert.match(result.stdout + result.stderr, /obsolete or unexpected field coordination_mode/);

      await writeGoalPlan(root, 3, [], "\n## Delegated Execution Addendum\nlegacy\n");
      result = runValidator(root);
      assert.equal(result.status, 1);
      assert.match(result.stdout + result.stderr, /obsolete Goal Plan addendum/);
    } finally {
      await rm(fixtureProject(root), { recursive: true, force: true });
    }
  });

  it("refuses active legacy per-Ticket workspace contracts without rewriting their evidence", async () => {
    const root=await fixture();
    try {
      await writeStatus(root,"active",[{ticket_id:"T-01",status:"active",workspace_ref:`specdev-worktree/${changeName}/T-01`}]);
      const file=join(root,"evidence/T-01.md"), before=await readFile(file,"utf8");
      const result=runValidator(root);
      assert.equal(result.status,1);assert.match(result.stderr,/unsupported execution record/);
      assert.equal(await readFile(file,"utf8"),before);
    } finally { await rm(fixtureProject(root),{recursive:true,force:true}); }
  });

  it("returns repeated Ticket failures to the Lead before redispatch", async () => {
    const [implement, evidence, lead, completion, finalize, executionLoop] = await Promise.all([
      readFile(join(packageRoot, "template/workflows/specdev/specdev-i-implement/references/implementation-procedure.md"), "utf8"),
      readFile(join(packageRoot, "template/workflows/specdev/specdev-i-implement/assets/evidence-template.md"), "utf8"),
      readFile(join(packageRoot, "template/workflows/specdev/specdev-p-goal-plan/references/lead-orchestration.md"), "utf8"),
      readFile(join(packageRoot, "template/workflows/specdev/specdev-p-goal-plan/references/completion-control.md"), "utf8"),
      readFile(join(packageRoot, "template/workflows/specdev/common/skills/dev-worktree/references/finalize.md"), "utf8"),
      readFile(join(packageRoot, "template/workflows/specdev/specdev-p-goal-plan/references/multi-execution-loop.md"), "utf8"),
    ]);

    assert.match(finalize, /attempts 达到有效上限时返回 Lead 复盘/);
    assert.match(implement, /同一 blocker[\s\S]*返回有效 Lead/);
    assert.match(evidence, /Failure History And Lead Recovery[\s\S]*共同失败模式[\s\S]*最可能原因[\s\S]*下一轮具体改变[\s\S]*下一 owner\/路由/);
    assert.match(lead, /达到有效尝试上限时停止重复派单/);
    assert.match(lead, /有实质变化的新 Dispatch Packet/);
    assert.match(completion, /单个 Ticket 进入 Lead 复盘不自动终止整个父循环/);
    assert.match(executionLoop, /父 Lead 可以继续其他不受影响的 ready frontier/);
  });

  it("validates Triage before downstream Ticket artifacts exist", async () => {
    const root = await fixture();
    try {
      await writeStatus(root);
      await writeSourceAndTriage(root);
      const result = runValidator(root, "triage");
      assert.equal(result.status, 0, result.stdout + result.stderr);

      await writeFile(join(root, "source-issue.md"), "obsolete\n");
      const obsolete = runValidator(root, "triage");
      assert.equal(obsolete.status, 1);
      assert.match(obsolete.stdout + obsolete.stderr, /source-issue\.md is forbidden/);
    } finally {
      await rm(fixtureProject(root), { recursive: true, force: true });
    }
  });

  it("validates evolved source snapshots without overwriting the frozen original", async () => {
    const root = await fixture();
    try {
      await writeStatus(root); await writeSourceAndTriage(root);
      const original = await readFile(join(root, "source.md"), "utf8");
      const triage = await readFile(join(root, "triage.md"), "utf8");
      await mkdir(join(root, "sources"));
      const snapshot = original.replace("artifact: source", "artifact: source\nsupersedes_source: <Path>{roots.state}/specdev/changes/{change}/source.md</Path>");
      await writeFile(join(root, "sources/SRC-001.md"), snapshot);
      await writeFile(join(root, "triage.md"), triage.replace("/source.md</Path>", "/sources/SRC-001.md</Path>"));
      const valid = runValidator(root, "triage"); assert.equal(valid.status, 0, valid.stdout + valid.stderr);
      assert.equal(await readFile(join(root, "source.md"), "utf8"), original);
      await writeFile(join(root, "sources/SRC-001.md"), snapshot.replace("/source.md</Path>", "/sources/SRC-099.md</Path>"));
      const invalid = runValidator(root, "triage"); assert.match(invalid.stdout + invalid.stderr, /existing distinct supersedes_source/);
    } finally { await rm(fixtureProject(root), { recursive: true, force: true }); }
  });

  it("rejects hypotheses before diagnosis has red evidence", async () => {
    const root = await fixture();
    try {
      await writeStatus(root);
      await writeFile(
        join(root, "diagnosis.md"),
        [
          "---",
          "schema_version: 1",
          "artifact: diagnosis",
          `change: ${changeName}`,
          "status: blocked",
          "feedback_loop_ready: false",
          "red_command: null",
          "red_evidence: null",
          "cleanup_status: pending",
          "updated_at: 2026-08-07T00:00:00Z",
          "---",
          "## 2. 红灯反馈回路",
          "blocked",
          "## 3. 最小复现",
          "none",
          "## 4. 假设与证伪",
          "| 排名 | 假设与预测 | 支持证据 | 单变量实验 | 结果 |",
          "|---|---|---|---|---|",
          "| 1 | guessed | none | none | pending |",
          "## 5. 已确认根因",
          "none",
          "## 6. 修复契约",
          "none",
          "## 7. 清理",
          "pending",
        ].join("\n"),
      );
      const result = runValidator(root, "diagnosis");
      assert.equal(result.status, 1);
      assert.match(result.stdout + result.stderr, /hypotheses must be empty before red evidence/);
    } finally {
      await rm(fixtureProject(root), { recursive: true, force: true });
    }
  });

  it("validates indexed SpecDev change-learning diagrams independently from Learning state", async () => {
    const root = await fixture();
    try {
      await writeStatus(root);

      const missing = runValidator(root, "learn");
      assert.equal(missing.status, 1);
      assert.match(missing.stdout + missing.stderr, /learn stage requires learning\/index\.md/);

      const learningRoot = join(root, "learning");
      await mkdir(learningRoot);
      await writeFile(
        join(learningRoot, "01_request-flow.md"),
        [
          "# 请求怎样流过这个 change",
          "",
          "## 先看全图",
          "",
          "```text",
          "[用户请求] -> [入口] -> [处理] -> [回应]",
          "```",
          "",
          "## 一步一步看",
          "",
          "请求先进入入口，再交给处理步骤，最后形成回应。",
          "",
          "## 术语小词典",
          "",
          "- 门口（入口）：接住用户请求的第一个位置。",
          "",
          "## 你现在能复述什么",
          "",
          "- 这个 change 让请求依次经过入口、处理和回应。",
        ].join("\n"),
      );
      await writeFile(
        join(learningRoot, "index.md"),
        [
          "# Change 学习图解索引",
          "",
          "| 编号 | 文件 | 主题 | 简介 |",
          "| --- | --- | --- | --- |",
          "| 01 | 01_request-flow.md | 请求流 | 解释请求如何经过当前 change。 |",
        ].join("\n"),
      );

      const valid = runValidator(root, "learn");
      assert.equal(valid.status, 0, valid.stdout + valid.stderr);

      await writeFile(
        join(learningRoot, "02_unindexed.md"),
        [
          "# 未登记图解",
          "## 先看全图",
          "```text",
          "[输入] -> [输出]",
          "```",
          "## 一步一步看",
          "输入变成输出。",
          "## 术语小词典",
          "- 结果（输出）：处理后得到的内容。",
          "## 你现在能复述什么",
          "- 输入会变成输出。",
        ].join("\n"),
      );
      const unindexed = runValidator(root, "learn");
      assert.equal(unindexed.status, 1);
      assert.match(unindexed.stdout + unindexed.stderr, /missing entry for '02_unindexed\.md'/);
    } finally {
      await rm(fixtureProject(root), { recursive: true, force: true });
    }
  });

  it("rejects mutable review inputs and obsolete prototype records", async () => {
    const root = await fixture();
    try {
      await writeStatus(root);
      await mkdir(join(root, "reviews"));
      await writeFile(
        join(root, "reviews", "CR-001.md"),
        [
          "---",
          "schema_version: 1",
          "artifact: code-review",
          `change: ${changeName}`,
          "review_id: CR-001",
          "fixed_point: abcdef1",
          "head: abcdef1",
          "status: blocked",
          "standards_result: request-changes",
          "specification_result: skipped",
          "spec_sources: []",
          "standards_sources: []",
          "created_at: 2026-08-07T00:00:00Z",
          "---",
          "## Fixed Input",
          "diff",
          "## 标准",
          "finding",
          "## 规范",
          "skipped",
          "## Summary",
          "blocked",
        ].join("\n"),
      );
      const review = runValidator(root, "review");
      assert.equal(review.status, 1);
      assert.match(review.stdout + review.stderr, /fixed_point and head must differ/);

      await mkdir(join(root, "prototypes", "PROTO-001"), { recursive: true });
      await writeFile(
        join(root, "prototypes", "PROTO-001", "record.md"),
        [
          "---",
          "schema_version: 1",
          "artifact: prototype-record",
          `change: ${changeName}`,
          "prototype_id: PROTO-001",
          "question: Does this state model work?",
          "branch: logic",
          "status: answered",
          "workspace_ref: /tmp/prototype",
          "project_paths: []",
          "assets: []",
          "winner: reducer",
          "promotion_target: T-01",
          "cleanup_status: clean",
          "updated_at: 2026-08-07T00:00:00Z",
          "---",
          "## Question and Assumption",
          "question",
          "## Run and Assets",
          "asset",
          "## Evaluation",
          "answer",
          "## Promotion and Cleanup",
          "clean",
        ].join("\n"),
      );
      const prototype = runValidator(root, "prototype");
      assert.equal(prototype.status, 1);
      assert.match(prototype.stdout + prototype.stderr, /obsolete prototype record is forbidden/);
    } finally {
      await rm(fixtureProject(root), { recursive: true, force: true });
    }
  });

  it("accepts a ready UI design package with materialized sources and comparison variants", async () => {
    const root = await fixture();
    try {
      await writeStatus(root);
      await writeDesignPackage(root);
      const result = runValidator(root, "prototype");
      assert.equal(result.status, 0, result.stdout + result.stderr);
    } finally {
      await rm(fixtureProject(root), { recursive: true, force: true });
    }
  });

  it("allows resumable design drafts but does not complete the prototype stage", async () => {
    const root = await fixture();
    try {
      await writeStatus(root);
      await writeDesignPackage(root, "selecting", false);
      const resumable = runValidator(root);
      assert.equal(resumable.status, 0, resumable.stdout + resumable.stderr);
      const completion = runValidator(root, "prototype");
      assert.equal(completion.status, 1);
      assert.match(completion.stdout + completion.stderr, /requires the selected ready UI or logic design package/);
    } finally {
      await rm(fixtureProject(root), { recursive: true, force: true });
    }
  });

  it("rejects drift between design-system.md and materialized prototype files", async () => {
    const root = await fixture();
    try {
      await writeStatus(root);
      const designPath = await writeDesignPackage(root);
      await writeFile(join(dirname(designPath), "final", "app.js"), "// drift\n");
      const result = runValidator(root, "prototype");
      assert.equal(result.status, 1);
      assert.match(result.stdout + result.stderr, /app\.js: differs from design-system\.md/);
    } finally {
      await rm(fixtureProject(root), { recursive: true, force: true });
    }
  });

  it("rejects malformed prototype source markers and missing comparisons", async () => {
    const root = await fixture();
    try {
      await writeStatus(root);
      const designPath = await writeDesignPackage(root, "ready", false);
      const malformed = (await readFile(designPath, "utf8")).replace(
        "<!-- /PROTOTYPE-FILE -->",
        "<!-- /BROKEN-PROTOTYPE-FILE -->",
      );
      await writeFile(designPath, malformed);
      const result = runValidator(root, "prototype");
      assert.equal(result.status, 1);
      assert.match(result.stdout + result.stderr, /exactly three paired PROTOTYPE-FILE blocks/);
      await writeDesignPackage(root, "ready", false);
      const missing = runValidator(root, "prototype");
      assert.equal(missing.status, 1);
      assert.match(missing.stdout + missing.stderr, /comparison/);
    } finally {
      await rm(fixtureProject(root), { recursive: true, force: true });
    }
  });

  it("blocks archive validation until the external action is reconciled", async () => {
    const root = await fixture();
    try {
      await writeStatus(root, "completed");
      await writeSourceAndTriage(root, "pending-close");
      await mkdir(join(root, "evidence"), {recursive:true});
      await writeFile(join(root, "evidence", "direct-spec.md"), `# Evidence\n\n## Acceptance Verification\n\n\x60\x60\x60json\n${JSON.stringify([{id:"AC-1",result:"passed",method:"fixture behavior check",source:"test source",observed:"expected behavior confirmed"}])}\n\x60\x60\x60\n`);
      await writeFile(
        join(root, "spec.md"),
        [
          "---",
          "schema_version: 3",
          "artifact: spec",
          `change: ${changeName}`,
          "status: ready",
          "ready_for_tickets: false",
          "sources: [local-source]",
          "---",
          "## 1. 问题与目标",
          "goal",
          "## 2. 解决方案与外部行为",
          "behavior",
          "### 未决问题",
          "无",
          "## 4. 验收合同",
          "AC-1: verified behavior",
          "## 5. 范围",
          "scope",
          "## 9. 验证策略",
          "verify",
        ].join("\n"),
      );
      attachReviewFixture(fixtureProject(root),root,"evidence/direct-spec.md");
      const local = runValidator(root,"complete");
      assert.equal(local.status,0,local.stdout+local.stderr);
      const blocked = runValidator(root, "archive-ready");
      assert.equal(blocked.status, 1);
      assert.match(blocked.stdout + blocked.stderr, /cannot archive external_action=pending-close/);

      await writeSourceAndTriage(root, "closed");
      const closed = runValidator(root, "archive-ready");
      assert.equal(closed.status, 0, closed.stdout + closed.stderr);
    } finally {
      await rm(fixtureProject(root), { recursive: true, force: true });
    }
  });

  it("keeps GitHub close dry-run read-only and apply retries idempotent", { skip: process.platform === "win32" }, async () => {
    const root = await fixture();
    try {
      const bin = join(root, "bin");
      const statePath = join(root, "state.json");
      const commentPath = join(root, "comment.md");
      await mkdir(bin);
      await writeFile(statePath, JSON.stringify({ state: "OPEN", comments: [], actions: [] }));
      await writeFile(commentPath, "Implemented and verified.");
      const fakeGh = join(bin, "gh");
      await writeFile(
        fakeGh,
        `#!/usr/bin/env node
const fs = require("fs");
const path = process.env.FAKE_GH_STATE;
const state = JSON.parse(fs.readFileSync(path, "utf8"));
const args = process.argv.slice(2);
state.actions.push(args.join(" "));
if (args[0] === "api" && args[1].includes("/comments?")) {
  console.log(JSON.stringify([state.comments]));
} else if (args[0] === "api" && args[1].endsWith("/issues/1")) {
  console.log(JSON.stringify({ number: 1, title: "Issue", body: "Body", state: state.state.toLowerCase(), html_url: "https://github.com/owner/repo/issues/1", user: { login: "user" }, labels: [], created_at: "2026-08-07", updated_at: "2026-08-07", comments: state.comments.length }));
} else if (args[0] === "issue" && args[1] === "comment") {
  state.comments.push({ body: args[args.indexOf("--body") + 1] });
} else if (args[0] === "issue" && args[1] === "close") {
  state.state = "CLOSED";
} else {
  process.exitCode = 2;
}
fs.writeFileSync(path, JSON.stringify(state));
`,
      );
      await chmod(fakeGh, 0o755);
      const transport = join(packageRoot, "template/workflows/specdev/common/tools/github-transport.mjs");
      const args = [
        transport,
        "issue-comment-close",
        "--repo",
        "owner/repo",
        "--number",
        "1",
        "--comment-file",
        commentPath,
        "--marker",
        "specdev:change:completion",
      ];
      const env = { ...process.env, PATH: `${bin}:${process.env.PATH}`, FAKE_GH_STATE: statePath };

      const dryRun = spawnSync(process.execPath, args, { encoding: "utf8", env });
      assert.equal(dryRun.status, 0, dryRun.stdout + dryRun.stderr);
      let state = JSON.parse(await readFile(statePath, "utf8"));
      assert.equal(state.state, "OPEN");
      assert.equal(state.comments.length, 0);

      const applied = spawnSync(process.execPath, [...args, "--apply"], { encoding: "utf8", env });
      assert.equal(applied.status, 0, applied.stdout + applied.stderr);
      state = JSON.parse(await readFile(statePath, "utf8"));
      assert.equal(state.state, "CLOSED");
      assert.equal(state.comments.length, 1);
      assert.match(state.comments[0].body, /specdev:change:completion/);

      const retry = spawnSync(process.execPath, [...args, "--apply"], { encoding: "utf8", env });
      assert.equal(retry.status, 0, retry.stdout + retry.stderr);
      state = JSON.parse(await readFile(statePath, "utf8"));
      assert.equal(state.comments.length, 1);
    } finally {
      await rm(fixtureProject(root), { recursive: true, force: true });
    }
  });
  it("analyzes a single Goal without mutating files or claiming authorization", async () => {
    const root = await controllerFixture();
    try {
      await writeReadyChild(root, changeName, "src/one.ts"); await writeGoalPlan(root);
      const ticketPath = join(root,"ticket","01-implementation.md");
      await writeFile(ticketPath,(await readFile(ticketPath,"utf8")).replace("owner: unassigned","owner: lead-session"));
      const files = [ticketPath,join(root,"tickets-map.md"),join(root,"goal-plan.md"),join(root,"README.md")];
      const before = await Promise.all(files.map(file => readFile(file,"utf8")));
      const { analyzeMap } = await import(pathToFileURL(join(packageRoot,"template/workflows/specdev/common/tools/ticket-control.mjs")).href);
      const result = analyzeMap({mapPath:join(root,"tickets-map.md"),repoRoot:fixtureProject(root)});
      assert.deepEqual(result.errors,[]); assert.deepEqual(result.validation_errors,[]);
      assert.deepEqual(result.suggested_batch,["T-01"]);
      assert.equal(result.authorization_checked,false); assert.equal(result.transaction_gateway_checked,false);
      assert.equal(result.eligible_for_final_verification,false);
      assert.deepEqual(await Promise.all(files.map(file => readFile(file,"utf8"))),before);
      const planFile = join(root,"goal-plan.md");
      await writeFile(planFile,(await readFile(planFile,"utf8")).replace("status: ready","status: draft").replace("ready_for_execution: true","ready_for_execution: false"));
      const blocked = analyzeMap({mapPath:join(root,"tickets-map.md"),repoRoot:fixtureProject(root)});
      assert.deepEqual(blocked.suggested_batch,[]); assert.match(JSON.stringify(blocked),/not ready for execution/);
    } finally { await rm(fixtureProject(root),{recursive:true,force:true}); }
  });

  it("keeps independent multi-change work dispatchable when one Ticket fails its Skill gate", async () => {
    const root = await controllerFixture(); const members = ["2026-09-08-api","2026-09-08-ui"];
    try {
      await writeNamedStatus(root,changeName,"active","specdev/goal-plan");
      for (const [i,member] of members.entries()) {
        const child = join(dirname(root),member); await writeReadyChild(child,member,`src/member-${i}/**`);
        const file=join(child,"ticket","01-implementation.md");
        await writeFile(file,(await readFile(file,"utf8")).replace("owner: unassigned",`owner: member-${i}`));
      }
      await writeImplementationArtifacts(root,members,{});
      const { analyzeMap } = await import(pathToFileURL(join(packageRoot,"template/workflows/specdev/common/tools/ticket-control.mjs")).href);
      const input = {mapPath:join(root,"implementation-map.md"),repoRoot:fixtureProject(root)};
      const before=analyzeMap(input);
      assert.deepEqual(before.errors,[]); assert.deepEqual(before.suggested_batch,members.map(member => `${member}::T-01`));
      const file=join(dirname(root),members[0],"ticket","01-implementation.md");
      await writeFile(file,(await readFile(file,"utf8")).replace(/^---\n/, '---\nskill_bindings: [{"id":"required-check","path":"<Path>.agents/skills/required-check/SKILL.md</Path>","required":true}]\n'));
      const result=analyzeMap(input);
      assert.deepEqual(result.errors,[]); assert.deepEqual(result.suggested_batch,[`${members[1]}::T-01`]);
      assert.ok(result.blocked.some((node:any) => node.id === `${members[0]}::T-01`));
      assert.ok(result.validation_errors.length);
    } finally { await rm(fixtureProject(root),{recursive:true,force:true}); }
  });

  it("honors semantic resource ownership across independent member paths", async () => {
    const root=await controllerFixture(); const members=["2026-09-08-api","2026-09-08-ui"];
    try {
      await writeNamedStatus(root,changeName,"active","specdev/goal-plan");
      for (const [i,member] of members.entries()) {
        const child=join(dirname(root),member); await writeReadyChild(child,member,`src/member-${i}/**`);
        const file=join(child,"ticket","01-implementation.md");
        await writeFile(file,(await readFile(file,"utf8")).replace("owner: unassigned",`owner: member-${i}`).replace("resource_claims: []",'resource_claims: ["api:public-users"]'));
      }
      await writeImplementationArtifacts(root,members,{});
      const { analyzeMap } = await import(pathToFileURL(join(packageRoot,"template/workflows/specdev/common/tools/ticket-control.mjs")).href);
      const input={mapPath:join(root,"implementation-map.md"),repoRoot:fixtureProject(root)};
      let result=analyzeMap(input);
      assert.deepEqual(result.errors,[]); assert.equal(result.suggested_batch.length,1); assert.match(JSON.stringify(result.deferred),/semantic resource/);
      assert.equal(result.max_parallel_tickets,3);
    } finally { await rm(fixtureProject(root),{recursive:true,force:true}); }
  });

  it("invalidates only the changed contract and its downstream closure", async () => {
    const root=await controllerFixture(); const members=["2026-09-08-api","2026-09-08-ui","2026-09-08-docs"];
    try {
      await writeNamedStatus(root,changeName,"active","specdev/goal-plan");
      for (const [i,member] of members.entries()) {
        const child=join(dirname(root),member); await writeReadyChild(child,member,`src/member-${i}/**`);
        const file=join(child,"ticket","01-implementation.md");
        await writeFile(file,(await readFile(file,"utf8")).replace("owner: unassigned",`owner: member-${i}`));
      }
      await writeImplementationArtifacts(root,members,{dependencies:[`${members[1]}::T-01 <- ${members[0]}::T-01`]});
      const { analyzeMap } = await import(pathToFileURL(join(packageRoot,"template/workflows/specdev/common/tools/ticket-control.mjs")).href);
      const input={mapPath:join(root,"implementation-map.md"),repoRoot:fixtureProject(root)};
      const previous=analyzeMap(input); assert.deepEqual(previous.errors,[]);
      let result=analyzeMap({...input,previous}); assert.deepEqual(result.invalidated,[]);
      const file=join(dirname(root),members[0],"ticket","01-implementation.md");
      await writeFile(file,(await readFile(file,"utf8")).replace("owner: member-0","owner: replacement-owner"));
      result=analyzeMap({...input,previous}); assert.deepEqual(result.invalidated,[]);
      await writeFile(file,(await readFile(file,"utf8"))+"\nContract changed: new API requirement.\n");
      result=analyzeMap({...input,previous});
      assert.deepEqual(result.invalidated,[`${members[0]}::T-01`,`${members[1]}::T-01`]);
      assert.deepEqual(result.suggested_batch,[`${members[2]}::T-01`]);
    } finally { await rm(fixtureProject(root),{recursive:true,force:true}); }
  });

  it("does not treat cancelled prerequisites as successful delivery", async () => {
    const root=await controllerFixture(); const members=["2026-09-08-api","2026-09-08-ui"];
    try {
      await writeNamedStatus(root,changeName,"active","specdev/goal-plan");
      await writeReadyChild(join(dirname(root),members[0]),members[0],"src/api/**",{ticketStatus:"cancelled"});
      await writeReadyChild(join(dirname(root),members[1]),members[1],"src/ui/**");
      const file=join(dirname(root),members[1],"ticket","01-implementation.md");
      await writeFile(file,(await readFile(file,"utf8")).replace("owner: unassigned","owner: implementer"));
      await writeImplementationArtifacts(root,members,{dependencies:[`${members[1]}::T-01 <- ${members[0]}::T-01`]});
      const { analyzeMap }=await import(pathToFileURL(join(packageRoot,"template/workflows/specdev/common/tools/ticket-control.mjs")).href);
      const result=analyzeMap({mapPath:join(root,"implementation-map.md"),repoRoot:fixtureProject(root)});
      assert.deepEqual(result.errors,[]); assert.deepEqual(result.suggested_batch,[]);
      assert.match(JSON.stringify(result.blocked),/dependency not successfully satisfied/); assert.equal(result.eligible_for_final_verification,false);
    } finally { await rm(fixtureProject(root),{recursive:true,force:true}); }
  });

  it("keeps a running parent active when one Ticket becomes blocked", async () => {
    const root=await controllerFixture(); const members=["2026-09-08-api","2026-09-08-ui"];
    try {
      await writeNamedStatus(root,changeName,"active","specdev/goal-plan");
      for (const [i,member] of members.entries()) {
        const child=join(dirname(root),member); await writeReadyChild(child,member,`src/member-${i}/**`);
        const file=join(child,"ticket","01-implementation.md");
        let text=(await readFile(file,"utf8")).replace("owner: unassigned",`owner: member-${i}`);
        if (i===0) text=text.replace("status: ready","status: blocked").replace("ready: true","ready: false");
        await writeFile(file,text);
      }
      await writeImplementationArtifacts(root,members,{status:"in_progress"});
      const { analyzeMap }=await import(pathToFileURL(join(packageRoot,"template/workflows/specdev/common/tools/ticket-control.mjs")).href);
      const result=analyzeMap({mapPath:join(root,"implementation-map.md"),repoRoot:fixtureProject(root)});
      assert.deepEqual(result.errors,[]); assert.deepEqual(result.validation_errors,[]);
      assert.deepEqual(result.suggested_batch,[`${members[1]}::T-01`]);
      assert.match(JSON.stringify(result.blocked),/not Ready: blocked/);
    } finally { await rm(fixtureProject(root),{recursive:true,force:true}); }
  });

  it("never takes over a competing parent and only pauses its overlapping members", async () => {
    const root=await controllerFixture(); const members=["2026-09-08-api","2026-09-08-ui"];
    try {
      await writeNamedStatus(root,changeName,"active","specdev/goal-plan");
      for (const [i,member] of members.entries()) {
        const child=join(dirname(root),member); await writeReadyChild(child,member,`src/member-${i}/**`);
        const file=join(child,"ticket","01-implementation.md");
        await writeFile(file,(await readFile(file,"utf8")).replace("owner: unassigned",`owner: member-${i}`));
      }
      await writeImplementationArtifacts(root,members,{status:"in_progress"});
      const competitor=join(dirname(root),"2026-09-08-other-goal");
      await writeNamedStatus(competitor,"2026-09-08-other-goal","active","specdev/goal-plan");
      await writeImplementationArtifacts(competitor,[members[0],"2026-09-08-unrelated"],{status:"in_progress"});
      const competingFiles=[join(competitor,"implementation-map.md"),join(competitor,"implementation-plan.md"),join(competitor,"README.md")];
      const before=await Promise.all(competingFiles.map(file=>readFile(file,"utf8")));
      const { analyzeMap }=await import(pathToFileURL(join(packageRoot,"template/workflows/specdev/common/tools/ticket-control.mjs")).href);
      const result=analyzeMap({mapPath:join(root,"implementation-map.md"),repoRoot:fixtureProject(root)});
      assert.deepEqual(result.errors,[]); assert.deepEqual(result.suggested_batch,[`${members[1]}::T-01`]);
      assert.match(JSON.stringify(result.blocked),/unfinished parent implementation/);
      assert.deepEqual(await Promise.all(competingFiles.map(file=>readFile(file,"utf8"))),before);
    } finally { await rm(fixtureProject(root),{recursive:true,force:true}); }
  });

  it("detects shared Goal gate drift but ignores progress-only projection updates", async () => {
    const root=await controllerFixture();
    try {
      await writeReadyChild(root,changeName,"src/one.ts"); await writeGoalPlan(root);
      const file=join(root,"ticket","01-implementation.md");
      await writeFile(file,(await readFile(file,"utf8")).replace("owner: unassigned","owner: lead-session"));
      const { analyzeMap }=await import(pathToFileURL(join(packageRoot,"template/workflows/specdev/common/tools/ticket-control.mjs")).href);
      const input={mapPath:join(root,"tickets-map.md"),repoRoot:fixtureProject(root)};
      const previous=analyzeMap(input); assert.deepEqual(previous.errors,[]);
      const plan=join(root,"goal-plan.md");
      let text=await readFile(plan,"utf8");
      text=text.replace("### Current Status","### Current Status\n\nRead-only checkpoint: no actions executed.");
      await writeFile(plan,text);
      assert.deepEqual(analyzeMap({...input,previous}).invalidated,[]);
      await writeFile(plan,text.replace("### Overall Definition of Done","### Overall Definition of Done\n\nNew approved shared acceptance gate."));
      const result=analyzeMap({...input,previous});
      assert.deepEqual(result.invalidated,["T-01"]);assert.deepEqual(result.suggested_batch,[]);
    } finally { await rm(fixtureProject(root),{recursive:true,force:true}); }
  });

});

