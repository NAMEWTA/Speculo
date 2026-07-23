import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import {
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import { initSpeculo } from "../src/index.js";
import {
  detectLegacyState,
  migrateSpeculo,
} from "../src/migrate.js";
import { pathExists } from "../src/utils.js";
import {
  discoverWorkflowCatalog,
  promptWorkflowSelection,
  selectAllFromCatalog,
} from "../src/workflows.js";

const packageRoot = process.cwd();

async function tempProject(): Promise<string> {
  return mkdtemp(join(tmpdir(), "speculo-test-"));
}

async function writeJson(path: string, value: unknown): Promise<void> {
  await mkdir(join(path, ".."), { recursive: true });
  await writeFile(path, JSON.stringify(value, null, 2) + "\n");
}

function legacyStatus(
  name: string,
  category: "dev" | "doc" | "person",
  changeStatus: "active" | "archived" = "active"
): Record<string, unknown> {
  return {
    name,
    category,
    change_status: changeStatus,
    execution_mode: "legacy",
    created_at: "2026-06-01T00:00:00.000Z",
    updated_at: "2026-06-01T00:00:00.000Z",
    current_phase: "legacy-phase",
    phase_history: [],
  };
}

async function createLegacyChange(
  root: string,
  category: "dev" | "doc" | "person",
  name: string,
  archived = false
): Promise<void> {
  const destination = archived
    ? join(root, "archive", category, name.slice(0, 7), name)
    : join(root, category, name);
  await mkdir(destination, { recursive: true });
  await writeJson(
    join(destination, ".status.json"),
    legacyStatus(name, category, archived ? "archived" : "active")
  );
  await writeFile(join(destination, "artifact.md"), category + " artifact\n");
}

async function createLegacyInstallation(target: string): Promise<void> {
  const install = join(target, "speculo");
  const state = join(install, ".speculo");
  await mkdir(join(state, ".config", "context"), { recursive: true });
  await mkdir(join(state, ".config", "adr"), { recursive: true });
  await writeFile(join(state, ".config", "RULES.md"), "# User Rules\n");
  await writeFile(join(state, ".config", "LESSONS.md"), "# User Lessons\n");
  await writeJson(join(state, "dev-status.json"), { active: [] });
  await writeJson(join(state, "doc-status.json"), { active: [] });
  await writeJson(join(state, "person-status.json"), { active: [] });
  await createLegacyChange(state, "dev", "2026-06-01-login");
  await createLegacyChange(state, "doc", "2026-06-02-article");
  await createLegacyChange(state, "person", "2026-06-03-strategy");
  await createLegacyChange(state, "dev", "2026-05-01-old-code", true);
  await createLegacyChange(state, "person", "2026-05-02-old-consult", true);
  await writeJson(join(state, "dev", "docs-sync-state.json"), {
    schema_version: 2,
    state_path: "speculo/.speculo/dev/docs-sync-state.json",
    tracked_assets: ["README.md"],
    last_sync_sha: null,
    last_sync_short: null,
    last_sync_commit_subject: null,
    last_sync_commit_date: null,
  });
  await mkdir(join(state, "commands", "2026-06-01-status-check"), {
    recursive: true,
  });
  await writeFile(
    join(state, "commands", "2026-06-01-status-check", "snapshot.md"),
    "legacy command\n"
  );
  await writeFile(join(state, "AGENTS.md"), "legacy state guide\n");

  await mkdir(join(install, "workflows", "dev"), { recursive: true });
  await mkdir(join(install, "workflows", "doc"), { recursive: true });
  await writeFile(join(install, "workflows", "dev", "AGENTS.md"), "legacy dev\n");
  await writeFile(join(install, "workflows", "doc", "AGENTS.md"), "legacy doc\n");
}

async function createValidatorFixture(root: string, skillPath: string): Promise<void> {
  await writeJson(join(root, "template", ".speculo", "workspace.json"), {
    schema_version: 1,
    path_base: "project-root",
    roots: {
      speculo: "speculo",
      state: "speculo/.speculo",
      commands: "speculo/commands",
      skills: "speculo/skills",
      workflows: "speculo/workflows",
    },
  });
  for (const name of [
    "speculo-write-skill",
    "speculo-write-workflows",
    "speculo-write-command",
    "speculo-write-canonical",
  ]) {
    const dir = join(root, ".agents", "skills", name);
    await mkdir(dir, { recursive: true });
    await writeFile(
      join(dir, "SKILL.md"),
      `---\nname: ${name}\ndescription: Test authoring skill stub\n---\n`
    );
  }
  await mkdir(join(root, "template", "skills", "example"), { recursive: true });
  await writeFile(
    join(root, "template", "skills", "example", "SKILL.md"),
    "---\nid: example\ntype: skill\nname: Example\ndescription: Example\n---\n"
  );
  await mkdir(join(root, "template", "workflows", "example", "_state", "changes"), {
    recursive: true,
  });
  await mkdir(join(root, "template", "workflows", "example", "_state", "archive"), {
    recursive: true,
  });
  await writeJson(
    join(root, "template", "workflows", "example", "_state", "status.json"),
    { schema_version: 1, workflow: "example", active: [] }
  );
  // New-model single-file INDEX.md (isSingleFile=true → validator skips XML checks)
  await writeFile(
    join(root, "template", "workflows", "example", "INDEX.md"),
    [
      "---",
      "id: example",
      "type: workflow",
      "workflow: example",
      "name: Example",
      "description: Example workflow for validator testing",
      "---",
      "",
      "# Example Workflow",
      "",
      "```xml",
      "<sequence>",
      '  <phase id="load-persistence" order="1">',
      '    <instructions root="workflow" path="INDEX.md" activation="required" />',
      "    <completion>persistence loaded</completion>",
      "  </phase>",
      "</sequence>",
      "```",
      "",
    ].join("\n")
  );

  for (const name of [
    "speculo-write-skill",
    "speculo-write-workflows",
    "speculo-write-command",
  ]) {
    const skillDir = join(root, ".agents", "skills", name);
    await mkdir(skillDir, { recursive: true });
    await writeFile(
      join(skillDir, "SKILL.md"),
      `---\nname: ${name}\ndescription: Fixture skill\n---\n\n# Fixture\n`
    );
  }
}

describe("Speculo v3 CLI", () => {
  it("fresh init installs workflow packages and workflow-owned state", async () => {
    const target = await tempProject();
    const root = join(target, "speculo");
    try {
      const result = await initSpeculo(target, { packageRoot, all: true });
      assert.equal(result.mode, "init");
      assert.equal(await pathExists(join(target, ".speculo")), false);
      assert.equal(await pathExists(join(root, ".speculo", "README.md")), true);
      assert.equal(
        await pathExists(join(root, ".speculo", "workspace.json")),
        true
      );
      const workspace = JSON.parse(
        await readFile(join(root, ".speculo", "workspace.json"), "utf8")
      );
      assert.equal(workspace.path_base, "project-root");
      assert.equal(workspace.roots.state, "speculo/.speculo");
      assert.equal(
        await pathExists(join(root, ".speculo", "commands", "docs-sync", "state.json")),
        false
      );
      assert.equal(
        await pathExists(join(root, "workflows", "specdev", "INDEX.md")),
        true
      );
      assert.equal(
        await pathExists(join(root, "workflows", "person", "INDEX.md")),
        true
      );
      assert.equal(
        await pathExists(join(root, "workflows", "person", "atomic-skills")),
        false
      );
      assert.equal(
        await pathExists(join(root, "workflows", "specdev", "_state")),
        false
      );
      assert.equal(
        await pathExists(join(root, ".speculo", "specdev", "status.json")),
        true
      );
      assert.equal(
        await pathExists(join(root, ".speculo", "specdev", "changes")),
        true
      );
      assert.equal(
        await pathExists(join(root, ".speculo", "specdev", "archive")),
        true
      );
      assert.equal(
        await pathExists(join(root, ".speculo", "specdev", "docs-sync.json")),
        false
      );
      assert.equal(
        await pathExists(join(root, ".speculo", "specdev", ".config")),
        false
      );
      assert.equal(
        await pathExists(join(root, ".speculo", "person", "status.json")),
        true
      );
      assert.equal(
        await pathExists(join(root, ".speculo", "person", "docs-sync.json")),
        false
      );
      assert.equal(await pathExists(join(root, "workflows", "dev")), false);
      assert.equal(await pathExists(join(root, "workflows", "doc")), false);
      assert.equal(await pathExists(join(root, "commands", "grill-me.md")), false);
      assert.equal(await pathExists(join(root, "commands", "handoff.md")), true);
      assert.equal(await pathExists(join(root, "commands", "docs-sync.md")), true);
      assert.equal(await pathExists(join(root, "commands", "finalize.md")), false);
      assert.equal(await pathExists(join(root, "commands", "knowledge-prune.md")), false);
      assert.equal(await pathExists(join(root, "commands", "archive.md")), false);
      assert.equal(await pathExists(join(root, "commands", "config-prune.md")), false);
      assert.equal(await pathExists(join(root, "commands", "write-a-skill.md")), false);
      assert.equal(await pathExists(join(root, "commands", "scaffold-exercises.md")), false);
      assert.equal(
        await pathExists(join(root, "skills", "runtime-context", "SKILL.md")),
        false
      );
      assert.equal(
        await pathExists(join(root, "skills", "knowledge-prune", "SKILL.md")),
        false
      );
    } finally {
      await rm(target, { recursive: true, force: true });
    }
  });

  it("person-only selection excludes Matt assets and state", async () => {
    const target = await tempProject();
    const root = join(target, "speculo");
    try {
      await initSpeculo(target, {
        packageRoot,
        selection: { workflowIds: ["person"] },
      });
      assert.equal(
        await pathExists(join(root, "workflows", "person", "INDEX.md")),
        true
      );
      assert.equal(
        await pathExists(join(root, "workflows", "specdev")),
        false
      );
      assert.equal(
        await pathExists(join(root, ".speculo", "specdev")),
        false
      );
    } finally {
      await rm(target, { recursive: true, force: true });
    }
  });

  it("SpecDev-only selection installs work entries", async () => {
    const target = await tempProject();
    const root = join(target, "speculo");
    try {
      await initSpeculo(target, {
        packageRoot,
        selection: { workflowIds: ["specdev"] },
      });
      assert.equal(
        await pathExists(join(root, "workflows", "person")),
        false
      );
      assert.equal(
        await pathExists(
          join(root, "workflows", "specdev", "G-grill-with-docs", "G-grill-with-docs.md")
        ),
        true
      );
      assert.equal(
        await pathExists(
          join(root, "workflows", "specdev", "I-implement", "I-implement.md")
        ),
        true
      );
    } finally {
      await rm(target, { recursive: true, force: true });
    }
  });

  it("update refreshes selected assets while preserving all workflow state", async () => {
    const target = await tempProject();
    const root = join(target, "speculo");
    try {
      await initSpeculo(target, { packageRoot, all: true });
      await writeFile(
        join(root, ".speculo", "specdev", "state-marker.txt"),
        "preserve"
      );
      await mkdir(join(root, ".speculo", "specdev", ".config"), {
        recursive: true,
      });
      await writeFile(
        join(root, ".speculo", "specdev", ".config", "legacy.txt"),
        "preserve legacy namespace"
      );
      await writeJson(
        join(root, ".speculo", "specdev", "docs-sync.json"),
        {
          schema_version: 1,
          workflow: "specdev",
          manifest_path: "speculo/.speculo/specdev/docs-sync.json",
          project_targets: [],
          state_targets: [],
          scope_revision: 1,
          scope_confirmed_at: "2026-07-11T00:00:00Z",
        }
      );
      await rm(join(root, ".speculo", "workspace.json"));
      await writeFile(
        join(root, "workflows", "specdev", "asset-marker.txt"),
        "remove"
      );
      await writeFile(
        join(root, "workflows", "specdev", "INDEX.md"),
        "stale persistence\n"
      );
      await mkdir(join(root, "workflows", "specdev", "stale-dir"), {
        recursive: true,
      });
      await writeFile(
        join(root, "workflows", "specdev", "stale-dir", "stale.md"),
        "stale work entry\n"
      );
      await writeFile(
        join(root, "workflows", "person", "local-marker.txt"),
        "keep unselected"
      );
      await writeFile(join(root, "commands", "local.md"), "remove");

      await initSpeculo(target, {
        packageRoot,
        selection: { workflowIds: ["specdev"] },
      });

      assert.equal(
        await readFile(
          join(root, ".speculo", "specdev", "state-marker.txt"),
          "utf8"
        ),
        "preserve"
      );
      assert.equal(
        await readFile(
          join(root, ".speculo", "specdev", ".config", "legacy.txt"),
          "utf8"
        ),
        "preserve legacy namespace"
      );
      const docsScope = JSON.parse(
        await readFile(
          join(root, ".speculo", "specdev", "docs-sync.json"),
          "utf8"
        )
      );
      assert.equal(docsScope.scope_revision, 1);
      assert.equal(docsScope.scope_confirmed_at, "2026-07-11T00:00:00Z");
      assert.equal(
        await pathExists(join(root, ".speculo", "workspace.json")),
        true
      );
      assert.equal(
        await pathExists(join(root, "workflows", "specdev", "asset-marker.txt")),
        false
      );
      assert.match(
        await readFile(
          join(root, "workflows", "specdev", "INDEX.md"),
          "utf8"
        ),
        /# SpecDev Workflow/
      );
      assert.equal(
        await pathExists(join(root, "workflows", "specdev", "stale-dir")),
        false
      );
      assert.equal(
        await readFile(join(root, "workflows", "person", "local-marker.txt"), "utf8"),
        "keep unselected"
      );
      assert.equal(await pathExists(join(root, "commands", "local.md")), false);
    } finally {
      await rm(target, { recursive: true, force: true });
    }
  });

  it("catalog discovers first-level workflow packages", async () => {
    const catalog = await discoverWorkflowCatalog(packageRoot);
    assert.deepEqual([...catalog.keys()].sort(), ["person", "specdev"]);
    assert.deepEqual(selectAllFromCatalog(catalog).workflowIds, [
      "person",
      "specdev",
    ]);
    const nonInteractive = await promptWorkflowSelection(catalog);
    assert.deepEqual(nonInteractive.workflowIds, ["person", "specdev"]);
  });

  it("framework validator accepts a valid INDEX.md workflow skeleton", async () => {
    const validator = join(packageRoot, "scripts", "validate-framework-assets.mjs");
    const fixture = await tempProject();
    try {
      await createValidatorFixture(fixture, "example/SKILL.md");
      const result = spawnSync(process.execPath, [validator, fixture], {
        encoding: "utf8",
      });
      assert.equal(result.status, 0);
      assert.match(result.stdout + result.stderr, /framework asset validation: ok/);
    } finally {
      await rm(fixture, { recursive: true, force: true });
    }
  });

  it("framework validator rejects missing INDEX.md in workflow", async () => {
    const validator = join(packageRoot, "scripts", "validate-framework-assets.mjs");
    const fixture = await tempProject();
    try {
      await createValidatorFixture(fixture, "example/SKILL.md");
      await rm(join(fixture, "template", "workflows", "example", "INDEX.md"));
      const result = spawnSync(process.execPath, [validator, fixture], {
        encoding: "utf8",
      });
      assert.equal(result.status, 1);
      assert.match(result.stdout + result.stderr, /missing workflow entry/);
    } finally {
      await rm(fixture, { recursive: true, force: true });
    }
  });

  it("init refuses legacy state until explicit migration", async () => {
    const target = await tempProject();
    try {
      await mkdir(join(target, "speculo", ".speculo"), { recursive: true });
      await writeJson(
        join(target, "speculo", ".speculo", "dev-status.json"),
        { active: [] }
      );
      await assert.rejects(
        initSpeculo(target, { packageRoot, all: true }),
        /speculo migrate --apply/
      );
    } finally {
      await rm(target, { recursive: true, force: true });
    }
  });

  it("migrate previews without mutation and applies the v3 mapping", async () => {
    const target = await tempProject();
    const root = join(target, "speculo");
    const state = join(root, ".speculo");
    try {
      await createLegacyInstallation(target);
      const preview = await migrateSpeculo(target, { packageRoot });
      assert.equal(preview.legacyDetected, true);
      assert.equal(preview.applied, false);
      assert.equal(await pathExists(join(state, "dev-status.json")), true);

      const result = await migrateSpeculo(target, {
        packageRoot,
        apply: true,
      });
      assert.equal(result.applied, true);
      assert.equal(await detectLegacyState(target), false);
      assert.equal(await pathExists(join(state, "dev-status.json")), false);
      assert.equal(
        await readFile(join(state, "specdev", ".config", "RULES.md"), "utf8"),
        "# User Rules\n"
      );
      assert.equal(
        await pathExists(
          join(
            state,
            "specdev",
            "archive",
            "2026-06",
            "2026-06-01-legacy-dev-login",
            "artifact.md"
          )
        ),
        true
      );
      assert.equal(
        await pathExists(
          join(
            state,
            "specdev",
            "archive",
            "2026-06",
            "2026-06-02-legacy-doc-article",
            "artifact.md"
          )
        ),
        true
      );
      assert.equal(
        await pathExists(
          join(state, "person", "changes", "2026-06-03-strategy", "artifact.md")
        ),
        true
      );
      const personIndex = JSON.parse(
        await readFile(join(state, "person", "status.json"), "utf8")
      );
      assert.equal(personIndex.active[0].name, "2026-06-03-strategy");
      const docsState = JSON.parse(
        await readFile(
          join(state, "commands", "docs-sync", "state.json"),
          "utf8"
        )
      );
      assert.equal(docsState.schema_version, 4);
      assert.equal(docsState.command, "docs-sync");
      assert.equal(
        docsState.state_path,
        "speculo/.speculo/commands/docs-sync/state.json"
      );
      assert.equal("last_sync_short" in docsState, false);
      assert.equal("last_sync_commit_subject" in docsState, false);
      assert.equal(docsState.baseline.mode, "explicit");
      assert.equal(docsState.baseline.sha, null);
      assert.deepEqual(docsState.project_targets, []);
      assert.deepEqual(docsState.pending_legacy_targets, ["README.md"]);
      const archivedPersonStatus = JSON.parse(
        await readFile(
          join(
            state,
            "person",
            "archive",
            "2026-05",
            "2026-05-02-old-consult",
            ".status.json"
          ),
          "utf8"
        )
      );
      assert.equal(archivedPersonStatus.change_status, "archived");
      assert.equal(archivedPersonStatus.archived, true);
      assert.equal(
        archivedPersonStatus.archive_path,
        "speculo/.speculo/person/archive/2026-05/2026-05-02-old-consult"
      );
      assert.equal(
        await pathExists(
          join(
            state,
            "commands",
            "_legacy",
            "2026-06-01-status-check",
            "snapshot.md"
          )
        ),
        true
      );
      assert.equal(await pathExists(join(state, "workspace.json")), true);
      const migrationReports = await readdir(join(state, "commands", "migrate"));
      assert.equal(
        migrationReports.some((name) => /^\d{4}-\d{2}-\d{2}-workspace-layout-v3\.md$/.test(name)),
        true
      );
      assert.equal(await pathExists(join(root, "workflows", "dev")), false);
      assert.equal(await pathExists(join(root, "workflows", "doc")), false);
      const second = await migrateSpeculo(target, {
        packageRoot,
        apply: true,
      });
      assert.equal(second.legacyDetected, false);
      assert.equal(second.applied, false);
    } finally {
      await rm(target, { recursive: true, force: true });
    }
  });

  it("migrates transitional command state without touching workflow data", async () => {
    const target = await tempProject();
    const state = join(target, "speculo", ".speculo");
    try {
      await initSpeculo(target, { packageRoot, all: true });
      await writeFile(
        join(state, "specdev", "preserve.txt"),
        "workflow state"
      );
      await mkdir(join(state, "commands", ".config"), { recursive: true });
      await writeJson(
        join(state, "commands", ".config", "docs-sync-state.json"),
        {
          schema_version: 3,
          skill: "docs-sync",
          state_path: "speculo/.speculo/commands/.config/docs-sync-state.json",
          tracked_assets: ["README.md"],
          last_sync_sha: null,
          last_sync_run_at: null,
          previous_sync_sha: null,
          total_syncs: 0,
          synced_assets: [],
        }
      );
      await mkdir(join(state, "commands", "2026-07-01-status-workspace"), {
        recursive: true,
      });
      await writeFile(
        join(state, "commands", "2026-07-01-status-workspace", "snapshot.md"),
        "old report\n"
      );
      await rm(join(state, "workspace.json"));

      assert.equal(await detectLegacyState(target), true);
      const preview = await migrateSpeculo(target, { packageRoot });
      assert.equal(preview.applied, false);
      assert.equal(
        await pathExists(join(state, "commands", ".config", "docs-sync-state.json")),
        true
      );

      const result = await migrateSpeculo(target, { packageRoot, apply: true });
      assert.equal(result.applied, true);
      assert.equal(await detectLegacyState(target), false);
      assert.equal(
        await readFile(join(state, "specdev", "preserve.txt"), "utf8"),
        "workflow state"
      );
      assert.equal(await pathExists(join(state, "workspace.json")), true);
      assert.equal(
        await pathExists(join(state, "commands", "docs-sync", "state.json")),
        true
      );
      assert.equal(
        await pathExists(
          join(
            state,
            "commands",
            "_legacy",
            "2026-07-01-status-workspace",
            "snapshot.md"
          )
        ),
        true
      );
    } finally {
      await rm(target, { recursive: true, force: true });
    }
  });

  it("migration blockers leave the legacy tree untouched", async () => {
    const target = await tempProject();
    const state = join(target, "speculo", ".speculo");
    try {
      await createLegacyInstallation(target);
      await writeFile(join(state, "unknown-state.txt"), "keep me\n");
      await assert.rejects(
        migrateSpeculo(target, { packageRoot, apply: true }),
        /Unknown legacy state entry/
      );
      assert.equal(
        await readFile(join(state, "unknown-state.txt"), "utf8"),
        "keep me\n"
      );
      assert.equal(await pathExists(join(state, "dev-status.json")), true);
    } finally {
      await rm(target, { recursive: true, force: true });
    }
  });

  it("migration preview rejects malformed legacy indexes without mutation", async () => {
    const target = await tempProject();
    const state = join(target, "speculo", ".speculo");
    try {
      await createLegacyInstallation(target);
      await writeFile(join(state, "dev-status.json"), "{not-json\n");
      await assert.rejects(
        migrateSpeculo(target, { packageRoot }),
        /Invalid legacy workflow index JSON/
      );
      assert.equal(
        await readFile(join(state, "dev-status.json"), "utf8"),
        "{not-json\n"
      );
      assert.equal(await pathExists(join(state, "dev")), true);
    } finally {
      await rm(target, { recursive: true, force: true });
    }
  });

  it("compiled CLI resolves package assets and exposes migrate help", async () => {
    const target = await tempProject();
    const root = join(target, "speculo");
    const cliPath = join(process.cwd(), "dist", "src", "cli.js");
    try {
      const help = execFileSync(process.execPath, [cliPath, "--help"], {
        encoding: "utf8",
      });
      assert.match(help, /speculo migrate/);
      execFileSync(process.execPath, [cliPath, "init", "--all", target], {
        stdio: "pipe",
      });
      assert.equal(
        await pathExists(join(root, "workflows", "specdev", "INDEX.md")),
        true
      );
      assert.equal(
        await pathExists(join(root, ".speculo", "person", "status.json")),
        true
      );
    } finally {
      await rm(target, { recursive: true, force: true });
    }
  });
});
