import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import { initSpeculo, updateSpeculo } from "../src/index.js";
import { pathExists } from "../src/utils.js";

const packageRoot = process.cwd();

async function tempProject(): Promise<string> {
  return mkdtemp(join(tmpdir(), "speculo-test-"));
}

describe("speculo CLI operations", () => {
  it("init copies assets under speculo/ without scattering into the target root", async () => {
    const target = await tempProject();
    const root = join(target, "speculo");
    try {
      const result = await initSpeculo(target, { packageRoot });

      assert.deepEqual(result.copied, [".speculo", "commands", "skills", "workflows"]);
      // Assets nest under <target>/speculo/, not the target root.
      assert.equal(await pathExists(join(target, ".speculo")), false);
      assert.equal(await pathExists(join(target, "workflows")), false);
      assert.equal(await pathExists(join(root, ".speculo", "dev-status.json")), true);
      assert.equal(await pathExists(join(root, ".speculo", "doc-status.json")), true);
      assert.equal(await pathExists(join(root, ".speculo", "dev", "docs-sync-state.json")), true);
      assert.equal(await pathExists(join(root, ".speculo", ".config", "RULES.md")), true);
      assert.equal(await pathExists(join(root, ".speculo", ".config", "LESSONS.md")), true);
      assert.equal(await pathExists(join(root, ".speculo", ".config", "context")), true);
      assert.equal(await pathExists(join(root, ".speculo", ".config", "adr")), true);
      const removedConfigTemplate = "ARCHITECTURE" + ".md.example";
      assert.equal(await pathExists(join(root, ".speculo", ".config", removedConfigTemplate)), false);
      assert.equal(await pathExists(join(root, "commands", "status.md")), true);
      assert.equal(await pathExists(join(root, "commands", "retro.md")), true);
      assert.equal(await pathExists(join(root, "skills", "caveman", "SKILL.md")), true);
      assert.equal(await pathExists(join(root, "skills", "speculo-retro", "SKILL.md")), true);
      assert.equal(await pathExists(join(root, "skills", "speculo-retro", "references", "friction-taxonomy.md")), true);
      assert.equal(await pathExists(join(root, "skills", "speculo-retro", "references", "issue-drafting-sop.md")), true);
      assert.equal(await pathExists(join(root, "skills", "github-npm-ops", "SKILL.md")), true);
      assert.equal(await pathExists(join(root, "skills", "speculo-write", "SKILL.md")), true);
      assert.equal(await pathExists(join(root, "skills", "worktree-isolation", "SKILL.md")), true);
      assert.equal(await pathExists(join(root, "workflows", "dev", "I-to-issues", "I-to-issues.md")), true);
      assert.equal(await pathExists(join(root, "workflows", "dev", "H-diagnose", "H-diagnose.md")), true);
      assert.equal(await pathExists(join(root, "workflows", "dev", "R-review", "R-review.md")), true);
      assert.equal(await pathExists(join(root, "workflows", "dev", "R-review", "security-checklist.md")), true);
      assert.equal(await pathExists(join(root, "workflows", "dev", "04-finalize", "04-finalize.md")), true);
      assert.equal(await pathExists(join(root, "workflows", "dev", "D-docs-sync", "D-docs-sync.md")), true);
      assert.equal(await pathExists(join(root, "workflows", "doc", "00-INDEX.md")), true);
      assert.equal(await pathExists(join(root, "workflows", "doc", "M-mao-zedong-cognitive-os", "M-mao-zedong-cognitive-os.md")), true);
      assert.equal(await pathExists(join(root, "workflows", "doc", "F-writing-fragments", "F-writing-fragments.md")), true);
      assert.equal(await pathExists(join(root, "adapters")), false);
    } finally {
      await rm(target, { recursive: true, force: true });
    }
  });

  it("init fails on existing asset paths without overwriting", async () => {
    const target = await tempProject();
    const root = join(target, "speculo");
    try {
      await mkdir(root, { recursive: true });
      await writeFile(join(root, "commands"), "existing");

      await assert.rejects(
        initSpeculo(target, { packageRoot }),
        /refused to overwrite existing paths/
      );

      assert.equal(await readFile(join(root, "commands"), "utf8"), "existing");
      assert.equal(await pathExists(join(root, ".speculo")), false);
    } finally {
      await rm(target, { recursive: true, force: true });
    }
  });

  it("update overwrites commands, skills, and workflows but preserves .speculo", async () => {
    const target = await tempProject();
    const root = join(target, "speculo");
    try {
      await initSpeculo(target, { packageRoot });
      await writeFile(join(root, "commands", "status.md"), "local edit");
      await writeFile(join(root, "skills", "local-skill.md"), "remove me");
      await writeFile(join(root, "workflows", "local-workflow.md"), "remove me");
      await writeFile(join(root, ".speculo", "state.txt"), "keep me");
      await writeFile(join(root, ".speculo", "doc-status.json"), "keep doc status");

      const result = await updateSpeculo(target, { packageRoot });

      assert.deepEqual(result.updated, ["commands", "skills", "workflows"]);
      assert.match(await readFile(join(root, "commands", "status.md"), "utf8"), /# Status 命令/);
      assert.equal(await pathExists(join(root, "skills", "local-skill.md")), false);
      assert.equal(await pathExists(join(root, "workflows", "local-workflow.md")), false);
      assert.equal(await readFile(join(root, ".speculo", "state.txt"), "utf8"), "keep me");
      assert.equal(await readFile(join(root, ".speculo", "doc-status.json"), "utf8"), "keep doc status");
    } finally {
      await rm(target, { recursive: true, force: true });
    }
  });

  it("compiled CLI resolves package assets from the package root", async () => {
    const target = await tempProject();
    const root = join(target, "speculo");
    try {
      const cliPath = join(process.cwd(), "dist", "src", "cli.js");

      execFileSync(process.execPath, [cliPath, "init", target], { stdio: "pipe" });

      assert.equal(await pathExists(join(root, ".speculo", "dev-status.json")), true);
      assert.equal(await pathExists(join(root, ".speculo", "doc-status.json")), true);
      assert.equal(await pathExists(join(root, "workflows", "dev", "H-diagnose", "H-diagnose.md")), true);
      assert.equal(await pathExists(join(root, "workflows", "doc", "00-INDEX.md")), true);
    } finally {
      await rm(target, { recursive: true, force: true });
    }
  });
});
