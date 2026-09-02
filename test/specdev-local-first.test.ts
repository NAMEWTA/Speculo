import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmod, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";
import { describe, it } from "node:test";

const packageRoot = process.cwd();
const changeName = "2026-08-07-local-first";
const validator = join(
  packageRoot,
  "template/workflows/specdev/common/tools/validate-specdev.mjs",
);
const prototypeTemplate = join(
  packageRoot,
  "template/workflows/specdev/P-prototype/design-system-template.md",
);
const prototypeMaterializer = join(
  packageRoot,
  "template/workflows/specdev/P-prototype/tools/materialize-prototype.mjs",
);
const specTemplate = join(
  packageRoot,
  "template/workflows/specdev/S-spec/spec-template.md",
);
const ticketsMapTemplate = join(
  packageRoot,
  "template/workflows/specdev/T-tickets/tickets-map-template.md",
);
const ticketTemplate = join(
  packageRoot,
  "template/workflows/specdev/T-tickets/ticket-template.md",
);

async function fixture(): Promise<string> {
  const parent = await mkdtemp(join(tmpdir(), "specdev-local-first-"));
  const root = join(parent, changeName);
  await mkdir(root);
  await writeConfig(root);
  return root;
}

async function writeConfig(root: string, maxImplementationAgents = 3, maxIntegrationAttempts = 3): Promise<void> {
  const configRoot = join(dirname(root), ".speculo", "specdev");
  await mkdir(configRoot, { recursive: true });
  await writeFile(join(configRoot, "config.json"), JSON.stringify({
    schema_version: 5,
    interaction_language: "zh-CN",
    artifact_language: "zh-CN",
    git: { default_branch: "main" },
    execution: {
      max_implementation_agents: maxImplementationAgents,
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
  await mkdir(root, { recursive: true });
  await writeFile(
    join(root, ".status.json"),
    JSON.stringify(
      {
        schema_version: 6,
        artifact: "change-status",
        change: changeName,
        change_status: status,
        current_work: null,
        works_run: [],
        claimed_investigations: [],
        execution_authorization: {
          implementation_commit: { status: "not-authorized", source: null, granted_at: null, scope: "Ticket source commits" },
          local_candidate_integration: { status: "not-authorized", source: null, granted_at: null, scope: "Lead-owned local parent candidate integration and parent update" },
          source_cleanup: { status: "not-authorized", source: null, granted_at: null, scope: "Source worktree and branch cleanup" },
        },
        leadership: { current: "lead-session", epoch: 1, assigned_at: "2026-08-07T00:00:00Z", history: [] },
        created_at: "2026-08-07T00:00:00Z",
        updated_at: "2026-08-07T00:00:00Z",
        completed_at: status === "completed" ? "2026-08-07T01:00:00Z" : null,
        archived: false,
        archive_path: null,
        blockers: [],
        deviations: [],
        worktrees,
      },
      null,
      2,
    ) + "\n",
  );
}

async function writeNamedStatus(
  root: string,
  name: string,
  status = "active",
  currentWork: string | null = null,
  worktrees: unknown[] = [],
): Promise<void> {
  await mkdir(root, { recursive: true });
  await writeFile(join(root, ".status.json"), JSON.stringify({
    schema_version: 6,
    artifact: "change-status",
    change: name,
    change_status: status,
    current_work: currentWork,
    works_run: [],
    claimed_investigations: [],
    execution_authorization: {
      implementation_commit: { status: "not-authorized", source: null, granted_at: null, scope: "Ticket source commits" },
      local_candidate_integration: { status: "not-authorized", source: null, granted_at: null, scope: "Lead-owned local parent candidate integration and parent update" },
      source_cleanup: { status: "not-authorized", source: null, granted_at: null, scope: "Source worktree and branch cleanup" },
    },
    leadership: { current: "lead-session", epoch: 1, assigned_at: "2026-08-07T00:00:00Z", history: [] },
    created_at: "2026-08-07T00:00:00Z",
    updated_at: "2026-08-07T00:00:00Z",
    completed_at: status === "completed" ? "2026-08-07T01:00:00Z" : null,
    archived: false,
    archive_path: null,
    blockers: [],
    deviations: [],
    worktrees,
  }, null, 2) + "\n");
}

async function writeImplementationArtifacts(
  root: string,
  members: string[],
  options: {
    dependencies?: string[];
    serializations?: string[];
    status?: "ready" | "in_progress" | "blocked" | "completed";
    sourceMapRevision?: number;
    workspacePolicy?: "current" | "required";
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
  const workspacePolicy = options.workspacePolicy ?? "current";
  await writeFile(join(root, "implementation-plan.md"), [
    "---",
    "schema_version: 1",
    "artifact: implementation-plan",
    `change: ${basename(root)}`,
    `status: ${status}`,
    `source_map_revision: ${options.sourceMapRevision ?? 1}`,
    "orchestration: lead-directed",
    "lead: lead-session",
    "implementation_agent_limit: 3",
    "integration_attempt_limit: 3",
    `ticket_workspace_policy: ${workspacePolicy}`,
    `integration_gate: ${workspacePolicy === "current" ? "direct-parent" : "candidate-merge"}`,
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
  options: { changeStatus?: "active" | "blocked" | "completed"; ticketStatus?: "ready" | "done" | "cancelled" } = {},
): Promise<void> {
  const changeStatus = options.changeStatus ?? "active";
  const ticketStatus = options.ticketStatus ?? "ready";
  const worktrees = ticketStatus === "done" ? [currentTicketWorktree("integrated")] : [];
  await writeNamedStatus(root, name, changeStatus, null, worktrees);

  let spec = (await readFile(specTemplate, "utf8")).replace(/\r\n?/g, "\n");
  spec = spec
    .replace("change: <YYYY-MM-DD-topic>", `change: ${name}`)
    .replace("status: draft", "status: ready")
    .replace("ready_for_tickets: false", "ready_for_tickets: true")
    .replace("\n存在高影响未决问题时，`ready_for_tickets` 必须为 `false`。", "");
  await writeFile(join(root, "spec.md"), spec);

  let map = (await readFile(ticketsMapTemplate, "utf8")).replace(/\r\n?/g, "\n");
  map = map
    .replace("change: <YYYY-MM-DD-topic>", `change: ${name}`)
    .replace("status: draft", ticketStatus === "ready" ? "status: ready" : "status: completed");
  await writeFile(join(root, "tickets-map.md"), map);

  let ticket = (await readFile(ticketTemplate, "utf8")).replace(/\r\n?/g, "\n");
  ticket = ticket
    .replace("change: <YYYY-MM-DD-topic>", `change: ${name}`)
    .replace("status: draft", `status: ${ticketStatus}`)
    .replace("ready: false", `ready: ${ticketStatus === "cancelled" ? "false" : "true"}`)
    .replace('expected_changes: ["<Path>src/example.ts</Path>"]', `expected_changes: ["<Path>${writablePath}</Path>"]`)
    .replace('writable_paths: ["<Path>src/example/**</Path>"]', `writable_paths: ["<Path>${writablePath}</Path>"]`)
    .replace("\n存在会改变行为、接口、数据、兼容、安全、范围、迁移或验收的问题时，frontmatter 中 `ready` 必须为 `false`。", "");
  await mkdir(join(root, "ticket"), { recursive: true });
  await writeFile(join(root, "ticket", "01-implementation.md"), ticket);
  if (ticketStatus === "done") {
    await mkdir(join(root, "evidence"), { recursive: true });
    await writeFile(join(root, "evidence", "T-01.md"), "# Ticket Evidence\n\nverified\n");
  }
}

async function writeDesignPackage(
  root: string,
  status: "detecting" | "selecting" | "ready" | "blocked" = "ready",
  withComparison = true,
): Promise<string> {
  const designRoot = join(root, "prototypes", "UI-001");
  await mkdir(designRoot, { recursive: true });
  let content = (await readFile(prototypeTemplate, "utf8")).replace(/\r\n?/g, "\n");
  content = content
    .replace("change: <YYYY-MM-DD-topic>", `change: ${changeName}`)
    .replace("status: detecting", `status: ${status}`)
    .replace("updated_at: <ISO-8601>", "updated_at: 2026-08-07T00:00:00Z")
    .replace("# UI Design System UI-001: <产品或功能名称>", "# UI Design System UI-001: Workspace");
  if (status === "ready") {
    content = content
      .replace("selected_style: null", "selected_style: dense-ide")
      .replace("density: null", "density: compact")
      .replace("color_mode: null", "color_mode: both");
  }
  const designPath = join(designRoot, "design-system.md");
  await writeFile(designPath, content);
  const materialized = spawnSync(process.execPath, [prototypeMaterializer, designPath], { encoding: "utf8" });
  assert.equal(materialized.status, 0, materialized.stdout + materialized.stderr);
  if (withComparison) {
    const variants = join(designRoot, "comparison", "variants");
    await mkdir(variants, { recursive: true });
    await writeFile(join(designRoot, "comparison", "index.html"), "<!doctype html><title>Compare</title>\n");
    await writeFile(join(variants, "dense-ide.html"), "<!doctype html><title>Dense IDE</title>\n");
    await writeFile(join(variants, "responsive-web.html"), "<!doctype html><title>Responsive Web</title>\n");
  }
  return designPath;
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
      "schema_version: 1",
      "artifact: triage",
      `change: ${changeName}`,
      "mode: intake",
      "source: <Path>{roots.state}/specdev/changes/{change}/source.md</Path>",
      "classification: bug",
      "risk: medium",
      "route: specdev/diagnose-bugs",
      "ready_for_implementation: false",
      `external_action: ${externalAction}`,
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
      "## 外部动作",
      externalAction,
      "",
    ].join("\n"),
  );
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
  workspacePolicy: "current" | "required" = "current",
  integrationAttemptLimit = 3,
): Promise<void> {
  let content = await readFile(
    join(packageRoot, "template/workflows/specdev/P-goal-plan/goal-plan-template.md"),
    "utf8",
  );
  content = content.replace(/\r\n?/g, "\n");
  content = content
    .replace("change: <YYYY-MM-DD-topic>", `change: ${changeName}`)
    .replace("status: draft", "status: ready")
    .replaceAll("<owner-or-session-locator>", "lead-session")
    .replace("implementation_agent_limit: 3", `implementation_agent_limit: ${implementationAgentLimit}`)
    .replace("integration_attempt_limit: 3", `integration_attempt_limit: ${integrationAttemptLimit}`)
    .replace("ticket_workspace_policy: current", `ticket_workspace_policy: ${workspacePolicy}`)
    .replace("integration_gate: direct-parent", `integration_gate: ${workspacePolicy === "current" ? "direct-parent" : "candidate-merge"}`)
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

function ticketWorktree(overrides: Record<string, any> = {}): Record<string, any> {
  const integration = {
    status: "pending",
    parent_ref: null,
    parent_before_sha: null,
    source_sha: null,
    candidate_sha: null,
    candidate_tree_sha: null,
    candidate_branch: null,
    candidate_workspace_ref: null,
    result_sha: null,
    method: null,
    conflict_paths: [],
    verification: "pending",
    full_suite: { required: true, status: "pending", reason: null, evidence: null },
    e2e: { required: false, status: "not-required", reason: "Ticket exempts E2E", evidence: null },
    evidence: `<Path>{roots.state}/specdev/changes/${changeName}/evidence/T-01.md</Path>`,
    attempts: 0,
    promotion_status: "pending",
    ...(overrides.integration ?? {}),
  };
  return {
    ticket_id: "T-01",
    owner: "lead-session",
    implementation_owner: "implementation-agent-1",
    integration_owner: "lead-session",
    provider: "git",
    base_sha: "base-sha",
    parent_branch: "main",
    branch: `speculo/${changeName}/T-01`,
    workspace_ref: `specdev-worktree/${changeName}/T-01`,
    source_checkpoint: null,
    status: "active",
    updated_at: "2026-08-07T00:00:00Z",
    ...overrides,
    integration,
  };
}

function completedTicketWorktree(status: "integrated" | "removed" = "integrated"): Record<string, any> {
  return ticketWorktree({
    status,
    source_checkpoint: "source-sha",
    integration: {
      status: "passed",
      parent_ref: "main",
      parent_before_sha: "parent-sha",
      source_sha: "source-sha",
      candidate_sha: "source-sha",
      candidate_tree_sha: "source-tree",
      candidate_branch: `speculo/integration/${changeName}/T-01`,
      candidate_workspace_ref: `specdev-worktree/.integration/${changeName}/T-01`,
      result_sha: "source-sha",
      method: "fast-forward",
      verification: "passed",
      full_suite: { required: true, status: "passed", reason: null, evidence: "full-suite-report" },
      e2e: { required: false, status: "not-required", reason: "Ticket exempts E2E", evidence: null },
      attempts: 1,
      promotion_status: "applied",
    },
  });
}

function currentTicketWorktree(status: "active" | "integrated" = "active"): Record<string, any> {
  return ticketWorktree({
    status,
    branch: "main",
    workspace_ref: "current",
    source_checkpoint: status === "integrated" ? "implementation-sha" : null,
    integration: status === "integrated" ? {
      status: "passed",
      parent_ref: "main",
      parent_before_sha: "base-sha",
      source_sha: "implementation-sha",
      candidate_sha: null,
      candidate_tree_sha: null,
      candidate_branch: null,
      candidate_workspace_ref: null,
      result_sha: "implementation-sha",
      method: "direct-parent",
      verification: "passed",
      full_suite: { required: true, status: "passed", reason: null, evidence: "full-suite-report" },
      e2e: { required: false, status: "not-required", reason: "Ticket exempts E2E", evidence: null },
      attempts: 1,
      promotion_status: "applied",
    } : ticketWorktree().integration,
  });
}

describe("SpecDev local-first contracts", () => {
  it("keeps INDEX passive and loads the root contract only after work activation", async () => {
    const workflowRoot = join(packageRoot, "template/workflows/specdev");
    const index = await readFile(join(workflowRoot, "INDEX.md"), "utf8");
    const activation = await readFile(join(workflowRoot, "README.md"), "utf8");
    const activationRef = "<Path>{roots.workflows}/specdev/README.md</Path>";

    for (const marker of [
      "## 永久知识",
      "{roots.state}/specdev/adr/",
      "{roots.state}/specdev/context/",
      "{roots.state}/specdev/research/",
      "## Work 激活",
      activationRef,
    ]) {
      assert.match(index, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    }
    assert.doesNotMatch(index, /## (Work 条目|运行时根|持久化约定|启动协议|状态字段|路径分配|副作用边界)|AUTO-INDEX-(?:START|END)/);
    assert.doesNotMatch(index, /specdev\/(?:config|status)\.json|specdev\/changes\/\{change\}/);

    for (const section of ["Work 条目", "运行时根", "持久化约定", "启动协议", "状态字段", "路径分配", "副作用边界"]) {
      assert.match(activation, new RegExp(`## ${section}`));
    }
    assert.equal((activation.match(/AUTO-INDEX-START/g) ?? []).length, 1);
    assert.equal((activation.match(/AUTO-INDEX-END/g) ?? []).length, 1);
    assert.match(activation, /A-archive-and-consolidate[\s\S]*W-wayfinder/);
    assert.match(activation, /全局 schema v5/);
    assert.match(activation, /schema_version.*固定为 `5`/);

    const workDirs = (await readdir(workflowRoot, { withFileTypes: true }))
      .filter((entry) => entry.isDirectory() && /^[A-Z]-/.test(entry.name));
    assert.equal(workDirs.length, 15);
    for (const workDir of workDirs) {
      const entry = await readFile(join(workflowRoot, workDir.name, `${workDir.name}.md`), "utf8");
      assert.match(entry, new RegExp(activationRef.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    }
  });

  it("defines one Lead, bounded implementation agents, and mandatory Ticket integration", async () => {
    const goalPlan = await readFile(
      join(packageRoot, "template/workflows/specdev/P-goal-plan/goal-plan-template.md"),
      "utf8",
    );
    for (const marker of [
      "orchestration: lead-directed",
      "implementation_agent_limit: 3",
      "ticket_workspace_policy: current",
      "integration_gate: direct-parent",
      "Implementation subagents",
      "Read-only agents",
      "Local direct-parent verification and parent update",
      "source worktree 不运行 E2E",
      "Local candidate integration and parent update",
    ]) {
      assert.match(goalPlan, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    }
    assert.doesNotMatch(goalPlan, /coordination_mode|workspace_strategy|Delegated Execution Addendum/);
    for (const obsolete of [
      "delegated-execution.md",
      "delegated-execution-template.md",
      "workspace-execution-template.md",
    ]) {
      await assert.rejects(readFile(join(packageRoot, "template/workflows/specdev/P-goal-plan", obsolete), "utf8"));
    }

    const config = JSON.parse(
      await readFile(
        join(packageRoot, "template/workflows/specdev/I-init-setup/config-template.json"),
        "utf8",
      ),
    );
    const pathOwnership = await readFile(
      join(packageRoot, "template/workflows/specdev/common/rules/path-ownership.md"),
      "utf8",
    );
    const evidence = await readFile(
      join(packageRoot, "template/workflows/specdev/common/rules/evidence-and-verification.md"),
      "utf8",
    );

    assert.equal(config.schema_version, 5);
    assert.equal(config.execution.max_implementation_agents, 3);
    assert.equal(config.execution.max_integration_attempts, 3);
    assert.equal(config.planning.ui_design_default_candidates, 3);
    assert.equal(config.planning.ui_design_max_candidates, 4);
    assert.equal(config.execution.shared_path_owner, "explicit");
    assert.equal("max_parallel" in config.execution, false);
    assert.equal("auto_commit" in config.git, false);
    assert.match(pathOwnership, /implementation subagent 上限取 Goal Plan、config 和平台能力共同约束/);
    assert.match(pathOwnership, /review\/research\/test-observation agent 不设置 SpecDev 数字上限/);
    assert.match(evidence, /source-worktree/);
  });

  it("requires every Ticket to be covered by valid project Skill routing", async () => {
    const root = await fixture();
    const repo = await mkdtemp(join(tmpdir(), "specdev-project-skills-"));
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

      const noSkillRow = "| ALL | 无（已扫描项目 Skill 入口，未发现适用项） | `<Path>.agents/skills/**/SKILL.md</Path>` 与项目 Agent 指令声明的 Skill 根 | Map 后、Ticket 前 | 明确当前 change 没有额外项目 Skill 读取要求 |";
      const skillRow = `| ALL | \`<Path>${skillRelative}</Path>\` | all project code | Map 后、Ticket 前 | apply project engineering standards |`;
      const originalMap = await readFile(mapPath, "utf8");
      const validMap = originalMap.replace(noSkillRow, skillRow);
      assert.notEqual(validMap, originalMap);
      await writeFile(mapPath, validMap);

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
      assert.match(result.stdout + result.stderr, /does not cover T-01/);

      const legacyMap = validMap.replace(/### 总体实施背景[\s\S]*?(?=## 2\. 执行清单)/, "");
      await writeFile(mapPath, legacyMap);
      result = runValidator(root, "tickets", repo);
      assert.equal(result.status, 1);
      assert.match(result.stdout + result.stderr, /missing '### 总体实施背景'/);
      assert.match(result.stdout + result.stderr, /missing '### 项目 Skill 读取矩阵'/);
    } finally {
      await rm(dirname(root), { recursive: true, force: true });
      await rm(repo, { recursive: true, force: true });
    }
  });

  it("validates a resumable parent implementation and its composite Ticket DAG", async () => {
    const root = await fixture();
    const changesRoot = dirname(root);
    const members = ["2026-08-05-api", "2026-08-06-profile"];
    try {
      await writeNamedStatus(root, changeName, "active", "specdev/orchestrate-implementation");
      await writeReadyChild(join(changesRoot, members[0]), members[0], "src/api/**");
      await writeReadyChild(join(changesRoot, members[1]), members[1], "src/profile/**");
      await writeImplementationArtifacts(root, members, {
        dependencies: [`${members[1]}::T-01 <- ${members[0]}::T-01`],
      });

      let result = runValidator(root, "orchestrate-implementation");
      assert.equal(result.status, 0, result.stdout + result.stderr);

      await writeImplementationArtifacts(root, members, {
        dependencies: [
          `${members[1]}::T-01 <- ${members[0]}::T-01`,
          `${members[0]}::T-01 <- ${members[1]}::T-01`,
        ],
      });
      result = runValidator(root, "orchestrate-implementation");
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
      await writeNamedStatus(root, changeName, "active", "specdev/orchestrate-implementation");
      await writeReadyChild(join(changesRoot, members[0]), members[0], "src/shared.ts");
      await writeReadyChild(join(changesRoot, members[1]), members[1], "src/shared.ts");
      await writeImplementationArtifacts(root, members);
      let result = runValidator(root, "orchestrate-implementation");
      assert.equal(result.status, 1);
      assert.match(result.stdout + result.stderr, /composite tasks .* have writable overlap without dependency or serialization/);

      await writeImplementationArtifacts(root, members, {
        serializations: [`${members[0]}::T-01 <> ${members[1]}::T-01`],
      });
      result = runValidator(root, "orchestrate-implementation");
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
      await writeNamedStatus(root, changeName, "active", "specdev/orchestrate-implementation");
      await writeReadyChild(join(changesRoot, members[0]), members[0], "src/api/**");
      await writeImplementationArtifacts(root, members);
      let result = runValidator(root, "orchestrate-implementation");
      assert.equal(result.status, 1);
      assert.match(result.stdout + result.stderr, /member change does not exist/);

      await writeReadyChild(join(changesRoot, members[1]), members[1], "src/profile/**");
      await writeFile(
        join(changesRoot, members[1], "spec.md"),
        (await readFile(join(changesRoot, members[1], "spec.md"), "utf8")).replace("status: ready", "status: draft"),
      );
      result = runValidator(root, "orchestrate-implementation");
      assert.equal(result.status, 1);
      assert.match(result.stdout + result.stderr, /Spec must have status=ready/);

      await writeReadyChild(join(changesRoot, members[1]), members[1], "src/profile/**");
      await writeImplementationArtifacts(root, members, { sourceMapRevision: 2 });
      result = runValidator(root, "orchestrate-implementation");
      assert.equal(result.status, 1);
      assert.match(result.stdout + result.stderr, /source_map_revision must equal Implementation Map revision/);

      await writeImplementationArtifacts(root, members);
      const competingParent = join(changesRoot, "2026-08-08-competing-parent");
      await writeNamedStatus(competingParent, basename(competingParent), "active", "specdev/orchestrate-implementation");
      await writeImplementationArtifacts(competingParent, members);
      result = runValidator(root, "orchestrate-implementation");
      assert.equal(result.status, 1);
      assert.match(result.stdout + result.stderr, /already belong to unfinished parent implementation/);
    } finally {
      await rm(changesRoot, { recursive: true, force: true });
    }
  });

  it("closes a parent implementation only after child Evidence and aggregate Evidence complete", async () => {
    const root = await fixture();
    const changesRoot = dirname(root);
    const members = ["2026-08-05-api", "2026-08-06-profile"];
    try {
      await writeNamedStatus(root, changeName, "completed");
      await writeReadyChild(join(changesRoot, members[0]), members[0], "src/api/**", { changeStatus: "completed", ticketStatus: "done" });
      await writeReadyChild(join(changesRoot, members[1]), members[1], "src/profile/**", { changeStatus: "active", ticketStatus: "done" });
      await writeImplementationArtifacts(root, members, { status: "completed" });
      let result = runValidator(root, "orchestrate-implementation");
      assert.equal(result.status, 1);
      assert.match(result.stdout + result.stderr, /members remain incomplete/);
      assert.match(result.stdout + result.stderr, /requires evidence\/implementation-orchestration\.md/);

      await writeReadyChild(join(changesRoot, members[1]), members[1], "src/profile/**", { changeStatus: "completed", ticketStatus: "done" });
      await mkdir(join(root, "evidence"));
      await writeFile(join(root, "evidence", "implementation-orchestration.md"), [
        "# Implementation Orchestration Evidence",
        "## 1. Parent Plan and Final Revision",
        "revision 1",
        "## 2. Member and Ticket Completion",
        "all completed",
        "## 3. Dependency and Serialization Audit",
        "audited",
        "## 4. Repository Integration Audit",
        "integrated",
        "## 5. Aggregate Verification",
        "passed",
        "## 6. Contract, Drift and Deviation Audit",
        "clean",
        "## 7. Residual Risk and Boundary",
        "none",
      ].join("\n"));
      result = runValidator(root, "orchestrate-implementation");
      assert.equal(result.status, 0, result.stdout + result.stderr);
    } finally {
      await rm(changesRoot, { recursive: true, force: true });
    }
  });

  it("keeps Direct Spec executable and separates planning from dispatch inputs", async () => {
    const implement = await readFile(
      join(packageRoot, "template/workflows/specdev/I-implement/I-implement.md"),
      "utf8",
    );
    const delivery = await readFile(
      join(packageRoot, "template/workflows/specdev/common/skills/subagent-delivery/SKILL.md"),
      "utf8",
    );

    for (const marker of [
      "Direct Spec 模式由 Lead 作为 current workspace 唯一写入 owner",
      "Direct Spec 模式同样跳过 source worktree、candidate merge 和父分支推进",
      "evidence/direct-spec.md",
      "common/rules/code-commenting-rule.md",
      "{roots.state}/specdev/adr/",
      "{roots.state}/specdev/context/",
    ]) {
      assert.match(implement, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    }
    assert.match(delivery, /operation=plan[\s\S]*Goal Plan 此时可以尚未写入/);
    assert.match(delivery, /operation=dispatch[\s\S]*provider/);
    assert.match(delivery, /operation=accept[\s\S]*原 Dispatch Packet/);
    assert.doesNotMatch(delivery, /达到修正上限后/);
  });

  it("validates the Lead-directed Goal Plan workspace strategy contract", async () => {
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
      assert.match(result.stdout + result.stderr, /exceeds config max_implementation_agents 4/);

      await writeGoalPlan(root, 4, [], "", "current", 4);
      result = runValidator(root);
      assert.equal(result.status, 1);
      assert.match(result.stdout + result.stderr, /exceeds config max_integration_attempts 3/);

      const attempted = currentTicketWorktree("active");
      attempted.integration = { ...attempted.integration, attempts: 4 };
      await writeStatus(root, "active", [attempted]);
      await writeGoalPlan(root, 4, [], "", "current", 3);
      result = runValidator(root);
      assert.equal(result.status, 1);
      assert.match(result.stdout + result.stderr, /integration attempts 4 exceed Goal Plan limit 3/);
      await writeStatus(root);

      await writeGoalPlan(root, 3, ["coordination_mode: single-session"]);
      result = runValidator(root);
      assert.equal(result.status, 1);
      assert.match(result.stdout + result.stderr, /obsolete Goal Plan field coordination_mode/);

      await writeGoalPlan(root, 3, [], "\n## Delegated Execution Addendum\nlegacy\n");
      result = runValidator(root);
      assert.equal(result.status, 1);
      assert.match(result.stdout + result.stderr, /obsolete Goal Plan addendum/);
    } finally {
      await rm(dirname(root), { recursive: true, force: true });
    }
  });

  it("requires a source commit and a passed parent candidate before integration", async () => {
    const root = await fixture();
    try {
      await writeStatus(root, "active", [ticketWorktree()]);
      let result = runValidator(root);
      assert.equal(result.status, 0, result.stdout + result.stderr);

      await writeStatus(root, "active", [ticketWorktree({ status: "review" })]);
      result = runValidator(root);
      assert.equal(result.status, 1);
      assert.match(result.stdout + result.stderr, /review requires source_checkpoint/);

      const integrating = ticketWorktree({
        status: "integrating",
        source_checkpoint: "source-sha",
        integration: {
          status: "candidate",
          parent_before_sha: "parent-sha",
          source_sha: "source-sha",
          candidate_sha: "source-sha",
          candidate_branch: `speculo/integration/${changeName}/T-01`,
          candidate_workspace_ref: `specdev-worktree/.integration/${changeName}/T-01`,
          method: "fast-forward",
          e2e: { required: true, status: "pending", evidence: null },
          attempts: 1,
        },
      });
      await writeStatus(root, "active", [integrating]);
      result = runValidator(root);
      assert.equal(result.status, 0, result.stdout + result.stderr);

      const fastForward = ticketWorktree({
        status: "integrated",
        source_checkpoint: "source-sha",
        integration: {
          status: "passed",
          parent_before_sha: "parent-sha",
          source_sha: "source-sha",
          candidate_sha: "source-sha",
          candidate_branch: `speculo/integration/${changeName}/T-01`,
          candidate_workspace_ref: `specdev-worktree/.integration/${changeName}/T-01`,
          result_sha: "source-sha",
          method: "fast-forward",
          verification: "passed",
          e2e: { required: false, status: "not-required", reason: "Ticket exempts E2E", evidence: null },
          attempts: 1,
        },
      });
      await writeStatus(root, "active", [fastForward]);
      result = runValidator(root);
      assert.equal(result.status, 0, result.stdout + result.stderr);

      await writeStatus(root, "active", [{
        ...fastForward,
        integration: { ...fastForward.integration, result_sha: "other-sha" },
      }]);
      result = runValidator(root);
      assert.equal(result.status, 1);
      assert.match(result.stdout + result.stderr, /passed candidate\/result\/E2E state/);

      await writeStatus(root, "active", [{
        ...fastForward,
        integration: {
          ...fastForward.integration,
          e2e: { required: true, status: "pending", evidence: null },
        },
      }]);
      result = runValidator(root);
      assert.equal(result.status, 1);
      assert.match(result.stdout + result.stderr, /passed candidate\/result\/E2E state/);

      await writeStatus(root, "active", [{
        ...fastForward,
        terminal_action: "integrate",
      }]);
      result = runValidator(root);
      assert.equal(result.status, 1);
      assert.match(result.stdout + result.stderr, /obsolete terminal_action/);

      const mergeCommit = ticketWorktree({
        status: "integrated",
        source_checkpoint: "source-sha",
        integration: {
          status: "passed",
          parent_before_sha: "parent-sha",
          source_sha: "source-sha",
          candidate_sha: "candidate-sha",
          candidate_branch: `speculo/integration/${changeName}/T-01`,
          candidate_workspace_ref: `specdev-worktree/.integration/${changeName}/T-01`,
          result_sha: "candidate-sha",
          method: "merge-commit",
          verification: "passed",
          e2e: { required: true, status: "passed", evidence: "e2e-report" },
          attempts: 1,
        },
      });
      await writeStatus(root, "active", [mergeCommit]);
      result = runValidator(root);
      assert.equal(result.status, 0, result.stdout + result.stderr);

      await writeStatus(root, "active", [completedTicketWorktree("removed")]);
      result = runValidator(root);
      assert.equal(result.status, 0, result.stdout + result.stderr);

      await writeStatus(root, "active", [ticketWorktree({
        ...completedTicketWorktree("removed"),
        integration: { ...completedTicketWorktree("removed").integration, verification: "failed" },
      })]);
      result = runValidator(root);
      assert.equal(result.status, 1);
      assert.match(result.stdout + result.stderr, /removed worktree T-01 requires passed candidate\/result\/E2E state/);
    } finally {
      await rm(dirname(root), { recursive: true, force: true });
    }
  });

  it("requires one source worktree record for every executable Ticket", async () => {
    const root = await fixture();
    try {
      await writeStatus(root);
      const spec = (await readFile(
        join(packageRoot, "template/workflows/specdev/S-spec/spec-template.md"),
        "utf8",
      ))
        .replace("change: <YYYY-MM-DD-topic>", `change: ${changeName}`)
        .replace("status: draft", "status: ready")
        .replace("ready_for_tickets: false", "ready_for_tickets: true")
        .replace("存在高影响未决问题时，`ready_for_tickets` 必须为 `false`。", "");
      await writeFile(join(root, "spec.md"), spec);

      const map = (await readFile(
        join(packageRoot, "template/workflows/specdev/T-tickets/tickets-map-template.md"),
        "utf8",
      ))
        .replace("change: <YYYY-MM-DD-topic>", `change: ${changeName}`)
        .replace("status: draft", "status: ready");
      await writeFile(join(root, "tickets-map.md"), map);

      await mkdir(join(root, "ticket"));
      const ticket = (await readFile(
        join(packageRoot, "template/workflows/specdev/T-tickets/ticket-template.md"),
        "utf8",
      ))
        .replace("change: <YYYY-MM-DD-topic>", `change: ${changeName}`)
        .replace("status: draft", "status: ready")
        .replace("ready: false", "ready: true")
        .replace("存在会改变行为、接口、数据、兼容、安全、范围、迁移或验收的问题时，frontmatter 中 `ready` 必须为 `false`。", "");
      await writeFile(join(root, "ticket", "01-ticket.md"), ticket);
      await writeGoalPlan(root);

      let result = runValidator(root, "implement");
      assert.equal(result.status, 1);
      assert.match(result.stdout + result.stderr, /Implement stage requires one Ticket workspace execution record/);

      await writeGoalPlan(root, 3, [], "", "required");
      await writeStatus(root, "active", [ticketWorktree()]);
      result = runValidator(root, "implement");
      assert.equal(result.status, 0, result.stdout + result.stderr);

      await writeFile(join(root, "ticket", "01-ticket.md"), ticket.replace("status: ready", "status: done"));
      await mkdir(join(root, "evidence"));
      await writeFile(
        join(root, "evidence", "T-01.md"),
        await readFile(join(packageRoot, "template/workflows/specdev/I-implement/evidence-template.md"), "utf8"),
      );
      await writeStatus(root, "active", [completedTicketWorktree("removed")]);
      result = runValidator(root, "implement");
      assert.equal(result.status, 0, result.stdout + result.stderr);
    } finally {
      await rm(dirname(root), { recursive: true, force: true });
    }
  });

  it("supports current workspace direct-parent completion and rejects concurrent Tickets", async () => {
    const root = await fixture();
    try {
      await writeStatus(root, "active", [currentTicketWorktree("integrated")]);
      await writeGoalPlan(root);
      let result = runValidator(root);
      assert.equal(result.status, 0, result.stdout + result.stderr);

      await writeStatus(root, "active", [currentTicketWorktree("active"), { ...currentTicketWorktree("active"), ticket_id: "T-02" }]);
      result = runValidator(root);
      assert.equal(result.status, 1);
      assert.match(result.stdout + result.stderr, /strictly serial Ticket execution/);
    } finally {
      await rm(dirname(root), { recursive: true, force: true });
    }
  });

  it("verifies recorded completion SHAs against an actual Git repository", async () => {
    const root = await fixture();
    const repo = await mkdtemp(join(tmpdir(), "specdev-git-evidence-"));
    try {
      assert.equal(spawnSync("git", ["init", "-b", "main"], { cwd: repo }).status, 0);
      await writeFile(join(repo, "tracked.txt"), "base\n");
      assert.equal(spawnSync("git", ["-c", "user.name=Speculo Test", "-c", "user.email=speculo@example.invalid", "add", "."], { cwd: repo }).status, 0);
      assert.equal(spawnSync("git", ["-c", "user.name=Speculo Test", "-c", "user.email=speculo@example.invalid", "commit", "-m", "base"], { cwd: repo }).status, 0);
      const baseSha = spawnSync("git", ["rev-parse", "HEAD"], { cwd: repo, encoding: "utf8" }).stdout.trim();
      await writeFile(join(repo, "tracked.txt"), "implemented\n");
      assert.equal(spawnSync("git", ["add", "."], { cwd: repo }).status, 0);
      assert.equal(spawnSync("git", ["-c", "user.name=Speculo Test", "-c", "user.email=speculo@example.invalid", "commit", "-m", "implementation"], { cwd: repo }).status, 0);
      const resultSha = spawnSync("git", ["rev-parse", "HEAD"], { cwd: repo, encoding: "utf8" }).stdout.trim();
      const completed = currentTicketWorktree("integrated");
      completed.base_sha = baseSha;
      completed.source_checkpoint = resultSha;
      completed.integration = { ...completed.integration, parent_before_sha: baseSha, source_sha: resultSha, result_sha: resultSha };
      await writeStatus(root, "active", [completed]);
      await writeGoalPlan(root);

      let result = runValidator(root, undefined, repo);
      assert.equal(result.status, 0, result.stdout + result.stderr);

      completed.base_sha = "f".repeat(40);
      await writeStatus(root, "active", [completed]);
      result = runValidator(root, undefined, repo);
      assert.equal(result.status, 1);
      assert.match(result.stdout + result.stderr, /base_sha is not a resolvable Git commit/);
    } finally {
      await rm(dirname(root), { recursive: true, force: true });
      await rm(repo, { recursive: true, force: true });
    }
  });

  it("keeps automatic worktree integration local and recoverable", async () => {
    const finalize = await readFile(
      join(packageRoot, "template/workflows/specdev/common/skills/dev-worktree/references/finalize.md"),
      "utf8",
    );
    const conflict = await readFile(
      join(packageRoot, "template/workflows/specdev/I-implement/merge-conflict-protocol.md"),
      "utf8",
    );
    const worktree = await readFile(
      join(packageRoot, "template/workflows/specdev/common/skills/dev-worktree/SKILL.md"),
      "utf8",
    );

    for (const marker of ["git merge --ff-only", "git merge --no-ff --no-commit", "git merge --abort", "integration_attempt_limit", "specdev-worktree/.integration/<ticket-id>"]) {
      assert.match(finalize, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    }
    assert.match(conflict, /需要新行为或上层决定时停止/);
    assert.match(worktree, /Ticket 切片本身决定来源 worktree/);
    assert.match(worktree, /Ticket E2E 只在 Lead-owned parent-candidate checkout 运行/);
    assert.match(worktree, /push、PR、remote merge、deploy、migration/);
    assert.match(finalize, /来源 branch\/worktree 不自动清理/);
    assert.match(finalize, /父分支保持 `parent_before_sha`/);
  });

  it("returns repeated Ticket failures to the Lead before redispatch", async () => {
    const [implement, evidence, lead, completion, finalize, executionLoop] = await Promise.all([
      readFile(join(packageRoot, "template/workflows/specdev/I-implement/I-implement.md"), "utf8"),
      readFile(join(packageRoot, "template/workflows/specdev/I-implement/evidence-template.md"), "utf8"),
      readFile(join(packageRoot, "template/workflows/specdev/P-goal-plan/lead-orchestration.md"), "utf8"),
      readFile(join(packageRoot, "template/workflows/specdev/P-goal-plan/completion-control.md"), "utf8"),
      readFile(join(packageRoot, "template/workflows/specdev/common/skills/dev-worktree/references/finalize.md"), "utf8"),
      readFile(join(packageRoot, "template/workflows/specdev/O-orchestrate-implementation/execution-loop.md"), "utf8"),
    ]);

    assert.match(finalize, /已达到上限，不创建或重建 candidate、不增加 attempts/);
    assert.match(implement, /implementation、review、direct-parent 还是 parent-candidate[\s\S]*返回父 O Lead/);
    assert.match(evidence, /Failure History And Lead Recovery[\s\S]*共同失败模式[\s\S]*最可能原因[\s\S]*下一轮具体改变[\s\S]*下一 owner\/路由/);
    assert.match(lead, /上限因此是 Lead 复盘触发点，不是 Ticket 的永久失败终态/);
    assert.match(lead, /新 Packet 必须引用该 Evidence 并明确相较上一轮改变了什么/);
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
      await rm(dirname(root), { recursive: true, force: true });
    }
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
      await rm(dirname(root), { recursive: true, force: true });
    }
  });

  it("validates indexed SpecDev change-learning diagrams independently from Learning state", async () => {
    const root = await fixture();
    try {
      await writeStatus(root);

      const missing = runValidator(root, "learn-change");
      assert.equal(missing.status, 1);
      assert.match(missing.stdout + missing.stderr, /learn-change stage requires learning\/index\.md/);

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

      const valid = runValidator(root, "learn-change");
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
      const unindexed = runValidator(root, "learn-change");
      assert.equal(unindexed.status, 1);
      assert.match(unindexed.stdout + unindexed.stderr, /missing entry for '02_unindexed\.md'/);
    } finally {
      await rm(dirname(root), { recursive: true, force: true });
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
      await rm(dirname(root), { recursive: true, force: true });
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
      await rm(dirname(root), { recursive: true, force: true });
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
      assert.match(completion.stdout + completion.stderr, /requires at least one ready UI design package/);
    } finally {
      await rm(dirname(root), { recursive: true, force: true });
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
      await rm(dirname(root), { recursive: true, force: true });
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
      assert.match(result.stdout + result.stderr, /requires comparison\/index\.html/);
    } finally {
      await rm(dirname(root), { recursive: true, force: true });
    }
  });

  it("blocks archive validation until the external action is reconciled", async () => {
    const root = await fixture();
    try {
      await writeStatus(root, "completed");
      await writeSourceAndTriage(root, "pending-close");
      await mkdir(join(root, "evidence"));
      await writeFile(join(root, "evidence", "direct-spec.md"), "# Evidence\n");
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
          "verified behavior",
          "## 5. 范围",
          "scope",
          "## 9. 验证策略",
          "verify",
        ].join("\n"),
      );
      const blocked = runValidator(root, "complete");
      assert.equal(blocked.status, 1);
      assert.match(blocked.stdout + blocked.stderr, /cannot archive external_action=pending-close/);

      await writeSourceAndTriage(root, "closed");
      const closed = runValidator(root, "complete");
      assert.equal(closed.status, 0, closed.stdout + closed.stderr);
    } finally {
      await rm(dirname(root), { recursive: true, force: true });
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
if (args[0] === "issue" && args[1] === "view") {
  console.log(JSON.stringify({ number: 1, title: "Issue", body: "Body", state: state.state, url: "https://github.com/owner/repo/issues/1", author: { login: "user" }, labels: [], createdAt: "2026-08-07", updatedAt: "2026-08-07", comments: state.comments }));
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
      const transport = join(packageRoot, "template/skills/github-npm-ops/scripts/issue-transport.mjs");
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
      await rm(dirname(root), { recursive: true, force: true });
    }
  });
});
