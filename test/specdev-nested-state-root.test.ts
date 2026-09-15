import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";

const packageRoot = process.cwd();
const validator = join(
  packageRoot,
  "template/workflows/specdev/common/tools/validate-specdev.mjs",
);
const legalName = "2026-09-16-legal";
const illegalName = "2026-09-16-illegal";
const archiveName = "2026-08-01-archived";
const MACHINE_ABS = /(?:\/Users\/|\/home\/|\/mnt\/|\/tmp\/|\/var\/|\/workspace\/|[A-Za-z]:[\\/])/;

function specdevConfig(): string {
  return `${JSON.stringify({
    schema_version: 5,
    interaction_language: "zh-CN",
    artifact_language: "zh-CN",
    git: { default_branch: "main" },
    execution: {
      max_implementation_agents: 3,
      max_integration_attempts: 3,
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
  }, null, 2)}\n`;
}

function changeStatus(name: string): string {
  return `${JSON.stringify({
    schema_version: 6,
    artifact: "change-status",
    change: name,
    change_status: "active",
    current_work: null,
    works_run: [],
    claimed_investigations: [],
    execution_authorization: {
      implementation_commit: { status: "not-authorized", source: null, granted_at: null, scope: "Ticket source commits" },
      local_candidate_integration: { status: "not-authorized", source: null, granted_at: null, scope: "Lead-owned local parent candidate integration and parent update" },
      source_cleanup: { status: "not-authorized", source: null, granted_at: null, scope: "Source worktree and branch cleanup" },
    },
    leadership: { current: "lead-session", epoch: 1, assigned_at: "2026-09-16T00:00:00Z", history: [] },
    created_at: "2026-09-16T00:00:00Z",
    updated_at: "2026-09-16T00:00:00Z",
    completed_at: null,
    archived: false,
    archive_path: null,
    blockers: [],
    deviations: [],
    worktrees: [],
  }, null, 2)}\n`;
}

function designTree(name: string): string {
  return `${JSON.stringify({
    schema_version: 1,
    artifact: "design-tree",
    change: name,
    status: "active",
    round: 0,
    nodes: [],
  }, null, 2)}\n`;
}

async function writeGrillChange(root: string, name: string): Promise<string> {
  const change = join(root, name);
  await mkdir(change, { recursive: true });
  await writeFile(join(change, ".status.json"), changeStatus(name));
  await writeFile(join(change, "design-tree.json"), designTree(name));
  await writeFile(join(change, "LOG.md"), "# LOG\n");
  await writeFile(join(change, "CONTEXT.md"), "# CONTEXT\n");
  await writeFile(join(change, "ADR.md"), "# ADR\n");
  return change;
}

async function nestedFixture(): Promise<{
  proj: string;
  legal: string;
  illegal: string;
  archived: string;
}> {
  const proj = await mkdtemp(join(tmpdir(), "specdev-nested-root-"));
  const stateRoot = join(proj, "speculo", ".speculo");
  const specdevRoot = join(stateRoot, "specdev");
  const shadowRoot = join(proj, ".speculo", "specdev");
  await mkdir(join(specdevRoot, "changes"), { recursive: true });
  await mkdir(join(specdevRoot, "archive", "2026-08"), { recursive: true });
  await mkdir(join(shadowRoot, "changes"), { recursive: true });
  await writeFile(join(stateRoot, "workspace.json"), `${JSON.stringify({
    schema_version: 1,
    path_base: "project-root",
    roots: { state: "speculo/.speculo" },
  }, null, 2)}\n`);
  await writeFile(join(specdevRoot, "config.json"), specdevConfig());
  await writeFile(join(shadowRoot, "config.json"), specdevConfig());
  const legal = await writeGrillChange(join(specdevRoot, "changes"), legalName);
  const illegal = await writeGrillChange(join(shadowRoot, "changes"), illegalName);
  const archived = await writeGrillChange(join(specdevRoot, "archive", "2026-08"), archiveName);
  assert.equal(spawnSync("git", ["init", "-b", "main"], { cwd: proj }).status, 0);
  return { proj, legal, illegal, archived };
}

async function flatLegacyFixture(): Promise<{ parent: string; change: string }> {
  const parent = await mkdtemp(join(tmpdir(), "specdev-flat-legacy-"));
  const change = await writeGrillChange(parent, legalName);
  await mkdir(join(parent, ".speculo", "specdev"), { recursive: true });
  await writeFile(join(parent, ".speculo", "specdev", "config.json"), specdevConfig());
  return { parent, change };
}

function runValidator(change: string, options: { stage?: string; repo?: string; cwd?: string } = {}) {
  const args = [validator];
  if (options.stage) args.push("--stage", options.stage);
  if (options.repo) args.push("--repo", options.repo);
  args.push(change);
  return spawnSync(process.execPath, args, {
    encoding: "utf8",
    cwd: options.cwd ?? packageRoot,
  });
}

function combined(result: ReturnType<typeof spawnSync>): string {
  return `${result.stdout ?? ""}${result.stderr ?? ""}`;
}

