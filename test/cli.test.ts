import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
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
  it("init copies .speculo, commands, skills, and workflows without adapters", async () => {
    const target = await tempProject();
    try {
      const result = await initSpeculo(target, { packageRoot });

      assert.deepEqual(result.copied, [".speculo", "commands", "skills", "workflows"]);
      assert.equal(await pathExists(join(target, ".speculo", "dev-status.json")), true);
      assert.equal(await pathExists(join(target, ".speculo", "doc-status.json")), true);
      assert.equal(await pathExists(join(target, ".speculo", "dev", "docs-sync-state.json")), true);
      assert.equal(await pathExists(join(target, ".speculo", ".config", "RULES.md")), true);
      assert.equal(await pathExists(join(target, ".speculo", ".config", "LESSONS.md")), true);
      assert.equal(await pathExists(join(target, ".speculo", ".config", "context")), true);
      assert.equal(await pathExists(join(target, ".speculo", ".config", "adr")), true);
      const removedConfigTemplate = "ARCHITECTURE" + ".md.example";
      assert.equal(await pathExists(join(target, ".speculo", ".config", removedConfigTemplate)), false);
      assert.equal(await pathExists(join(target, "commands", "status.md")), true);
      assert.equal(await pathExists(join(target, "skills", "caveman", "SKILL.md")), true);
      assert.equal(await pathExists(join(target, "skills", "github-npm-ops", "SKILL.md")), true);
      assert.equal(await pathExists(join(target, "skills", "speculo-write", "SKILL.md")), true);
      assert.equal(await pathExists(join(target, "workflows", "dev", "I-to-issues", "I-to-issues.md")), true);
      assert.equal(await pathExists(join(target, "workflows", "dev", "H-diagnose", "H-diagnose.md")), true);
      assert.equal(await pathExists(join(target, "workflows", "dev", "R-review", "R-review.md")), true);
      assert.equal(await pathExists(join(target, "workflows", "dev", "D-docs-sync", "D-docs-sync.md")), true);
      assert.equal(await pathExists(join(target, "workflows", "doc", "00-INDEX.md")), true);
      assert.equal(await pathExists(join(target, "workflows", "doc", "F-writing-fragments", "F-writing-fragments.md")), true);
      assert.equal(await pathExists(join(target, "adapters")), false);
    } finally {
      await rm(target, { recursive: true, force: true });
    }
  });

  it("init fails on existing asset paths without overwriting", async () => {
    const target = await tempProject();
    try {
      await writeFile(join(target, "commands"), "existing");

      await assert.rejects(
        initSpeculo(target, { packageRoot }),
        /refused to overwrite existing paths/
      );

      assert.equal(await readFile(join(target, "commands"), "utf8"), "existing");
      assert.equal(await pathExists(join(target, ".speculo")), false);
    } finally {
      await rm(target, { recursive: true, force: true });
    }
  });

  it("update overwrites commands, skills, and workflows but preserves .speculo", async () => {
    const target = await tempProject();
    try {
      await initSpeculo(target, { packageRoot });
      await writeFile(join(target, "commands", "status.md"), "local edit");
      await writeFile(join(target, "skills", "local-skill.md"), "remove me");
      await writeFile(join(target, "workflows", "local-workflow.md"), "remove me");
      await writeFile(join(target, ".speculo", "state.txt"), "keep me");
      await writeFile(join(target, ".speculo", "doc-status.json"), "keep doc status");

      const result = await updateSpeculo(target, { packageRoot });

      assert.deepEqual(result.updated, ["commands", "skills", "workflows"]);
      assert.match(await readFile(join(target, "commands", "status.md"), "utf8"), /# Status 命令/);
      assert.equal(await pathExists(join(target, "skills", "local-skill.md")), false);
      assert.equal(await pathExists(join(target, "workflows", "local-workflow.md")), false);
      assert.equal(await readFile(join(target, ".speculo", "state.txt"), "utf8"), "keep me");
      assert.equal(await readFile(join(target, ".speculo", "doc-status.json"), "utf8"), "keep doc status");
    } finally {
      await rm(target, { recursive: true, force: true });
    }
  });

  it("compiled CLI resolves package assets from the package root", async () => {
    const target = await tempProject();
    try {
      const cliPath = join(process.cwd(), "dist", "src", "cli.js");

      execFileSync(process.execPath, [cliPath, "init", target], { stdio: "pipe" });

      assert.equal(await pathExists(join(target, ".speculo", "dev-status.json")), true);
      assert.equal(await pathExists(join(target, ".speculo", "doc-status.json")), true);
      assert.equal(await pathExists(join(target, "workflows", "dev", "H-diagnose", "H-diagnose.md")), true);
      assert.equal(await pathExists(join(target, "workflows", "doc", "00-INDEX.md")), true);
    } finally {
      await rm(target, { recursive: true, force: true });
    }
  });
});
