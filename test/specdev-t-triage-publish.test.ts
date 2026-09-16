import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";

const packageRoot = process.cwd();
const changeName = "2026-09-16-publish-projection";
const validator = join(
  packageRoot,
  "template/workflows/specdev/common/tools/validate-specdev.mjs",
);
const statusTool = join(
  packageRoot,
  "template/workflows/specdev/T-triage/tools/publish-status.mjs",
);

async function fixture(): Promise<string> {
  const parent = await mkdtemp(join(tmpdir(), "specdev-t-triage-publish-"));
  const root = join(parent, changeName);
  await mkdir(root);
  await writeFile(
    join(root, ".status.json"),
    JSON.stringify({
      schema_version: 6,
      artifact: "change-status",
      change: changeName,
      change_status: "completed",
      current_work: null,
      works_run: ["specdev/tickets", "specdev/implement"],
      claimed_investigations: [],
      execution_authorization: {
        implementation_commit: { status: "not-authorized", source: null, granted_at: null, scope: "Ticket source commits" },
        local_candidate_integration: { status: "not-authorized", source: null, granted_at: null, scope: "Lead-owned local parent candidate integration and parent update" },
        source_cleanup: { status: "not-authorized", source: null, granted_at: null, scope: "Source worktree and branch cleanup" },
      },
      leadership: { current: "lead-session", epoch: 1, assigned_at: "2026-09-16T00:00:00Z", history: [] },
      created_at: "2026-09-16T00:00:00Z",
      updated_at: "2026-09-16T00:00:00Z",
      completed_at: "2026-09-16T01:00:00Z",
      archived: false,
      archive_path: null,
      blockers: [],
      deviations: [],
      worktrees: [],
    }, null, 2) + "\n",
  );
  return root;
}

function runValidator(root: string, stage: string | null = "triage") {
  const args = [validator];
  if (stage) args.push("--stage", stage);
  args.push(root);
  return spawnSync(process.execPath, args, { encoding: "utf8" });
}

async function writeSource(root: string, sourceType = "conversation"): Promise<void> {
  await writeFile(
    join(root, "source.md"),
    [
      "---",
      "schema_version: 1",
      "artifact: source",
      `change: ${changeName}`,
      `source_type: ${sourceType}`,
      "canonical_locator: null",
      "captured_at: 2026-09-16T00:00:00Z",
      `content_sha256: ${"b".repeat(64)}`,
      "remote_state: not-applicable",
      "close_capability: not-applicable",
      "---",
      "",
      "# Source",
      "",
      "## Capture Metadata",
      "local",
      "## Original Content",
      "body",
      "## Source Comments",
      "无",
      "",
    ].join("\n"),
  );
}

async function writeTriage(
  root: string,
  extras: { mode?: string; classification?: string; publishAction?: string; externalAction?: string } = {},
): Promise<void> {
  const publishAction = extras.publishAction ?? "not-requested";
  const lines = [
    "---",
    "schema_version: 1",
    "artifact: triage",
    `change: ${changeName}`,
    `mode: ${extras.mode ?? "publish"}`,
    "source: <Path>{roots.state}/specdev/changes/{change}/source.md</Path>",
    `classification: ${extras.classification ?? "bug"}`,
    "risk: medium",
    "route: specdev/triage",
    "ready_for_implementation: false",
    `external_action: ${extras.externalAction ?? "not-applicable"}`,
    `publish_action: ${publishAction}`,
    "updated_at: 2026-09-16T00:00:00Z",
    "---",
    "",
    "# Triage",
    "",
    "## 当前判定",
    "observed",
    "## 未知项",
    "none",
    "## 路由",
    "publish",
    "## 外部动作",
    "none",
  ];
  if (publishAction !== "not-requested") {
    lines.push(
      "",
      "## 发布投影",
      "ledger",
    );
  }
  await writeFile(join(root, "triage.md"), lines.join("\n") + "\n");
}

