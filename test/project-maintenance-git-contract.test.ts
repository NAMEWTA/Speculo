import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmod, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

// Exercise the documented Git recipe, not a project-maintenance runner or model invocation.
const contract = await readFile("template/commands/project-maintenance/references/git-state-contract.md", "utf8");
const template = JSON.parse(await readFile("template/commands/project-maintenance/assets/state-template.json", "utf8"));
const addRecipe = contract.match(/`git (--literal-pathspecs add -A --) <本次文件列表>`/)?.[1].split(" ");
const commitRecipe = contract.match(/`git (--literal-pathspecs commit --only) -m <消息> -- <同一文件列表>`/)?.[1].split(" ");
assert.ok(addRecipe && commitRecipe, "the tested recipe must be present in the contract");

function run(repo: string, args: string[]) {
  return spawnSync("git", ["-c", "user.name=Fixture", "-c", "user.email=fixture@example.invalid",
    "-c", "commit.gpgsign=false", "-c", `core.hooksPath=${join(repo, ".git", "hooks")}`, ...args], {
    cwd: repo, encoding: "utf8",
    env: { ...process.env, GIT_CONFIG_NOSYSTEM: "1", GIT_CONFIG_GLOBAL: join(repo, "empty-git-config") },
  });
}
function git(repo: string, args: string[]) {
  const result = run(repo, args);
  assert.equal(result.status, 0, `${args.join(" ")}\n${result.stdout}${result.stderr}`);
  return result.stdout.trim();
}
async function fixture() {
  const repo = await mkdtemp(join(tmpdir(), "speculo-project-maintenance-"));
  git(repo, ["init", "-q"]);
  await mkdir(join(repo, "docs"));
  for (const path of ["README.md", "obsolete.md", "unrelated.md", "docs/[draft].md", "docs/d.md"])
    await writeFile(join(repo, path), `original ${path}\n`);
  await writeFile(join(repo, "state.json"), JSON.stringify(template));
  git(repo, ["add", "--", "README.md", "obsolete.md", "unrelated.md", "docs", "state.json"]);
  git(repo, ["commit", "-qm", "fixture input"]);
  return repo;
}

test("target-only commit preserves unrelated staged, unstaged and untracked work with literal paths", async () => {
  const repo = await fixture();
  try {
    const input = git(repo, ["rev-parse", "HEAD"]);
    await writeFile(join(repo, "unrelated.md"), "user staged\n");
    git(repo, ["add", "--", "unrelated.md"]);
    await writeFile(join(repo, "unrelated.md"), "user working copy\n");
    await writeFile(join(repo, "personal-note.md"), "untracked user work\n");
    const unrelatedIndex = git(repo, ["ls-files", "--stage", "--", "unrelated.md"]);
    await writeFile(join(repo, "README.md"), "corrected documentation\n");
    await writeFile(join(repo, "new.md"), "new documentation\n");
    await writeFile(join(repo, "docs/[draft].md"), "literal bracket path\n");
    await rm(join(repo, "obsolete.md"));
    const next = { ...template, baseline: { mode: "state-file-commit", sha: null },
      last_range: { from_sha: null, to_sha: input }, total_syncs: 1 };
    await writeFile(join(repo, "state.json"), JSON.stringify(next));
    const paths = ["README.md", "new.md", "obsolete.md", "docs/[draft].md", "state.json"];
    git(repo, [...addRecipe!, ...paths]);
    git(repo, [...commitRecipe!, "-m", "docs(project-maintenance): synchronize project documentation", "--", ...paths]);
    const output = git(repo, ["rev-parse", "HEAD"]);
    assert.equal(git(repo, ["rev-parse", "HEAD^"]), input);
    assert.deepEqual(git(repo, ["diff-tree", "--no-commit-id", "--name-only", "-r", "HEAD"]).split("\n").sort(), paths.sort());
    assert.equal(git(repo, ["ls-files", "--stage", "--", "unrelated.md"]), unrelatedIndex);
    assert.equal(await readFile(join(repo, "unrelated.md"), "utf8"), "user working copy\n");
    assert.equal(await readFile(join(repo, "personal-note.md"), "utf8"), "untracked user work\n");
    assert.equal(git(repo, ["show", "HEAD:unrelated.md"]), "original unrelated.md");
    assert.equal(git(repo, ["show", "HEAD:docs/d.md"]), "original docs/d.md");
    assert.equal(git(repo, ["log", "-1", "--format=%H", "--", "state.json"]), output);
    assert.equal(JSON.parse(git(repo, ["show", "HEAD:state.json"])).last_range.to_sha, input);
    assert.equal(git(repo, ["diff", "--name-only", "HEAD", "--", ...paths]), "");
    assert.match(git(repo, ["status", "--short"]), /MM unrelated\.md/);
  } finally { await rm(repo, { recursive: true, force: true }); }
});

test("failed commit leaves the committed cursor recoverable and retry preserves unrelated staging", async () => {
  const repo = await fixture();
  try {
    const input = git(repo, ["rev-parse", "HEAD"]);
    const beforeState = git(repo, ["show", "HEAD:state.json"]);
    await writeFile(join(repo, "unrelated.md"), "user staged\n");
    git(repo, ["add", "--", "unrelated.md"]);
    const unrelatedIndex = git(repo, ["ls-files", "--stage", "--", "unrelated.md"]);
    await writeFile(join(repo, "README.md"), "candidate docs\n");
    await writeFile(join(repo, "state.json"), JSON.stringify({ ...template,
      baseline: { mode: "state-file-commit", sha: null }, last_range: { from_sha: null, to_sha: input }, total_syncs: 1 }));
    const paths = ["README.md", "state.json"];
    git(repo, [...addRecipe!, ...paths]);
    const hook = join(repo, ".git", "hooks", "pre-commit");
    await writeFile(hook, "#!/bin/sh\nexit 1\n");
    await chmod(hook, 0o755);
    const failed = run(repo, [...commitRecipe!, "-m", "candidate", "--", ...paths]);
    assert.notEqual(failed.status, 0);
    assert.equal(git(repo, ["rev-parse", "HEAD"]), input);
    assert.equal(git(repo, ["show", "HEAD:state.json"]), beforeState);
    assert.equal(git(repo, ["log", "-1", "--format=%H", "--", "state.json"]), input);
    assert.equal(git(repo, ["ls-files", "--stage", "--", "unrelated.md"]), unrelatedIndex);
    assert.equal(await readFile(join(repo, "README.md"), "utf8"), "candidate docs\n");
    await rm(hook);
    git(repo, [...commitRecipe!, "-m", "recovered candidate", "--", ...paths]);
    assert.equal(git(repo, ["rev-parse", "HEAD^"]), input);
    assert.equal(git(repo, ["rev-list", "--count", `${input}..HEAD`]), "1");
    assert.equal(git(repo, ["ls-files", "--stage", "--", "unrelated.md"]), unrelatedIndex);
  } finally { await rm(repo, { recursive: true, force: true }); }
});
