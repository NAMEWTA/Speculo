import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import { describe, it } from "node:test";

const toolRoot = join(process.cwd(), "template/workflows/specdev/common/tools");
const contract = await import(pathToFileURL(join(toolRoot, "plan-contract.mjs")).href);
const validator = await import(pathToFileURL(join(toolRoot, "validate-specdev.mjs")).href);
const change = "2026-09-08-plan-contract";
const body = "## 11. SKILL 调用计划\nExplicit implementation invocation.\n## 12. 停止、检查点与交付\nBlock affected Ticket; preserve unrelated work.\n";
async function fixture() {
  const root = await mkdtemp(join(tmpdir(), "speculo-plan-contract-"));
  const skillPath = ".agents/skills/project-check/SKILL.md";
  const skill = "---\nname: project-check\ndescription: Check this project only.\n---\n# Project check\n";
  await mkdir(dirname(join(root, skillPath)), { recursive: true });
  await writeFile(join(root, skillPath), skill);
  await mkdir(join(root, change, "ticket"), { recursive: true });
  const binding = { id: "project-check", path: `<Path>${skillPath}</Path>`, sha256: contract.digest(skill), phase: "verify", operation: "review changed contract", inputs: ["Ticket, Spec and changed source"], outputs: ["acceptance evidence"], required: true, on_failure: "block-ticket" };
  const artifact = { path: join(root, change, "ticket", "01-check.md"), body, meta: { id: "T-01", plan_contract_version: 1, ready: true, status: "ready", skill_scan: "Inspected the declared project Skill roots; selected project-check", skill_bindings: [binding], resource_claims: [] } };
  return { root, skillPath, binding, artifact };
}

