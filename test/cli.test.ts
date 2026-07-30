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
      config: "speculo/config.json",
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
    "speculo-write-work",
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
  // Full package INDEX.md (type: workflow requires all 7 sections)
  await writeFile(
    join(root, "template", "workflows", "example", "INDEX.md"),
    [
      "---",
      "id: example",
      "type: workflow",
      "workflow: example",
      "name: Example",
      "description: Example workflow for validator testing",
      "keywords: [example]",
      "---",
      "",
      "# Example Workflow",
      "",
      "## 运行时根",
      "",
      "- workflow 根解析为 template/workflows/example/",
      "- state 根解析为 template 运行时 state",
      "",
      "## 持久化约定",
      "",
      "| 名称 | 路径 | 说明 |",
      "|------|------|------|",
      "| 状态索引 | status.json | workflow 全局状态 |",
      "| 活跃变更 | changes/ | 进行中的 change |",
      "| 变更归档 | archive/ | 已归档 change |",
      "",
      "## 启动协议",
      "",
      "1. 解析运行时",
      "2. 选择 change",
      "",
      "## 状态字段",
      "",
      "- schema_version",
      "- workflow",
      "- active",
      "",
      "## 路径分配",
      "",
      "产物写入当前 change 目录。",
      "",
      "## 副作用边界",
      "",
      "确认前不得执行破坏性操作。",
      "",
      "## Work 条目",
      "",
      "<!-- AUTO-INDEX-START -->",
      "",
      "<!-- AUTO-INDEX-END -->",
      "",
    ].join("\n")
  );
}