async function writePublish(
  root: string,
  rows: Array<{
    ticket: string;
    kind: string;
    labels: string;
    number: string;
    url: string;
    marker?: string;
    sha256?: string;
    state: string;
  }>,
  extras: { action?: string; origin?: string } = {},
): Promise<void> {
  const action = extras.action ?? "published";
  const origin = extras.origin ?? "local";
  const table = [
    "| ticket | kind | labels | number | url | marker | sha256 | state |",
    "|---|---|---|---|---|---|---|---|",
    ...rows.map((row) =>
      `| ${row.ticket} | ${row.kind} | ${row.labels} | ${row.number} | ${row.url} | ${row.marker ?? `specdev:${changeName}:${row.ticket}:published`} | ${row.sha256 ?? "a".repeat(64)} | ${row.state} |`,
    ),
  ];
  await writeFile(
    join(root, "publish.md"),
    [
      "---",
      "schema_version: 1",
      "artifact: publish",
      `change: ${changeName}`,
      "mode: publish",
      "repo: NAMEWTA/Speculo",
      `publish_action: ${action}`,
      "include_cancelled: false",
      "parent_issue: null",
      `origin: ${origin}`,
      "published_at: 2026-09-16T02:00:00Z",
      "updated_at: 2026-09-16T02:00:00Z",
      "---",
      "",
      "# Publish",
      "",
      "## 发布计划",
      "confirmed",
      "## 账本",
      "",
      ...table,
      "",
      "## 计数",
      "counts",
      "## 重试",
      "无",
      "",
    ].join("\n"),
  );
}