describe("SpecDev Plan contracts", () => {
  it("round-trips strict JSON invocation arrays, including commas in strings", async () => {
    const f = await fixture();
    try {
      await writeFile(f.artifact.path, `---\nplan_contract_version: 1\nskill_bindings: ${JSON.stringify([f.binding])}\n---\n${body}`);
      assert.deepEqual(validator.parseFrontmatter(f.artifact.path).meta.skill_bindings, [f.binding]);
      assert.deepEqual(contract.validateTicketPlan(f.artifact, { repoRoot: f.root }), []);
    } finally { await rm(f.root, { recursive: true, force: true }); }
  });
  it("rejects duplicate and prototype frontmatter keys, and malformed object arrays", async () => {
    const f = await fixture();
    try {
      for (const frontmatter of ["id: T-01\nid: T-02", "__proto__: bad", "constructor: bad", 'skill_bindings: [{"id": broken}]']) {
        await writeFile(f.artifact.path, `---\n${frontmatter}\n---\nbody`);
        assert.throws(() => validator.parseFrontmatter(f.artifact.path));
      }
    } finally { await rm(f.root, { recursive: true, force: true }); }
  });
  it("blocks unresolved discovery, fake names, missing skills and digest drift", async () => {
    const f = await fixture();
    try {
      const original = structuredClone(f.artifact);
      f.artifact.meta.skill_scan = "unreviewed";
      assert.match(contract.validateTicketPlan(f.artifact, { repoRoot: f.root }).join("\n"), /skill_scan/);
      for (const overrides of [{ id: "fake" }, { path: "<Path>.agents/skills/missing/SKILL.md</Path>" }, { sha256: "0".repeat(64) }, { on_failure: "report-and-continue" }]) {
        const artifact = structuredClone(original);
        Object.assign(artifact.meta.skill_bindings[0], overrides);
        assert.ok(contract.validateTicketPlan(artifact, { repoRoot: f.root }).length > 0);
      }
    } finally { await rm(f.root, { recursive: true, force: true }); }
  });
  it("allows a project-internal source symlink without replacing it", async () => {
    const f = await fixture();
    try {
      await mkdir(join(f.root, "compat"));
      await symlink("../.agents/skills/project-check/SKILL.md", join(f.root, "compat", "SKILL.md"));
      const before = await readFile(join(f.root, f.skillPath));
      f.binding.path = "<Path>compat/SKILL.md</Path>";
      assert.deepEqual(contract.validateTicketPlan(f.artifact, { repoRoot: f.root }), []);
      assert.deepEqual(await readFile(join(f.root, f.skillPath)), before);
    } finally { await rm(f.root, { recursive: true, force: true }); }
  });
  it("rejects outside symlink targets, cache sources and path traversal", async () => {
    const f = await fixture();
    const outside = await mkdtemp(join(tmpdir(), "speculo-outside-"));
    try {
      await writeFile(join(outside, "SKILL.md"), await readFile(join(f.root, f.skillPath)));
      await symlink(outside, join(f.root, "outside"));
      await mkdir(join(f.root, "node_modules", "cached"), { recursive: true });
      await writeFile(join(f.root, "node_modules", "cached", "SKILL.md"), await readFile(join(f.root, f.skillPath)));
      for (const path of ["<Path>outside/SKILL.md</Path>", "<Path>node_modules/cached/SKILL.md</Path>", "<Path>../SKILL.md</Path>", "<Path>/tmp/SKILL.md</Path>"]) assert.throws(() => contract.resolveProjectSource(f.root, path));
    } finally { await rm(f.root, { recursive: true, force: true }); await rm(outside, { recursive: true, force: true }); }
  });
  it("validates optional invocation conditions and pinned reference sources", async () => {
    const f = await fixture();
    try {
      const binding: any = f.binding;
      binding.required = false; binding.on_failure = "report-and-continue";
      assert.match(contract.validateTicketPlan(f.artifact, { repoRoot: f.root }).join("\n"), /condition/);
      binding.condition = "Only when the Ticket changes the public API";
      const ref = ".agents/skills/project-check/references/api.md";
      await mkdir(dirname(join(f.root, ref)), { recursive: true }); await writeFile(join(f.root, ref), "API review\n");
      binding.references = [{ path: `<Path>${ref}</Path>`, sha256: contract.digest("API review\n"), when: "public API changes" }];
      assert.deepEqual(contract.validateTicketPlan(f.artifact, { repoRoot: f.root }), []);
      await writeFile(join(f.root, ref), "changed\n");
      assert.match(contract.validateTicketPlan(f.artifact, { repoRoot: f.root }).join("\n"), /reference digest drift/);
    } finally { await rm(f.root, { recursive: true, force: true }); }
  });
  it("requires one matching passed execution record for every required invocation", async () => {
    const f = await fixture();
    try {
      f.artifact.meta.status = "done";
      assert.match(contract.validateTicketPlan(f.artifact, { repoRoot: f.root }).join("\n"), /execution evidence/);
      const evidenceRoot = join(f.root, change, "evidence"); await mkdir(evidenceRoot);
      const record = { id: f.binding.id, phase: f.binding.phase, operation: f.binding.operation, sha256: f.binding.sha256, status: "passed", evidence: ["node --test: 3 passed; captured at project commit abc"] };
      const writeRecords = async (records: unknown[]) => writeFile(join(evidenceRoot, "T-01.md"), `## Skill Execution Records\n\n\x60\x60\x60json\n${JSON.stringify(records)}\n\x60\x60\x60\n`);
      await writeRecords([{ ...record, status: "read" }]); assert.ok(contract.validateTicketPlan(f.artifact, { repoRoot: f.root }).length);
      await writeRecords([record, record]); assert.ok(contract.validateTicketPlan(f.artifact, { repoRoot: f.root }).length);
      await writeRecords([record]); assert.deepEqual(contract.validateTicketPlan(f.artifact, { repoRoot: f.root }), []);
      // A historical completion record is not invalidated by the present-day Skill package.
      await writeFile(join(f.root, f.skillPath), "new Skill package\n");
      assert.deepEqual(contract.validateTicketPlan(f.artifact, { repoRoot: f.root }), []);
    } finally { await rm(f.root, { recursive: true, force: true }); }
  });
  it("keeps legacy artifacts readable but requires upgrade before new implementation", () => {
    const legacy = { meta: { status: "ready" }, body: "", path: "ticket.md" };
    assert.deepEqual(contract.validateTicketPlan(legacy), []);
    assert.match(contract.validateTicketPlan(legacy, { requirePlan: true }).join("\n"), /upgraded/);
    legacy.meta.status = "done";
    assert.deepEqual(contract.validateTicketPlan(legacy, { requirePlan: true }), []);
  });
  it("checks the invocation matrix in both directions", () => {
    const skill = ".agents/skills/check/SKILL.md";
    const ticket = { meta: { plan_contract_version: 1, ready: true, skill_bindings: [] as any[] } };
    const tickets = new Map([["T-01", ticket]]);
    const matrix = [{ appliesTo: new Set(["ALL"]), path: skill }];
    assert.match(contract.validateInvocationCoverage(tickets, matrix).join("\n"), /no invocation binding/);
    ticket.meta.skill_bindings = [{ path: `<Path>${skill}</Path>` }];
    assert.deepEqual(contract.validateInvocationCoverage(tickets, matrix), []);
    assert.match(contract.validateInvocationCoverage(tickets, []).join("\n"), /absent from Map/);
  });
  it("does not accept reduced, duplicate or missing explicitly quantified deliverables", async () => {
    const f = await fixture();
    try {
      const map = { meta: { plan_contract_version: 1, plan_revision: 1, status: "completed", deliverable_policy: "User explicitly requested three mockups", requested_deliverables: [{ name: "mockups", count: 3 }] }, body: "## 9. 总控与恢复\n" };
      const root = join(f.root, change); await mkdir(join(root, "evidence"));
      const writeRecords = async (outputs: string[]) => writeFile(join(root, "evidence", "goal-delivery.md"), `## Delivery Records\n\n\x60\x60\x60json\n${JSON.stringify([{ name: "mockups", outputs }])}\n\x60\x60\x60\n`);
      for (const outputs of [["a", "b"], ["a", "b", "b"]]) { await writeRecords(outputs); assert.ok(contract.validatePlanMap(map, root).length > 0); }
      await writeRecords(["a", "b", "c"]); assert.deepEqual(contract.validatePlanMap(map, root), []);
    } finally { await rm(f.root, { recursive: true, force: true }); }
  });
  it("keeps a parent tickets-map a pointer rather than a second mutable state store", async () => {
    const f = await fixture();
    try {
      const directory = join(f.root, change);
      await writeFile(join(directory, "implementation-map.md"), "source\n"); await writeFile(join(directory, "implementation-plan.md"), "plan\n");
      const meta: any = { schema_version: 1, artifact: "goal-tickets-map", change, implementation_map: `<Path>{roots.state}/specdev/changes/${change}/implementation-map.md</Path>`, implementation_plan: `<Path>{roots.state}/specdev/changes/${change}/implementation-plan.md</Path>` };
      assert.deepEqual(contract.validateGoalMap({ meta }, directory), []);
      meta.status = "done"; assert.match(contract.validateGoalMap({ meta }, directory).join("\n"), /may not cache state/); delete meta.status;
      meta.implementation_map = "<Path>../another/implementation-map.md</Path>"; assert.match(contract.validateGoalMap({ meta }, directory).join("\n"), /own parent artifact/);
    } finally { await rm(f.root, { recursive: true, force: true }); }
  });
  it("validates initiative candidate identity, dependencies and independently owned child changes", async () => {
    const f = await fixture();
    try {
      const directory = join(f.root, change), child = "2026-09-08-child";
      const candidate = (id: string) => ({ id, name: id, background: "verified request", scope: "bounded feature", non_goals: [], unknowns: [], depends_on: [] as string[], target: null as string | null });
      const data = { schema_version: 1, artifact: "initiative", change, revision: 1, destination: "Explore an end-to-end product", changes: [candidate("api"), candidate("ui")] };
      const save = async () => writeFile(join(directory, "initiative.json"), JSON.stringify(data));
      await save(); assert.deepEqual(contract.validateInitiative(directory), []);
      data.changes[0].depends_on = ["ui"]; data.changes[1].depends_on = ["api"];
      await save(); assert.match(contract.validateInitiative(directory).join("\n"), /cycle/);
      data.changes[0].depends_on = []; data.changes[1].target = child;
      await save(); assert.match(contract.validateInitiative(directory).join("\n"), /missing/);
      await mkdir(join(f.root, child)); await writeFile(join(f.root, child, ".status.json"), JSON.stringify({ schema_version: 6, artifact: "change-status", change: child }));
      await save(); assert.deepEqual(contract.validateInitiative(directory), []);
      data.changes[1].target = change; await save(); assert.match(contract.validateInitiative(directory).join("\n"), /self target/);
    } finally { await rm(f.root, { recursive: true, force: true }); }
  });
});