async function createValidSpecdevChange(root: string): Promise<void> {
  const change = "2026-07-29-node-validator";
  await mkdir(join(root, "ticket"), { recursive: true });
  await writeJson(join(root, ".status.json"), {
    schema_version: 3,
    artifact: "change-status",
    change,
    change_status: "active",
    current_work: "specdev/tickets",
    created_at: "2026-07-29T00:00:00Z",
    updated_at: "2026-07-29T00:00:00Z",
    completed_at: null,
    archived: false,
    archive_path: null,
    blockers: [],
    deviations: [],
  });
  await writeFile(
    join(root, "spec.md"),
    [
      "---",
      "schema_version: 3",
      "artifact: spec",
      `change: ${change}`,
      "status: ready",
      "ready_for_tickets: true",
      "sources: [external-request]",
      "---",
      "",
      "## 1. 问题与目标",
      "",
      "验证 Node 校验器。",
      "",
      "## 2. 解决方案与外部行为",
      "",
      "执行一个垂直切片。",
      "",
      "### 未决问题",
      "",
      "无",
      "",
      "## 4. 验收合同",
      "",
      "- AC-001：Node 校验器接受有效 change。",
      "",
      "## 5. 范围",
      "",
      "仅验证测试夹具。",
      "",
      "## 9. 验证策略",
      "",
      "运行校验器。",
      "",
    ].join("\n")
  );
  await writeFile(
    join(root, "tickets-map.md"),
    [
      "---",
      "schema_version: 3",
      "artifact: tickets-map",
      `change: ${change}`,
      "status: ready",
      "---",
      "",
      "## 2. 执行清单",
      "",
      "| Ticket | Contract |",
      "|---|---|",
      "| T-01 | AC-001 |",
      "",
      "## 3. 依赖 DAG",
      "",
      "T-01",
      "",
      "## 4. 合同覆盖矩阵",
      "",
      "| Contract | Ticket |",
      "|---|---|",
      "| AC-001 | T-01 |",
      "",
      "## 5. 并行与路径所有权",
      "",
      "单 Ticket，无并行冲突。",
      "",
    ].join("\n")
  );
  await writeFile(
    join(root, "ticket", "01-node-validator.md"),
    [
      "---",
      "schema_version: 3",
      "artifact: ticket",
      `change: ${change}`,
      "id: T-01",
      "title: 验证 Node 校验器",
      "status: ready",
      "planning_depth: standard",
      "planning_depth_reason: 覆盖结构校验主路径",
      "ready: true",
      "risk: low",
      "blocked_by: []",
      "contract_ids: [AC-001]",
      "owner: lead",
      "expected_changes: [<Path>src/example.ts</Path>]",
      "writable_paths: [<Path>src/example.ts</Path>]",
      "read_only_paths: []",
      "shared_paths: []",
      "shared_path_owners: []",
      "---",
      "",
      "## 1. 战略与来源",
      "",
      "覆盖 AC-001。",
      "",
      "## 2. 决策状态",
      "",
      "### 未决问题",
      "",
      "无",
      "",
      "## 3. 范围边界",
      "",
      "只修改授权路径。",
      "",
      "## 4. 要构建什么",
      "",
      "实现验证切片。",
      "",
      "## 5. 实现契约",
      "",
      "保持外部行为稳定。",
      "",
      "## 6. 执行路线",
      "",
      "先测试，再实现。",
      "",
      "## 7. 路径访问契约",
      "",
      "遵守 frontmatter 路径。",
      "",
      "## 8. 验证矩阵",
      "",
      "| 场景 | 命令 |",
      "|---|---|",
      "| 正常路径 | node validator |",
      "",
      "## 10. 验收标准",
      "",
      "- [ ] AC-001 已满足。",
      "",
    ].join("\n")
  );
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
      assert.equal(workspace.roots.config, "speculo/config.json");
      assert.equal(
        await pathExists(join(root, "config.json")),
        true
      );
      const config = JSON.parse(
        await readFile(join(root, "config.json"), "utf8")
      );
      assert.equal(config.schema_version, 1);
      assert.equal(config.language, "zh-CN");
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
      assert.equal(
        await pathExists(
          join(
            root,
            "workflows",
            "specdev",
            "common",
            "skills",
            "dev-worktree",
            "SKILL.md"
          )
        ),
        true
      );
      assert.equal(
        await pathExists(
          join(
            root,
            "workflows",
            "specdev",
            "common",
            "skills",
            "handoff",
            "SKILL.md"
          )
        ),
        false
      );
      const orchestrationProtocol = await readFile(
        join(
          root,
          "workflows",
          "specdev",
          "P-goal-plan",
          "orchestration-protocol.md"
        ),
        "utf8"
      );
      assert.match(orchestrationProtocol, /## 8\. Evidence 返回与集成/);
      assert.doesNotMatch(
        orchestrationProtocol,
        /common\/skills\/handoff|changes\/\{change\}\/handoff/
      );
      const validator = join(
        root,
        "workflows",
        "specdev",
        "common",
        "tools",
        "validate-specdev.mjs"
      );
      assert.equal(await pathExists(validator), true);
      assert.equal(
        await pathExists(
          join(root, "workflows", "specdev", "common", "tools", "validate_specdev.py")
        ),
        false
      );
      const validation = spawnSync(process.execPath, [validator, "--self-check"], {
        encoding: "utf8",
      });
      assert.equal(validation.status, 0, validation.stdout + validation.stderr);
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

      // Write custom config.json to verify it is not overwritten during update
      await writeJson(join(root, "config.json"), {
        schema_version: 1,
        language: "en",
        persistence: { root_override: "/custom" },
        defaults: { confirm_before_external_write: false, report_language: "en" },
      });

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

      // Verify custom config.json was preserved (not overwritten by update)
      const configAfter = JSON.parse(
        await readFile(join(root, "config.json"), "utf8")
      );
      assert.equal(configAfter.language, "en");
      assert.equal(configAfter.persistence.root_override, "/custom");
      assert.equal(configAfter.defaults.confirm_before_external_write, false);
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

  it("SpecDev package validator runs on the required Node runtime", () => {
    const validator = join(
      packageRoot,
      "template",
      "workflows",
      "specdev",
      "common",
      "tools",
      "validate-specdev.mjs"
    );
    const result = spawnSync(process.execPath, [validator, "--self-check"], {
      encoding: "utf8",
    });
    assert.equal(result.status, 0, result.stdout + result.stderr);
    assert.match(result.stdout, /Summary: 0 error\(s\), 0 warning\(s\)/);
  });

  it("SpecDev Node validator accepts a structurally valid change", async () => {
    const validator = join(
      packageRoot,
      "template",
      "workflows",
      "specdev",
      "common",
      "tools",
      "validate-specdev.mjs"
    );
    const root = await tempProject();
    try {
      const change = join(root, "2026-07-29-node-validator");
      await createValidSpecdevChange(change);
      const result = spawnSync(process.execPath, [validator, change], {
        encoding: "utf8",
      });
      assert.equal(result.status, 0, result.stdout + result.stderr);
      assert.match(result.stdout, /Summary: 0 error\(s\), 0 warning\(s\)/);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("SpecDev Node validator rejects a done Ticket without Evidence", async () => {
    const validator = join(
      packageRoot,
      "template",
      "workflows",
      "specdev",
      "common",
      "tools",
      "validate-specdev.mjs"
    );
    const root = await tempProject();
    try {
      const change = join(root, "2026-07-29-node-validator");
      await createValidSpecdevChange(change);
      const ticket = join(change, "ticket", "01-node-validator.md");
      await writeFile(
        ticket,
        (await readFile(ticket, "utf8")).replace("status: ready", "status: done")
      );
      const result = spawnSync(process.execPath, [validator, change], {
        encoding: "utf8",
      });
      assert.equal(result.status, 1);
      assert.match(result.stdout + result.stderr, /status is done but Evidence is missing/);
    } finally {
      await rm(root, { recursive: true, force: true });
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
