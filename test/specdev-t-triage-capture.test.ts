import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";

import {changeFixture as seedChange, fixtureProject} from "./workspace-fixture.js";
const packageRoot = process.cwd();
const recordId = "2026-09-17-login-timeout";
const changeName = "2026-09-17-unrelated-change";
const validator = join(
  packageRoot,
  "template/workflows/specdev/common/tools/validate-specdev.mjs",
);
const statusTool = join(
  packageRoot,
  "template/workflows/specdev/specdev-t-triage/scripts/capture-status.mjs",
);

async function changeFixture(): Promise<string> {
  const parent = await mkdtemp(join(tmpdir(), "specdev-t-triage-capture-"));
  const root = await seedChange(parent,changeName);
  await writeFile(join(root, "README.md"), `# Fixture\nOutcome: active\n\n## Ownership\nOwner: lead-session\nEvidence: owner.md\n`);
  await writeFile(join(root, "owner.md"), "Owner: lead-session\nSource: synthetic test fixture\n");
  return root;
}

function runValidator(args: string[]) {
  return spawnSync(process.execPath, [validator, ...args], { encoding: "utf8" });
}

async function writeCapture(
  file: string,
  rows: Array<{
    id: string;
    kind: string;
    title: string;
    labels: string;
    number: string;
    url: string;
    marker?: string;
    sha256?: string;
    state: string;
  }>,
): Promise<void> {
  const table = [
    "| id | kind | title | labels | number | url | marker | sha256 | state |",
    "|---|---|---|---|---|---|---|---|---|",
    ...rows.map((row) =>
      `| ${row.id} | ${row.kind} | ${row.title} | ${row.labels} | ${row.number} | ${row.url} | ${row.marker ?? `specdev:capture:${row.id}`} | ${row.sha256 ?? "a".repeat(64)} | ${row.state} |`,
    ),
  ];
  await writeFile(
    file,
    [
      "---",
      "schema_version: 1",
      "artifact: capture-index",
      "mode: capture",
      "repo: NAMEWTA/Speculo",
      "updated_at: 2026-09-17T02:00:00Z",
      "---",
      "",
      "# Capture",
      "",
      "## 捕获计划",
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

describe("SpecDev T-triage capture inbox", () => {
  it("treats missing capture.md as a legal empty inbox", async () => {
    const root = await changeFixture();
    try {
      const changeResult = runValidator([root]);
      assert.equal(changeResult.status, 0, changeResult.stdout + changeResult.stderr);

      const stateRoot = join(root, "../..");
      const status = spawnSync(process.execPath, [statusTool, "--state-root", stateRoot, "--json"], {
        encoding: "utf8",
      });
      assert.equal(status.status, 0, status.stdout + status.stderr);
      const summary = JSON.parse(status.stdout);
      assert.equal(summary.missing, true);
      assert.equal(summary.inbox_open, 0);
      assert.equal(summary.inbox_intaken, 0);
      assert.equal(summary.published_issues, undefined);
    } finally {
      await rm(fixtureProject(root), { recursive: true, force: true });
    }
  });

  it("accepts an open local-origin capture ledger", async () => {
    const parent = await mkdtemp(join(tmpdir(), "specdev-capture-ok-"));
    const file = join(parent, "capture.md");
    try {
      await writeCapture(file, [{
        id: recordId,
        kind: "bug",
        title: "bug: login timeout on empty session",
        labels: "bug, specdev:captured, origin:local",
        number: "81",
        url: "https://github.com/NAMEWTA/Speculo/issues/81",
        state: "open",
      }]);
      const result = runValidator(["--capture", file]);
      assert.equal(result.status, 0, result.stdout + result.stderr);
    } finally {
      await rm(parent, { recursive: true, force: true });
    }
  });

  it("rejects specdev:published and needs-triage on captured issues", async () => {
    const parent = await mkdtemp(join(tmpdir(), "specdev-capture-labels-"));
    const file = join(parent, "capture.md");
    try {
      await writeCapture(file, [{
        id: recordId,
        kind: "bug",
        title: "bug: login timeout",
        labels: "bug, specdev:captured, specdev:published, origin:local, needs-triage",
        number: "81",
        url: "https://github.com/NAMEWTA/Speculo/issues/81",
        state: "open",
      }]);
      const result = runValidator(["--capture", file]);
      assert.equal(result.status, 1);
      const output = result.stdout + result.stderr;
      assert.match(output, /forbidden label specdev:published/);
      assert.match(output, /forbidden label needs-triage/);
    } finally {
      await rm(parent, { recursive: true, force: true });
    }
  });

  it("rejects mixed kind on capture rows", async () => {
    const parent = await mkdtemp(join(tmpdir(), "specdev-capture-mixed-"));
    const file = join(parent, "capture.md");
    try {
      await writeCapture(file, [{
        id: recordId,
        kind: "mixed",
        title: "mixed: several notes",
        labels: "specdev:captured, origin:local",
        number: "81",
        url: "https://github.com/NAMEWTA/Speculo/issues/81",
        state: "open",
      }]);
      const result = runValidator(["--capture", file]);
      assert.equal(result.status, 1);
      assert.match(result.stdout + result.stderr, /invalid kind/);
    } finally {
      await rm(parent, { recursive: true, force: true });
    }
  });

  it("forbids change-level capture.md copies", async () => {
    const root = await changeFixture();
    try {
      await writeCapture(join(root, "capture.md"), [{
        id: recordId,
        kind: "bug",
        title: "bug: misplaced ledger",
        labels: "bug, specdev:captured, origin:local",
        number: "81",
        url: "https://github.com/NAMEWTA/Speculo/issues/81",
        state: "open",
      }]);
      const result = runValidator(["--stage", "triage", root]);
      assert.equal(result.status, 1);
      assert.match(result.stdout + result.stderr, /workspace-owned/);
    } finally {
      await rm(fixtureProject(root), { recursive: true, force: true });
    }
  });

  it("rejects mode=capture on change-level triage.md", async () => {
    const root = await changeFixture();
    try {
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
          "mode: capture",
          "source: <Path>{roots.state}/specdev/changes/{change}/source.md</Path>",
          "classification: bug",
          "risk: medium",
          "route: specdev/triage",
          "ready_for_implementation: false",
          "external_action: not-applicable",
          "updated_at: 2026-09-17T00:00:00Z",
          "---",
          "",
          "# Triage",
          "",
          "## 当前判定",
          "observed",
          "## 未知项",
          "none",
          "## 路由",
          "capture",
          "## 外部动作",
          "none",
          "",
        ].join("\n"),
      );
      const result = runValidator(["--stage", "triage", root]);
      assert.equal(result.status, 1);
      assert.match(result.stdout + result.stderr, /invalid mode capture/);
    } finally {
      await rm(fixtureProject(root), { recursive: true, force: true });
    }
  });

  it("counts inbox_open and inbox_intaken without published_issues", async () => {
    const parent = await mkdtemp(join(tmpdir(), "specdev-capture-count-"));
    try {
      await writeCapture(join(parent, "capture.md"), [
        {
          id: recordId,
          kind: "bug",
          title: "bug: login timeout",
          labels: "bug, specdev:captured, origin:local",
          number: "81",
          url: "https://github.com/NAMEWTA/Speculo/issues/81",
          state: "open",
        },
        {
          id: "2026-09-17-docs-typo",
          kind: "documentation",
          title: "docs: changelog typo",
          labels: "documentation, specdev:captured, origin:local",
          number: "82",
          url: "https://github.com/NAMEWTA/Speculo/issues/82",
          state: "intaken",
        },
        {
          id: "2026-09-17-wont-do",
          kind: "feature",
          title: "feature: deferred idea",
          labels: "feature-request, specdev:captured, origin:local",
          number: "—",
          url: "—",
          state: "waived",
        },
      ]);
      const result = spawnSync(process.execPath, [statusTool, "--state-root", parent, "--json"], {
        encoding: "utf8",
      });
      assert.equal(result.status, 0, result.stdout + result.stderr);
      const summary = JSON.parse(result.stdout);
      assert.equal(summary.inbox_open, 1);
      assert.equal(summary.inbox_intaken, 1);
      assert.equal(summary.inbox_waived, 1);
      assert.equal(summary.inbox_failed, 0);
      assert.equal(summary.missing, false);
      assert.equal(summary.published_issues, undefined);
    } finally {
      await rm(parent, { recursive: true, force: true });
    }
  });

  it("keeps capture contracts in T-triage assets", async () => {
    const [entry, protocol, map, projection, intake] = await Promise.all([
      readFile(join(packageRoot, "template/workflows/specdev/specdev-t-triage/SKILL.md"), "utf8"),
      readFile(join(packageRoot, "template/workflows/specdev/specdev-t-triage/references/capture-protocol.md"), "utf8"),
      readFile(join(packageRoot, "template/workflows/specdev/specdev-t-triage/references/classification-map.md"), "utf8"),
      readFile(join(packageRoot, "template/workflows/specdev/specdev-t-triage/references/public-projection.md"), "utf8"),
      readFile(join(packageRoot, "template/workflows/specdev/specdev-t-triage/references/intake-protocol.md"), "utf8"),
    ]);
    assert.match(entry, /\| capture \|/);
    assert.match(map, /specdev:captured/);
    assert.match(entry, /capture 不创建也不选择 change/);
    assert.match(protocol, /issue-create/);
    assert.match(protocol, /issue-comment-close/);
    assert.match(protocol, /1 条记录 = 1 次未来 intake/);
    assert.match(map, /specdev:captured/);
    assert.match(projection, /This was generated by AI during SpecDev T-triage capture/);
    assert.match(intake, /intaken/);
  });
});
