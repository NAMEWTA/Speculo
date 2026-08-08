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
import { mirrorSkills, POINTER_SENTINEL } from "../src/skills-mirror.js";

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

describe("Speculo CLI", () => {
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
      const specdevStatus = JSON.parse(
        await readFile(join(root, ".speculo", "specdev", "status.json"), "utf8")
      );
      assert.deepEqual(specdevStatus, {
        schema_version: 4,
        workflow: "specdev",
        active: [],
        archived: [],
      });
      assert.equal(
        await readFile(join(target, ".gitignore"), "utf8"),
        "specdev-worktree/\n"
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
      assert.equal(
        await pathExists(join(root, "skills", "docs-sync", "references", "agents", "agent-writing.md")),
        true
      );
      assert.equal(await pathExists(join(root, "skills", "agents-md-builder")), false);
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
      assert.equal(await pathExists(join(target, ".gitignore")), false);
    } finally {
      await rm(target, { recursive: true, force: true });
    }
  });

  it("init appends the SpecDev worktree ignore without changing existing content", async () => {
    const target = await tempProject();
    try {
      await writeFile(join(target, ".gitignore"), "node_modules/\r\n# keep\r\n");
      const first = await initSpeculo(target, {
        packageRoot,
        selection: { workflowIds: ["specdev"] },
      });
      assert.equal(
        await readFile(join(target, ".gitignore"), "utf8"),
        "node_modules/\r\n# keep\r\nspecdev-worktree/\r\n"
      );
      assert.equal(
        first.copied?.includes(".gitignore (updated specdev-worktree/)"),
        true
      );

      const second = await initSpeculo(target, {
        packageRoot,
        selection: { workflowIds: ["specdev"] },
      });
      assert.equal(
        await readFile(join(target, ".gitignore"), "utf8"),
        "node_modules/\r\n# keep\r\nspecdev-worktree/\r\n"
      );
      assert.equal(
        second.updated?.includes(".gitignore (preserved specdev-worktree/)"),
        true
      );
    } finally {
      await rm(target, { recursive: true, force: true });
    }
  });

  it("init recognizes an equivalent root-anchored worktree ignore", async () => {
    const target = await tempProject();
    try {
      await writeFile(join(target, ".gitignore"), "node_modules/\n/specdev-worktree\n");
      await initSpeculo(target, {
        packageRoot,
        selection: { workflowIds: ["specdev"] },
      });
      assert.equal(
        await readFile(join(target, ".gitignore"), "utf8"),
        "node_modules/\n/specdev-worktree\n"
      );
    } finally {
      await rm(target, { recursive: true, force: true });
    }
  });

  it("init appends the worktree ignore after a file without a final newline", async () => {
    const target = await tempProject();
    try {
      await writeFile(join(target, ".gitignore"), "node_modules/");
      await initSpeculo(target, {
        packageRoot,
        selection: { workflowIds: ["specdev"] },
      });
      assert.equal(
        await readFile(join(target, ".gitignore"), "utf8"),
        "node_modules/\nspecdev-worktree/\n"
      );
    } finally {
      await rm(target, { recursive: true, force: true });
    }
  });

  it("a Git worktree under specdev-worktree leaves the main worktree clean", async () => {
    const target = await tempProject();
    try {
      execFileSync("git", ["init", "-q"], { cwd: target });
      execFileSync("git", ["config", "user.email", "test@example.com"], { cwd: target });
      execFileSync("git", ["config", "user.name", "Speculo Test"], { cwd: target });
      await writeFile(join(target, "base.txt"), "base\n");
      await initSpeculo(target, {
        packageRoot,
        selection: { workflowIds: ["specdev"] },
      });
      execFileSync("git", ["add", "."], { cwd: target });
      execFileSync("git", ["commit", "-qm", "baseline"], { cwd: target });
      execFileSync(
        "git",
        [
          "worktree",
          "add",
          "-q",
          "-b",
          "speculo/test/T-01",
          join(target, "specdev-worktree", "T-01"),
          "HEAD",
        ],
        { cwd: target }
      );
      const worktrees = execFileSync("git", ["worktree", "list", "--porcelain"], {
        cwd: target,
        encoding: "utf8",
      });
      assert.match(worktrees, /specdev-worktree\/T-01/);
      assert.equal(
        execFileSync("git", ["status", "--short"], {
          cwd: target,
          encoding: "utf8",
        }),
        ""
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
      const deliverySkillRoot = join(
        root,
        "workflows",
        "specdev",
        "common",
        "skills",
        "subagent-delivery"
      );
      for (const relativePath of [
        "SKILL.md",
        join("references", "native-subagent.md"),
        join("references", "external-web-subagent.md"),
        join("references", "github-checkpoints.md"),
        join("references", "source-package.md"),
      ]) {
        assert.equal(await pathExists(join(deliverySkillRoot, relativePath)), true);
      }
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
      assert.match(orchestrationProtocol, /## 6\. Ticket 执行、Evidence 与集成/);
      assert.doesNotMatch(
        orchestrationProtocol,
        /common\/skills\/subagent-delivery\/SKILL\.md/
      );
      const delegatedProtocol = await readFile(
        join(
          root,
          "workflows",
          "specdev",
          "P-goal-plan",
          "delegated-execution.md"
        ),
        "utf8"
      );
      assert.match(delegatedProtocol, /## 2\. Dispatch Packet/);
      assert.match(
        delegatedProtocol,
        /common\/skills\/subagent-delivery\/SKILL\.md/
      );
      assert.doesNotMatch(
        orchestrationProtocol,
        /common\/skills\/handoff|changes\/\{change\}\/handoff/
      );
      const implementWork = await readFile(
        join(root, "workflows", "specdev", "I-implement", "I-implement.md"),
        "utf8"
      );
      assert.match(
        implementWork,
        /common\/skills\/subagent-delivery\/SKILL\.md/
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
      await mkdir(join(root, "skills", "agents-md-builder"), { recursive: true });
      await writeFile(
        join(root, "skills", "agents-md-builder", "SKILL.md"),
        "obsolete merged skill\n"
      );

      // Write custom config.json to verify it is not overwritten during update
      await writeJson(join(root, "config.json"), {
        schema_version: 1,
        language: "en",
        persistence: { root_override: "/custom" },
        defaults: { confirm_before_external_write: false, report_language: "en" },
      });

      const updateResult = await initSpeculo(target, {
        packageRoot,
        selection: { workflowIds: ["specdev"] },
      });

      // Update reports the preserved config.json explicitly (issue #33).
      assert.ok(
        (updateResult.updated ?? []).includes("config.json (preserved)"),
        "update output should mark config.json as preserved"
      );

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
      assert.equal(await pathExists(join(root, "skills", "agents-md-builder")), false);
      assert.equal(
        await pathExists(join(root, "skills", "docs-sync", "references", "agents", "agent-writing.md")),
        true
      );

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

  it("SpecDev validator enforces the Git worktree reference contract", async () => {
    const root = await tempProject();
    const change = join(root, "2026-07-29-node-validator");
    const validator = join(
      packageRoot,
      "template",
      "workflows",
      "specdev",
      "common",
      "tools",
      "validate-specdev.mjs"
    );
    try {
      await createValidSpecdevChange(change);
      const statusPath = join(change, ".status.json");
      const status = JSON.parse(await readFile(statusPath, "utf8"));
      status.worktrees = [
        {
          ticket_id: "T-01",
          owner: "worker",
          provider: "git",
          base_sha: "abc123",
          branch: "speculo/change/T-01",
          workspace_ref: "specdev-worktree/T-01",
          status: "active",
          updated_at: "2026-07-29T00:00:00Z",
        },
        {
          ticket_id: "T-02",
          owner: "worker",
          provider: "external",
          base_sha: "abc123",
          branch: "speculo/change/T-02",
          workspace_ref: "provider/session-02",
          status: "active",
          updated_at: "2026-07-29T00:00:00Z",
        },
      ];
      await writeJson(statusPath, status);
      const valid = spawnSync(process.execPath, [validator, change], {
        encoding: "utf8",
      });
      assert.equal(valid.status, 0, valid.stdout + valid.stderr);

      status.worktrees[0].workspace_ref = "specdev-worktree/T-99";
      await writeJson(statusPath, status);
      const invalid = spawnSync(process.execPath, [validator, change], {
        encoding: "utf8",
      });
      assert.equal(invalid.status, 1);
      assert.match(
        invalid.stdout + invalid.stderr,
        /git workspace_ref must equal specdev-worktree\/T-01/
      );
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

  it("SpecDev Node validator rejects a malformed design tree", async () => {
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
      await writeJson(join(change, "design-tree.json"), {
        schema_version: 1,
        artifact: "design-tree",
        change: "2026-07-29-node-validator",
        status: "consensus",
        round: 1,
        nodes: [
          {
            id: "D-001",
            title: "范围",
            question: "范围是什么？",
            depends_on: ["D-999"],
            recommendation: "保持最小范围",
            status: "open",
            round: null,
            answer: null,
            log_ref: null,
          },
        ],
      });
      const result = spawnSync(process.execPath, [validator, change], {
        encoding: "utf8",
      });
      assert.equal(result.status, 1);
      assert.match(result.stdout + result.stderr, /depends on missing D-999/);
      assert.match(result.stdout + result.stderr, /consensus design tree cannot contain open/);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("SpecDev Node validator rejects malformed Wayfinder closure", async () => {
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
      await writeFile(
        join(change, "wayfinder-map.md"),
        [
          "---",
          "artifact: wayfinder-map",
          "change: 2026-07-29-node-validator",
          "status: active",
          "---",
          "",
          "# Wayfinder Map",
          "",
        ].join("\n")
      );
      await mkdir(join(change, "investigation"), { recursive: true });
      await writeFile(
        join(change, "investigation", "INV-01-scope.md"),
        [
          "---",
          "artifact: wayfinder-ticket",
          "id: INV-01",
          "name: Scope",
          "parent_map: <Path>{roots.state}/specdev/changes/{change}/wayfinder-map.md</Path>",
          "label: wayfinder:grilling",
          "status: closed",
          "blocked_by: [INV-99]",
          "resolution: null",
          "---",
          "",
          "# Scope",
          "",
        ].join("\n")
      );
      const result = spawnSync(process.execPath, [validator, change], {
        encoding: "utf8",
      });
      assert.equal(result.status, 1);
      assert.match(result.stdout + result.stderr, /blocked_by references missing INV-99/);
      assert.match(result.stdout + result.stderr, /closed Wayfinder Ticket needs a resolution/);
      assert.match(result.stdout + result.stderr, /has no solution comment/);
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

  it("migrates SpecDev global status v3 to the strict v4 index", async () => {
    const target = await tempProject();
    const state = join(target, "speculo", ".speculo");
    const activeChange = "2026-08-07-active-change";
    const archivedChange = "2026-07-21-archived-change";
    try {
      await initSpeculo(target, {
        packageRoot,
        selection: { workflowIds: ["specdev"] },
      });
      await mkdir(
        join(state, "specdev", "archive", "2026-07", archivedChange),
        { recursive: true }
      );
      const legacy = {
        schema_version: 3,
        workflow: "specdev",
        active: [
          {
            change: activeChange,
            current_work: "specdev/tickets",
            works_run: ["specdev/spec", "specdev/spec"],
            result: "completed",
            claimed_investigations: [],
          },
        ],
        work_history: [
          {
            change: activeChange,
            work_id: "specdev/spec",
            started_at: "2026-08-07T00:00:00Z",
            completed_at: "2026-08-07T01:00:00Z",
            result: "completed",
          },
        ],
        completed: [
          { change: archivedChange, archived_at: "2026-07-21T00:00:00Z" },
          { change: archivedChange, archived_at: "2026-07-21T00:00:00Z" },
        ],
      };
      const statusPath = join(state, "specdev", "status.json");
      await writeJson(statusPath, legacy);

      await assert.rejects(
        initSpeculo(target, { packageRoot, all: true }),
        /state migration required/
      );
      const preview = await migrateSpeculo(target, { packageRoot });
      assert.equal(preview.applied, false);
      assert.equal(
        preview.actions.some((action) => action.kind === "migrate-specdev-status"),
        true
      );
      assert.deepEqual(JSON.parse(await readFile(statusPath, "utf8")), legacy);

      const result = await migrateSpeculo(target, { packageRoot, apply: true });
      assert.equal(result.applied, true);
      assert.deepEqual(JSON.parse(await readFile(statusPath, "utf8")), {
        schema_version: 4,
        workflow: "specdev",
        active: [
          {
            change: activeChange,
            current_work: "specdev/tickets",
            works_run: ["specdev/spec"],
            claimed_investigations: [],
          },
        ],
        archived: [archivedChange],
      });
      assert.equal(await detectLegacyState(target), false);
      const second = await migrateSpeculo(target, { packageRoot, apply: true });
      assert.equal(second.legacyDetected, false);
      assert.equal(second.applied, false);
    } finally {
      await rm(target, { recursive: true, force: true });
    }
  });

  it("blocks status v3 migration when archived state cannot be resolved", async () => {
    const target = await tempProject();
    const statusPath = join(
      target,
      "speculo",
      ".speculo",
      "specdev",
      "status.json"
    );
    try {
      await initSpeculo(target, {
        packageRoot,
        selection: { workflowIds: ["specdev"] },
      });
      const legacy = {
        schema_version: 3,
        workflow: "specdev",
        active: [],
        work_history: [],
        completed: [
          { change: "2026-07-21-missing-archive" },
        ],
      };
      await writeJson(statusPath, legacy);
      await assert.rejects(
        migrateSpeculo(target, { packageRoot, apply: true }),
        /Archived change directory is missing/
      );
      assert.deepEqual(JSON.parse(await readFile(statusPath, "utf8")), legacy);
    } finally {
      await rm(target, { recursive: true, force: true });
    }
  });

  it("blocks unknown SpecDev status versions without mutation", async () => {
    const target = await tempProject();
    const statusPath = join(
      target,
      "speculo",
      ".speculo",
      "specdev",
      "status.json"
    );
    try {
      await initSpeculo(target, {
        packageRoot,
        selection: { workflowIds: ["specdev"] },
      });
      const unknown = {
        schema_version: 99,
        workflow: "specdev",
        active: [],
        archived: [],
      };
      await writeJson(statusPath, unknown);
      await assert.rejects(
        initSpeculo(target, { packageRoot, all: true }),
        /state migration required/
      );
      await assert.rejects(
        migrateSpeculo(target, { packageRoot, apply: true }),
        /Unsupported SpecDev status schema_version: 99/
      );
      assert.deepEqual(JSON.parse(await readFile(statusPath, "utf8")), unknown);
    } finally {
      await rm(target, { recursive: true, force: true });
    }
  });

  it("blocks malformed status that falsely claims schema v4", async () => {
    const target = await tempProject();
    const statusPath = join(
      target,
      "speculo",
      ".speculo",
      "specdev",
      "status.json"
    );
    try {
      await initSpeculo(target, {
        packageRoot,
        selection: { workflowIds: ["specdev"] },
      });
      const malformed = {
        schema_version: 4,
        workflow: "specdev",
        active: [],
        archived: [],
        work_history: [],
      };
      await writeJson(statusPath, malformed);
      await assert.rejects(
        initSpeculo(target, { packageRoot, all: true }),
        /state migration required/
      );
      await assert.rejects(
        migrateSpeculo(target, { packageRoot, apply: true }),
        /Invalid SpecDev status v4: top-level fields/
      );
      assert.deepEqual(JSON.parse(await readFile(statusPath, "utf8")), malformed);
    } finally {
      await rm(target, { recursive: true, force: true });
    }
  });

  it("blocks a status migration when active and archived indexes overlap", async () => {
    const target = await tempProject();
    const state = join(target, "speculo", ".speculo");
    const change = "2026-07-21-overlap";
    try {
      await initSpeculo(target, {
        packageRoot,
        selection: { workflowIds: ["specdev"] },
      });
      await mkdir(join(state, "specdev", "archive", "2026-07", change), {
        recursive: true,
      });
      const legacy = {
        schema_version: 3,
        workflow: "specdev",
        active: [
          { change, current_work: null, works_run: [], result: null },
        ],
        work_history: [],
        completed: [{ change }],
      };
      const statusPath = join(state, "specdev", "status.json");
      await writeJson(statusPath, legacy);
      await assert.rejects(
        migrateSpeculo(target, { packageRoot, apply: true }),
        /appears in both active and archived/
      );
      assert.deepEqual(JSON.parse(await readFile(statusPath, "utf8")), legacy);
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
        migrationReports.some((name) => /^\d{4}-\d{2}-\d{2}-workspace-migration\.md$/.test(name)),
        true
      );
      const specdevIndex = JSON.parse(
        await readFile(join(state, "specdev", "status.json"), "utf8")
      );
      assert.equal(specdevIndex.schema_version, 4);
      assert.deepEqual(specdevIndex.active, []);
      assert.deepEqual(
        specdevIndex.archived,
        [
          "2026-06-01-legacy-dev-login",
          "2026-05-01-legacy-dev-old-code",
          "2026-06-02-legacy-doc-article",
        ]
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
      await writeJson(join(state, "specdev", "status.json"), {
        schema_version: 3,
        workflow: "specdev",
        active: [],
        work_history: [],
        completed: [],
      });
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
      assert.deepEqual(
        JSON.parse(await readFile(join(state, "specdev", "status.json"), "utf8")),
        {
          schema_version: 4,
          workflow: "specdev",
          active: [],
          archived: [],
        }
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

  async function writeSkill(
    dir: string,
    name: string,
    body: string
  ): Promise<void> {
    await mkdir(join(dir, name), { recursive: true });
    await writeFile(
      join(dir, name, "SKILL.md"),
      "---\nname: " + name + "\ndescription: " + name + " skill\n---\n\n" + body,
      "utf8"
    );
  }

  it("mirror-skills writes a frontmatter-preserving pointer for each canonical skill", async () => {
    const target = await tempProject();
    const agents = join(target, ".agents", "skills");
    const claude = join(target, ".claude", "skills");
    try {
      await writeSkill(agents, "foo", "# Foo\n\ncanonical logic\n");
      // _shared has no SKILL.md and must be ignored.
      await mkdir(join(agents, "_shared"), { recursive: true });
      await writeFile(join(agents, "_shared", "notes.md"), "shared\n", "utf8");

      const result = await mirrorSkills(target, { apply: true });

      assert.equal(result.applied, true);
      assert.deepEqual(
        result.actions.map((action) => action.kind + ":" + action.name),
        ["mirror:foo"]
      );

      const pointer = await readFile(join(claude, "foo", "SKILL.md"), "utf8");
      assert.match(pointer, /name: foo/);
      assert.match(pointer, /description: foo skill/);
      assert.ok(pointer.includes(POINTER_SENTINEL));
      assert.ok(
        pointer.includes("../../../.agents/skills/foo/SKILL.md"),
        "pointer must reference the canonical via relative path"
      );
      // Canonical body must not be duplicated into the pointer.
      assert.ok(!pointer.includes("canonical logic"));
      // _shared is skipped, never mirrored.
      assert.equal(await pathExists(join(claude, "_shared")), false);

      // Relative path resolves from the pointer back to the canonical.
      assert.equal(
        await pathExists(
          join(claude, "foo", "..", "..", "..", ".agents", "skills", "foo", "SKILL.md")
        ),
        true
      );
    } finally {
      await rm(target, { recursive: true, force: true });
    }
  });

  it("mirror-skills relocates a full .claude skill into .agents canonical without content loss", async () => {
    const target = await tempProject();
    const agents = join(target, ".agents", "skills");
    const claude = join(target, ".claude", "skills");
    try {
      await writeSkill(claude, "bar", "# Bar\n\nreal implementation\n");

      const result = await mirrorSkills(target, { apply: true });
      assert.deepEqual(
        result.actions.map((action) => action.kind + ":" + action.name),
        ["relocate:bar"]
      );

      // Canonical now lives in .agents with the original full body intact.
      const canonical = await readFile(join(agents, "bar", "SKILL.md"), "utf8");
      assert.ok(canonical.includes("real implementation"));
      assert.ok(!canonical.includes(POINTER_SENTINEL));

      // .claude side is now a pointer.
      const pointer = await readFile(join(claude, "bar", "SKILL.md"), "utf8");
      assert.ok(pointer.includes(POINTER_SENTINEL));
      assert.ok(!pointer.includes("real implementation"));
    } finally {
      await rm(target, { recursive: true, force: true });
    }
  });

  it("mirror-skills is idempotent on a second run", async () => {
    const target = await tempProject();
    const claude = join(target, ".claude", "skills");
    try {
      await writeSkill(join(target, ".agents", "skills"), "foo", "# Foo\n");
      await mirrorSkills(target, { apply: true });
      const first = await readFile(join(claude, "foo", "SKILL.md"), "utf8");

      const second = await mirrorSkills(target, { apply: true });
      assert.deepEqual(
        second.actions.map((action) => action.kind),
        ["skip"]
      );
      assert.equal(
        await readFile(join(claude, "foo", "SKILL.md"), "utf8"),
        first
      );
    } finally {
      await rm(target, { recursive: true, force: true });
    }
  });

  it("mirror-skills dry-run writes nothing", async () => {
    const target = await tempProject();
    try {
      await writeSkill(join(target, ".agents", "skills"), "foo", "# Foo\n");
      const result = await mirrorSkills(target, { apply: false });
      assert.equal(result.applied, false);
      assert.deepEqual(
        result.actions.map((action) => action.kind),
        ["mirror"]
      );
      assert.equal(await pathExists(join(target, ".claude")), false);
    } finally {
      await rm(target, { recursive: true, force: true });
    }
  });

  it("mirror-skills errors on a dangling .claude pointer with no canonical", async () => {
    const target = await tempProject();
    const claude = join(target, ".claude", "skills");
    try {
      await mkdir(join(claude, "orphan"), { recursive: true });
      await writeFile(
        join(claude, "orphan", "SKILL.md"),
        "---\nname: orphan\n---\n" + POINTER_SENTINEL + "\n",
        "utf8"
      );
      await assert.rejects(
        mirrorSkills(target, { apply: true }),
        /no canonical/
      );
    } finally {
      await rm(target, { recursive: true, force: true });
    }
  });

  it("mirror-skills errors when a full skill exists on both sides", async () => {
    const target = await tempProject();
    try {
      await writeSkill(join(target, ".agents", "skills"), "dup", "# canonical\n");
      await writeSkill(join(target, ".claude", "skills"), "dup", "# other full\n");
      await assert.rejects(
        mirrorSkills(target, { apply: true }),
        /exists in both/
      );
    } finally {
      await rm(target, { recursive: true, force: true });
    }
  });
});
