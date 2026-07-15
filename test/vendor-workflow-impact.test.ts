import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import {
  mkdir,
  mkdtemp,
  readFile,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";

const packageRoot = process.cwd();
const analyzer = join(
  packageRoot,
  ".agents",
  "skills",
  "speculo-write-workflows",
  "scripts",
  "vendor-workflow-impact.mjs"
);

function git(root: string, ...args: string[]): string {
  return execFileSync("git", ["-C", root, ...args], { encoding: "utf8" });
}

async function writeJson(path: string, value: unknown): Promise<void> {
  await mkdir(join(path, ".."), { recursive: true });
  await writeFile(path, JSON.stringify(value, null, 2) + "\n");
}

function rawSkill(name: string, body = ""): string {
  return [
    "---",
    `name: ${name}`,
    `description: ${name} capability`,
    "---",
    "",
    `# ${name}`,
    "",
    body,
    "",
  ].join("\n");
}

function wrapper(id: string, target: string): string {
  return [
    "---",
    `id: ${id}`,
    "type: atomic-skill",
    "workflow: example",
    `name: ${id}`,
    `description: ${id} wrapper`,
    "stability: stable",
    "invocation: model-allowed",
    "---",
    "",
    "```xml",
    "<sequence>",
    '  <phase id="load-persistence" order="1"><instructions root="workflow" path="PERSISTENCE.md" activation="required" /></phase>',
    `  <phase id="invoke" order="2"><skill root="vendor:source" path="${target}" activation="adapted" /></phase>`,
    "</sequence>",
    "```",
    "",
  ].join("\n");
}

async function createFixture(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "speculo-vendor-impact-"));
  await writeJson(join(root, "template", ".speculo", "workspace.json"), {
    schema_version: 1,
    path_base: "project-root",
    roots: {
      speculo: "speculo",
      workflows: "speculo/workflows",
      vendor: "speculo/vendor",
    },
  });
  await mkdir(join(root, "template", "vendor", "source", "engineering", "alpha"), {
    recursive: true,
  });
  await mkdir(join(root, "template", "vendor", "source", "engineering", "beta"), {
    recursive: true,
  });
  await writeFile(
    join(root, "template", "vendor", "source", "engineering", "alpha", "SKILL.md"),
    rawSkill("alpha")
  );
  await writeFile(
    join(root, "template", "vendor", "source", "engineering", "beta", "SKILL.md"),
    rawSkill("beta", "Run `/alpha` when needed.")
  );

  const workflow = join(root, "template", "workflows", "example");
  await mkdir(join(workflow, "atomic-skills"), { recursive: true });
  await mkdir(join(workflow, "routes"), { recursive: true });
  await writeFile(
    join(workflow, "PERSISTENCE.md"),
    [
      "```xml",
      "<runtime-context>",
      '  <root id="workflow" base="workflows" path="example" />',
      '  <root id="vendor:source" base="vendor" path="source" />',
      "</runtime-context>",
      "```",
      "",
    ].join("\n")
  );
  await writeFile(
    join(workflow, "WORKFLOW.md"),
    [
      "---",
      "id: example",
      "type: workflow",
      "workflow: example",
      "name: Example",
      "description: Example",
      "---",
      "",
      "```xml",
      '<atomic-skills source-root="vendor:source" coverage="complete">',
      '  <atomic-skill id="alpha" order="1" root="workflow" path="atomic-skills/alpha.md"><when>alpha</when></atomic-skill>',
      '  <atomic-skill id="beta" order="2" root="workflow" path="atomic-skills/beta.md"><when>beta</when></atomic-skill>',
      "</atomic-skills>",
      "```",
      "",
    ].join("\n")
  );
  await writeFile(
    join(workflow, "atomic-skills", "alpha.md"),
    wrapper("alpha", "engineering/alpha/SKILL.md")
  );
  await writeFile(
    join(workflow, "atomic-skills", "beta.md"),
    wrapper("beta", "engineering/beta/SKILL.md")
  );
  await writeFile(
    join(workflow, "routes", "main.md"),
    '<instructions root="workflow" path="atomic-skills/alpha.md" activation="required" />\n'
  );

  git(root, "init", "-q");
  git(root, "config", "user.email", "speculo@example.test");
  git(root, "config", "user.name", "Speculo Test");
  git(root, "add", ".");
  git(root, "commit", "-qm", "fixture");
  return root;
}

function analyze(root: string, ...args: string[]): { status: number | null; report: any; stderr: string } {
  const result = spawnSync(
    process.execPath,
    [analyzer, "--repo", root, "--format", "json", ...args],
    { encoding: "utf8" }
  );
  return {
    status: result.status,
    report: result.stdout ? JSON.parse(result.stdout) : undefined,
    stderr: result.stderr,
  };
}

