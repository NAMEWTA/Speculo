import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { it } from "node:test";

const source = join(process.cwd(), "template/skills/engineering-standards-builder");

function run(root: string, script: string, args: string[] = []) {
  return spawnSync(process.execPath, [join(root, "scripts", script), "--root", root, ...args], { encoding: "utf8" });
}

it("keeps Gradle fixture caches out of Builder manifests, validation and self-tests", async () => {
  const temp = await mkdtemp(join(tmpdir(), "speculo-builder-cache-"));
  const root = join(temp, "engineering-standards-builder");
  try {
    await cp(source, root, { recursive: true, filter: file => basename(file) !== ".gradle" });
    let result = run(root, "sync-manifest.mjs", ["--write"]);
    assert.equal(result.status, 0, result.stdout + result.stderr);
    const before = await readFile(join(root, "manifest.txt"), "utf8");
    const fixture = join(root, "examples/fallback/kotlin-gradle");
    const clean = spawnSync(process.execPath, [join(root, "scripts/discover-project.mjs"), "--root", fixture], { encoding: "utf8" });
    assert.equal(clean.status, 0, clean.stderr);
    await mkdir(join(fixture, ".gradle/empty"), { recursive: true });
    await writeFile(join(fixture, ".gradle/expected.json"), "invalid fixture data");
    await writeFile(join(fixture, ".gradle/cache.md"), "[not a package link](missing-file.md)\n");
    for (const script of ["sync-manifest.mjs", "validate-builder.mjs", "self-test.mjs"]) {
      result = run(root, script);
      assert.equal(result.status, 0, `${script}: ${result.stdout}${result.stderr}`);
    }
    result = run(root, "sync-manifest.mjs", ["--write"]);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(await readFile(join(root, "manifest.txt"), "utf8"), before);
    const dirty = spawnSync(process.execPath, [join(root, "scripts/discover-project.mjs"), "--root", fixture], { encoding: "utf8" });
    assert.equal(dirty.status, 0, dirty.stderr);
    assert.equal(dirty.stdout, clean.stdout);
    assert.match(before, /examples\/fallback\/kotlin-gradle\/expected\.json/);
    assert.match(before, /references\/entry-procedure\.md/);
    assert.doesNotMatch(before, /\.gradle\//);
  } finally { await rm(temp, { recursive: true, force: true }); }
});

it("validates the Builder contract through its routed entry without allowing arbitrary flat references", async () => {
  const temp = await mkdtemp(join(tmpdir(), "speculo-builder-entry-"));
  const root = join(temp, "engineering-standards-builder");
  try {
    await cp(source, root, { recursive: true, filter: file => basename(file) !== ".gradle" });
    const procedurePath = join(root, "references/entry-procedure.md");
    const procedure = await readFile(procedurePath, "utf8");
    await writeFile(procedurePath, procedure.replaceAll("Skill 边界", "boundary"));
    let result = run(root, "validate-builder.mjs");
    assert.equal(result.status, 1);
    assert.match(result.stderr, /missing core contract: Skill 边界/);
    await writeFile(procedurePath, procedure);
    const entryPath = join(root, "SKILL.md");
    await writeFile(entryPath, (await readFile(entryPath, "utf8")).replace("[\u0060references/entry-procedure.md\u0060](references/entry-procedure.md)", "entry procedure"));
    result = run(root, "validate-builder.mjs");
    assert.equal(result.status, 1);
    assert.match(result.stderr, /orphan reference not reachable from SKILL.md: references\/entry-procedure.md/);
    await writeFile(join(root, "references/unexpected.md"), "# Unexpected\n");
    result = run(root, "validate-builder.mjs");
    assert.equal(result.status, 1);
    assert.match(result.stderr, /unexpected top-level reference group: references\/unexpected.md/);
  } finally { await rm(temp, { recursive: true, force: true }); }
});
