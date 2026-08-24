import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, readdir, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";

const packageRoot = process.cwd();
const script = join(packageRoot, "template", "skills", "upstream-fork-sync", "scripts", "upstream-sync.mjs");

function command(cwd: string, ...args: string[]): string {
  const result = spawnSync(args[0], args.slice(1), { cwd, encoding: "utf8" });
  assert.equal(result.status, 0, `${args.join(" ")}\n${result.stdout}\n${result.stderr}`);
  return result.stdout.trim();
}

function runSkill(...args: string[]) {
  return spawnSync(process.execPath, [script, ...args], { encoding: "utf8" });
}

async function writeJson(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(value, null, 2) + "\n", "utf8");
}

async function readJson(path: string): Promise<Record<string, any>> {
  return JSON.parse(await readFile(path, "utf8")) as Record<string, any>;
}

async function createFixture() {
  const root = await mkdtemp(join(tmpdir(), "upstream-fork-sync-"));
  command(root, "git", "init", "-b", "main");
  command(root, "git", "config", "user.name", "Skill Test");
  command(root, "git", "config", "user.email", "skill-test@example.invalid");
  await writeFile(join(root, "base.txt"), "base\n");
  command(root, "git", "add", "base.txt");
  command(root, "git", "commit", "-m", "base");
  const base = command(root, "git", "rev-parse", "HEAD");
  command(root, "git", "branch", "upstream-line", base);
  await writeFile(join(root, "product.txt"), "product\n");
  command(root, "git", "add", "product.txt");
  command(root, "git", "commit", "-m", "product change");
  command(root, "git", "switch", "upstream-line");
  await writeFile(join(root, "src-auth.ts"), "export const auth = 1;\n");
  command(root, "git", "add", "src-auth.ts");
  command(root, "git", "commit", "-m", "upstream one");
  const upstreamOne = command(root, "git", "rev-parse", "HEAD");
  command(root, "git", "switch", "main");
  command(root, "git", "merge", "--no-ff", upstreamOne, "-m", "integrate upstream one");
  const firstMerge = command(root, "git", "rev-parse", "HEAD");
  command(root, "git", "switch", "upstream-line");
  await writeFile(join(root, "src-auth.ts"), "export const auth = 2;\n");
  command(root, "git", "add", "src-auth.ts");
  command(root, "git", "commit", "-m", "upstream two");
  const upstreamTwo = command(root, "git", "rev-parse", "HEAD");
  command(root, "git", "update-ref", "refs/remotes/upstream/main", upstreamTwo);
  command(root, "git", "switch", "main");
  command(root, "git", "update-ref", "refs/remotes/origin/main", firstMerge);

  const stateRoot = join(root, "speculo", ".speculo", "skills", "upstream-fork-sync");
  const repositoryMap = join(stateRoot, "repository-map.json");
  await writeJson(repositoryMap, {
    schema_version: 1,
    repositories: [{
      id: "app",
      path: ".",
      product_ref: "refs/heads/main",
      origin_ref: "refs/remotes/origin/main",
      origin_remote: "origin",
      upstream_ref: "refs/remotes/upstream/main",
      upstream_remote: "upstream",
      mirror_ref: "refs/heads/upstream-line",
      baseline_ref: null,
      risk_paths: ["src-*.ts"],
    }],
  });
  return { root, stateRoot, repositoryMap, upstreamOne, upstreamTwo, firstMerge };
}

function assessArgs(fixture: Awaited<ReturnType<typeof createFixture>>, ...extra: string[]): string[] {
  return [
    "assess", "--root", fixture.root, "--state-root", fixture.stateRoot,
    "--repository-map", fixture.repositoryMap, "--topic", "sync-test", "--date", "2026-08-24",
    ...extra,
  ];
}