describe("vendor workflow impact analyzer", () => {
  it("reports a clean inventory without mutating the repository", async () => {
    const root = await createFixture();
    try {
      const before = git(root, "status", "--short");
      const result = analyze(root, "--check");
      assert.equal(result.status, 0, result.stderr);
      assert.equal(result.report.summary.changes, 0);
      assert.equal(result.report.summary.drift, 0);
      assert.equal(result.report.summary.blockers, 0);
      assert.equal(git(root, "status", "--short"), before);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("classifies untracked and committed additions from explicit ranges", async () => {
    const root = await createFixture();
    try {
      const gamma = join(root, "template", "vendor", "source", "productivity", "gamma");
      await mkdir(gamma, { recursive: true });
      await writeFile(join(gamma, "SKILL.md"), rawSkill("gamma"));

      const workingTree = analyze(root, "--check");
      assert.equal(workingTree.status, 1);
      const workflow = workingTree.report.workflows[0];
      assert.equal(workflow.changes.some((change: any) => change.type === "added" && change.id === "gamma"), true);
      assert.equal(workflow.safeActions.some((action: any) => action.code === "ADD_WRAPPER_AND_CATALOG" && action.id === "gamma"), true);
      assert.equal(workflow.drift.some((item: any) => item.code === "MISSING_WRAPPER" && item.id === "gamma"), true);

      git(root, "add", ".");
      git(root, "commit", "-qm", "add gamma");
      const committed = analyze(root, "--from", "HEAD~1", "--to", "HEAD");
      assert.equal(
        committed.report.workflows[0].changes.some(
          (change: any) => change.type === "added" && change.id === "gamma"
        ),
        true
      );
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("blocks a referenced deletion with route and raw-call evidence", async () => {
    const root = await createFixture();
    try {
      await rm(join(root, "template", "vendor", "source", "engineering", "alpha"), {
        recursive: true,
        force: true,
      });
      const result = analyze(root, "--check");
      assert.equal(result.status, 1);
      const blocker = result.report.workflows[0].blockers.find(
        (item: any) => item.code === "REFERENCED_DELETE" && item.id === "alpha"
      );
      assert.ok(blocker);
      assert.deepEqual(blocker.reverse.routes, ["routes/main.md"]);
      assert.deepEqual(blocker.reverse.rawCalls, ["beta"]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("maps frontmatter and supporting-file changes to their owning raw skill", async () => {
    const root = await createFixture();
    try {
      const beta = join(
        root,
        "template",
        "vendor",
        "source",
        "engineering",
        "beta"
      );
      const skillPath = join(beta, "SKILL.md");
      await writeFile(
        skillPath,
        (await readFile(skillPath, "utf8")).replace(
          "description: beta capability",
          "description: updated beta capability"
        )
      );
      await writeFile(join(beta, "GUIDE.md"), "# Beta guide\n");
      const result = analyze(root);
      const change = result.report.workflows[0].changes.find(
        (item: any) => item.type === "modified" && item.id === "beta"
      );
      assert.ok(change);
      assert.deepEqual(change.frontmatterDelta.description, {
        before: "beta capability",
        after: "updated beta capability",
      });
      assert.equal(
        change.files.some((file: any) => file.path.endsWith("engineering/beta/GUIDE.md")),
        true
      );
      assert.equal(
        result.report.workflows[0].safeActions.some(
          (action: any) => action.code === "REVIEW_SEMANTICS" && action.id === "beta"
        ),
        true
      );
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("distinguishes path moves, ID renames, and duplicate raw names", async () => {
    const movedRoot = await createFixture();
    try {
      await mkdir(join(movedRoot, "template", "vendor", "source", "in-progress"), {
        recursive: true,
      });
      await rename(
        join(movedRoot, "template", "vendor", "source", "engineering", "beta"),
        join(movedRoot, "template", "vendor", "source", "in-progress", "beta")
      );
      const moved = analyze(movedRoot, "--check");
      assert.equal(
        moved.report.workflows[0].changes.some(
          (change: any) => change.type === "moved" && change.id === "beta"
        ),
        true
      );
      assert.equal(
        moved.report.workflows[0].safeActions.some(
          (action: any) => action.code === "UPDATE_TARGET_AND_POLICY" && action.id === "beta"
        ),
        true
      );
    } finally {
      await rm(movedRoot, { recursive: true, force: true });
    }

    const renamedRoot = await createFixture();
    try {
      const alpha = join(
        renamedRoot,
        "template",
        "vendor",
        "source",
        "engineering",
        "alpha",
        "SKILL.md"
      );
      await writeFile(alpha, (await readFile(alpha, "utf8")).replace("name: alpha", "name: alpha-next"));
      const renamed = analyze(renamedRoot, "--check");
      assert.equal(
        renamed.report.workflows[0].changes.some(
          (change: any) =>
            change.type === "renamed" &&
            change.beforeId === "alpha" &&
            change.id === "alpha-next"
        ),
        true
      );
      assert.equal(
        renamed.report.workflows[0].blockers.some(
          (item: any) => item.code === "REFERENCED_RENAME" && item.id === "alpha"
        ),
        true
      );
    } finally {
      await rm(renamedRoot, { recursive: true, force: true });
    }

    const duplicateRoot = await createFixture();
    try {
      const duplicate = join(
        duplicateRoot,
        "template",
        "vendor",
        "source",
        "productivity",
        "duplicate"
      );
      await mkdir(duplicate, { recursive: true });
      await writeFile(join(duplicate, "SKILL.md"), rawSkill("beta"));
      const result = analyze(duplicateRoot, "--check");
      assert.equal(
        result.report.workflows[0].blockers.some(
          (item: any) => item.code === "INVALID_RAW_ID" && item.id === "beta"
        ),
        true
      );
    } finally {
      await rm(duplicateRoot, { recursive: true, force: true });
    }
    const malformedRoot = await createFixture();
    try {
      const malformed = join(
        malformedRoot,
        "template",
        "vendor",
        "source",
        "productivity",
        "malformed"
      );
      await mkdir(malformed, { recursive: true });
      await writeFile(join(malformed, "SKILL.md"), "---\ndescription: missing name\n---\n");
      const result = analyze(malformedRoot, "--check");
      assert.equal(
        result.report.workflows[0].blockers.some(
          (item: any) => item.code === "INVALID_RAW_ID" && item.id === "<missing>"
        ),
        true
      );
    } finally {
      await rm(malformedRoot, { recursive: true, force: true });
    }
  });
});
