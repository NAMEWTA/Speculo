import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, readdir, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { initSpeculo } from "../src/index.js";
import { pathExists } from "../src/utils.js";
import {
  discoverWorkflowCatalog,
  promptWorkflowSelection,
  selectAllFromCatalog,
} from "../src/workflows.js";

const packageRoot = process.cwd();
const migrationScript = join(packageRoot, "template", "skills", "migrate-runtime-state", "scripts", "migrate-runtime-state.mjs");

async function tempProject(): Promise<string> {
  return mkdtemp(join(tmpdir(), "speculo-test-"));
}

async function writeJson(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(value, null, 2) + "\n");
}

async function readJson(path: string): Promise<Record<string, any>> {
  return JSON.parse(await readFile(path, "utf8")) as Record<string, any>;
}

async function sha256(path: string): Promise<string> {
  return createHash("sha256").update(await readFile(path)).digest("hex");
}

function runMigrationScript(args: string[]) {
  return spawnSync(process.execPath, [migrationScript, ...args], { encoding: "utf8" });
}

async function createPendingProject(): Promise<string> {
  const target = await tempProject();
  await initSpeculo(target, { packageRoot, selection: { workflowIds: ["specdev"] } });
  await writeFile(join(target, "speculo", "config.json"), "{ invalid\n", "utf8");
  const result = await initSpeculo(target, { packageRoot, selection: { workflowIds: ["specdev"] } });
  assert.equal(result.migration.status, "pending");
  return target;
}

async function migrationPlan(target: string, actions: Record<string, unknown>[] = []): Promise<Record<string, unknown>> {
  const inspect = runMigrationScript(["inspect", "--project-root", target]);
  assert.equal(inspect.status, 0, inspect.stderr);
  const result = JSON.parse(inspect.stdout) as {
    backup: { manifest_sha256: string; files: { path: string }[] };
  };
  const backupSources = new Set(result.backup.files.map((entry) => entry.path));
  const normalizedActions: Record<string, unknown>[] = actions.map((action) => {
    const targetPath = String(action.to ?? "config.json");
    const derivedSource = targetPath === "config.json"
      ? "config.json"
      : `state/${targetPath.slice(".speculo/".length)}`;
    const sourceDecision = backupSources.has(derivedSource) ? derivedSource : "config.json";
    return { ...action, source_decision: sourceDecision };
  });
  const decisions = new Map(result.backup.files.map((entry) => [
    entry.path,
    {
      path: entry.path,
      disposition: "keep-current",
      target: entry.path === "config.json" ? "config.json" : `.speculo/${entry.path.slice("state/".length)}`,
    },
  ]));
  for (const action of normalizedActions) {
    const targetPath = String(action.to ?? "config.json");
    const source = String(action.source_decision);
    const decision = decisions.get(source);
    if (!decision) continue;
    decision.target = targetPath;
    decision.disposition = action.kind === "copy"
      ? "restore"
      : action.kind === "replace-json"
        ? "replace-json"
        : action.kind === "remove-current"
          ? "remove-current"
          : "keep-current";
  }
  return {
    schema_version: 2,
    backup_manifest_sha256: result.backup.manifest_sha256,
    source_decisions: [...decisions.values()],
    actions: normalizedActions,
  };
}

async function createBrokenPackageRoot(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "speculo-broken-package-"));
  const template = join(root, "template");
  await mkdir(join(template, ".speculo"), { recursive: true });
  await mkdir(join(template, "commands"), { recursive: true });
  await mkdir(join(template, "skills"), { recursive: true });
  await mkdir(join(template, "workflows", "example"), { recursive: true });
  await writeFile(join(template, ".speculo", "workspace.json"), "{}\n");
  await writeFile(join(template, ".speculo", "README.md"), "state\n");
  await writeFile(join(template, "config.json"), "{}\n");
  await writeFile(
    join(template, "workflows", "example", "INDEX.md"),
    "---\nworkflow: example\nname: Example\ndescription: broken fixture\n---\n",
  );
  return root;
}

