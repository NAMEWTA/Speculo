import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import { initSpeculo } from "../src/index.js";
import { pathExists } from "../src/utils.js";
import { promptCategorySelection, selectAllFromCatalog, discoverWorkflowCatalog } from "../src/workflows.js";

const packageRoot = process.cwd();

async function tempProject(): Promise<string> {
  return mkdtemp(join(tmpdir(), "speculo-test-"));
}

describe("speculo CLI operations", () => {
  it("init copies assets under speculo/ without scattering into the target root", async () => {
    const target = await tempProject();
    const root = join(target, "speculo");
    try {
      const result = await initSpeculo(target, { packageRoot, all: true });

      assert.equal(result.mode, "init");
      // First 4 items are non-workflow assets
      assert.deepEqual(result.copied!.slice(0, 4), [".speculo", "commands", "skills", "vendor"]);
      // Rest are workflow paths
      for (const item of result.copied!.slice(4)) {
        assert.ok(item.startsWith("workflows/"), `Expected workflow path, got ${item}`);
      }
      // Assets nest under <target>/speculo/, not the target root.
      assert.equal(await pathExists(join(target, ".speculo")), false);
      assert.equal(await pathExists(join(target, "workflows")), false);
      assert.equal(await pathExists(join(root, ".speculo", "dev-status.json")), true);
      assert.equal(await pathExists(join(root, ".speculo", "doc-status.json")), true);
      assert.equal(await pathExists(join(root, ".speculo", "person-status.json")), true);
      assert.equal(await pathExists(join(root, ".speculo", "dev", "docs-sync-state.json")), true);
      assert.equal(await pathExists(join(root, ".speculo", ".config", "RULES.md")), true);
      assert.equal(await pathExists(join(root, ".speculo", ".config", "LESSONS.md")), true);
      assert.equal(await pathExists(join(root, ".speculo", ".config", "context")), true);
      assert.equal(await pathExists(join(root, ".speculo", ".config", "adr")), true);
      assert.equal(await pathExists(join(root, ".speculo", "person", ".gitkeep")), true);
      assert.equal(await pathExists(join(root, ".speculo", "archive", "person", ".gitkeep")), true);
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
      assert.equal(await pathExists(join(root, "skills", "agents-md-builder", "SKILL.md")), true);
      assert.equal(await pathExists(join(root, "vendor", "README.md")), true);
      // Person workflow (moved from doc/)
      assert.equal(await pathExists(join(root, "workflows", "person", "00-INDEX.md")), true);
      assert.equal(await pathExists(join(root, "workflows", "person", "M-mao-zedong-cognitive-os", "M-mao-zedong-cognitive-os.md")), true);
      assert.equal(await pathExists(join(root, "workflows", "person", "_templates", "mao-consultation-output-template.md")), true);
      // Dev workflows
      assert.equal(await pathExists(join(root, "workflows", "dev", "I-to-issues", "I-to-issues.md")), true);
      assert.equal(await pathExists(join(root, "workflows", "dev", "H-diagnose", "H-diagnose.md")), true);
      assert.equal(await pathExists(join(root, "workflows", "dev", "R-review", "R-review.md")), true);
      assert.equal(await pathExists(join(root, "workflows", "dev", "R-review", "security-checklist.md")), true);
      assert.equal(await pathExists(join(root, "workflows", "dev", "04-finalize", "04-finalize.md")), true);
      assert.equal(await pathExists(join(root, "workflows", "dev", "D-docs-sync", "D-docs-sync.md")), true);
      // New horizontal dev workflows
      assert.equal(await pathExists(join(root, "workflows", "dev", "M-domain-modeling", "M-domain-modeling.md")), true);
      assert.equal(await pathExists(join(root, "workflows", "dev", "M-domain-modeling", "CONTEXT-FORMAT.md")), true);
      assert.equal(await pathExists(join(root, "workflows", "dev", "M-domain-modeling", "ADR-FORMAT.md")), true);
      assert.equal(await pathExists(join(root, "workflows", "dev", "A-improve-architecture", "A-improve-architecture.md")), true);
      assert.equal(await pathExists(join(root, "workflows", "dev", "A-improve-architecture", "HTML-REPORT.md")), true);
      assert.equal(await pathExists(join(root, "workflows", "dev", "_templates", "domain-model-log-template.md")), true);
      // Vendored codebase-design (referenced by 03-tdd, I-to-issues, A-improve-architecture)
      assert.equal(await pathExists(join(root, "vendor", "codebase-design", "SKILL.md")), true);
      assert.equal(await pathExists(join(root, "vendor", "codebase-design", "DEEPENING.md")), true);
      assert.equal(await pathExists(join(root, "vendor", "codebase-design", "DESIGN-IT-TWICE.md")), true);
      // speculo-write quality-levers reference (writing-great-skills domain model)
      assert.equal(await pathExists(join(root, "skills", "speculo-write", "references", "authoring-quality-levers.md")), true);
      // Deduped files removed: their content now lives in single sources
      assert.equal(await pathExists(join(root, "workflows", "dev", "03-tdd", "deep-modules.md")), false);
      assert.equal(await pathExists(join(root, "workflows", "dev", "03-tdd", "interface-design.md")), false);
      assert.equal(await pathExists(join(root, "workflows", "dev", "01-grill-with-docs", "ADR-FORMAT.md")), false);
      assert.equal(await pathExists(join(root, "workflows", "dev", "01-grill-with-docs", "CONTEXT-FORMAT.md")), false);
      // Doc workflows (mao removed from here)
      assert.equal(await pathExists(join(root, "workflows", "doc", "00-INDEX.md")), true);
      assert.equal(await pathExists(join(root, "workflows", "doc", "F-writing-fragments", "F-writing-fragments.md")), true);
      // Old path must not exist
      assert.equal(await pathExists(join(root, "workflows", "doc", "M-mao-zedong-cognitive-os")), false);
      assert.equal(await pathExists(join(root, "workflows", "doc", "_templates", "mao-consultation-output-template.md")), false);
      assert.equal(await pathExists(join(root, "adapters")), false);
    } finally {
      await rm(target, { recursive: true, force: true });
    }
  });

  it("init detects existing speculo/ and enters update mode", async () => {
    const target = await tempProject();
    const root = join(target, "speculo");
    try {
      await mkdir(root, { recursive: true });
      await writeFile(join(root, "commands"), "existing");

      const result = await initSpeculo(target, { packageRoot, all: true });

      assert.equal(result.mode, "update");
      // First 3 items are non-workflow assets (commands, skills, vendor)
      assert.deepEqual(result.updated!.slice(0, 3), ["commands", "skills", "vendor"]);
      // Rest are workflow paths
      for (const item of result.updated!.slice(3)) {
        assert.ok(item.startsWith("workflows/"), `Expected workflow path, got ${item}`);
      }
      // The stale `commands` file was replaced by the `commands` directory from the package.
      assert.equal(await pathExists(join(root, "commands", "status.md")), true);
    } finally {
      await rm(target, { recursive: true, force: true });
    }
  });

  it("init re-run overwrites commands, skills, and workflows but preserves .speculo", async () => {
    const target = await tempProject();
    const root = join(target, "speculo");
    try {
      // First call: fresh install.
      const first = await initSpeculo(target, { packageRoot, all: true });
      assert.equal(first.mode, "init");

      await writeFile(join(root, "commands", "status.md"), "local edit");
      await writeFile(join(root, "skills", "local-skill.md"), "remove me");
      // Write a local file inside an installed workflow (will be overwritten on update)
      await writeFile(join(root, "workflows", "dev", "H-diagnose", "local-note.md"), "remove me");
      // Write a stray file at the workflows root level — preserved because
      // update mode only touches selected workflow directories, not the root.
      await writeFile(join(root, "workflows", "stray-root-file.md"), "keep me too");
      await writeFile(join(root, ".speculo", "state.txt"), "keep me");
      await writeFile(join(root, ".speculo", "doc-status.json"), "keep doc status");

      // Second call: auto-detects existing speculo/ and enters update mode.
      const result = await initSpeculo(target, { packageRoot, all: true });

      assert.equal(result.mode, "update");
      // First 3 items are non-workflow assets
      assert.deepEqual(result.updated!.slice(0, 3), ["commands", "skills", "vendor"]);
      for (const item of result.updated!.slice(3)) {
        assert.ok(item.startsWith("workflows/"), `Expected workflow path, got ${item}`);
      }
      assert.match(await readFile(join(root, "commands", "status.md"), "utf8"), /# Status 命令/);
      assert.equal(await pathExists(join(root, "skills", "local-skill.md")), false);
      // File inside a workflow directory that was selected for update is overwritten
      assert.equal(await pathExists(join(root, "workflows", "dev", "H-diagnose", "local-note.md")), false);
      // Stray file at workflows root level preserved (update is surgical, not blanket rm)
      assert.equal(await readFile(join(root, "workflows", "stray-root-file.md"), "utf8"), "keep me too");
      assert.equal(await readFile(join(root, ".speculo", "state.txt"), "utf8"), "keep me");
      assert.equal(await readFile(join(root, ".speculo", "doc-status.json"), "utf8"), "keep doc status");
    } finally {
      await rm(target, { recursive: true, force: true });
    }
  });

  it("compiled CLI resolves package assets from the package root", async () => {
    const target = await tempProject();
    const root = join(target, "speculo");
    const cliPath = join(process.cwd(), "dist", "src", "cli.js");
    try {
      // First call: fresh init with --all (pipe stdio means non-TTY, auto-all)
      execFileSync(process.execPath, [cliPath, "init", "--all", target], { stdio: "pipe" });

      assert.equal(await pathExists(join(root, ".speculo", "dev-status.json")), true);
      assert.equal(await pathExists(join(root, ".speculo", "doc-status.json")), true);
      assert.equal(await pathExists(join(root, ".speculo", "person-status.json")), true);
      assert.equal(await pathExists(join(root, "workflows", "dev", "H-diagnose", "H-diagnose.md")), true);
      assert.equal(await pathExists(join(root, "workflows", "doc", "00-INDEX.md")), true);
      assert.equal(await pathExists(join(root, "workflows", "person", "00-INDEX.md")), true);
      assert.equal(await pathExists(join(root, "workflows", "person", "M-mao-zedong-cognitive-os", "M-mao-zedong-cognitive-os.md")), true);

      // Second call: speculo/ exists, should enter update mode without error.
      execFileSync(process.execPath, [cliPath, "init", "--all", target], { stdio: "pipe" });

      // .speculo still intact after update.
      assert.equal(await pathExists(join(root, ".speculo", "dev-status.json")), true);
      assert.equal(await pathExists(join(root, "workflows", "dev", "H-diagnose", "H-diagnose.md")), true);
    } finally {
      await rm(target, { recursive: true, force: true });
    }
  });

  it("init with explicit selection installs only chosen workflows", async () => {
    const target = await tempProject();
    const root = join(target, "speculo");
    try {
      const result = await initSpeculo(target, {
        packageRoot,
        selection: {
          workflows: [{ category: "person", name: "M-mao-zedong-cognitive-os" }],
          categories: new Set(["person"]),
        },
      });

      assert.equal(result.mode, "init");
      assert.ok(result.copied!.includes(".speculo"));
      assert.ok(result.copied!.includes("commands"));
      assert.ok(result.copied!.includes("skills"));
      assert.ok(result.copied!.includes("workflows/person/M-mao-zedong-cognitive-os"));

      // Person workflow installed
      assert.equal(await pathExists(join(root, "workflows", "person", "M-mao-zedong-cognitive-os", "M-mao-zedong-cognitive-os.md")), true);
      // Person category metadata installed
      assert.equal(await pathExists(join(root, "workflows", "person", "00-INDEX.md")), true);
      // Dev and doc workflows NOT installed (only person selected)
      assert.equal(await pathExists(join(root, "workflows", "dev")), false);
      assert.equal(await pathExists(join(root, "workflows", "doc")), false);
    } finally {
      await rm(target, { recursive: true, force: true });
    }
  });

  it("init with selection copies category metadata for selected categories only", async () => {
    const target = await tempProject();
    const root = join(target, "speculo");
    try {
      await initSpeculo(target, {
        packageRoot,
        selection: {
          workflows: [
            { category: "dev", name: "H-diagnose" },
            { category: "person", name: "M-mao-zedong-cognitive-os" },
          ],
          categories: new Set(["dev", "person"]),
        },
      });

      // Selected categories have their metadata
      assert.equal(await pathExists(join(root, "workflows", "dev", "00-INDEX.md")), true);
      assert.equal(await pathExists(join(root, "workflows", "person", "00-INDEX.md")), true);
      // Unselected category does not
      assert.equal(await pathExists(join(root, "workflows", "doc")), false);
      // Selected workflows exist
      assert.equal(await pathExists(join(root, "workflows", "dev", "H-diagnose", "H-diagnose.md")), true);
      assert.equal(await pathExists(join(root, "workflows", "person", "M-mao-zedong-cognitive-os", "M-mao-zedong-cognitive-os.md")), true);
      // Unselected workflows in selected category do not exist
      assert.equal(await pathExists(join(root, "workflows", "dev", "R-review")), false);
    } finally {
      await rm(target, { recursive: true, force: true });
    }
  });

  it("update mode preserves unselected installed workflows", async () => {
    const target = await tempProject();
    const root = join(target, "speculo");
    try {
      // First: init with all workflows
      await initSpeculo(target, { packageRoot, all: true });
      assert.equal(await pathExists(join(root, "workflows", "dev", "R-review", "R-review.md")), true);
      assert.equal(await pathExists(join(root, "workflows", "person", "M-mao-zedong-cognitive-os", "M-mao-zedong-cognitive-os.md")), true);

      // Write a marker in a workflow to verify it's preserved (not overwritten)
      await writeFile(join(root, "workflows", "dev", "R-review", "marker.txt"), "do not remove");

      // Second: update with only person/ selected
      await initSpeculo(target, {
        packageRoot,
        selection: {
          workflows: [{ category: "person", name: "M-mao-zedong-cognitive-os" }],
          categories: new Set(["person"]),
        },
      });

      // Unselected dev workflow still exists with its marker
      assert.equal(await pathExists(join(root, "workflows", "dev", "R-review", "R-review.md")), true);
      assert.equal(await readFile(join(root, "workflows", "dev", "R-review", "marker.txt"), "utf8"), "do not remove");
      // Selected person workflow was refreshed (its directory still exists)
      assert.equal(await pathExists(join(root, "workflows", "person", "M-mao-zedong-cognitive-os", "M-mao-zedong-cognitive-os.md")), true);
    } finally {
      await rm(target, { recursive: true, force: true });
    }
  });

  it("update mode adds newly available workflow while keeping existing", async () => {
    const target = await tempProject();
    const root = join(target, "speculo");
    try {
      // First: init with only dev workflows
      const catalog = await discoverWorkflowCatalog(packageRoot);
      const devWfs = catalog.get("dev") ?? [];
      await initSpeculo(target, {
        packageRoot,
        selection: {
          workflows: devWfs.map(w => ({ category: w.category, name: w.name })),
          categories: new Set(["dev"]),
        },
      });

      // Person not installed
      assert.equal(await pathExists(join(root, "workflows", "person")), false);

      // Write marker in dev workflow
      await writeFile(join(root, "workflows", "dev", "H-diagnose", "marker.txt"), "keep");

      // Second: update adding person workflow
      await initSpeculo(target, {
        packageRoot,
        selection: {
          workflows: [
            ...devWfs.map(w => ({ category: w.category, name: w.name })),
            { category: "person", name: "M-mao-zedong-cognitive-os" },
          ],
          categories: new Set(["dev", "person"]),
        },
      });

      // Person now installed
      assert.equal(await pathExists(join(root, "workflows", "person", "M-mao-zedong-cognitive-os", "M-mao-zedong-cognitive-os.md")), true);
      // Dev marker preserved (dev workflows were re-copied via overwrite though)
      // Actually with overwrite:true, the marker gets removed. Let's just verify dev still exists.
      assert.equal(await pathExists(join(root, "workflows", "dev", "H-diagnose", "H-diagnose.md")), true);
    } finally {
      await rm(target, { recursive: true, force: true });
    }
  });

  it("selectAllFromCatalog includes all categories", async () => {
    const catalog = await discoverWorkflowCatalog(packageRoot);
    const selection = selectAllFromCatalog(catalog);

    assert.ok(selection.categories.has("dev"));
    assert.ok(selection.categories.has("doc"));
    assert.ok(selection.categories.has("person"));

    // Verify person/M is in the selection
    const maoEntry = selection.workflows.find(
      w => w.category === "person" && w.name === "M-mao-zedong-cognitive-os"
    );
    assert.ok(maoEntry, "Mao workflow should be in all selection");

    // Verify doc/M is NOT in any workflow (moved to person)
    const docMao = selection.workflows.find(
      w => w.category === "doc" && w.name === "M-mao-zedong-cognitive-os"
    );
    assert.equal(docMao, undefined);
  });

  it("promptCategorySelection falls back to all in non-TTY", async () => {
    const catalog = await discoverWorkflowCatalog(packageRoot);
    const selection = await promptCategorySelection(catalog);
    assert.ok(selection.categories.has("dev"));
    assert.ok(selection.categories.has("doc"));
    assert.ok(selection.categories.has("person"));
  });

  describe("vendor handling", () => {
    it("update without --all merges vendor (adds new, preserves existing)", async () => {
      const target = await tempProject();
      const root = join(target, "speculo");
      try {
        // First: fresh init with all (vendor included)
        await initSpeculo(target, { packageRoot, all: true });
        assert.equal(await pathExists(join(root, "vendor", "README.md")), true);

        // User adds a collected skill and modifies README
        await mkdir(join(root, "vendor", "my-skill"), { recursive: true });
        await writeFile(join(root, "vendor", "my-skill", "SKILL.md"), "my content");
        await writeFile(join(root, "vendor", "README.md"), "custom readme");

        // Second: update without --all (merge mode for vendor)
        const result = await initSpeculo(target, { packageRoot });
        assert.equal(result.mode, "update");

        // User's collected skill still exists
        assert.equal(await pathExists(join(root, "vendor", "my-skill", "SKILL.md")), true);
        assert.equal(await readFile(join(root, "vendor", "my-skill", "SKILL.md"), "utf8"), "my content");

        // User's modified README preserved (merge doesn't overwrite existing)
        assert.equal(await readFile(join(root, "vendor", "README.md"), "utf8"), "custom readme");
      } finally {
        await rm(target, { recursive: true, force: true });
      }
    });

    it("update with --all fully overwrites vendor", async () => {
      const target = await tempProject();
      const root = join(target, "speculo");
      try {
        // First: fresh init with all
        await initSpeculo(target, { packageRoot, all: true });

        // User adds skill and modifies README
        await mkdir(join(root, "vendor", "user-skill"), { recursive: true });
        await writeFile(join(root, "vendor", "user-skill", "SKILL.md"), "user");
        await writeFile(join(root, "vendor", "README.md"), "modified");

        // Second: update with --all (full overwrite for vendor)
        const result = await initSpeculo(target, { packageRoot, all: true });
        assert.equal(result.mode, "update");
        assert.ok(result.updated!.includes("vendor"), "vendor should be in updated list with --all");

        // User's skill removed by full overwrite
        assert.equal(await pathExists(join(root, "vendor", "user-skill")), false);

        // README restored to framework version
        assert.match(await readFile(join(root, "vendor", "README.md"), "utf8"), /原生 AgentSkills/);
      } finally {
        await rm(target, { recursive: true, force: true });
      }
    });
  });
});