describe("upstream-fork-sync skill", () => {
  it("documents command inputs, outputs, and examples", () => {
    const general = runSkill("--help");
    const assess = runSkill("assess", "--help");
    const record = runSkill("record-integration", "--help");
    for (const result of [general, assess, record]) assert.equal(result.status, 0, result.stderr);
    assert.match(general.stdout, /assess \[options\]/);
    assert.match(assess.stdout, /--state-root/);
    assert.match(assess.stdout, /Example:/);
    assert.match(record.stdout, /--verification/);
  });

  it("derives a proven graph checkpoint and publishes non-overwriting changes", async () => {
    const fixture = await createFixture();
    try {
      const mainBefore = command(fixture.root, "git", "rev-parse", "refs/heads/main");
      const mirrorBefore = command(fixture.root, "git", "rev-parse", "refs/heads/upstream-line");
      for (const expected of ["2026-08-24-sync-test", "2026-08-24-sync-test-01"]) {
        const result = runSkill(...assessArgs(fixture));
        assert.equal(result.status, 0, result.stderr);
        const output = JSON.parse(result.stdout);
        assert.equal(output.change, expected);
        const change = await readJson(join(output.change_dir, "state.json"));
        assert.equal(change.repositories.app.integrated_upstream_sha, fixture.upstreamOne);
        assert.equal(change.repositories.app.upstream_sha, fixture.upstreamTwo);
        assert.equal(change.repositories.app.main_merge_sha, null);
        assert.match(await readFile(join(output.change_dir, "diff-report.md"), "utf8"), /src-auth\.ts/);
        assert.match(await readFile(join(output.change_dir, "conflict-report.md"), "utf8"), /Git 确认冲突数/);
      }
      const state = await readJson(join(fixture.stateRoot, "state.json"));
      assert.equal(state.current_change, "2026-08-24-sync-test-01");
      assert.equal(state.repositories.app.integrated_upstream_sha, fixture.upstreamOne);
      assert.equal(command(fixture.root, "git", "rev-parse", "refs/heads/main"), mainBefore);
      assert.equal(command(fixture.root, "git", "rev-parse", "refs/heads/upstream-line"), mirrorBefore);
    } finally {
      await rm(fixture.root, { recursive: true, force: true });
    }
  });

  it("dry-run writes no change or root state", async () => {
    const fixture = await createFixture();
    try {
      const before = (await readdir(fixture.stateRoot)).sort();
      const result = runSkill(...assessArgs(fixture, "--dry-run"));
      assert.equal(result.status, 0, result.stderr);
      assert.equal(JSON.parse(result.stdout).change, "2026-08-24-sync-test");
      assert.deepEqual((await readdir(fixture.stateRoot)).sort(), before);
    } finally {
      await rm(fixture.root, { recursive: true, force: true });
    }
  });

  it("records only an exact reachable upstream merge parent", async () => {
    const fixture = await createFixture();
    try {
      assert.equal(runSkill(...assessArgs(fixture)).status, 0);
      const rejected = runSkill(
        "record-integration", "--root", fixture.root, "--state-root", fixture.stateRoot,
        "--repository-map", fixture.repositoryMap, "--change", "2026-08-24-sync-test",
        "--repository", "app", "--merge-commit", fixture.firstMerge, "--upstream-sha", fixture.upstreamTwo,
        "--verification", "pnpm test: exit 0",
      );
      assert.equal(rejected.status, 2);
      assert.match(rejected.stderr, /exact non-first parent/);
      command(fixture.root, "git", "merge", "--no-ff", fixture.upstreamTwo, "-m", "integrate upstream two");
      const merge = command(fixture.root, "git", "rev-parse", "HEAD");
      const result = runSkill(
        "record-integration", "--root", fixture.root, "--state-root", fixture.stateRoot,
        "--repository-map", fixture.repositoryMap, "--change", "2026-08-24-sync-test",
        "--repository", "app", "--merge-commit", merge, "--upstream-sha", fixture.upstreamTwo,
        "--verification", "pnpm test: exit 0",
      );
      assert.equal(result.status, 0, result.stderr);
      const state = await readJson(join(fixture.stateRoot, "state.json"));
      const change = await readJson(join(fixture.stateRoot, "2026-08-24-sync-test", "state.json"));
      assert.equal(state.repositories.app.integrated_upstream_sha, fixture.upstreamTwo);
      assert.equal(state.repositories.app.main_merge_sha, merge);
      assert.deepEqual(change.repositories.app.verification, ["pnpm test: exit 0"]);

      const staleChange = structuredClone(change);
      staleChange.repositories.app.upstream_sha = fixture.upstreamOne;
      staleChange.repositories.app.integrated_upstream_sha = command(fixture.root, "git", "rev-parse", `${fixture.upstreamOne}^`);
      staleChange.repositories.app.main_merge_sha = null;
      staleChange.repositories.app.recorded_at = null;
      staleChange.repositories.app.verification = [];
      await writeJson(join(fixture.stateRoot, "2026-08-24-stale", "state.json"), staleChange);
      const regression = runSkill(
        "record-integration", "--root", fixture.root, "--state-root", fixture.stateRoot,
        "--repository-map", fixture.repositoryMap, "--change", "2026-08-24-stale",
        "--repository", "app", "--merge-commit", fixture.firstMerge, "--upstream-sha", fixture.upstreamOne,
        "--verification", "pnpm test: exit 0",
      );
      assert.equal(regression.status, 2);
      assert.match(regression.stderr, /would regress the current checkpoint/);
    } finally {
      await rm(fixture.root, { recursive: true, force: true });
    }
  });

  it("marks a failed explicit fetch as stale while using the frozen local ref", async () => {
    const fixture = await createFixture();
    try {
      const map = await readJson(fixture.repositoryMap);
      map.repositories[0].upstream_remote = "missing-upstream";
      map.repositories[0].origin_remote = null;
      await writeJson(fixture.repositoryMap, map);
      const result = runSkill(...assessArgs(fixture, "--fetch"));
      assert.equal(result.status, 0, result.stderr);
      const output = JSON.parse(result.stdout);
      const report = await readFile(join(output.change_dir, "diff-report.md"), "utf8");
      assert.match(report, /Freshness \| `stale`/);
      assert.match(report, /fetch 失败/);
      assert.match(report, new RegExp(fixture.upstreamTwo));
    } finally {
      await rm(fixture.root, { recursive: true, force: true });
    }
  });

  it("stops when a configured mirror diverges from observed upstream", async () => {
    const fixture = await createFixture();
    try {
      const base = command(fixture.root, "git", "rev-parse", `${fixture.upstreamOne}^`);
      const tree = command(fixture.root, "git", "rev-parse", `${base}^{tree}`);
      const divergent = command(fixture.root, "git", "commit-tree", tree, "-p", base, "-m", "divergent mirror");
      command(fixture.root, "git", "update-ref", "refs/heads/upstream-line", divergent);
      const result = runSkill(...assessArgs(fixture));
      assert.equal(result.status, 2);
      assert.match(result.stderr, /mirror is not an ancestor/);
      assert.equal((await readdir(fixture.stateRoot)).includes("2026-08-24-sync-test"), false);
    } finally {
      await rm(fixture.root, { recursive: true, force: true });
    }
  });

  it("rejects escaped state paths and missing refs without publishing a change", async () => {
    const fixture = await createFixture();
    try {
      const escaped = runSkill(
        "assess", "--root", fixture.root, "--state-root", join(fixture.root, "..", "outside"),
        "--repository-map", fixture.repositoryMap, "--topic", "escape",
      );
      assert.equal(escaped.status, 2);
      assert.match(escaped.stderr, /must stay under project root/);

      const linkRoot = join(fixture.root, "linked-state");
      await symlink(join(fixture.root, "speculo", ".speculo"), linkRoot);
      const linked = runSkill(
        "assess", "--root", fixture.root, "--state-root", join(linkRoot, "skills", "upstream-fork-sync"),
        "--repository-map", fixture.repositoryMap, "--topic", "linked",
      );
      assert.equal(linked.status, 2);
      assert.match(linked.stderr, /must not traverse a symlink/);

      const map = await readJson(fixture.repositoryMap);
      map.repositories[0].upstream_ref = "refs/remotes/upstream/missing";
      await writeJson(fixture.repositoryMap, map);
      const missing = runSkill(...assessArgs(fixture));
      assert.equal(missing.status, 2);
      assert.match(missing.stderr, /missing commit ref/);
      assert.equal((await readdir(fixture.stateRoot)).includes("2026-08-24-sync-test"), false);
    } finally {
      await rm(fixture.root, { recursive: true, force: true });
    }
  });
});
