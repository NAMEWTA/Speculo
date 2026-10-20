import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, readdir, rename, rm, symlink, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";

const tool = join(process.cwd(), "template/workflows/learning/common/tools/relocate-learning.mjs");
const validator = join(process.cwd(), "template/workflows/learning/common/tools/validate-learning.mjs");
const PARENT = "2026-10-19-parent", SOURCE = "2026-10-19-source", CHILD = "2026-10-19-child";
const json = (value: unknown) => JSON.stringify(value, null, 2) + "\n";
const readJson = async (file: string) => JSON.parse(await readFile(file, "utf8"));

async function fixture(t: { after: (fn: () => Promise<unknown>) => void }, nested = false) {
  const root = await mkdtemp(join(tmpdir(), "speculo-learning-relocation-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const seed = await readJson(join(process.cwd(), "template/workflows/learning/learning-a-assess-and-plan/assets/change-status-template.json"));
  const ids = nested ? [PARENT, SOURCE, CHILD] : [PARENT, SOURCE];
  const entries: Record<string, unknown>[] = [];
  for (const id of ids) {
    const locator = id === CHILD ? "changes/" + SOURCE + "/children/" + CHILD : "changes/" + id;
    const value = { ...structuredClone(seed), change_id: id, kind: id === PARENT || id === SOURCE && nested ? "consolidation" : "learning", domain: "programming", topic_id: "fixture", parent_change: id === CHILD ? SOURCE : null, root_change: id === CHILD ? SOURCE : id, locator, current_work: null, created_at: "2026-10-18T00:00:00.000Z", updated_at: "2026-10-18T00:00:00.000Z" };
    if (id === SOURCE && nested) value.children = [{ change_id: CHILD, locator: "changes/" + SOURCE + "/children/" + CHILD, content_hash: "0".repeat(64), effective_at: value.updated_at, lifecycle: "active" }];
    await mkdir(join(root, locator), { recursive: true });
    await writeFile(join(root, locator, ".status.json"), json(value));
    await writeFile(join(root, locator, "original.md"), "# Original " + id + "\n用户原始答案：保持字节。\n");
    await writeFile(join(root, locator, "unknown.bin"), Buffer.from([0, 1, 255, 13, 10]));
    const { change_id, kind, domain, topic_id, parent_change, root_change, current_work, works_run, updated_at } = value;
    entries.push({ change_id, kind, domain, topic_id, locator, parent_change, root_change, current_work, works_run, updated_at, extension: "preserved" });
  }
  await writeFile(join(root, "status.json"), json({ schema_version: 2, workflow: "learning", active: entries, archived: [] }));
  await writeFile(join(root, "locations.json"), json({ schema_version: 2, workflow: "learning", entries: structuredClone(entries), extension: "preserved" }));
  return root;
}

function run(root: string, args: string[]) {
  const result = spawnSync(process.execPath, [tool, "--state-root", root, ...args], { encoding: "utf8" });
  assert.ifError(result.error);
  return result;
}
function plan(root: string) {
  const result = run(root, ["--parent", PARENT, "--source", SOURCE]);
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout);
}
function apply(root: string, expected = plan(root).plan_digest) {
  return run(root, ["--parent", PARENT, "--source", SOURCE, "--apply", "--expect-digest", expected]);
}
function validate(root: string) {
  const result = spawnSync(process.execPath, [validator, "--state-root", root], { encoding: "utf8" });
  assert.ifError(result.error);
  assert.equal(result.status, 0, result.stdout + result.stderr);
}
async function snapshots(root: string, nested = false) {
  const paths = ["status.json", "locations.json", "changes/" + PARENT + "/.status.json", "changes/" + SOURCE + "/.status.json", "changes/" + SOURCE + "/original.md", "changes/" + SOURCE + "/unknown.bin"];
  if (nested) paths.push("changes/" + SOURCE + "/children/" + CHILD + "/.status.json");
  return Object.fromEntries(await Promise.all(paths.map(async (path) => [path, (await readFile(join(root, path))).toString("base64")])));
}
async function manifestPath(root: string) {
  const entries = await readdir(join(root, "transactions/relocation"));
  assert.equal(entries.length, 1);
  return join(root, "transactions/relocation", entries[0], "manifest.json");
}

async function treeBytes(root: string): Promise<Record<string, string>> {
  const result: Record<string, string> = {};
  async function visit(locator: string) {
    for (const entry of await readdir(join(root, locator), { withFileTypes: true })) {
      const path = locator ? locator + "/" + entry.name : entry.name;
      if (entry.isDirectory()) { result[path + "/"] = "directory"; await visit(path); }
      else result[path] = (await readFile(join(root, path))).toString("base64");
    }
  }
  await visit("");
  return result;
}

test("relocation dry-run writes nothing and a foreign global/root lock is preserved", async (t) => {
  const root = await fixture(t);
  const before = await snapshots(root);
  const preview = plan(root);
  assert.equal(existsSync(join(root, "transactions")), false);
  assert.deepEqual(await snapshots(root), before);
  await writeFile(join(root, ".consolidate.lock"), "another writer\n");
  const blocked = apply(root, preview.plan_digest);
  assert.equal(blocked.status, 1);
  assert.equal(await readFile(join(root, ".consolidate.lock"), "utf8"), "another writer\n");
  assert.deepEqual(await snapshots(root), before);
  await rm(join(root, ".consolidate.lock"));
  await mkdir(join(root, "locks"), { recursive: true });
  await writeFile(join(root, "locks", PARENT + ".lock"), "parent writer\n");
  const rootBlocked = apply(root);
  assert.equal(rootBlocked.status, 1);
  assert.equal(await readFile(join(root, "locks", PARENT + ".lock"), "utf8"), "parent writer\n");
  assert.equal(existsSync(join(root, ".consolidate.lock")), false);
  assert.deepEqual(await snapshots(root), before);
});

test("successful nested relocation updates every projection and exact rollback is repeatable", async (t) => {
  const root = await fixture(t, true), before = await snapshots(root, true);
  const result = apply(root);
  assert.equal(result.status, 0, result.stderr);
  const output = JSON.parse(result.stdout), status = await readJson(join(root, "status.json")), locations = await readJson(join(root, "locations.json"));
  for (const id of [SOURCE, CHILD]) {
    const expected = "changes/" + PARENT + "/children/" + SOURCE + (id === CHILD ? "/children/" + CHILD : "");
    const entry = status.active.find((entry: { change_id: string }) => entry.change_id === id);
    assert.equal(entry.locator, expected);
    assert.equal(entry.root_change, PARENT);
    assert.equal(entry.parent_change, id === CHILD ? SOURCE : PARENT);
    assert.equal(entry.extension, "preserved");
    assert.equal(locations.entries.find((entry: { change_id: string }) => entry.change_id === id).locator, expected);
    const state = await readJson(join(root, expected, ".status.json"));
    assert.equal(state.locator, expected);
    assert.equal(state.root_change, PARENT);
    assert.deepEqual(await readFile(join(root, expected, "unknown.bin")), Buffer.from([0, 1, 255, 13, 10]));
  }
  const parent = await readJson(join(root, "changes", PARENT, ".status.json"));
  assert.equal(parent.children[0].change_id, SOURCE);
  const moved = await readJson(join(root, "changes", PARENT, "children", SOURCE, ".status.json"));
  assert.equal(moved.children[0].locator, "changes/" + PARENT + "/children/" + SOURCE + "/children/" + CHILD);
  validate(root);
  assert.equal(run(root, ["--resume", output.manifest]).status, 0);
  const rollback = run(root, ["--rollback", output.manifest]);
  assert.equal(rollback.status, 0, rollback.stderr);
  assert.deepEqual(await snapshots(root, true), before);
  validate(root);
  const repeated = run(root, ["--rollback", output.manifest]);
  assert.equal(repeated.status, 0, repeated.stderr);
  assert.equal(JSON.parse(repeated.stdout).unchanged, true);
  assert.deepEqual(await snapshots(root, true), before);
});

test("terminal replay refuses the opposite valid image without changing business bytes or its journal", async (t) => {
  for (const terminal of ["applied", "rolled-back"]) {
    const root = await fixture(t, true), applied = apply(root);
    assert.equal(applied.status, 0, applied.stderr);
    const manifest = JSON.parse(applied.stdout).manifest;
    if (terminal === "rolled-back") {
      const rollback = run(root, ["--rollback", manifest]);
      assert.equal(rollback.status, 0, rollback.stderr);
    }
    const planValue = await readJson(manifest);
    assert.equal(planValue.status, terminal);
    // Simulate an operator restoring the other complete, otherwise valid image.
    // The terminal manifest remains byte-for-byte unchanged.
    for (const move of planValue.moves) await rename(join(root, terminal === "applied" ? move.to : move.from), join(root, terminal === "applied" ? move.from : move.to));
    for (const file of planValue.files) await writeFile(join(root, terminal === "applied" ? file.before_path : file.after_path), Buffer.from(terminal === "applied" ? file.before : file.after, "base64"));
    validate(root);
    const before = await treeBytes(root);
    const rejected = run(root, [terminal === "applied" ? "--resume" : "--rollback", manifest]);
    assert.equal(rejected.status, 1, rejected.stdout + rejected.stderr);
    assert.match(rejected.stderr, /terminal relocation image\/location mismatch/);
    assert.deepEqual(await treeBytes(root), before);
  }
});

test("terminal replay verifies exact metadata bytes and rejects unfinished transaction staging", async (t) => {
  for (const drift of ["image", "staging"]) {
    const root = await fixture(t), applied = apply(root);
    assert.equal(applied.status, 0, applied.stderr);
    const manifest = JSON.parse(applied.stdout).manifest, planValue = await readJson(manifest);
    const file = planValue.files[0];
    if (drift === "image") await writeFile(join(root, file.after_path), Buffer.from(file.before, "base64"));
    else await writeFile(join(root, "changes", PARENT, "children", SOURCE, ".relocation-" + planValue.transaction_id + "-0.tmp"), Buffer.from(file.after, "base64").subarray(0, 37));
    const before = await treeBytes(root);
    const rejected = run(root, ["--resume", manifest]);
    assert.equal(rejected.status, 1, rejected.stdout + rejected.stderr);
    assert.match(rejected.stderr, drift === "image" ? /terminal relocation image\/location mismatch/ : /unfinished metadata staging/);
    assert.deepEqual(await treeBytes(root), before);
  }
});

test("stale approval, parent cycles, linked sources and nested partial selection fail before movement", async (t) => {
  const root = await fixture(t, true);
  const preview = plan(root);
  await writeFile(join(root, "changes", SOURCE, "original.md"), "new user answer\n");
  assert.equal(apply(root, preview.plan_digest).status, 1);
  assert.equal(existsSync(join(root, "changes", SOURCE)), true);
  const partial = run(root, ["--parent", PARENT, "--source", CHILD]);
  assert.equal(partial.status, 1);
  const cycle = run(root, ["--parent", CHILD, "--source", SOURCE]);
  assert.equal(cycle.status, 1);
  if (process.platform !== "win32") {
    await symlink(join(root, "status.json"), join(root, "changes", SOURCE, "linked.md"));
    const linked = run(root, ["--parent", PARENT, "--source", SOURCE]);
    assert.equal(linked.status, 1);
    assert.match(linked.stderr, /unsupported entry|linked path/);
  }
});

test("failure after every business write restores the original bytes and indices", async (t) => {
  const module = await import(pathToFileURL(tool).href);
  const checkpoints = ["prepared", "forward:move:" + SOURCE, "forward:file:0", "forward:file:1", "forward:file:2", "forward:file:3"];
  for (const checkpoint of checkpoints) {
    const root = await fixture(t), before = await snapshots(root), preview = plan(root);
    await assert.rejects(module.relocateLearning({ stateRoot: root, parent: PARENT, sources: [SOURCE], apply: true, expectDigest: preview.plan_digest }, {
      checkpoint(step: string) { if (step === checkpoint) throw new Error("injected failure at " + step); },
    }), /injected failure/);
    assert.deepEqual(await snapshots(root), before);
    validate(root);
    assert.equal((await readJson(await manifestPath(root))).status, "rolled-back");
    assert.equal(existsSync(join(root, ".consolidate.lock")), false);
  }
});

test("a process crash after movement can resume or roll back using only the prewritten manifest", async (t) => {
  for (const recovery of ["--resume", "--rollback"]) {
    const root = await fixture(t, true), before = await snapshots(root, true), preview = plan(root);
    const script = "const {relocateLearning}=await import(" + JSON.stringify(pathToFileURL(tool).href) + ");await relocateLearning(" + JSON.stringify({ stateRoot: root, parent: PARENT, sources: [SOURCE], apply: true, expectDigest: preview.plan_digest }) + ",{checkpoint(step){if(step===" + JSON.stringify("forward:move:" + SOURCE) + ")process.exit(73)}})";
    const crash = spawnSync(process.execPath, ["--input-type=module", "-e", script], { encoding: "utf8" });
    assert.ifError(crash.error);
    assert.equal(crash.status, 73, crash.stderr);
    const manifest = await manifestPath(root);
    assert.equal((await readJson(manifest)).files.length, 5);
    const recovered = run(root, [recovery, manifest]);
    assert.equal(recovered.status, 0, recovered.stderr);
    validate(root);
    if (recovery === "--rollback") assert.deepEqual(await snapshots(root, true), before);
    else assert.equal(existsSync(join(root, "changes", PARENT, "children", SOURCE)), true);
    assert.equal(existsSync(join(root, ".consolidate.lock")), false);
  }
});

test("recovery refuses external content and metadata changes without overwriting them", async (t) => {
  const root = await fixture(t), result = apply(root);
  assert.equal(result.status, 0, result.stderr);
  const manifest = JSON.parse(result.stdout).manifest, path = join(root, "changes", PARENT, "children", SOURCE, "original.md");
  await writeFile(path, "external edit after apply\n");
  const global = await readFile(join(root, "status.json"), "utf8");
  const blocked = run(root, ["--rollback", manifest]);
  assert.equal(blocked.status, 1);
  assert.match(blocked.stderr, /external content drift/);
  assert.equal(await readFile(path, "utf8"), "external edit after apply\n");
  assert.equal(await readFile(join(root, "status.json"), "utf8"), global);
  assert.equal(existsSync(join(root, "changes", SOURCE)), false);
});

test("recovery finishes its interrupted metadata staging but preserves foreign staging bytes", async (t) => {
  for (const foreign of [false, true]) {
    const root = await fixture(t), before = await snapshots(root), preview = plan(root);
    const script = "const {relocateLearning}=await import(" + JSON.stringify(pathToFileURL(tool).href) + ");await relocateLearning(" + JSON.stringify({ stateRoot: root, parent: PARENT, sources: [SOURCE], apply: true, expectDigest: preview.plan_digest }) + ",{checkpoint(step){if(step===" + JSON.stringify("forward:move:" + SOURCE) + ")process.exit(73)}})";
    const crash = spawnSync(process.execPath, ["--input-type=module", "-e", script], { encoding: "utf8" });
    assert.ifError(crash.error); assert.equal(crash.status, 73, crash.stderr);
    const manifest = await manifestPath(root), planValue = await readJson(manifest);
    const staged = join(root, "changes", PARENT, "children", SOURCE, ".relocation-" + planValue.transaction_id + "-0.tmp");
    const bytes = foreign ? Buffer.from("externally edited transaction staging") : Buffer.from(planValue.files[0].after, "base64").subarray(0, 37);
    await writeFile(staged, bytes);
    const result = run(root, ["--rollback", manifest]);
    if (foreign) {
      assert.equal(result.status, 1);
      assert.match(result.stderr, /external staging drift/);
      assert.deepEqual(await readFile(staged), bytes);
    } else {
      assert.equal(result.status, 0, result.stderr);
      assert.deepEqual(await snapshots(root), before);
      validate(root);
    }
  }
});

test("recovery refuses modified global metadata and relocation-manifest mappings", async (t) => {
  for (const target of ["status.json", "manifest"]) {
    const root = await fixture(t), result = apply(root);
    assert.equal(result.status, 0, result.stderr);
    const manifest = JSON.parse(result.stdout).manifest;
    const path = target === "manifest" ? manifest : join(root, target);
    const value = await readJson(path);
    if (target === "manifest") value.files[0].after_path = "../not-authorized/.status.json";
    else value.external_owner = "new information";
    await writeFile(path, json(value));
    const before = await readFile(path, "utf8"), blocked = run(root, ["--rollback", manifest]);
    assert.equal(blocked.status, 1);
    assert.match(blocked.stderr, target === "manifest" ? /digest mismatch/ : /external metadata drift/);
    assert.equal(await readFile(path, "utf8"), before);
  }
});
