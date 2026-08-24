import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmod, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";

const packageRoot = process.cwd();
const changeName = "2026-08-07-local-first";
const validator = join(
  packageRoot,
  "template/workflows/specdev/common/tools/validate-specdev.mjs",
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
      ui_prototype_default_variants: 3,
      ui_prototype_max_variants: 5,
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
    assert.equal(config.planning.ui_prototype_default_variants, 3);
    assert.equal(config.planning.ui_prototype_max_variants, 5);
    assert.equal(config.execution.shared_path_owner, "explicit");
    assert.equal("max_parallel" in config.execution, false);
    assert.equal("auto_commit" in config.git, false);
    assert.match(pathOwnership, /implementation subagent 上限取 Goal Plan、config 和平台能力共同约束/);
    assert.match(pathOwnership, /review\/research\/test-observation agent 不设置 SpecDev 数字上限/);
    assert.match(evidence, /source-worktree/);
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

  it("requires a complete visual HTML artifact for the eli5 stage", async () => {
    const root = await fixture();
    try {
      await writeStatus(root);

      const missing = runValidator(root, "eli5");
      assert.equal(missing.status, 1);
      assert.match(missing.stdout + missing.stderr, /eli5 stage requires eli5\.html/);

      await writeFile(
        join(root, "eli5.html"),
        "<!doctype html><html><head><title>雨</title></head><body><svg role=\"img\"></svg></body></html>\n",
      );
      const valid = runValidator(root, "eli5");
      assert.equal(valid.status, 0, valid.stdout + valid.stderr);
    } finally {
      await rm(dirname(root), { recursive: true, force: true });
    }
  });

  it("rejects mutable review inputs and machine-specific prototype locators", async () => {
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
      assert.match(prototype.stdout + prototype.stderr, /workspace_ref must be a portable locator/);
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
