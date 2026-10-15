import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";

import {changeFixture as seedChange, fixtureProject} from "./workspace-fixture.js";
const packageRoot = process.cwd();
const changeName = "2026-09-16-publish-projection";
const validator = join(
  packageRoot,
  "template/workflows/specdev/common/tools/validate-specdev.mjs",
);
const statusTool = join(
  packageRoot,
  "template/workflows/specdev/specdev-t-triage/scripts/publish-status.mjs",
);

async function fixture(): Promise<string> {
  const parent = await mkdtemp(join(tmpdir(), "specdev-t-triage-publish-"));
  const root = await seedChange(parent,changeName);
  await writeFile(join(root, "README.md"), `# Fixture\nOutcome: active\n\n## Ownership\nOwner: lead-session\nEvidence: owner.md\n`);
  await writeFile(join(root, "owner.md"), "Owner: lead-session\nSource: synthetic test fixture\n");
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
    "schema_version: 2",
    "artifact: triage",
    "disposition: needs-triage",
    "verification: pending",
    "remote_actions: []",
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
          "schema_version: 2",
          "artifact: triage",
          "disposition: needs-triage",
          "verification: pending",
          "remote_actions: []",
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
      await rm(fixtureProject(root), { recursive: true, force: true });
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
      await rm(fixtureProject(root), { recursive: true, force: true });
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
      await rm(fixtureProject(root), { recursive: true, force: true });
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
      await rm(fixtureProject(root), { recursive: true, force: true });
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
      await rm(fixtureProject(root), { recursive: true, force: true });
    }
  });

  it("separates local completion from pending publication archive gates", async () => {
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
      await writeFile(join(root, "README.md"), `# Verified local task
Outcome: completed

<a id="scope"></a>
## Scope
One completed local investigation; publication is a separate requested action.
<a id="acceptance"></a>
## Acceptance
- [x] AC-1 records the local finding.
<a id="verification"></a>
## Verification
| AC | Result | Evidence |
| --- | --- | --- |
| AC-1 | passed | #local-observation |
<a id="local-observation"></a>
## Local observation
Method: isolated investigation fixture
Source: local-source
Observed: expected finding was reproduced
Result: passed

## Next Steps
Resolve the separately requested publication before archival.

## Ownership
Owner: lead-session
Work: specdev/triage
Evidence: owner.md
`);
      await writeFile(join(root,'owner.md'),'Owner: lead-session\nWork: specdev/triage\nSource: synthetic triage-only request\n');
      const completed = runValidator(root, "complete");
      assert.equal(completed.status, 0, completed.stdout + completed.stderr);
      const blocked = runValidator(root, "archive-ready");
      assert.equal(blocked.status, 1);
      assert.match(blocked.stdout + blocked.stderr, /publish delivery is not closed|cannot archive publish_action=pending/);

      await writeTriage(root, { publishAction: "not-requested" });
      await rm(join(root, "publish.md"));
      const allowed = runValidator(root, "archive-ready");
      assert.equal(allowed.status, 0, allowed.stdout + allowed.stderr);
    } finally {
      await rm(fixtureProject(root), { recursive: true, force: true });
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
      const stateRoot = join(root, "../..");
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
      await rm(fixtureProject(root), { recursive: true, force: true });
    }
  });

  it("keeps protocol contracts in T-triage assets", async () => {
    const [entry, protocol, map, projection, archive] = await Promise.all([
      readFile(join(packageRoot, "template/workflows/specdev/specdev-t-triage/SKILL.md"), "utf8"),
      readFile(join(packageRoot, "template/workflows/specdev/specdev-t-triage/references/publish-protocol.md"), "utf8"),
      readFile(join(packageRoot, "template/workflows/specdev/specdev-t-triage/references/classification-map.md"), "utf8"),
      readFile(join(packageRoot, "template/workflows/specdev/specdev-t-triage/references/public-projection.md"), "utf8"),
      readFile(join(packageRoot, "template/workflows/specdev/specdev-a-archive-and-consolidate/SKILL.md"), "utf8"),
    ]);
    assert.match(entry, /\| publish \|/);
    assert.match(map, /specdev:published/);
    assert.match(protocol, /include-cancelled/);
    assert.match(protocol, /skipped:cancelled/);
    assert.match(protocol, /issue-create/);
    assert.match(map, /needs-triage/);
    assert.match(projection, /This was generated by AI during SpecDev T-triage publish/);
    assert.match(archive, /publish_action/);
  });
});
