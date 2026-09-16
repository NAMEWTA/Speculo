import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";

const packageRoot = process.cwd();
const validator = join(
  packageRoot,
  "template/workflows/learning/common/tools/validate-learning.mjs",
);
const CHANGE = "2026-09-16-mine-pass";

function changeStatus(): string {
  return `${JSON.stringify({
    schema_version: 2,
    artifact: "learning-change-status",
    change_id: CHANGE,
    kind: "learning",
    domain: "programming",
    domain_type: "project",
    topic_id: "mine-pass",
    parent_change: null,
    root_change: CHANGE,
    locator: `changes/${CHANGE}`,
    lifecycle: "active",
    phase: "planning",
    current_work: null,
    works_run: ["learning/goal"],
    created_at: "2026-09-16T00:00:00Z",
    updated_at: "2026-09-16T00:00:00Z",
    closed_at: null,
    archived_at: null,
    closure_reason: null,
    archive_path: null,
    homework: { status: "none", latest_id: null, submitted_at: null },
    mastery: {
      overall: "unverified",
      immediate: "not_attempted",
      retention: "not_scheduled",
      critical_objectives: "not_attempted",
      transfer: "not_attempted",
      blocking_misconceptions: [],
      evidence: [],
      next_review_at: null,
    },
    children: [],
    blockers: [],
  }, null, 2)}\n`;
}

function statusJson(): string {
  return `${JSON.stringify({
    schema_version: 2,
    workflow: "learning",
    active: [{
      change_id: CHANGE,
      kind: "learning",
      domain: "programming",
      topic_id: "mine-pass",
      locator: `changes/${CHANGE}`,
      parent_change: null,
      root_change: CHANGE,
      current_work: null,
      works_run: ["learning/goal"],
      updated_at: "2026-09-16T00:00:00Z",
    }],
    archived: [],
  }, null, 2)}\n`;
}

function locationsJson(): string {
  return `${JSON.stringify({
    schema_version: 2,
    workflow: "learning",
    entries: [{ change_id: CHANGE, locator: `changes/${CHANGE}` }],
  }, null, 2)}\n`;
}

function chainDoc(lessons: string[], statuses: string[], unitLessons?: string[]): string {
  const rows = lessons.map((id, index) =>
    `| ${id} | title-${id} | OBJ-01 | C:context | — | 35 | \`lessons/${id}-x.md\` | ${statuses[index] ?? "planned"} |`
  ).join("\n");
  const unit = (unitLessons ?? lessons).join(", ");
  return `# Chain: fixture

## Lessons

| ID | 标题 | OBJ | 覆盖格子 | 前置 | 估时 | 将写入 | 状态 |
| --- | --- | --- | --- | --- | --- | --- | --- |
${rows}

## Units

| unit_id | Lessons | 上限 | 状态 |
| --- | --- | --- | --- |
| U1 | ${unit} | ≤15 | planned |
`;
}

function probeDoc(options: {
  lesson: string;
  batch: string;
  questions: number[];
  budget?: number;
  split?: boolean;
  mineMore?: boolean;
  splitDepth?: number;
  extra?: string;
}): string {
  const qs = options.questions.map((n) => `## Q${n} 槽\n\nbody\n`).join("\n");
  const meta = options.mineMore === false ? "defer" : (options.split ? "split-lesson" : "mine-more");
  const splitTable = options.split
    ? `| ${options.lesson} | child lesson | C:context | 10 questions were not enough |`
    : `|  |  |  |  |`;
  return `---
artifact: learning-goal-probe
probe_id: GP-${options.lesson}-${options.batch}
lesson_id: ${options.lesson}
audience: mine
batch: ${options.batch}
question_budget_used: ${options.budget ?? options.questions.length}
split_depth: ${options.splitDepth ?? 0}
status: open
---

# Probe GP-${options.lesson} / ${options.batch}

## Q${options.questions[0] ?? 1} 澄清

${qs}

## 缺口清单

| 格子 | 缺口 | 建议补丁 | 处置建议 |
| --- | --- | --- | --- |
| C:context | still unclear | split | ${meta} |

## split-proposal

${options.split ? splitTable : "none"}

${options.extra ?? ""}
`;
}

