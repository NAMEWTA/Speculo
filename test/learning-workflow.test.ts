import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rename, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";

const root = process.cwd();
const workflowRoot = join(root, "template", "workflows", "learning");
const validator = join(workflowRoot, "common", "tools", "validate-learning.mjs");
const generator = join(root, ".agents", "skills", "speculo-write-workflows", "scripts", "generate-index.mjs");
const change = "2026-08-30-learn-indexes";

function runNode(script: string, args: string[]) {
  return spawnSync(process.execPath, [script, ...args], { cwd: root, encoding: "utf8" });
}

async function writeJson(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(value, null, 2) + "\n", "utf8");
}

function statusValue(overrides: Record<string, unknown> = {}) {
  return {
    schema_version: 1,
    artifact: "learning-change-status",
    change,
    domain: "speculo",
    domain_type: "project",
    topic: "Speculo indexes",
    change_status: "completed",
    phase: "ready_to_archive",
    current_work: null,
    works_run: ["learning/assess-and-plan", "learning/eli5", "learning/practice", "learning/quiz", "learning/review"],
    created_at: "2026-08-28T00:00:00.000Z",
    updated_at: "2026-08-30T00:00:00.000Z",
    completed_at: "2026-08-30T00:00:00.000Z",
    archived_at: null,
    archive_path: null,
    mastery: {
      immediate: "passed",
      retention: "passed",
      score: 90,
      critical_objectives_passed: true,
      transfer_passed: true,
      blocking_misconceptions: [],
      evidence: [
        `<Path>{roots.state}/learning/changes/${change}/quiz/immediate-01-result.md</Path>`,
        `<Path>{roots.state}/learning/changes/${change}/quiz/retention-01-result.md</Path>`,
      ],
      next_review_at: "2026-09-06T00:00:00.000Z",
    },
    blockers: [],
    ...overrides,
  };
}

async function stateFixture(): Promise<string> {
  const stateRoot = await mkdtemp(join(tmpdir(), "speculo-learning-state-"));
  const changeRoot = join(stateRoot, "changes", change);
  await mkdir(join(changeRoot, "quiz"), { recursive: true });
  await mkdir(join(stateRoot, "archive"), { recursive: true });
  await mkdir(join(stateRoot, "context", "domains"), { recursive: true });
  await writeFile(join(stateRoot, "context", "INDEX.md"), "# 已掌握知识总目录\n", "utf8");
  await writeFile(join(stateRoot, "context", "REVIEW.md"), "# 复习目录\n", "utf8");
  await writeFile(join(changeRoot, "quiz", "immediate-01-result.md"), "# Immediate result\n", "utf8");
  await writeFile(join(changeRoot, "quiz", "retention-01-result.md"), "# Retention result\n", "utf8");
  const changeStatus = statusValue();
  await writeJson(join(changeRoot, ".status.json"), changeStatus);
  await writeJson(join(stateRoot, "status.json"), {
    schema_version: 1,
    workflow: "learning",
    active: [{
      change,
      domain: changeStatus.domain,
      topic: changeStatus.topic,
      current_work: changeStatus.current_work,
      works_run: changeStatus.works_run,
    }],
    archived: [],
  });
  return stateRoot;
}

