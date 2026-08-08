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
  return root;
}

async function writeStatus(root: string, status = "active"): Promise<void> {
  await mkdir(root, { recursive: true });
  await writeFile(
    join(root, ".status.json"),
    JSON.stringify(
      {
        schema_version: 3,
        artifact: "change-status",
        change: changeName,
        change_status: status,
        current_work: null,
        created_at: "2026-08-07T00:00:00Z",
        updated_at: "2026-08-07T00:00:00Z",
        completed_at: status === "completed" ? "2026-08-07T01:00:00Z" : null,
        archived: false,
        archive_path: null,
        blockers: [],
        deviations: [],
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

function runValidator(root: string, stage: string) {
  return spawnSync(process.execPath, [validator, "--stage", stage, root], {
    encoding: "utf8",
  });
}

describe("SpecDev local-first contracts", () => {
  it("keeps ordinary Goal Plans free of delegated role machinery", async () => {
    const ordinary = await readFile(
      join(packageRoot, "template/workflows/specdev/P-goal-plan/goal-plan-template.md"),
      "utf8",
    );
    const delegated = await readFile(
      join(packageRoot, "template/workflows/specdev/P-goal-plan/delegated-execution-template.md"),
      "utf8",
    );

    for (const marker of [
      "Lead",
      "Provider",
      "Delivery Contract",
      "Dispatch Packet",
      "Worker",
      "execution_model",
    ]) {
      assert.doesNotMatch(ordinary, new RegExp(marker));
    }
    for (const marker of [
      "## Delegated Execution Addendum",
      "### Delivery Contract",
      "### Per-Ticket Dispatch Packets",
      "### Candidate Delivery Return and Lead Integration",
    ]) {
      assert.match(delegated, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
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

    assert.equal(config.execution.shared_path_owner, "explicit");
    assert.doesNotMatch(pathOwnership, /shared path 只能由 Lead|生命周期由 Lead/);
    assert.doesNotMatch(evidence, /并且只由 Lead/);
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