function matrixDoc(uncovered: boolean): string {
  return `# Coverage Matrix

| 单元 | 状态 |
| --- | --- |
| context | ${uncovered ? "uncovered" : "covered"} |
`;
}

async function writeState(root: string, files: Record<string, string>): Promise<string> {
  const state = join(root, "learning");
  const change = join(state, "changes", CHANGE);
  await mkdir(join(change, "goal", "probes"), { recursive: true });
  await writeFile(join(state, "status.json"), statusJson());
  await writeFile(join(state, "locations.json"), locationsJson());
  await writeFile(join(change, ".status.json"), changeStatus());
  await writeFile(join(change, "goal", "goal-plan.md"), `# Goal-Plan\n\n禁止 L → mine → L → mine 交错。\n`);
  await writeFile(join(change, "goal", "progress.md"), `# Progress\n\n- current_mine_unit: U1\n`);
  await writeFile(join(change, "goal", "coverage-matrix.md"), matrixDoc(false));
  await writeFile(join(change, "goal", "chain.md"), chainDoc(["L-001"], ["planned"]));
  for (const [relative, content] of Object.entries(files)) {
    const path = join(change, relative);
    await mkdir(join(path, ".."), { recursive: true });
    await writeFile(path, content);
  }
  return state;
}

function run(stateRoot: string) {
  return spawnSync(process.execPath, [validator, "--state-root", stateRoot], {
    encoding: "utf8",
    cwd: packageRoot,
  });
}

function combined(result: ReturnType<typeof spawnSync>): string {
  return `${result.stdout ?? ""}${result.stderr ?? ""}`;
}