describe("progressive command references", () => {
  async function commandFixture() {
    const root = await mkdtemp(join(tmpdir(), "speculo-command-references-"));
    await mkdir(join(root, ".agents", "skills"), { recursive: true });
    await mkdir(join(root, "template", "commands", "references"), { recursive: true });
    await writeFile(join(root, "template", "commands", "audit.md"), "---\nid: audit\ntype: command\nname: Audit\ndescription: Audit selected files.\n---\nRead <Path>{roots.commands}/references/audit.md</Path>.\n");
    await writeFile(join(root, "template", "commands", "references", "audit.md"), "# Required detailed procedure\nKeep the original quality gates.\n");
    return root;
  }
  function check(root: string) {
    const result = spawnSync(process.execPath, [join(process.cwd(), ".agents/skills/speculo-write-workflows/scripts/validate-speculo-assets.mjs"), root, "--json"], { encoding: "utf8" });
    assert.equal(result.error, undefined);
    return { status: result.status, report: JSON.parse(result.stdout) };
  }
  it("does not classify prose in commands/references as a command, but still checks its paths", async () => {
    const root = await commandFixture();
    try {
      assert.equal(check(root).status, 0);
      await writeFile(join(root, "template", "commands", "references", "audit.md"), "Missing <Path>{roots.commands}/references/missing.md</Path>.\n");
      const failed = check(root); assert.equal(failed.status, 1);
      assert.ok(failed.report.errors.some((error: { message: string }) => error.message.includes("static Path target does not exist")));
    } finally { await rm(root, { recursive: true, force: true }); }
  });
  it("still rejects a real command without mandatory frontmatter", async () => {
    const root = await commandFixture();
    try {
      await writeFile(join(root, "template", "commands", "broken.md"), "# Not a valid command\n");
      const failed = check(root); assert.equal(failed.status, 1);
      assert.ok(failed.report.errors.some((error: { message: string }) => error.message.includes("command requires valid frontmatter")));
    } finally { await rm(root, { recursive: true, force: true }); }
  });
});
