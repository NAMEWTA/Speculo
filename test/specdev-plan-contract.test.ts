import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, realpath, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import { describe, it } from "node:test";

const isWindows = process.platform === "win32";
const toolRoot = join(process.cwd(), "template/workflows/specdev/common/tools");
const contract = await import(pathToFileURL(join(toolRoot, "plan-contract.mjs")).href);
const validator = await import(pathToFileURL(join(toolRoot, "validate-specdev.mjs")).href);
const controller = await import(pathToFileURL(join(toolRoot, "ticket-control.mjs")).href);
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
      for (const frontmatter of ["id: T-01\nid: T-02", "__proto__: bad", "constructor: bad", 'skill_bindings: [{"id": broken]']) {
        await writeFile(f.artifact.path, `---\n${frontmatter}\n---\nbody`);
        assert.throws(() => validator.parseFrontmatter(f.artifact.path));
      }
    } finally { await rm(f.root, { recursive: true, force: true }); }
  });
  it("blocks fake names, missing required skills and digest drift without demanding catalogue scans", async () => {
    const f = await fixture();
    try {
      const original = structuredClone(f.artifact);
      f.artifact.meta.skill_scan = "unreviewed";
      assert.deepEqual(contract.validateTicketPlan(f.artifact, { repoRoot: f.root }), []);
      for (const overrides of [{ id: "fake" }, { path: "<Path>.agents/skills/missing/SKILL.md</Path>" }, { sha256: "0".repeat(64) }, { on_failure: "report-and-continue" }]) {
        const artifact = structuredClone(original);
        Object.assign(artifact.meta.skill_bindings[0], overrides);
        assert.ok(contract.validateTicketPlan(artifact, { repoRoot: f.root }).length > 0);
      }
    } finally { await rm(f.root, { recursive: true, force: true }); }
  });
  it("allows a project-internal source symlink without replacing it", { skip: isWindows ? "requires Windows Developer Mode symlink privileges" : false }, async () => {
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
  it("rejects outside symlink targets, cache sources and path traversal", { skip: isWindows ? "requires Windows Developer Mode symlink privileges" : false }, async () => {
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
  it("permits optional knowledge drift but preserves required reference pins", async () => {
    const f = await fixture();
    try {
      const binding: any = f.binding;
      binding.required = false; binding.on_failure = "report-and-continue";
      assert.deepEqual(contract.validateTicketPlan(f.artifact, { repoRoot: f.root }), []);
      binding.condition = "Only when the Ticket changes the public API";
      const ref = ".agents/skills/project-check/references/api.md";
      await mkdir(dirname(join(f.root, ref)), { recursive: true }); await writeFile(join(f.root, ref), "API review\n");
      binding.references = [{ path: `<Path>${ref}</Path>`, sha256: contract.digest("API review\n"), when: "public API changes" }];
      assert.deepEqual(contract.validateTicketPlan(f.artifact, { repoRoot: f.root }), []);
      await writeFile(join(f.root, ref), "changed\n");
      assert.deepEqual(contract.validateTicketPlan(f.artifact, { repoRoot: f.root }), []);
      binding.required = true; binding.on_failure = "block-ticket";
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
  it("rejects missing plan contracts even on recorded completed artifacts", () => {
    const legacy = { meta: { status: "ready" }, body: "", path: "ticket.md" };
    assert.match(contract.validateTicketPlan(legacy).join("\n"), /plan_contract_version/);
    assert.match(contract.validateTicketPlan(legacy, { requirePlan: true }).join("\n"), /plan_contract_version/);
    legacy.meta.status = "done";
    assert.match(contract.validateTicketPlan(legacy, { requirePlan: true }).join("\n"), /plan_contract_version/);
  });
  it("keeps Map discovery open while enforcing explicitly required methods", () => {
    const skill = ".agents/skills/check/SKILL.md";
    const ticket = { meta: { plan_contract_version: 1, ready: true, skill_bindings: [] as any[] } };
    const tickets = new Map([["T-01", ticket]]);
    const matrix = [{ appliesTo: new Set(["ALL"]), path: skill, required: false }];
    assert.deepEqual(contract.validateInvocationCoverage(tickets, matrix), []);
    matrix[0].required = true;
    assert.match(contract.validateInvocationCoverage(tickets, matrix).join("\n"), /no required invocation binding/);
    ticket.meta.skill_bindings = [{ path: `<Path>${skill}</Path>`, required: false }];
    assert.ok(contract.validateInvocationCoverage(tickets, matrix).length);
    ticket.meta.skill_bindings[0].required = true;
    assert.deepEqual(contract.validateInvocationCoverage(tickets, matrix), []);
    assert.deepEqual(contract.validateInvocationCoverage(tickets, []), []);
  });
  it("reports malformed binding collections during coverage and completion without treating them as empty", async () => {
    const f=await fixture();
    try {
      for(const value of ["not-a-list",null,{}]) {
        const artifact:any=structuredClone(f.artifact);artifact.meta.skill_bindings=value;
        const tickets=new Map([["T-01",artifact]]);
        assert.match(contract.validateInvocationCoverage(tickets,[]).join("\n"),/T-01: skill_bindings must be a JSON array/);
        artifact.meta.status="done";
        assert.match(contract.validateTicketPlan(artifact,{repoRoot:f.root}).join("\n"),/skill_bindings must be a JSON array/);
      }
    } finally {await rm(f.root,{recursive:true,force:true});}
  });
  it("allows new optional Skills without replan, digest pins, or scanning unrelated packages", async () => {
    const f = await fixture();
    try {
      const meta: any = f.artifact.meta;
      delete meta.skill_scan; delete meta.skill_bindings;
      assert.deepEqual(contract.validateTicketPlan(f.artifact), []);
      meta.skill_bindings = [{ id: "discovered", path: "<Path>.agents/skills/discovered/SKILL.md</Path>", required: false }];
      assert.deepEqual(contract.validateTicketPlan(f.artifact), []);
      meta.skill_bindings[0].path = "<Path>../outside/SKILL.md</Path>";
      assert.match(contract.validateTicketPlan(f.artifact).join("\n"), /invalid project source Path/);
      meta.skill_bindings = [f.binding];
      assert.match(contract.validateTicketPlan(f.artifact).join("\n"), /requires --repo/);
    } finally { await rm(f.root, { recursive: true, force: true }); }
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
      await mkdir(join(f.root, child)); await writeFile(join(f.root, child, "README.md"), "# Child\n\nOutcome: active\n");
      await save(); assert.deepEqual(contract.validateInitiative(directory), []);
      data.changes[1].target = change; await save(); assert.match(contract.validateInitiative(directory).join("\n"), /self target/);
    } finally { await rm(f.root, { recursive: true, force: true }); }
  });
});

describe("planning entry contract closure", () => {
  it("keeps optional Skill discovery free of publishing-time binding and scan gates", async () => {
    const root=join(process.cwd(),"template/workflows/specdev");
    const entry=await readFile(join(root,"specdev-t-tickets/SKILL.md"),"utf8");
    const review=await readFile(join(root,"common/skills/plan-quality-review/SKILL.md"),"utf8");
    const checklist=await readFile(join(root,"common/skills/plan-quality-review/references/checklist.md"),"utf8");
    for(const source of [entry,review,checklist]) {
      assert.doesNotMatch(source,/为每票解析实际 Skill ID|没有适用项目 Skill 时记录扫描证据|Skill 最低路由|无适用项有扫描依据/);
      assert.match(source,/必需方法/);assert.match(source,/可选/);
    }
    assert.match(entry,/common\/rules\/skill-invocation\.md/);
    assert.match(review,/common\/rules\/skill-invocation\.md/);
    assert.doesNotMatch(checklist,/接缝、有序步骤、公共契约/);
  });
  it("uses persistent coordination needs throughout lightweight Goal entry and templates", async () => {
    const root=join(process.cwd(),"template/workflows/specdev");
    for(const path of ["specdev-p-goal-plan/SKILL.md","specdev-p-goal-plan/assets/lightweight-goal-plan-template.md","specdev-p-goal-plan/references/single-change-plan.md","common/rules/artifact-contract.md","specdev-s-spec/SKILL.md"]) {
      const source=await readFile(join(root,path),"utf8");
      assert.doesNotMatch(source,/无真实并行|多个 Ticket 可以或需要并行|真实并行或复杂设计依赖使用完整工件|复杂设计\/Deep\/并行\/跨 change/);
      assert.match(source,/持久依赖图|持续协调/);
      assert.match(source,/只读.*并行|并行.*只读/);
    }
  });
});

describe("Ticket authority and execution policy without config", () => {
  async function controllerFixture(policy: "current" | "required" = "current") {
    const repo = await realpath(await mkdtemp(join(tmpdir(), "speculo-ticket-authority-")));
    const name = "2026-10-14-ticket-authority";
    const root = join(repo, "facts/specdev/changes", name);
    await mkdir(join(root, "ticket"), { recursive: true });
    const git = spawnSync("git", ["init", "-b", "main"], { cwd: repo, encoding: "utf8" });
    assert.equal(git.status, 0, git.stdout + git.stderr);
    const templateRoot = join(process.cwd(), "template/workflows/specdev");
    const materialize = async (path: string) => (await readFile(join(templateRoot, path), "utf8"))
      .replace("change: <YYYY-MM-DD-topic>", `change: ${name}`)
      .replace("status: draft", "status: ready")
      .replace("skill_scan: unreviewed", "skill_scan: inspected the fixture project; no applicable Skills")
      .replace("deliverable_policy: unreviewed", "deliverable_policy: no additional quantified outputs requested");
    await writeFile(join(root, "README.md"), `# Goal\n\nOutcome: active\n\n## Ownership\nOwner: lead-session\nWork: specdev/goal-plan\nEvidence: ownership.md\n`);
    await writeFile(join(root, "ownership.md"), "Owner: lead-session\nWork: specdev/goal-plan\nSource: isolated controller fixture assignment\n");
    const spec = (await materialize("specdev-s-spec/assets/spec-template.md"))
      .replace("ready_for_tickets: false", "ready_for_tickets: true")
      .replace("\n存在高影响未决问题时，`ready_for_tickets` 必须为 `false`。", "");
    await writeFile(join(root, "spec.md"), spec);
    let map = await materialize("specdev-t-tickets/assets/tickets-map-template.md");
    const tickets = [];
    for (const id of ["T-01", "T-02", "T-03"]) {
      const ticketPath = join(root, "ticket", `${id.slice(2)}-implementation.md`);
      const ticket = (await materialize("specdev-t-tickets/assets/ticket-template.md"))
        .replaceAll("T-01", id)
        .replace("ready: false", "ready: true")
        .replace("owner: unassigned", `owner: ${id === "T-01" ? "lead-session" : `worker-${id}`}`)
        .replace('expected_changes: ["<Path>src/example.ts</Path>"]', `expected_changes: ["<Path>src/${id}.ts</Path>"]`)
        .replace('writable_paths: ["<Path>src/example/**</Path>"]', `writable_paths: ["<Path>src/${id}.ts</Path>"]`)
        .replace("\n存在会改变行为、接口、数据、兼容、安全、范围、迁移或验收的问题时，frontmatter 中 `ready` 必须为 `false`。", "");
      await writeFile(ticketPath, ticket);
      tickets.push(ticketPath);
      if (id !== "T-01") map += `\n${id}: <Path>{roots.state}/specdev/changes/${name}/ticket/${id.slice(2)}-implementation.md</Path>\n`;
    }
    await writeFile(join(root, "tickets-map.md"), map);
    const plan = (await materialize("specdev-p-goal-plan/assets/goal-plan-template.md"))
      .replaceAll("<owner-or-session-locator>", "lead-session")
      .replace("ticket_execution: auto", `ticket_execution: ${policy === "current" ? "serial" : "parallel"}\nmax_parallel_tickets: 2\nconcurrent_implementation_limit: 2`)
      .replace("ready_for_execution: false", "ready_for_execution: true")
      .replace(/## Execution Policy Source[\s\S]*$/, "## Execution Policy Source\n\nFixture request allows two simultaneous implementations including the Lead and three integration attempts; Ticket scheduling follows the declared ticket_execution policy.\n");
    await writeFile(join(root, "goal-plan.md"), plan);
    const input = { mapPath: join(root, "tickets-map.md"), repoRoot: repo, methodRoot: join(process.cwd(), "template"), stateRoot: "facts" };
    return { repo, root, tickets, input, map, plan };
  }

  it("reads and resumes Ticket progress without rewriting Map or Goal and honors explicit serial scheduling", async () => {
    const f = await controllerFixture();
    try {
      const executionTable = f.map.split("## 2. 执行清单")[1].split("## 3.")[0];
      assert.doesNotMatch(executionTable.split("\n").filter(line => line.startsWith("|")).join("\n"), /\b(?:Status|Ready|Owner)\b/);
      let result = controller.analyzeMap(f.input);
      assert.deepEqual(result.errors, []); assert.deepEqual(result.validation_errors, []);
      const toolsReadme = await readFile(join(toolRoot, "README.md"), "utf8");
      const documentedSchemaVersions = [...toolsReadme.matchAll(/schema_version\s*(?:为|:)\s*(\d+)/g)].map(match => Number(match[1]));
      assert.ok(documentedSchemaVersions.length > 0);
      assert.ok(documentedSchemaVersions.every(version => version === result.schema_version), "tools README must document the current controller schema");
      assert.doesNotMatch(toolsReadme, /创建时要求每个成员已有 Ready Spec\/Tickets|不输出旧 eligible/);
      assert.equal(result.ticket_execution, "serial"); assert.equal(result.max_parallel_tickets, 1);
      assert.deepEqual(result.suggested_batch, ["T-01"]);
      assert.deepEqual(result.eligible, ["T-01", "T-02", "T-03"]);
      const previous = result;
      const original = await readFile(f.tickets[0], "utf8");
      await writeFile(f.tickets[0], original.replace("status: ready", "status: in_progress"));
      result = controller.analyzeMap({ ...f.input, previous });
      assert.deepEqual(result.invalidated, []);
      assert.deepEqual(result.in_flight, [{ id: "T-01", owner: "lead-session" }]);
      assert.deepEqual(result.suggested_batch, []);
      await writeFile(f.tickets[0], original);
      result = controller.analyzeMap({ ...f.input, previous });
      assert.deepEqual(result.errors, []); assert.deepEqual(result.invalidated, []);
      assert.deepEqual(result.suggested_batch, ["T-01"]);
      assert.equal(await readFile(f.input.mapPath, "utf8"), f.map);
      assert.equal(await readFile(join(f.root, "goal-plan.md"), "utf8"), f.plan);
      await assert.rejects(readFile(join(f.repo, "facts/specdev/config.json")), /ENOENT/);
    } finally { await rm(f.repo, { recursive: true, force: true }); }
  });

  it("counts active Tickets against the declared Ticket cap independently of Agent owners", async () => {
    const f = await controllerFixture("required");
    try {
      let result = controller.analyzeMap(f.input);
      assert.deepEqual(result.errors, []); assert.deepEqual(result.suggested_batch, ["T-01", "T-02"]);
      await writeFile(f.tickets[0], (await readFile(f.tickets[0], "utf8")).replace("status: ready", "status: in_progress"));
      result = controller.analyzeMap(f.input);
      assert.deepEqual(result.errors, []); assert.deepEqual(result.validation_errors, []);
      assert.equal(result.max_parallel_tickets, 2);
      assert.deepEqual(result.in_flight, [{ id: "T-01", owner: "lead-session" }]);
      assert.deepEqual(result.suggested_batch, ["T-02"]);
      assert.ok(result.deferred.some((node: any) => node.id === "T-03" && /concurrency limit/.test(node.reason)));
      await writeFile(join(f.root, "goal-plan.md"), f.plan.replace(/## Execution Policy Source[\s\S]*$/, ""));
      const missingSource = controller.analyzeMap(f.input);
      assert.deepEqual(missingSource.suggested_batch, []);
      assert.match(missingSource.errors.join("\n"), /Execution Policy Source/);
      await assert.rejects(readFile(join(f.repo, "facts/specdev/config.json")), /ENOENT/);
    } finally { await rm(f.repo, { recursive: true, force: true }); }
  });
});


describe("progressive command references", () => {
  async function commandFixture() {
    const root = await mkdtemp(join(tmpdir(), "speculo-command-references-"));
    await mkdir(join(root, ".agents", "skills"), { recursive: true });
    await mkdir(join(root, "template", "commands", "audit", "references"), { recursive: true });
    await writeFile(join(root, "template", "commands", "manifest.json"), JSON.stringify({schema_version:1,commands:["audit/COMMAND.md"]}));
    await writeFile(join(root, "template", "commands", "audit", "COMMAND.md"), "---\nid: audit\ntype: command\nname: Audit\ndescription: Audit selected files.\n---\nRead <Path>{roots.commands}/audit/references/audit.md</Path>.\n");
    await writeFile(join(root, "template", "commands", "audit", "references", "audit.md"), "# Required detailed procedure\nKeep the original quality gates.\n");
    return root;
  }
  function check(root: string) {
    const result = spawnSync(process.execPath, [join(process.cwd(), ".agents/skills/speculo-write-workflows/scripts/validate-speculo-assets.mjs"), root, "--json"], { encoding: "utf8" });
    assert.equal(result.error, undefined);
    return { status: result.status, report: JSON.parse(result.stdout) };
  }
  it("does not classify prose in command references as an entry, but still checks its paths", async () => {
    const root = await commandFixture();
    try {
      assert.equal(check(root).status, 0);
      await writeFile(join(root, "template", "commands", "audit", "references", "audit.md"), "Missing <Path>{roots.commands}/audit/references/missing.md</Path>.\n");
      const failed = check(root); assert.equal(failed.status, 1);
      assert.match(JSON.stringify(failed.report.errors), /missing reference.*missing\.md/);
    } finally { await rm(root, { recursive: true, force: true }); }
  });
  it("still rejects a real command without mandatory frontmatter", async () => {
    const root = await commandFixture();
    try {
      await writeFile(join(root, "template", "commands", "audit", "COMMAND.md"), "# Not a valid command\n");
      const failed = check(root); assert.equal(failed.status, 1);
      assert.match(JSON.stringify(failed.report.errors), /invalid-frontmatter/);
    } finally { await rm(root, { recursive: true, force: true }); }
  });
});