describe("Learning G-goal teach-then-mine contracts", () => {
  it("accepts a 6-lesson mine unit under the cap of 15", async () => {
    const root = await mkdtemp(join(tmpdir(), "learning-mine-small-"));
    try {
      const lessons = ["L-001", "L-002", "L-003", "L-004", "L-005", "L-006"];
      const state = await writeState(root, {
        "goal/chain.md": chainDoc(lessons, lessons.map(() => "written")),
      });
      const result = run(state);
      assert.equal(result.status, 0, combined(result));
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("rejects 16 lessons in one mine unit", async () => {
    const root = await mkdtemp(join(tmpdir(), "learning-mine-cap-"));
    try {
      const lessons = Array.from({ length: 16 }, (_, i) => `L-${String(i + 1).padStart(3, "0")}`);
      const state = await writeState(root, {
        "goal/chain.md": chainDoc(lessons, lessons.map(() => "planned")),
      });
      const result = run(state);
      assert.notEqual(result.status, 0, combined(result));
      assert.match(combined(result), /mine_unit_cap=15/);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("rejects b03 and more than 10 questions", async () => {
    const root = await mkdtemp(join(tmpdir(), "learning-mine-b03-"));
    try {
      const questions = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
      const state = await writeState(root, {
        "goal/chain.md": chainDoc(["L-001"], ["written"]),
        "goal/probes/GP-L-001-b01.md": probeDoc({ lesson: "L-001", batch: "b01", questions: [1, 2, 3, 4, 5], budget: 5 }),
        "goal/probes/GP-L-001-b02.md": probeDoc({ lesson: "L-001", batch: "b02", questions: [6, 7, 8, 9, 10], budget: 10 }),
        "goal/probes/GP-L-001-b03.md": probeDoc({ lesson: "L-001", batch: "b03", questions: [11], budget: 11 }),
      });
      void questions;
      const result = run(state);
      assert.notEqual(result.status, 0, combined(result));
      assert.match(combined(result), /b03/);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("requires split-proposal after 10 questions still uncovered", async () => {
    const root = await mkdtemp(join(tmpdir(), "learning-mine-split-"));
    try {
      const state = await writeState(root, {
        "goal/chain.md": chainDoc(["L-001"], ["mined"]),
        "goal/coverage-matrix.md": matrixDoc(true),
        "goal/probes/GP-L-001-b01.md": probeDoc({ lesson: "L-001", batch: "b01", questions: [1, 2, 3, 4, 5], budget: 5 }),
        "goal/probes/GP-L-001-b02.md": probeDoc({
          lesson: "L-001",
          batch: "b02",
          questions: [6, 7, 8, 9, 10],
          budget: 10,
          split: false,
          mineMore: true,
        }),
      });
      const result = run(state);
      assert.notEqual(result.status, 0, combined(result));
      assert.match(combined(result), /split-proposal/);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("rejects interleaved L/mine inside one unit", async () => {
    const root = await mkdtemp(join(tmpdir(), "learning-mine-interleave-"));
    try {
      const state = await writeState(root, {
        "goal/chain.md": chainDoc(["L-001", "L-002"], ["mined", "planned"]),
        "goal/probes/GP-L-001-b01.md": probeDoc({ lesson: "L-001", batch: "b01", questions: [1, 2, 3, 4, 5], budget: 5, mineMore: false }),
      });
      const result = run(state);
      assert.notEqual(result.status, 0, combined(result));
      assert.match(combined(result), /interleaved L\/mine/);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("rejects re-dispatch-L that resets question_budget_used", async () => {
    const root = await mkdtemp(join(tmpdir(), "learning-mine-budget-"));
    try {
      const state = await writeState(root, {
        "goal/chain.md": chainDoc(["L-001"], ["revised"]),
        "goal/probes/GP-L-001-b01.md": probeDoc({ lesson: "L-001", batch: "b01", questions: [1, 2, 3, 4, 5], budget: 0 }),
      });
      const result = run(state);
      assert.notEqual(result.status, 0, combined(result));
      assert.match(combined(result), /question_budget_used/);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("requires defer(needs-replan) after split depth 2 still unclear", async () => {
    const root = await mkdtemp(join(tmpdir(), "learning-mine-depth-"));
    try {
      const state = await writeState(root, {
        "goal/chain.md": chainDoc(["L-001"], ["split_proposed"]),
        "goal/coverage-matrix.md": matrixDoc(true),
        "goal/probes/GP-L-001-b01.md": probeDoc({
          lesson: "L-001",
          batch: "b01",
          questions: [1, 2, 3, 4, 5],
          budget: 10,
          split: true,
          splitDepth: 2,
          mineMore: false,
        }),
        "goal/probes/GP-L-001-b02.md": probeDoc({
          lesson: "L-001",
          batch: "b02",
          questions: [6, 7, 8, 9, 10],
          budget: 10,
          split: true,
          splitDepth: 2,
          mineMore: false,
        }),
      });
      const result = run(state);
      assert.notEqual(result.status, 0, combined(result));
      assert.match(combined(result), /needs-replan/);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("rejects learner protocol fields in mine probes and enforces miner write-set isolation", async () => {
    const root = await mkdtemp(join(tmpdir(), "learning-mine-learner-"));
    try {
      const state = await writeState(root, {
        "goal/chain.md": chainDoc(["L-001", "L-002"], ["written", "written"]),
        "goal/probes/GP-L-001-b01.md": probeDoc({
          lesson: "L-001",
          batch: "b01",
          questions: [1, 2, 3, 4, 5],
          budget: 5,
          mineMore: false,
          extra: "Response: pending\nSee inquiry/IQ-001.md\n",
        }),
        "goal/probes/GP-L-002-b01.md": `---
artifact: learning-goal-probe
probe_id: GP-L-002-b01
lesson_id: L-001
audience: mine
batch: b01
question_budget_used: 5
status: open
---

# Probe

## Q1 澄清

body
`,
      });
      const result = run(state);
      assert.notEqual(result.status, 0, combined(result));
      const text = combined(result);
      assert.match(text, /Response:|inquiry\//);
      assert.match(text, /write-set isolation/);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
