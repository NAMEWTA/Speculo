import assert from "node:assert/strict";
import { chmod, link, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { test } from "node:test";
import { initSpeculo } from "../src/index.js";
import { fingerprintTree } from "../src/manifest.js";

const root = process.cwd();

test("external hardlinks and read-only handbooks are preserved", { skip: process.platform === "win32" }, async () => {
  const project = await mkdtemp(join(tmpdir(), "speculo-external-contract-"));
  try {
    await writeFile(join(project, "original.md"), "owned source\n");
    await link(join(project, "original.md"), join(project, "AGENTS.md"));
    const before = await fingerprintTree(project);
    await assert.rejects(initSpeculo(project, { packageRoot: root, selection: { workflowIds: [] } }), /unsafe-external-file/);
    assert.equal(await fingerprintTree(project), before);
    await rm(join(project, "AGENTS.md"));
    await writeFile(join(project, "AGENTS.md"), "read only\n");
    await chmod(join(project, "AGENTS.md"), 0o444);
    await assert.rejects(initSpeculo(project, { packageRoot: root, selection: { workflowIds: [] } }), /read-only-external-file/);
    assert.equal(await readFile(join(project, "AGENTS.md"), "utf8"), "read only\n");
  } finally { await chmod(join(project, "AGENTS.md"), 0o600).catch(() => {}); await rm(project, { recursive: true, force: true }); }
});
