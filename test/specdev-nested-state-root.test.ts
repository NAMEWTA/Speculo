import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";

import { DEFAULT_ROOTS } from "../src/paths.js";
import { readChangeFactsSync } from "../src/specdev-artifacts.js";
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
    schema_version: 7,
    github: { include_external_prs: false, labels: {} },
    interaction_language: "zh-CN",
    artifact_language: "zh-CN",
    git: { default_branch: "main" },
    execution: {
      max_concurrent_implementations: 3,
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
  const completion = name === archiveName ? '\n<a id="scope"></a>\n## Scope\nResolve the bounded grill question.\n\n<a id="acceptance"></a>\n## Acceptance\n- [x] AC-1: Answer has reviewed evidence.\n\n<a id="verification"></a>\n## Verification\n| AC | Result | Evidence |\n|---|---|---|\n| AC-1 | passed | LOG.md |\n\n## Next Steps\nNo remaining grill work.\n' : '';
  await writeFile(join(change, "README.md"), `# ${name}\n\nOutcome: ${name === archiveName ? 'completed' : 'active'}\n\n## Ownership\nOwner: lead-session\nWork: specdev/grill\nEvidence: LOG.md\n${completion}`);
  await writeFile(join(change, "design-tree.json"), designTree(name));
  await writeFile(join(change, "LOG.md"), "# LOG\n\nOwner: lead-session\nWork: specdev/grill\nSource: fixture:original-user-request\nMethod: fixture evidence review\nObserved: bounded question has a verified answer\nResult: passed\n");
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
  const stateRoot = join(proj, ".agents/speculo", ".speculo");
  const specdevRoot = join(stateRoot, "specdev");
  const shadowRoot = join(proj, ".speculo", "specdev");
  await mkdir(join(specdevRoot, "changes"), { recursive: true });
  await mkdir(join(shadowRoot, "changes"), { recursive: true });
  await writeFile(join(stateRoot, "workspace.json"), `${JSON.stringify({
    schema_version: 2, layout_version: "agents-v2", installation_id: "00000000-0000-0000-0000-000000000000",
    path_base: "project-root", roots: DEFAULT_ROOTS,
  }, null, 2)}\n`);
  await writeFile(join(specdevRoot, "config.json"), specdevConfig());
  await writeFile(join(shadowRoot, "config.json"), specdevConfig());
  const legal = await writeGrillChange(join(specdevRoot, "changes"), legalName);
  const illegal = await writeGrillChange(join(shadowRoot, "changes"), illegalName);
  const archived = await writeGrillChange(join(specdevRoot, "changes", "archive"), archiveName);
  assert.equal(spawnSync("git", ["init", "-b", "main"], { cwd: proj }).status, 0);
  return { proj, legal, illegal, archived };
}

async function uninstalledFixture(): Promise<{ parent: string; change: string }> {
  const parent = await mkdtemp(join(tmpdir(), "specdev-uninstalled-"));
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
      assert.match(text, /identity-conflict.*change not found in the requested locations/);
      assert.doesNotMatch(text, MACHINE_ABS);

      const walked = runValidator(fixture.illegal, { stage: "grill", cwd: fixture.illegal });
      assert.notEqual(walked.status, 0, combined(walked));
      assert.match(combined(walked), /identity-conflict/);
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
      assert.match(combined(illegal), /identity-conflict/);
    } finally {
      await rm(fixture.proj, { recursive: true, force: true });
    }
  });

  it("accepts a new Markdown archive under roots.state/specdev/changes/archive", async () => {
    const fixture = await nestedFixture();
    try {
      const result = runValidator(fixture.archived, { stage: "grill", repo: fixture.proj, cwd: fixture.proj });
      assert.equal(result.status, 0, combined(result));
      assert.doesNotMatch(combined(result), /outside workspace roots\.state/);
    } finally {
      await rm(fixture.proj, { recursive: true, force: true });
    }
  });

  it("rejects a changed authoritative workspace root", async () => {
    const fixture = await nestedFixture();
    try {
      await writeFile(join(fixture.proj, ".agents/speculo/.speculo", "workspace.json"), `${JSON.stringify({
        schema_version: 2, layout_version: "agents-v2", installation_id: "00000000-0000-0000-0000-000000000000",
        path_base: "project-root",
        roots: {...DEFAULT_ROOTS, state: ".speculo" },
      }, null, 2)}\n`);
      const result = runValidator(fixture.legal, { stage: "grill", repo: fixture.proj, cwd: fixture.proj });
      assert.notEqual(result.status, 0, combined(result));
      assert.match(combined(result), /invalid-workspace-roots/);

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
        roots: { state: ".agents/speculo/.speculo" },
      }, null, 2)}\n`);
      const legal = runValidator(fixture.legal, { stage: "grill", repo: fixture.proj, cwd: fixture.proj });
      const illegal = runValidator(fixture.illegal, { stage: "grill", repo: fixture.proj, cwd: fixture.proj });
      assert.equal(legal.status, 0, combined(legal));
      assert.notEqual(illegal.status, 0, combined(illegal));
      assert.match(combined(illegal), /identity-conflict/);
    } finally {
      await rm(fixture.proj, { recursive: true, force: true });
    }
  });

  it("refuses a historical folder outside current change locations and preserves its source bytes", async () => {
    const fixture = await nestedFixture();
    try {
      const name = '2026-08-02-history', root = join(fixture.proj, '.agents/speculo/.speculo/specdev');
      const historical = join(root, 'archive/2026-08', name); await mkdir(historical, { recursive: true });
      const original = '{"historical":"opaque source bytes"}\r\n'; await writeFile(join(historical, '.status.json'), original);
      assert.throws(() => readChangeFactsSync(root, name), /identity-conflict/);
      const result = runValidator(historical, { stage: 'grill', repo: fixture.proj }); assert.notEqual(result.status, 0);
      assert.match(combined(result), /identity-conflict/);
      assert.equal(await readFile(join(historical, '.status.json'), 'utf8'), original);
      assert.equal(runValidator(fixture.legal, { stage: 'grill', repo: fixture.proj }).status, 0);
    } finally { await rm(fixture.proj, { recursive: true, force: true }); }
  });

  it("rejects missing workspace instead of guessing a state root from nearby files", async () => {
    const fixture = await uninstalledFixture();
    try {
      const result = runValidator(fixture.change, { stage: "grill", cwd: fixture.parent });
      assert.notEqual(result.status, 0, combined(result));
      assert.match(combined(result), /missing-workspace/);
    } finally {
      await rm(fixture.parent, { recursive: true, force: true });
    }
  });
});