describe("Speculo CLI", () => {
  it("fresh init installs core assets, selected workflows, runtime state, and agent instructions", async () => {
    const target = await tempProject();
    const root = join(target, "speculo");
    try {
      const result = await initSpeculo(target, { packageRoot, selection: { workflowIds: ["specdev"] } });
      assert.equal(result.mode, "init");
      assert.equal(result.migration.status, "not-required");
      assert.equal(await pathExists(join(root, "config.json")), true);
      assert.equal(await pathExists(join(root, ".speculo", "workspace.json")), true);
      assert.deepEqual(await readJson(join(root, ".speculo", "install.json")), {
        schema_version: 1,
        package_version: "0.7.6",
        workflows: ["specdev"],
      });
      assert.equal(await pathExists(join(root, ".speculo", "back")), false);
      assert.equal(await pathExists(join(root, ".speculo", "migration.json")), false);
      assert.equal(await pathExists(join(root, "commands", "handoff.md")), true);
      assert.equal(await pathExists(join(root, "commands", "migrate-runtime-state.md")), true);
      assert.equal(await pathExists(join(root, "skills", "docs-sync", "SKILL.md")), true);
      assert.equal(await pathExists(join(root, "skills", "migrate-runtime-state", "SKILL.md")), true);
      assert.equal(await pathExists(join(root, "skills", "optimize-codex-config", "SKILL.md")), true);
      assert.equal(await pathExists(join(root, "workflows", "specdev", "INDEX.md")), true);
      assert.equal(await pathExists(join(root, "workflows", "person")), false);
      assert.deepEqual(JSON.parse(await readFile(join(root, ".speculo", "specdev", "status.json"), "utf8")), {
        schema_version: 5,
        workflow: "specdev",
        active: [],
        archived: [],
      });
      assert.equal(await readFile(join(target, ".gitignore"), "utf8"), "specdev-worktree/\nspeculo/.speculo/back/\n");
      assert.equal(await pathExists(join(target, "CLAUDE.md")), true);
      const agents = await readFile(join(target, "AGENTS.md"), "utf8");
      assert.match(agents, /workflows\/specdev\/INDEX\.md/);
      assert.match(agents, /migration\.json/);
      assert.match(agents, /migrate-runtime-state/);
      assert.doesNotMatch(agents, /workflows\/person\/INDEX\.md/);
    } finally {
      await rm(target, { recursive: true, force: true });
    }
  });

  it("preserves user AGENTS content while replacing only the Speculo block", async () => {
    const target = await tempProject();
    try {
      await writeFile(
        join(target, "AGENTS.md"),
        "# Local Rules\n\nKeep this text.\n\n<SPECULO>\nstale\n</SPECULO>\n",
      );
      await initSpeculo(target, { packageRoot, selection: { workflowIds: ["person"] } });
      const agents = await readFile(join(target, "AGENTS.md"), "utf8");
      assert.match(agents, /Keep this text./);
      assert.match(agents, /workflows\/person\/INDEX\.md/);
      assert.doesNotMatch(agents, /stale/);
      assert.equal((agents.match(/<SPECULO>/g) ?? []).length, 1);
    } finally {
      await rm(target, { recursive: true, force: true });
    }
  });

  it("refreshes compatible v0.7 runtime state without deleting initialized configuration or persistence", async () => {
    const target = await tempProject();
    const root = join(target, "speculo");
    const state = join(root, ".speculo");
    const activeChange = "2026-08-09-active";
    const archivedChange = "2026-08-01-archive";
    try {
      await initSpeculo(target, { packageRoot, selection: { workflowIds: ["specdev", "person"] } });
      const previousInstall = await readJson(join(state, "install.json"));
      previousInstall.package_version = "0.7.0";
      await writeJson(join(state, "install.json"), previousInstall);
      await writeJson(join(root, "config.json"), { schema_version: 1, language: "en-US", custom: { keep: true } });
      await writeJson(join(state, "specdev", "status.json"), {
        schema_version: 4,
        workflow: "specdev",
        active: [{ change: activeChange, current_work: "specdev/init", works_run: ["specdev/init"] }],
        archived: [archivedChange],
      });
      await writeJson(join(state, "specdev", "changes", activeChange, ".status.json"), {
        schema_version: 3,
        artifact: "change-status",
        change: activeChange,
        change_status: "active",
      });
      await writeFile(join(state, "specdev", "changes", activeChange, "goal-plan.md"), [
        "---",
        "schema_version: 5",
        "artifact: goal-plan",
        `change: ${activeChange}`,
        "status: draft",
        "modes: []",
        "orchestration: lead-directed",
        "lead: lead-session",
        "implementation_agent_limit: 8",
        "ticket_workspace_policy: current",
        "integration_gate: direct-parent",
        "ready_for_execution: false",
        "---",
        "",
        "# Goal Plan",
        "",
      ].join("\n"));
      await writeFile(join(state, "specdev", "changes", activeChange, "source.md"), "active history\n");
      await writeJson(join(state, "specdev", "archive", "2026-08", archivedChange, ".status.json"), {
        schema_version: 3,
        artifact: "change-status",
        change: archivedChange,
        change_status: "archived",
      });
      await writeFile(join(state, "specdev", "archive", "2026-08", archivedChange, "evidence.md"), "archive\n");
      await mkdir(join(state, "specdev", ".config"), { recursive: true });
      await writeFile(join(state, "specdev", ".config", "tracking.md"), "tracking\n");
      await writeJson(join(state, "specdev", "config.json"), {
        schema_version: 3,
        interaction_language: "en-US",
        artifact_language: "zh-CN",
        git: { auto_commit: true, default_branch: "main", worktree_for_parallel: false },
        execution: { max_parallel: 8, deep_ticket_human_approval: true, shared_path_owner: "explicit" },
        verification: { test: "pnpm test", typecheck: null, lint: null, build: "pnpm build" },
        planning: { default_depth: "deep", require_ready_gate: true, require_evidence: true },
      });
      for (const namespace of ["adr", "context", "research"]) {
        await mkdir(join(state, "specdev", namespace), { recursive: true });
        await writeFile(join(state, "specdev", namespace, "keep.md"), namespace + "\n");
      }
      await writeJson(join(state, "specdev", "docs-sync.json"), { schema_version: 1, owner: "docs-sync" });
      await mkdir(join(state, "commands", "docs-sync"), { recursive: true });
      await writeJson(join(state, "commands", "docs-sync", "state.json"), { schema_version: 4, command: "docs-sync", total_syncs: 2 });
      await writeFile(join(state, "commands", "docs-sync", "2026-08-09-workspace-report.md"), "report\n");
      await writeFile(join(root, "commands", "legacy.md"), "remove\n");
      await mkdir(join(root, "skills", "legacy-skill"), { recursive: true });
      await writeFile(join(root, "skills", "legacy-skill", "SKILL.md"), "remove\n");
      await writeFile(join(root, "workflows", "specdev", "local-static.md"), "remove\n");
      await writeFile(join(root, "workflows", "person", "local-static.md"), "preserve unselected\n");
      await writeFile(join(state, "person", "local-state.md"), "preserve unselected\n");

      const result = await initSpeculo(target, { packageRoot, selection: { workflowIds: ["specdev"] } });
      assert.equal(result.mode, "refresh");
      assert.equal(result.migration.status, "migrated");
      assert.equal(result.migration.sourceVersion, "0.7.0");
      assert.equal((await readJson(join(root, "config.json"))).language, "en-US");
      assert.deepEqual((await readJson(join(root, "config.json"))).custom, { keep: true });
      assert.equal((await readJson(join(state, "specdev", "status.json"))).active[0].change, activeChange);
      assert.equal(await readFile(join(state, "specdev", "changes", activeChange, "source.md"), "utf8"), "active history\n");
      assert.equal(await readFile(join(state, "specdev", "archive", "2026-08", archivedChange, "evidence.md"), "utf8"), "archive\n");
      assert.equal(await readFile(join(state, "specdev", ".config", "tracking.md"), "utf8"), "tracking\n");
      const migratedSpecdevConfig = await readJson(join(state, "specdev", "config.json"));
      assert.equal(migratedSpecdevConfig.schema_version, 5);
      assert.equal(migratedSpecdevConfig.execution.max_implementation_agents, 8);
      assert.equal(migratedSpecdevConfig.execution.max_integration_attempts, 3);
      assert.equal(migratedSpecdevConfig.planning.ui_prototype_default_variants, 3);
      assert.equal(migratedSpecdevConfig.planning.ui_prototype_max_variants, 5);
      assert.equal(migratedSpecdevConfig.git.default_branch, "main");
      assert.equal(migratedSpecdevConfig.planning.default_depth, "deep");
      assert.equal("max_parallel" in migratedSpecdevConfig.execution, false);
      assert.equal("auto_commit" in migratedSpecdevConfig.git, false);
      assert.equal((await readJson(join(state, "specdev", "changes", activeChange, ".status.json"))).schema_version, 6);
      assert.equal((await readJson(join(state, "specdev", "archive", "2026-08", archivedChange, ".status.json"))).schema_version, 6);
      const migratedGoalPlan = await readFile(join(state, "specdev", "changes", activeChange, "goal-plan.md"), "utf8");
      assert.match(migratedGoalPlan, /^schema_version: 6$/m);
      assert.match(migratedGoalPlan, /^implementation_agent_limit: 8$/m);
      assert.match(migratedGoalPlan, /^integration_attempt_limit: 3$/m);
      for (const namespace of ["adr", "context", "research"]) {
        assert.equal(await readFile(join(state, "specdev", namespace, "keep.md"), "utf8"), namespace + "\n");
      }
      assert.equal((await readJson(join(state, "specdev", "docs-sync.json"))).owner, "docs-sync");
      assert.equal((await readJson(join(state, "commands", "docs-sync", "state.json"))).total_syncs, 2);
      assert.equal(await readFile(join(state, "commands", "docs-sync", "2026-08-09-workspace-report.md"), "utf8"), "report\n");
      for (const removed of [
        join(root, "commands", "legacy.md"),
        join(root, "skills", "legacy-skill"),
        join(root, "workflows", "specdev", "local-static.md"),
      ]) {
        assert.equal(await pathExists(removed), false, removed);
      }
      assert.equal(await readFile(join(root, "workflows", "person", "local-static.md"), "utf8"), "preserve unselected\n");
      assert.equal(await readFile(join(state, "person", "local-state.md"), "utf8"), "preserve unselected\n");
      assert.equal(await pathExists(join(root, "workflows", "person", "INDEX.md")), true);
      const backupManifest = await readJson(join(state, "back", "manifest.json"));
      assert.equal(backupManifest.source_version, "0.7.0");
      assert.equal(backupManifest.files.some((entry: { path: string }) => entry.path.includes("back/")), false);
      const configEntry = backupManifest.files.find((entry: { path: string }) => entry.path === "config.json");
      assert.equal(configEntry.sha256, await sha256(join(state, "back", "config.json")));
      assert.equal(await pathExists(join(state, "migration.json")), false);
    } finally {
      await rm(target, { recursive: true, force: true });
    }
  });

  it("leaves an unselected current workflow and its state untouched", async () => {
    const target = await tempProject();
    const root = join(target, "speculo");
    try {
      await initSpeculo(target, { packageRoot, selection: { workflowIds: ["person", "specdev"] } });
      await writeFile(join(root, "workflows", "person", "local-marker.txt"), "keep\n");
      await writeFile(join(root, ".speculo", "person", "state-marker.txt"), "keep\n");
      await initSpeculo(target, { packageRoot, selection: { workflowIds: ["specdev"] } });
      assert.equal(await readFile(join(root, "workflows", "person", "local-marker.txt"), "utf8"), "keep\n");
      assert.equal(await readFile(join(root, ".speculo", "person", "state-marker.txt"), "utf8"), "keep\n");
    } finally {
      await rm(target, { recursive: true, force: true });
    }
  });

  it("creates a complete backup and pending marker for incompatible state, then blocks repeated init without changes", async () => {
    const target = await tempProject();
    const root = join(target, "speculo");
    const state = join(root, ".speculo");
    try {
      await initSpeculo(target, { packageRoot, selection: { workflowIds: ["specdev"] } });
      await writeFile(join(root, "config.json"), "{ malformed\n", "utf8");
      await writeJson(join(state, "commands", "legacy", "state.json"), { schema_version: 99 });

      const result = await initSpeculo(target, { packageRoot, selection: { workflowIds: ["specdev"] } });
      assert.equal(result.migration.status, "pending");
      assert.equal(result.migration.blockers.some((blocker) => blocker.code === "invalid-json"), true);
      assert.equal(result.migration.blockers.some((blocker) => blocker.code === "unknown-command-state"), true);
      assert.deepEqual(await readJson(join(root, "config.json")), await readJson(join(packageRoot, "template", "config.json")));
      assert.deepEqual(await readJson(join(state, "specdev", "status.json")), {
        schema_version: 5,
        workflow: "specdev",
        active: [],
        archived: [],
      });
      assert.equal(await readFile(join(state, "back", "config.json"), "utf8"), "{ malformed\n");
      assert.equal(await pathExists(join(state, "back", "state", "commands", "legacy", "state.json")), true);
      const markerBefore = await readFile(join(state, "migration.json"), "utf8");
      const manifestBefore = await readFile(join(state, "back", "manifest.json"), "utf8");
      await assert.rejects(
        initSpeculo(target, { packageRoot, selection: { workflowIds: ["specdev"] } }),
        /runtime migration is pending/,
      );
      assert.equal(await readFile(join(state, "migration.json"), "utf8"), markerBefore);
      assert.equal(await readFile(join(state, "back", "manifest.json"), "utf8"), manifestBefore);
      assert.equal((await readdir(target)).some((name) => name.startsWith(".speculo-init-stage-")), false);
    } finally {
      await rm(target, { recursive: true, force: true });
    }
  });

  it("does not automatically migrate an installation declared older than v0.7", async () => {
    const target = await tempProject();
    const installPath = join(target, "speculo", ".speculo", "install.json");
    try {
      await initSpeculo(target, { packageRoot, selection: { workflowIds: ["specdev"] } });
      const install = await readJson(installPath);
      install.package_version = "0.6.9";
      await writeJson(installPath, install);
      const result = await initSpeculo(target, { packageRoot, selection: { workflowIds: ["specdev"] } });
      assert.equal(result.migration.status, "pending");
      assert.equal(result.migration.sourceVersion, "0.6.9");
      assert.equal(result.migration.blockers.some((blocker) => blocker.code === "unsupported-source-version"), true);
    } finally {
      await rm(target, { recursive: true, force: true });
    }
  });

  it("requires explicit reconciliation for legacy Ticket worktrees and Goal Plans", async () => {
    const target = await tempProject();
    const root = join(target, "speculo");
    const state = join(root, ".speculo");
    const change = "2026-08-09-legacy-plan";
    try {
      await initSpeculo(target, { packageRoot, selection: { workflowIds: ["specdev"] } });
      const install = await readJson(join(state, "install.json"));
      install.package_version = "0.7.0";
      await writeJson(join(state, "install.json"), install);
      await writeJson(join(state, "specdev", "status.json"), {
        schema_version: 4,
        workflow: "specdev",
        active: [{ change, current_work: "specdev/implement", works_run: ["specdev/goal-plan"] }],
        archived: [],
      });
      await writeJson(join(state, "specdev", "changes", change, ".status.json"), {
        schema_version: 3,
        artifact: "change-status",
        change,
        change_status: "active",
        worktrees: [{
          ticket_id: "T-01",
          owner: "legacy-worker",
          provider: "git",
          base_sha: "base",
          branch: `speculo/${change}/T-01`,
          workspace_ref: "specdev-worktree/T-01",
          terminal_action: "retain",
          status: "active",
          updated_at: "2026-08-09T00:00:00Z",
        }],
      });
      await writeFile(
        join(state, "specdev", "changes", change, "goal-plan.md"),
        "---\nschema_version: 3\nartifact: goal-plan\n---\n\n# Legacy plan\n",
      );

      const result = await initSpeculo(target, { packageRoot, selection: { workflowIds: ["specdev"] } });
      assert.equal(result.migration.status, "pending");
      assert.equal(result.migration.blockers.some((blocker) => blocker.code === "ambiguous-ticket-worktree-contract"), true);
      assert.equal(result.migration.blockers.some((blocker) => blocker.code === "unsupported-goal-plan-contract"), true);
      assert.equal(await pathExists(join(state, "migration.json")), true);
    } finally {
      await rm(target, { recursive: true, force: true });
    }
  });

  it("rejects incomplete schema-v4 SpecDev config, change status, and Goal Plan during automatic refresh", async () => {
    const cases = [
      {
        blocker: "invalid-specdev-config-v5",
        mutate: async (state: string) => {
          const configPath = join(state, "specdev", "config.json");
          const config = await readJson(join(packageRoot, "template", "workflows", "specdev", "I-init-setup", "config-template.json"));
          delete config.planning.require_evidence;
          await writeJson(configPath, config);
        },
      },
      {
        blocker: "unmapped-change-runtime-authority",
        mutate: async (state: string) => {
          const change = "2026-08-10-invalid-status";
          await writeJson(join(state, "specdev", "status.json"), {
            schema_version: 4,
            workflow: "specdev",
            active: [{ change, current_work: "specdev/implement", works_run: [] }],
            archived: [],
          });
          await writeJson(join(state, "specdev", "changes", change, ".status.json"), {
            schema_version: 4,
            artifact: "change-status",
            change,
            change_status: "active",
            current_work: "specdev/implement",
            created_at: "2026-08-10T00:00:00Z",
            updated_at: "2026-08-10T00:00:00Z",
            completed_at: null,
            archived: false,
            archive_path: null,
            blockers: [],
            deviations: [],
            worktrees: [{
              ticket_id: "T-01",
              owner: "lead-session",
              implementation_owner: "implementation-agent-1",
              integration_owner: "lead-session",
              provider: "git",
              base_sha: "base-sha",
              parent_branch: "main",
              branch: `speculo/${change}/T-01`,
              workspace_ref: "specdev-worktree/T-01",
              source_checkpoint: null,
              integration: {
                status: "passed",
                parent_before_sha: null,
                source_sha: null,
                candidate_sha: null,
                candidate_branch: null,
                candidate_workspace_ref: null,
                result_sha: null,
                method: null,
                conflict_paths: [],
                verification: "passed",
                e2e: { required: false, status: "not-required", evidence: null },
                evidence: `<Path>{roots.state}/specdev/changes/${change}/evidence/T-01.md</Path>`,
                attempts: 0,
              },
              status: "removed",
              updated_at: "2026-08-10T00:00:00Z",
            }],
          });
        },
      },
      {
        blocker: "unsupported-goal-plan-contract",
        mutate: async (state: string) => {
          const change = "2026-08-10-invalid-goal-plan";
          await writeJson(join(state, "specdev", "status.json"), {
            schema_version: 4,
            workflow: "specdev",
            active: [{ change, current_work: "specdev/goal-plan", works_run: [] }],
            archived: [],
          });
          await writeJson(join(state, "specdev", "changes", change, ".status.json"), {
            schema_version: 4,
            artifact: "change-status",
            change,
            change_status: "active",
            current_work: "specdev/goal-plan",
            created_at: "2026-08-10T00:00:00Z",
            updated_at: "2026-08-10T00:00:00Z",
            completed_at: null,
            archived: false,
            archive_path: null,
            blockers: [],
            deviations: [],
            worktrees: [],
          });
          await writeFile(
            join(state, "specdev", "changes", change, "goal-plan.md"),
            [
              "---",
              "schema_version: 4",
              "orchestration: lead-directed",
              "ticket_workspace_policy: required",
              "integration_gate: candidate-merge",
              "---",
              "",
              "# Incomplete Goal Plan",
              "",
            ].join("\n"),
          );
        },
      },
    ];

    for (const scenario of cases) {
      const target = await tempProject();
      try {
        await initSpeculo(target, { packageRoot, selection: { workflowIds: ["specdev"] } });
        const state = join(target, "speculo", ".speculo");
        await scenario.mutate(state);
        const result = await initSpeculo(target, { packageRoot, selection: { workflowIds: ["specdev"] } });
        assert.equal(result.migration.status, "pending");
        assert.equal(result.migration.blockers.some((blocker) => blocker.code === scenario.blocker), true);
      } finally {
        await rm(target, { recursive: true, force: true });
      }
    }
  });

  it("keeps the existing installation intact when staging a broken package fails", async () => {
    const target = await tempProject();
    const brokenPackageRoot = await createBrokenPackageRoot();
    try {
      await mkdir(join(target, "speculo"), { recursive: true });
      await writeFile(join(target, "speculo", "keep.txt"), "original\n");
      await assert.rejects(
        initSpeculo(target, { packageRoot: brokenPackageRoot, selection: { workflowIds: ["example"] } }),
        /missing _state/,
      );
      assert.equal(await readFile(join(target, "speculo", "keep.txt"), "utf8"), "original\n");
      const entries = await readdir(target);
      assert.equal(entries.some((name) => name.startsWith(".speculo-init-stage-")), false);
    } finally {
      await rm(target, { recursive: true, force: true });
      await rm(brokenPackageRoot, { recursive: true, force: true });
    }
  });

  it("maintains runtime ignores with CRLF and remains idempotent", async () => {
    const target = await tempProject();
    try {
      await writeFile(join(target, ".gitignore"), "node_modules/\r\n# keep\r\n");
      await initSpeculo(target, { packageRoot, selection: { workflowIds: ["specdev"] } });
      await initSpeculo(target, { packageRoot, selection: { workflowIds: ["specdev"] } });
      assert.equal(
        await readFile(join(target, ".gitignore"), "utf8"),
        "node_modules/\r\n# keep\r\nspecdev-worktree/\r\nspeculo/.speculo/back/\r\n",
      );
    } finally {
      await rm(target, { recursive: true, force: true });
    }
  });

  it("migration script inspects every backup entry, requires confirmation, and clears pending atomically", async () => {
    const target = await createPendingProject();
    const state = join(target, "speculo", ".speculo");
    const planPath = join(target, "runtime-plan.json");
    try {
      const inspect = runMigrationScript(["inspect", "--project-root", target]);
      assert.equal(inspect.status, 0, inspect.stderr);
      const inspection = JSON.parse(inspect.stdout);
      assert.equal(inspection.ok, true);
      assert.equal(typeof inspection.backup.manifest_sha256, "string");
      assert.equal(inspection.backup.files.length, inspection.backup.entries);
      assert.equal(inspection.backup.files.some((entry: { path: string }) => entry.path === "config.json"), true);

      const fingerprint = runMigrationScript(["fingerprint", "--project-root", target, "--target", "config.json"]);
      assert.equal(fingerprint.status, 0, fingerprint.stderr);
      assert.match(fingerprint.stdout.trim(), /^file:[a-f0-9]{64}$/);

      await writeJson(planPath, await migrationPlan(target));
      const markerBefore = await readFile(join(state, "migration.json"), "utf8");
      const manifestHashBefore = await sha256(join(state, "back", "manifest.json"));
      const unconfirmed = runMigrationScript(["apply", "--project-root", target, "--plan", planPath]);
      assert.equal(unconfirmed.status, 1);
      assert.match(unconfirmed.stderr, /requires --confirmed/);
      assert.equal(await readFile(join(state, "migration.json"), "utf8"), markerBefore);

      const applied = runMigrationScript(["apply", "--project-root", target, "--plan", planPath, "--confirmed"]);
      assert.equal(applied.status, 0, applied.stderr);
      assert.equal((JSON.parse(applied.stdout) as { ok: boolean }).ok, true);
      assert.equal(await pathExists(join(state, "migration.json")), false);
      assert.equal(await sha256(join(state, "back", "manifest.json")), manifestHashBefore);
      const rootEntries = await readdir(target);
      assert.equal(rootEntries.some((name) => name.startsWith(".speculo-runtime-migrate-stage-")), false);
      assert.equal(rootEntries.includes(".speculo-runtime-migrate-rollback"), false);
    } finally {
      await rm(target, { recursive: true, force: true });
    }
  });

  it("migration script rejects backup tampering", async () => {
    const target = await createPendingProject();
    try {
      await writeFile(join(target, "speculo", ".speculo", "back", "config.json"), "tampered\n", "utf8");
      const inspect = runMigrationScript(["inspect", "--project-root", target]);
      assert.equal(inspect.status, 0, inspect.stderr);
      const inspection = JSON.parse(inspect.stdout);
      assert.equal(inspection.ok, false);
      assert.match(inspection.issues.join("\n"), /hash or size mismatch/);
    } finally {
      await rm(target, { recursive: true, force: true });
    }
  });

  it("migration script preserves backup link facts but rejects symlinked staged runtime", async () => {
    const target = await tempProject();
    const root = join(target, "speculo");
    const state = join(root, ".speculo");
    const activeStatusPath = join(state, "specdev", "status.json");
    const planPath = join(target, "runtime-plan.json");
    try {
      await initSpeculo(target, { packageRoot, selection: { workflowIds: ["specdev"] } });
      await symlink("status.json", join(state, "specdev", "linked-state.json"));
      await writeFile(join(root, "config.json"), "{ invalid\n", "utf8");
      const pending = await initSpeculo(target, { packageRoot, selection: { workflowIds: ["specdev"] } });
      assert.equal(pending.migration.status, "pending");
      const inspect = runMigrationScript(["inspect", "--project-root", target]);
      assert.equal(inspect.status, 0, inspect.stderr);
      const inspection = JSON.parse(inspect.stdout) as {
        backup: { files: { path: string; type: string; target?: string }[] };
      };
      assert.deepEqual(
        inspection.backup.files.find((entry) => entry.path === "state/specdev/linked-state.json"),
        { path: "state/specdev/linked-state.json", type: "symlink", target: "status.json" },
      );
      const plan = await migrationPlan(target);
      const decisions = plan.source_decisions as Record<string, unknown>[];
      const linkDecision = decisions.find((decision) => decision.path === "state/specdev/linked-state.json");
      assert.ok(linkDecision);
      linkDecision.disposition = "restore";
      linkDecision.target = ".speculo/specdev/linked-state.json";
      plan.actions = [{
        kind: "copy",
        source_decision: "state/specdev/linked-state.json",
        from: "state/specdev/linked-state.json",
        to: ".speculo/specdev/linked-state.json",
        expected_target: "absent",
      }];
      await writeJson(planPath, plan);
      const before = await readFile(activeStatusPath, "utf8");
      const applied = runMigrationScript(["apply", "--project-root", target, "--plan", planPath, "--confirmed"]);
      assert.equal(applied.status, 1);
      assert.match(applied.stderr, /Runtime contains a symbolic link/);
      assert.equal(await readFile(activeStatusPath, "utf8"), before);
      assert.equal(await pathExists(join(state, "migration.json")), true);
    } finally {
      await rm(target, { recursive: true, force: true });
    }
  });

  it("migration script rejects path escape, target drift, and invalid migrated state without replacing active", async () => {
    const target = await createPendingProject();
    const root = join(target, "speculo");
    const state = join(root, ".speculo");
    const planPath = join(target, "runtime-plan.json");
    try {
      const statusPath = join(state, "specdev", "status.json");
      const activeStatusBefore = await readFile(statusPath, "utf8");

      await writeJson(planPath, await migrationPlan(target, [{
        kind: "keep-current",
        to: "../escape",
        expected_target: "absent",
      }]));
      const escaped = runMigrationScript(["apply", "--project-root", target, "--plan", planPath, "--confirmed"]);
      assert.equal(escaped.status, 1);
      assert.match(escaped.stderr, /outside runtime ownership|escapes its allowed root/);

      await writeJson(planPath, await migrationPlan(target, [{
        kind: "keep-current",
        to: "config.json",
        expected_target: "absent",
      }]));
      const drifted = runMigrationScript(["apply", "--project-root", target, "--plan", planPath, "--confirmed"]);
      assert.equal(drifted.status, 1);
      assert.match(drifted.stderr, /target drifted/);

      const statusFingerprint = runMigrationScript([
        "fingerprint", "--project-root", target, "--target", ".speculo/specdev/status.json",
      ]);
      assert.equal(statusFingerprint.status, 0, statusFingerprint.stderr);
      await writeJson(planPath, await migrationPlan(target, [{
        kind: "replace-json",
        to: ".speculo/specdev/status.json",
        expected_target: statusFingerprint.stdout.trim(),
        value: { schema_version: 999 },
      }]));
      const invalid = runMigrationScript(["apply", "--project-root", target, "--plan", planPath, "--confirmed"]);
      assert.equal(invalid.status, 1);
      assert.match(invalid.stderr, /Migrated runtime validation failed/);
      assert.equal(await readFile(statusPath, "utf8"), activeStatusBefore);
      assert.equal(await pathExists(join(state, "migration.json")), true);

      const configPath = join(state, "specdev", "config.json");
      const configFingerprint = runMigrationScript([
        "fingerprint", "--project-root", target, "--target", ".speculo/specdev/config.json",
      ]);
      assert.equal(configFingerprint.status, 0, configFingerprint.stderr);
      const invalidConfig = await readJson(join(packageRoot, "template", "workflows", "specdev", "I-init-setup", "config-template.json"));
      delete invalidConfig.verification.build;
      await writeJson(planPath, await migrationPlan(target, [{
        kind: "replace-json",
        to: ".speculo/specdev/config.json",
        expected_target: configFingerprint.stdout.trim(),
        value: invalidConfig,
      }]));
      const incomplete = runMigrationScript(["apply", "--project-root", target, "--plan", planPath, "--confirmed"]);
      assert.equal(incomplete.status, 1);
      assert.match(incomplete.stderr, /complete schema-v5 execution contract/);
      assert.equal(await pathExists(configPath), false);
      assert.equal((await readdir(target)).some((name) => name.startsWith(".speculo-runtime-migrate-stage-")), false);
    } finally {
      await rm(target, { recursive: true, force: true });
    }
  });

  it("discovers workflow packages and selects all in non-interactive environments", async () => {
    const catalog = await discoverWorkflowCatalog(packageRoot);
    assert.deepEqual([...catalog.keys()].sort(), ["person", "specdev"]);
    assert.deepEqual(selectAllFromCatalog(catalog).workflowIds, ["person", "specdev"]);
    assert.deepEqual((await promptWorkflowSelection(catalog)).workflowIds, ["person", "specdev"]);
  });

  it("compiled CLI exposes only init and version and rejects removed commands and flags", async () => {
    const cliPath = join(packageRoot, "dist", "src", "cli.js");
    const help = execFileSync(process.execPath, [cliPath, "--help"], { encoding: "utf8" });
    assert.match(help, /speculo \[init\] \[target\]/);
    assert.match(help, /speculo version/);
    assert.doesNotMatch(help, /^\s+(?:migrate|mirror-skills|update)\b|--all|--apply|--dry-run/m);
    for (const args of [["migrate"], ["mirror-skills"], ["update"], ["init", "--all"]]) {
      const result = spawnSync(process.execPath, [cliPath, ...args], { encoding: "utf8" });
      assert.equal(result.status, 1, result.stdout + result.stderr);
      assert.match(result.stderr, /has been removed/);
    }
  });

  it("compiled CLI returns exit code 2 when refresh needs agent migration", async () => {
    const target = await tempProject();
    const cliPath = join(packageRoot, "dist", "src", "cli.js");
    try {
      await initSpeculo(target, { packageRoot, selection: { workflowIds: ["specdev"] } });
      await writeFile(join(target, "speculo", "config.json"), "{ malformed\n", "utf8");
      const result = spawnSync(process.execPath, [cliPath, "init", target], { encoding: "utf8" });
      assert.equal(result.status, 2, result.stdout + result.stderr);
      assert.match(result.stderr, /runtime migration is pending/i);
      assert.match(result.stderr, /invalid-json/);
      assert.equal(await pathExists(join(target, "speculo", ".speculo", "migration.json")), true);
    } finally {
      await rm(target, { recursive: true, force: true });
    }
  });

  it("compiled bare CLI invocation is an init alias", async () => {
    const target = await tempProject();
    const cliPath = join(packageRoot, "dist", "src", "cli.js");
    try {
      const result = spawnSync(process.execPath, [cliPath, target], { encoding: "utf8" });
      assert.equal(result.status, 0, result.stdout + result.stderr);
      assert.match(result.stdout, /Speculo initialized/);
      assert.equal(await pathExists(join(target, "speculo", "workflows", "specdev", "INDEX.md")), true);
    } finally {
      await rm(target, { recursive: true, force: true });
    }
  });
});
