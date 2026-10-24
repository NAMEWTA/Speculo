import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { pathToFileURL } from "node:url";

import {changeFixture as seedChange, fixtureProject} from "./workspace-fixture.js";
const packageRoot = process.cwd();
const changeName = "2026-09-16-publish-projection";
const validator = join(
  packageRoot,
  "template/workflows/specdev/common/tools/validate-specdev.mjs",
);
const statusTool = join(
  packageRoot,
  "template/workflows/specdev/specdev-d-delivery/scripts/publish-status.mjs",
);

async function fixture(): Promise<string> {
  const parent = await mkdtemp(join(tmpdir(), "specdev-t-triage-publish-"));
  const root = await seedChange(parent,changeName);
  await writeFile(join(root, "README.md"), `# Fixture\nOutcome: active\n\n## Ownership\nOwner: lead-session\nEvidence: owner.md\n`);
  await writeFile(join(root, "owner.md"), "Owner: lead-session\nSource: synthetic test fixture\n");
  return root;
}

function runValidator(root: string, stage: string | null = "delivery") {
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

async function writeDelivery(root: string, extras: { mode?: string; classification?: string; publishAction?: string; externalAction?: string } = {}): Promise<void> {
  const publishing = extras.publishAction && extras.publishAction !== 'not-requested';
  await writeFile(join(root, 'delivery.md'), `---
schema_version: 1
artifact: delivery
change: ${changeName}
external_action: ${extras.externalAction ?? 'not-applicable'}
publish: ${publishing ? 'publish.md' : 'null'}
updated_at: 2026-09-16T00:00:00Z
---
## 来源完成回写
Not requested.
## 发布投影
${publishing ? 'Requested; original ledger owns progress.' : 'Not requested.'}
## 恢复
Preserve original receipts.
`);
}
async function writeTriage(root: string): Promise<void> {
  await writeFile(join(root, 'triage.md'), `---
schema_version: 3
artifact: triage
change: ${changeName}
mode: intake
disposition: needs-triage
verification: pending
remote_actions: []
source: <Path>{roots.state}/specdev/changes/{change}/source.md</Path>
classification: bug
risk: medium
route: specdev/diagnose-bugs
ready_for_implementation: false
updated_at: 2026-09-16T00:00:00Z
---
## 当前判定
Actual observation.
## 未知项
None.
## 路由
Diagnosis.
## 实施简报
Bounded investigation and observed reproduction.
## 打标回执
None.
`);
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
  extras: { action?: string; origin?: string; classification?: string } = {},
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
      "schema_version: 2",
      "artifact: publish",
      `change: ${changeName}`,
      "mode: publish",
      `classification: ${extras.classification ?? "bug"}`,
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

describe("SpecDev Delivery publish projection", () => {
  it("keeps intake fixtures valid without publish_action", async () => {
    const root = await fixture();
    try {
      await writeSource(root);
      await writeTriage(root);
      const result = runValidator(root, 'triage');
      assert.equal(result.status, 0, result.stdout + result.stderr);
    } finally {
      await rm(fixtureProject(root), { recursive: true, force: true });
    }
  });

  it("accepts mode=publish with a closed local-origin ledger", async () => {
    const root = await fixture();
    try {
      await writeDelivery(root, { publishAction: "published" });
      await writePublish(root, [{
        ticket: "T-01",
        kind: "bug",
        labels: "bug, specdev:published, origin:local",
        number: "70",
        url: "https://github.com/NAMEWTA/Speculo/issues/70",
        state: "closed",
      }]);
      assert.ok(!(await import('node:fs')).existsSync(join(root, 'triage.md')));
      assert.ok(!(await import('node:fs')).existsSync(join(root, 'source.md')));
      const result = runValidator(root, "delivery");
      assert.equal(result.status, 0, result.stdout + result.stderr);
    } finally {
      await rm(fixtureProject(root), { recursive: true, force: true });
    }
  });

  it("requires publish.md when publish_action is pending", async () => {
    const root = await fixture();
    try {
      await writeSource(root);
      await writeDelivery(root, { publishAction: "pending" });
      const result = runValidator(root, "delivery");
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
      await writeDelivery(root, { classification: "mixed", publishAction: "published" });
      await writePublish(root, [{
        ticket: "T-01",
        kind: "—",
        labels: "specdev:published, origin:local",
        number: "70",
        url: "https://github.com/NAMEWTA/Speculo/issues/70",
        state: "closed",
      }], { classification: "mixed" });
      const result = runValidator(root, "delivery");
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
      await writeDelivery(root, { publishAction: "published" });
      await writePublish(root, [{
        ticket: "T-01",
        kind: "bug",
        labels: "bug, specdev:published, origin:local, needs-triage",
        number: "70",
        url: "https://github.com/NAMEWTA/Speculo/issues/70",
        state: "closed",
      }]);
      const result = runValidator(root, "delivery");
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
      await writeTriage(root);
      await writeDelivery(root, { publishAction: "pending" });
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

      await writeDelivery(root, { publishAction: "not-requested" });
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
      await writeDelivery(root, { publishAction: "published" });
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

  it("keeps protocol contracts in Delivery assets", async () => {
    const [entry, protocol, map, projection, archive] = await Promise.all([
      readFile(join(packageRoot, "template/workflows/specdev/specdev-d-delivery/SKILL.md"), "utf8"),
      readFile(join(packageRoot, "template/workflows/specdev/specdev-d-delivery/references/publish-protocol.md"), "utf8"),
      readFile(join(packageRoot, "template/workflows/specdev/common/rules/request-classification.md"), "utf8"),
      readFile(join(packageRoot, "template/workflows/specdev/specdev-d-delivery/references/public-projection.md"), "utf8"),
      readFile(join(packageRoot, "template/workflows/specdev/specdev-a-archive-and-consolidate/SKILL.md"), "utf8"),
    ]);
    assert.match(entry, /\| publish \|/);
    assert.match(map, /specdev:published/);
    assert.match(protocol, /include-cancelled/);
    assert.match(protocol, /skipped:cancelled/);
    assert.match(protocol, /issue-create/);
    assert.match(map, /needs-triage/);
    assert.match(projection, /This was generated by AI during SpecDev Delivery publish/);
    assert.match(archive, /publish_action/);
  });
});

it('requires verified and nonempty agent-ready assessment; rejects old triage without rewriting it', async () => {
  const root=await fixture();
  try {
    await writeSource(root); await writeTriage(root);
    const path=join(root,'triage.md'),original=await readFile(path,'utf8');
    await writeFile(path,original.replace('disposition: needs-triage','disposition: ready-for-agent'));
    assert.match(runValidator(root,'triage').stderr,/ready-for-agent requires passed/);
    const ready=original.replace('disposition: needs-triage','disposition: ready-for-agent').replace('verification: pending','verification: passed');
    await writeFile(path,ready); const passed=runValidator(root,'triage');assert.equal(passed.status,0,passed.stdout+passed.stderr);
    await writeFile(path,ready.replace('Bounded investigation and observed reproduction.',''));
    assert.match(runValidator(root,'triage').stderr,/empty '## 实施简报'/);
    const old=original.replace('schema_version: 3','schema_version: 2');await writeFile(path,old);
    assert.notEqual(runValidator(root,'triage').status,0);assert.equal(await readFile(path,'utf8'),old);
  } finally { await rm(fixtureProject(root),{recursive:true,force:true}); }
});
it('archive preflight rejects a missing publish pointer, failed rows and old intake protocol', async () => {
  const root=await fixture();
  try {
    const {validateArchiveDelivery}=await import(pathToFileURL(join(packageRoot,'template/workflows/specdev/common/tools/change-artifacts.mjs')).href);
    await writeDelivery(root,{publishAction:'published'});
    await writePublish(root,[{ticket:'T-01',kind:'bug',labels:'bug',number:'—',url:'—',state:'failed'}],{action:'published'});
    assert.match(validateArchiveDelivery(root).join('\n'),/published requires all rows/);
    await rm(join(root,'publish.md'));
    assert.match(validateArchiveDelivery(root).join('\n'),/missing publish.md/);
    await rm(join(root,'delivery.md'));await writeTriage(root);
    const path=join(root,'triage.md'),old=(await readFile(path,'utf8')).replace('schema_version: 3','schema_version: 2');await writeFile(path,old);
    assert.match(validateArchiveDelivery(root).join('\n'),/invalid constant/);assert.equal(await readFile(path,'utf8'),old);
  } finally { await rm(fixtureProject(root),{recursive:true,force:true}); }
});