describe("Learning workflow package", () => {
  it("has seven works, valid static references, and a current generated index", async () => {
    const validation = runNode(validator, ["--workflow-root", workflowRoot]);
    assert.equal(validation.status, 0, validation.stdout + validation.stderr);

    const generated = runNode(generator, [workflowRoot, "--check"]);
    assert.equal(generated.status, 0, generated.stdout + generated.stderr);

    const readme = await readFile(join(workflowRoot, "README.md"), "utf8");
    for (const work of ["A-archive-and-consolidate", "A-assess-and-plan", "E-eli5", "I-init-setup", "P-practice", "Q-quiz", "R-review"]) {
      assert.match(readme, new RegExp(`\\*\\*${work}\\*\\*`));
    }
    assert.doesNotMatch(readme, /\{roots\.state\}\/specdev|specdev\/eli5/);
  });

  it("accepts a completed change only when both mastery gates have evidence", async () => {
    const stateRoot = await stateFixture();
    try {
      const result = runNode(validator, ["--state-root", stateRoot, "--stage", "pre-archive", "--change", change]);
      assert.equal(result.status, 0, result.stdout + result.stderr);
    } finally {
      await rm(stateRoot, { recursive: true, force: true });
    }
  });

  it("rejects premature completion after only the immediate quiz", async () => {
    const stateRoot = await stateFixture();
    try {
      const path = join(stateRoot, "changes", change, ".status.json");
      const value = statusValue({
        mastery: {
          ...statusValue().mastery,
          retention: "not_attempted",
          evidence: [`<Path>{roots.state}/learning/changes/${change}/quiz/immediate-01-result.md</Path>`],
        },
      });
      await writeJson(path, value);
      const result = runNode(validator, ["--state-root", stateRoot, "--stage", "pre-archive", "--change", change]);
      assert.equal(result.status, 1);
      assert.match(result.stdout + result.stderr, /requires both mastery gates passed|requires immediate and retention result evidence/);
    } finally {
      await rm(stateRoot, { recursive: true, force: true });
    }
  });

  it("accepts a fully archived change only after source removal and promotion evidence", async () => {
    const stateRoot = await stateFixture();
    try {
      const source = join(stateRoot, "changes", change);
      const target = join(stateRoot, "archive", change.slice(0, 7), change);
      await mkdir(dirname(target), { recursive: true });
      await rename(source, target);
      await writeFile(join(target, "promotion-plan.md"), "# Promotion Plan\n\nconfirmed\n", "utf8");
      const archivedEvidence = [
        `<Path>{roots.state}/learning/archive/${change.slice(0, 7)}/${change}/quiz/immediate-01-result.md</Path>`,
        `<Path>{roots.state}/learning/archive/${change.slice(0, 7)}/${change}/quiz/retention-01-result.md</Path>`,
      ];
      await writeJson(join(target, ".status.json"), statusValue({
        change_status: "archived",
        phase: "archived",
        works_run: [...statusValue().works_run, "learning/archive-and-consolidate"],
        archived_at: "2026-08-30T01:00:00.000Z",
        archive_path: `<Path>{roots.state}/learning/archive/${change.slice(0, 7)}/${change}</Path>`,
        mastery: { ...statusValue().mastery, evidence: archivedEvidence },
      }));
      await writeJson(join(stateRoot, "status.json"), {
        schema_version: 1,
        workflow: "learning",
        active: [],
        archived: [change],
      });

      const result = runNode(validator, ["--state-root", stateRoot, "--stage", "complete", "--change", change]);
      assert.equal(result.status, 0, result.stdout + result.stderr);
    } finally {
      await rm(stateRoot, { recursive: true, force: true });
    }
  });

  it("rejects duplicate Knowledge IDs and broken context links", async () => {
    const stateRoot = await stateFixture();
    try {
      const concepts = join(stateRoot, "context", "domains", "speculo", "concepts");
      await mkdir(concepts, { recursive: true });
      const knowledge = (title: string) => [
        `# ${title}`,
        "",
        "| 字段 | 内容 |",
        "| --- | --- |",
        "| Knowledge ID | speculo/indexes |",
        "| 状态 | mastered |",
        "",
        "## 当前理解",
        "## 心智模型",
        "## 示例与应用",
        "## 常见误区",
        "## 来源与证据",
      ].join("\n");
      await writeFile(join(concepts, "one.md"), knowledge("One"), "utf8");
      await writeFile(join(concepts, "two.md"), knowledge("Two"), "utf8");
      await writeFile(join(stateRoot, "context", "INDEX.md"), "# Index\n\n[missing](domains/missing/INDEX.md)\n", "utf8");
      const result = runNode(validator, ["--state-root", stateRoot]);
      assert.equal(result.status, 1);
      assert.match(result.stdout + result.stderr, /duplicate Knowledge ID/);
      assert.match(result.stdout + result.stderr, /broken or escaping Markdown link/);
    } finally {
      await rm(stateRoot, { recursive: true, force: true });
    }
  });
});