describe("SpecDev nested workspace.json state root", () => {
  it("accepts a change under the declared nested state root at grill", async () => {
    const fixture = await nestedFixture();
    try {
      const withRepo = runValidator(fixture.legal, { stage: "grill", repo: fixture.proj, cwd: fixture.proj });
      assert.equal(withRepo.status, 0, combined(withRepo));
      assert.doesNotMatch(combined(withRepo), /outside workspace roots\.state/);

      const walked = runValidator(fixture.legal, { stage: "grill", cwd: fixture.proj });
      assert.equal(walked.status, 0, combined(walked));
      assert.doesNotMatch(combined(walked), /outside workspace roots\.state/);
    } finally {
      await rm(fixture.proj, { recursive: true, force: true });
    }
  });

  it("rejects a project-root shadow change even with grill artifacts and config.json", async () => {
    const fixture = await nestedFixture();
    try {
      const withRepo = runValidator(fixture.illegal, { stage: "grill", repo: fixture.proj, cwd: fixture.proj });
      assert.notEqual(withRepo.status, 0, combined(withRepo));
      const text = combined(withRepo);
      assert.match(text, /outside workspace roots\.state/);
      assert.match(text, /speculo\/\.speculo/);
      assert.match(text, /project-root \.speculo\/specdev is illegal/);
      assert.doesNotMatch(text, MACHINE_ABS);

      const walked = runValidator(fixture.illegal, { stage: "grill", cwd: fixture.illegal });
      assert.notEqual(walked.status, 0, combined(walked));
      assert.match(combined(walked), /speculo\/\.speculo/);
      assert.doesNotMatch(combined(walked), MACHINE_ABS);
    } finally {
      await rm(fixture.proj, { recursive: true, force: true });
    }
  });

  it("keeps only the workspace-declared tree when both trees exist", async () => {
    const fixture = await nestedFixture();
    try {
      const legal = runValidator(fixture.legal, { stage: "grill", repo: fixture.proj, cwd: fixture.proj });
      const illegal = runValidator(fixture.illegal, { stage: "grill", repo: fixture.proj, cwd: fixture.proj });
      assert.equal(legal.status, 0, combined(legal));
      assert.notEqual(illegal.status, 0, combined(illegal));
      assert.match(combined(illegal), /speculo\/\.speculo/);
    } finally {
      await rm(fixture.proj, { recursive: true, force: true });
    }
  });

  it("accepts an archived change under roots.state/specdev/archive/YYYY-MM", async () => {
    const fixture = await nestedFixture();
    try {
      const result = runValidator(fixture.archived, { stage: "grill", repo: fixture.proj, cwd: fixture.proj });
      assert.equal(result.status, 0, combined(result));
      assert.doesNotMatch(combined(result), /outside workspace roots\.state/);
    } finally {
      await rm(fixture.proj, { recursive: true, force: true });
    }
  });

  it("errors on two self-consistent workspace.json files with different state roots", async () => {
    const fixture = await nestedFixture();
    try {
      await writeFile(join(fixture.proj, ".speculo", "workspace.json"), `${JSON.stringify({
        schema_version: 1,
        path_base: "project-root",
        roots: { state: ".speculo" },
      }, null, 2)}\n`);
      const result = runValidator(fixture.legal, { stage: "grill", repo: fixture.proj, cwd: fixture.proj });
      assert.notEqual(result.status, 0, combined(result));
      assert.match(combined(result), /conflicting workspace\.json/);
      assert.match(combined(result), /speculo\/\.speculo/);
      assert.doesNotMatch(combined(result), MACHINE_ABS);
    } finally {
      await rm(fixture.proj, { recursive: true, force: true });
    }
  });

  it("ignores a shadow workspace.json that is not located at roots.state", async () => {
    const fixture = await nestedFixture();
    try {
      await writeFile(join(fixture.proj, ".speculo", "workspace.json"), `${JSON.stringify({
        schema_version: 1,
        path_base: "project-root",
        roots: { state: "speculo/.speculo" },
      }, null, 2)}\n`);
      const legal = runValidator(fixture.legal, { stage: "grill", repo: fixture.proj, cwd: fixture.proj });
      const illegal = runValidator(fixture.illegal, { stage: "grill", repo: fixture.proj, cwd: fixture.proj });
      assert.equal(legal.status, 0, combined(legal));
      assert.notEqual(illegal.status, 0, combined(illegal));
      assert.match(combined(illegal), /outside workspace roots\.state/);
    } finally {
      await rm(fixture.proj, { recursive: true, force: true });
    }
  });

  it("keeps ancestor config lookup when no workspace.json exists", async () => {
    const fixture = await flatLegacyFixture();
    try {
      const result = runValidator(fixture.change, { stage: "grill", cwd: fixture.parent });
      assert.equal(result.status, 0, combined(result));
      assert.doesNotMatch(combined(result), /outside workspace roots\.state/);
    } finally {
      await rm(fixture.parent, { recursive: true, force: true });
    }
  });
});