describe("SpecDev T-triage publish projection", () => {
  it("keeps intake fixtures valid without publish_action", async () => {
    const root = await fixture();
    try {
      await writeSource(root);
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
          "external_action: not-applicable",
          "updated_at: 2026-09-16T00:00:00Z",
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
          "none",
          "",
        ].join("\n"),
      );
      const result = runValidator(root, "triage");
      assert.equal(result.status, 0, result.stdout + result.stderr);
    } finally {
      await rm(dirname(root), { recursive: true, force: true });
    }
  });

  it("accepts mode=publish with a closed local-origin ledger", async () => {
    const root = await fixture();
    try {
      await writeSource(root);
      await writeTriage(root, { publishAction: "published" });
      await writePublish(root, [{
        ticket: "T-01",
        kind: "bug",
        labels: "bug, specdev:published, origin:local",
        number: "70",
        url: "https://github.com/NAMEWTA/Speculo/issues/70",
        state: "closed",
      }]);
      const result = runValidator(root, "triage");
      assert.equal(result.status, 0, result.stdout + result.stderr);
    } finally {
      await rm(dirname(root), { recursive: true, force: true });
    }
  });

  it("requires publish.md when publish_action is pending", async () => {
    const root = await fixture();
    try {
      await writeSource(root);
      await writeTriage(root, { publishAction: "pending" });
      const result = runValidator(root, "triage");
      assert.equal(result.status, 1);
      assert.match(result.stdout + result.stderr, /missing publish\.md ledger/);
    } finally {
      await rm(dirname(root), { recursive: true, force: true });
    }
  });

  it("rejects mixed classification without per-ticket kind", async () => {
    const root = await fixture();
    try {
      await writeSource(root);
      await writeTriage(root, { classification: "mixed", publishAction: "published" });
      await writePublish(root, [{
        ticket: "T-01",
        kind: "—",
        labels: "specdev:published, origin:local",
        number: "70",
        url: "https://github.com/NAMEWTA/Speculo/issues/70",
        state: "closed",
      }]);
      const result = runValidator(root, "triage");
      assert.equal(result.status, 1);
      assert.match(result.stdout + result.stderr, /invalid kind/);
    } finally {
      await rm(dirname(root), { recursive: true, force: true });
    }
  });

  it("rejects needs-triage labels on published issues", async () => {
    const root = await fixture();
    try {
      await writeSource(root);
      await writeTriage(root, { publishAction: "published" });
      await writePublish(root, [{
        ticket: "T-01",
        kind: "bug",
        labels: "bug, specdev:published, origin:local, needs-triage",
        number: "70",
        url: "https://github.com/NAMEWTA/Speculo/issues/70",
        state: "closed",
      }]);
      const result = runValidator(root, "triage");
      assert.equal(result.status, 1);
      assert.match(result.stdout + result.stderr, /forbidden label needs-triage/);
    } finally {
      await rm(dirname(root), { recursive: true, force: true });
    }
  });

  it("blocks complete while publish_action is pending or failed", async () => {
    const root = await fixture();
    try {
      await writeSource(root);
      await writeTriage(root, { publishAction: "pending" });
      await writePublish(root, [{
        ticket: "T-01",
        kind: "bug",
        labels: "bug, specdev:published, origin:local",
        number: "—",
        url: "—",
        state: "planned",
      }], { action: "pending" });
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
      assert.match(blocked.stdout + blocked.stderr, /cannot archive publish_action=pending/);

      await writeTriage(root, { publishAction: "not-requested" });
      await rm(join(root, "publish.md"));
      const allowed = runValidator(root, "complete");
      assert.equal(allowed.status, 0, allowed.stdout + allowed.stderr);
    } finally {
      await rm(dirname(root), { recursive: true, force: true });
    }
  });

  it("counts local-origin closed issues and skipped cancelled rows", async () => {
    const root = await fixture();
    try {
      await writeSource(root);
      await writeTriage(root, { publishAction: "published" });
      await writePublish(root, [
        {
          ticket: "T-01",
          kind: "bug",
          labels: "bug, specdev:published, origin:local",
          number: "70",
          url: "https://github.com/NAMEWTA/Speculo/issues/70",
          state: "closed",
        },
        {
          ticket: "T-02",
          kind: "documentation",
          labels: "documentation, specdev:published, origin:local",
          number: "—",
          url: "—",
          state: "skipped:cancelled",
        },
      ]);
      const stateRoot = join(root, "..");
      await mkdir(join(stateRoot, "changes", changeName), { recursive: true });
      await writeFile(
        join(stateRoot, "changes", changeName, "publish.md"),
        await readFile(join(root, "publish.md"), "utf8"),
      );
      const result = spawnSync(process.execPath, [statusTool, "--state-root", stateRoot, "--json"], {
        encoding: "utf8",
      });
      assert.equal(result.status, 0, result.stdout + result.stderr);
      const summary = JSON.parse(result.stdout);
      assert.equal(summary.published_issues, 1);
      assert.equal(summary.origin.local, 1);
      assert.equal(summary.publish_skipped, 1);
      assert.equal(summary.publish_failed, 0);
    } finally {
      await rm(dirname(root), { recursive: true, force: true });
    }
  });

  it("keeps protocol contracts in T-triage assets", async () => {
    const [entry, protocol, map, projection, archive] = await Promise.all([
      readFile(join(packageRoot, "template/workflows/specdev/T-triage/T-triage.md"), "utf8"),
      readFile(join(packageRoot, "template/workflows/specdev/T-triage/publish-protocol.md"), "utf8"),
      readFile(join(packageRoot, "template/workflows/specdev/T-triage/references/classification-map.md"), "utf8"),
      readFile(join(packageRoot, "template/workflows/specdev/T-triage/references/public-projection.md"), "utf8"),
      readFile(join(packageRoot, "template/workflows/specdev/A-archive-and-consolidate/A-archive-and-consolidate.md"), "utf8"),
    ]);
    assert.match(entry, /mode=publish|\*\*publish\*\*/);
    assert.match(entry, /specdev:published/);
    assert.match(protocol, /include-cancelled/);
    assert.match(protocol, /skipped:cancelled/);
    assert.match(protocol, /issue-create/);
    assert.match(map, /needs-triage/);
    assert.match(projection, /This was generated by AI during SpecDev T-triage publish/);
    assert.match(archive, /publish_action/);
  });
});
