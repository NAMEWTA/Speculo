import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile, realpath, rename, lstat, cp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { DEFAULT_ROOTS } from "../src/paths.js";

const packageRoot = process.cwd();
const script = join(packageRoot, "template", "commands", "git-history-squash", "scripts", "git-history-squash.mjs");

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

async function initRepository(prefix = "git-history-squash-") {
  const root = await realpath(await mkdtemp(join(tmpdir(), prefix)));
  command(root, "git", "init", "-b", "main");
  command(root, "git", "config", "user.name", "Skill Test");
  command(root, "git", "config", "user.email", "skill-test@example.invalid");
  await writeFile(join(root, ".git", "info", "exclude"), "/request.json\n/.agents/speculo/.speculo/\n", "utf8");
  await mkdir(join(root, ".agents/speculo", ".speculo"), { recursive: true });
  return root;
}

async function commitFile(root: string, path: string, content: string, message: string): Promise<string> {
  await writeFile(join(root, path), content, "utf8");
  command(root, "git", "add", path);
  command(root, "git", "commit", "-m", message);
  return command(root, "git", "rev-parse", "HEAD");
}

function requestEntry(overrides: Record<string, unknown> = {}) {
  return {
    id: "app",
    path: ".",
    branch: "refs/heads/main",
    start: "HEAD~2",
    end: "HEAD",
    boundary: "exclusive",
    message: "feat: one requirement node",
    sign: false,
    remote: null,
    submodule_of: null,
    ...overrides,
  };
}

async function plan(root: string, repositories: unknown[], topic = "history-test", commandScript = script) {
  const request = join(root, "request.json");
  await writeJson(request, { schema_version: 1, topic, repositories });
  const result = spawnSync(process.execPath, [commandScript,
    "plan", "--root", root,
    "--state-root", join(root, ".agents/speculo", ".speculo", "skills", "git-history-squash"),
    "--evidence-root", join(root, ".agents/speculo", ".speculo"),
    "--request", request,
    "--date", "2026-09-02",
  ], { encoding: "utf8" });
  return result;
}

function runChange(root: string, operation: "apply" | "publish" | "status", change: string, digest?: string) {
  const args = [
    operation, "--root", root,
    "--state-root", join(root, ".agents/speculo", ".speculo", "skills", "git-history-squash"),
    "--change", change,
  ];
  if (operation === "apply") args.push("--confirm-plan", digest ?? "");
  if (operation === "publish") args.push("--confirm-publish", digest ?? "");
  return runSkill(...args);
}

function output(result: ReturnType<typeof runSkill>): Record<string, any> {
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout) as Record<string, any>;
}

async function createLinearFixture() {
  const root = await initRepository();
  const base = await commitFile(root, "app.txt", "base\n", "base");
  const first = await commitFile(root, "app.txt", "first\n", "first");
  const end = await commitFile(root, "app.txt", "end\n", "end");
  return { root, base, first, end };
}

describe("git-history-squash skill", () => {
  it("documents every operation and confirmation input", () => {
    const result = runSkill("--help");
    assert.equal(result.status, 0, result.stderr);
    for (const marker of ["plan --root", "apply --root", "publish --root", "status --root", "--confirm-plan", "--confirm-publish"]) {
      assert.match(result.stdout, new RegExp(marker));
    }
  });

  it("plans without Git writes, rejects a wrong digest, and squashes an exclusive linear range", async () => {
    const fixture = await createLinearFixture();
    try {
      const refsBefore = command(fixture.root, "git", "show-ref");
      const objectsBefore = command(fixture.root, "git", "rev-list", "--all", "--objects");
      const planned = output(await plan(fixture.root, [requestEntry({ start: fixture.base, end: fixture.end })]));
      assert.equal(command(fixture.root, "git", "show-ref"), refsBefore);
      assert.equal(command(fixture.root, "git", "rev-list", "--all", "--objects"), objectsBefore);

      const rejected = runChange(fixture.root, "apply", planned.change, "0".repeat(64));
      assert.equal(rejected.status, 2);
      assert.equal(command(fixture.root, "git", "rev-parse", "refs/heads/main"), fixture.end);

      const applied = output(runChange(fixture.root, "apply", planned.change, planned.plan_digest));
      assert.equal(applied.phase, "completed-local");
      const stateRoot = join(fixture.root, ".agents/speculo", ".speculo", "skills", "git-history-squash", planned.change);
      const state = await readJson(join(stateRoot, "state.json"));
      const repo = state.repositories[0];
      assert.equal(command(fixture.root, "git", "rev-parse", `${repo.new_head}^{tree}`), command(fixture.root, "git", "rev-parse", `${fixture.end}^{tree}`));
      assert.equal(command(fixture.root, "git", "rev-list", "--count", `${fixture.base}..${repo.new_head}`), "1");
      assert.equal(command(fixture.root, "git", "rev-parse", repo.backup_ref), fixture.end);
      assert.equal(command(fixture.root, "git", "status", "--porcelain"), "");
      assert.equal(output(runChange(fixture.root, "status", planned.change)).phase, "completed-local");
      const report = await readFile(join(stateRoot, "report.md"), "utf8");
      assert.doesNotMatch(report, new RegExp(fixture.root.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
      assert.doesNotMatch(report, /skill-test@example\.invalid/);
    } finally {
      await rm(fixture.root, { recursive: true, force: true });
    }
  });

  it("includes a merge start by selecting its first parent as baseline", async () => {
    const root = await initRepository();
    try {
      const base = await commitFile(root, "base.txt", "base\n", "base");
      command(root, "git", "switch", "-c", "side");
      await commitFile(root, "side.txt", "side\n", "side");
      command(root, "git", "switch", "main");
      await commitFile(root, "main.txt", "main\n", "main");
      command(root, "git", "merge", "--no-ff", "side", "-m", "merge side");
      const merge = command(root, "git", "rev-parse", "HEAD");
      const end = await commitFile(root, "end.txt", "end\n", "end");
      const planned = output(await plan(root, [requestEntry({ start: merge, end, boundary: "inclusive" })], "merge-start"));
      const stateBefore = await readJson(join(root, ".agents/speculo", ".speculo", "skills", "git-history-squash", planned.change, "state.json"));
      assert.equal(stateBefore.repositories[0].baseline_sha, command(root, "git", "rev-parse", `${merge}^1`));
      assert.equal(stateBefore.repositories[0].counts.merges, 1);
      output(runChange(root, "apply", planned.change, planned.plan_digest));
      const stateAfter = await readJson(join(root, ".agents/speculo", ".speculo", "skills", "git-history-squash", planned.change, "state.json"));
      const newHead = stateAfter.repositories[0].new_head;
      assert.equal(command(root, "git", "show", "-s", "--format=%P", newHead), command(root, "git", "rev-parse", `${merge}^1`));
      assert.equal(command(root, "git", "rev-parse", `${newHead}^{tree}`), command(root, "git", "rev-parse", `${end}^{tree}`));
      assert.notEqual(base, newHead);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("supports an inclusive root range and leaves one root commit", async () => {
    const fixture = await createLinearFixture();
    try {
      const planned = output(await plan(fixture.root, [requestEntry({ start: fixture.base, end: fixture.end, boundary: "inclusive" })], "root-range"));
      output(runChange(fixture.root, "apply", planned.change, planned.plan_digest));
      const state = await readJson(join(fixture.root, ".agents/speculo", ".speculo", "skills", "git-history-squash", planned.change, "state.json"));
      const newHead = state.repositories[0].new_head;
      assert.equal(command(fixture.root, "git", "rev-list", "--count", newHead), "1");
      assert.equal(command(fixture.root, "git", "show", "-s", "--format=%P", newHead), "");
    } finally {
      await rm(fixture.root, { recursive: true, force: true });
    }
  });

  it("fails closed on dirty worktrees and non-first-parent starts", async () => {
    const fixture = await createLinearFixture();
    try {
      await writeFile(join(fixture.root, "untracked.txt"), "dirty\n", "utf8");
      const dirty = await plan(fixture.root, [requestEntry({ start: fixture.base, end: fixture.end })], "dirty-tree");
      assert.equal(dirty.status, 2);
      assert.match(dirty.stderr, /dirty worktree/);
      assert.equal(command(fixture.root, "git", "rev-parse", "HEAD"), fixture.end);
      await rm(join(fixture.root, "untracked.txt"));

      command(fixture.root, "git", "switch", "-c", "side", fixture.base);
      const side = await commitFile(fixture.root, "side.txt", "side\n", "side");
      command(fixture.root, "git", "switch", "main");
      const invalid = await plan(fixture.root, [requestEntry({ start: side, end: fixture.end })], "side-start");
      assert.equal(invalid.status, 2);
      assert.match(invalid.stderr, /first-parent chain/);
    } finally {
      await rm(fixture.root, { recursive: true, force: true });
    }
  });

  it("blocks SHAs referenced by an active workflow change", async () => {
    const fixture = await createLinearFixture();
    try {
      const changeRoot = join(fixture.root, ".agents/speculo", ".speculo", "learning", "changes", "2026-09-02-active-change");
      await writeJson(join(changeRoot, ".status.json"), { change_status: "active" });
      await writeFile(join(changeRoot, "spec.md"), `source revision: ${fixture.end}\n`, "utf8");

      const blocked = await plan(fixture.root, [requestEntry({ start: fixture.base, end: fixture.end })], "active-evidence");
      assert.equal(blocked.status, 2);
      assert.match(blocked.stderr, /active workflow evidence/);

      await writeJson(join(changeRoot, ".status.json"), { change_status: "completed" });
      const planned = output(await plan(fixture.root, [requestEntry({ start: fixture.base, end: fixture.end })], "completed-evidence"));
      assert.equal(planned.next_action, "confirm-local");
    } finally {
      await rm(fixture.root, { recursive: true, force: true });
    }
  });

  it("protects Markdown SpecDev evidence and rejects ambiguous or legacy active authority", async () => {
    const fixture = await createLinearFixture();
    try {
      // Exercise the deployed consumer so archive validation has the same installed roots.
      const methodRoot = join(fixture.root, ".agents/speculo");
      await cp(join(packageRoot, "template"), methodRoot, { recursive: true });
      await writeJson(join(methodRoot, ".speculo/workspace.json"), {
        schema_version: 2, layout_version: "agents-v2", installation_id: "00000000-0000-4000-8000-000000000001",
        path_base: "project-root", roots: DEFAULT_ROOTS,
      });
      await writeFile(join(fixture.root, ".git/info/exclude"), "/request.json\n/.agents/\n");
      const installedScript = join(methodRoot, "commands/git-history-squash/scripts/git-history-squash.mjs");
      const planInstalled = (root: string, repositories: unknown[], topic: string) => plan(root, repositories, topic, installedScript);
      const specdev = join(fixture.root, ".agents/speculo/.speculo/specdev");
      const changeRoot = join(specdev, "changes/2026-09-02-markdown-change");
      await mkdir(changeRoot, { recursive: true });
      await writeFile(join(changeRoot, "evidence.md"), `Source revision: ${fixture.end}\n`);
      const readme = join(changeRoot, "README.md");
      const head = command(fixture.root, "git", "rev-parse", "HEAD");
      const index = await readFile(join(fixture.root, ".git/index"));
      for (const [label, text, diagnostic] of [
        ["active", "Outcome: active\n", /active workflow evidence/],
        ["cancelled", "Outcome: cancelled\n", /active workflow evidence/],
        ["duplicate", "Outcome: completed\nOutcome: active\n", /outcome-invalid/],
        ["missing", "# No outcome\n", /outcome-invalid/],
      ] as const) {
        await writeFile(readme, text);
        const blocked = await planInstalled(fixture.root, [requestEntry({ start: fixture.base, end: fixture.end })], `markdown-${label}`);
        assert.equal(blocked.status, 2, blocked.stderr);
        assert.match(blocked.stderr, diagnostic);
        assert.equal(await readFile(readme, "utf8"), text);
        assert.equal(command(fixture.root, "git", "rev-parse", "HEAD"), head);
        assert.deepEqual(await readFile(join(fixture.root, ".git/index")), index);
      }
      await writeFile(readme, "Outcome: completed\n");
      for (const marker of [".markdown-conversion-pending", "status.json"]) {
        await writeFile(join(specdev, marker), "{}");
        const blocked = await planInstalled(fixture.root, [requestEntry({ start: fixture.base, end: fixture.end })], "markdown-pending");
        assert.equal(blocked.status, 2);
        assert.match(blocked.stderr, /recovery-required|legacy-active-needs-conversion/);
        await rm(join(specdev, marker));
      }
      await writeJson(join(changeRoot, ".status.json"), { change_status: "completed" });
      const mixed = await planInstalled(fixture.root, [requestEntry({ start: fixture.base, end: fixture.end })], "markdown-mixed");
      assert.equal(mixed.status, 2);
      assert.match(mixed.stderr, /mixed-protocol/);
      await rm(join(changeRoot, ".status.json"));
      assert.equal(output(await planInstalled(fixture.root, [requestEntry({ start: fixture.base, end: fixture.end })], "markdown-completed")).next_action, "confirm-local");
      const archive = join(specdev, "changes/archive/2026-09-02-markdown-change");
      await mkdir(dirname(archive), { recursive: true });
      await rename(changeRoot, archive);
      await writeFile(join(archive, 'README.md'), `# Cancelled
Outcome: cancelled

## Ownership
Owner: test-owner
Evidence: #handoff

<a id="handoff"></a>
## Original session
Session: test-owner
Source: isolated fixture assignment
Observed: original owner continues this fixture

<a id="cancellation"></a>
## Cancellation
Source: #request
Scope: Entire original change
Time: 2026-10-14T10:00:00Z
Confirmed-By: test-owner
Undelivered: Fixture requirement remains unimplemented
Landed: none: analysis only
Writers: none: no workers dispatched
Dependencies: none: independent fixture
Checkpoints: none: no implementation commits
External: none: no remote actions requested
Next: retain evidence; no cleanup authorized

<a id="request"></a>
## Original request
Cancel the entire isolated fixture change.
`);
      const unsealed = await planInstalled(fixture.root, [requestEntry({ start: fixture.base, end: fixture.end })], "markdown-unsealed");
      assert.equal(unsealed.status, 2);
      assert.match(unsealed.stderr, /not verified as sealed/);
      const digest = (bytes: string | Buffer) => createHash('sha256').update(bytes).digest('hex');
      const approval = 'Archive 2026-09-02-markdown-change with operation ARCHIVE-TEST by test-owner.\n';
      await writeFile(join(archive, 'archive-approval.md'), approval);
      const entries = [];
      for (const path of ['README.md', 'evidence.md', 'archive-approval.md']) entries.push({path,type:'file',mode:(await lstat(join(archive,path))).mode & 0o7777,sha256:digest(await readFile(join(archive,path)))});
      const manifest = JSON.stringify({entries});
      await writeFile(join(archive, 'archive-manifest.json'), manifest);
      const receipt = `<a id="archive-2026-09-02-markdown-change"></a>\n## Archive\nChange: 2026-09-02-markdown-change\nOwner: test-owner\nOperation: ARCHIVE-TEST\nApproval: change:archive-approval.md\nApproval-SHA256: ${digest(approval)}\nSource: changes/2026-09-02-markdown-change\nTarget: changes/archive/2026-09-02-markdown-change\nResult: moved\nIntegrity: change:archive-manifest.json\nIntegrity-SHA256: ${digest(manifest)}\nTime: 2026-10-14T10:00:00Z\n`;
      await writeFile(join(archive, 'archive-receipt.md'), receipt);
      const moved = await planInstalled(fixture.root, [requestEntry({ start: fixture.base, end: fixture.end })], "markdown-moved");
      assert.equal(moved.status, 2);
      assert.match(moved.stderr, /not sealed/);
      await writeFile(join(archive, 'archive-receipt.md'), receipt.replace('Result: moved', 'Result: verified'));
      assert.equal(output(await planInstalled(fixture.root, [requestEntry({ start: fixture.base, end: fixture.end })], "markdown-archived")).next_action, "confirm-local");
      await mkdir(changeRoot);
      await writeFile(readme, "Outcome: active\n");
      const duplicate = await planInstalled(fixture.root, [requestEntry({ start: fixture.base, end: fixture.end })], "markdown-identity");
      assert.equal(duplicate.status, 2);
      assert.match(duplicate.stderr, /identity-conflict/);
    } finally {
      await rm(fixture.root, { recursive: true, force: true });
    }
  });

  it("rejects persisted state path tampering before creating Git objects", async () => {
    const fixture = await createLinearFixture();
    try {
      const planned = output(await plan(fixture.root, [requestEntry({ start: fixture.base, end: fixture.end })], "state-tamper"));
      const statePath = join(fixture.root, ".agents/speculo", ".speculo", "skills", "git-history-squash", planned.change, "state.json");
      const state = await readJson(statePath);
      state.repositories[0].path = "../outside";
      await writeJson(statePath, state);

      const rejected = runChange(fixture.root, "apply", planned.change, planned.plan_digest);
      assert.equal(rejected.status, 2);
      assert.match(rejected.stderr, /must be a POSIX project-relative path/);
      assert.equal(command(fixture.root, "git", "rev-parse", "refs/heads/main"), fixture.end);
      assert.equal(command(fixture.root, "git", "rev-list", "--all", "--count"), "3");
    } finally {
      await rm(fixture.root, { recursive: true, force: true });
    }
  });

  it("rechecks Markdown evidence after plan approval without changing refs or the index", async () => {
    const fixture = await createLinearFixture();
    try {
      const planned = output(await plan(fixture.root, [requestEntry({ start: fixture.base, end: fixture.end })], "evidence-drift"));
      const changeRoot = join(fixture.root, ".agents/speculo/.speculo/specdev/changes/2026-09-02-later-task");
      await mkdir(changeRoot, { recursive: true });
      await writeFile(join(changeRoot, "README.md"), `Outcome: active\nSource checkpoint: ${fixture.end}\n`);
      const refs = command(fixture.root, "git", "show-ref");
      const index = await readFile(join(fixture.root, ".git/index"));
      const rejected = runChange(fixture.root, "apply", planned.change, planned.plan_digest);
      assert.equal(rejected.status, 2);
      assert.match(rejected.stderr, /active workflow evidence/);
      assert.equal(command(fixture.root, "git", "show-ref"), refs);
      assert.deepEqual(await readFile(join(fixture.root, ".git/index")), index);
      const statePath = join(fixture.root, ".agents/speculo/.speculo/skills/git-history-squash", planned.change, "state.json");
      const state = await readJson(statePath);
      assert.equal(state.phase, "planned");
      assert.deepEqual(state.confirmations, []);
      state.evidence_root = ".agents/speculo/.speculo/specdev";
      await writeJson(statePath, state);
      const tampered = runChange(fixture.root, "apply", planned.change, planned.plan_digest);
      assert.equal(tampered.status, 2);
      assert.match(tampered.stderr, /manifest|digest/);
      assert.equal(command(fixture.root, "git", "show-ref"), refs);
    } finally {
      await rm(fixture.root, { recursive: true, force: true });
    }
  });

  it("keeps recovery blocked when an applied worktree has drifted", async () => {
    const fixture = await createLinearFixture();
    try {
      const planned = output(await plan(fixture.root, [requestEntry({ start: fixture.base, end: fixture.end })], "recovery-drift"));
      output(runChange(fixture.root, "apply", planned.change, planned.plan_digest));
      await writeFile(join(fixture.root, "app.txt"), "unexpected drift\n", "utf8");

      const recovered = runChange(fixture.root, "status", planned.change);
      assert.equal(recovered.status, 2);
      assert.match(recovered.stderr, /worktree|blocked/);
      const runRoot = join(fixture.root, ".agents/speculo", ".speculo", "skills", "git-history-squash", planned.change);
      const state = await readJson(join(runRoot, "state.json"));
      assert.equal(state.phase, "blocked-partial");
      assert.equal(state.next_action, "blocked");
      assert.match(await readFile(join(runRoot, "report.md"), "utf8"), /Blocking Error/);
    } finally {
      await rm(fixture.root, { recursive: true, force: true });
    }
  });

  it("publishes with an exact lease and rejects collaborator drift", async () => {
    const fixture = await createLinearFixture();
    const remote = await mkdtemp(join(tmpdir(), "git-history-squash-remote-"));
    const collaborator = await mkdtemp(join(tmpdir(), "git-history-squash-collaborator-"));
    try {
      command(remote, "git", "init", "--bare");
      command(remote, "git", "symbolic-ref", "HEAD", "refs/heads/main");
      command(fixture.root, "git", "remote", "add", "origin", remote);
      command(fixture.root, "git", "push", "-u", "origin", "main");
      const entry = requestEntry({
        start: fixture.base,
        end: fixture.end,
        remote: { name: "origin", branch: "refs/heads/main", publish: true },
      });
      const planned = output(await plan(fixture.root, [entry], "remote-lease"));
      const applied = output(runChange(fixture.root, "apply", planned.change, planned.plan_digest));
      assert.equal(applied.next_action, "confirm-publish");

      command(collaborator, "git", "clone", remote, ".");
      command(collaborator, "git", "config", "user.name", "Collaborator");
      command(collaborator, "git", "config", "user.email", "collaborator@example.invalid");
      await commitFile(collaborator, "collaborator.txt", "new\n", "collaborator update");
      command(collaborator, "git", "push", "origin", "main");
      const remoteAfter = command(collaborator, "git", "rev-parse", "HEAD");

      const rejected = runChange(fixture.root, "publish", planned.change, applied.publish_digest);
      assert.equal(rejected.status, 2);
      assert.match(rejected.stderr, /remote tip is not present locally|remote lease drifted/);
      assert.equal(command(remote, "git", "rev-parse", "refs/heads/main"), remoteAfter);
    } finally {
      await rm(fixture.root, { recursive: true, force: true });
      await rm(remote, { recursive: true, force: true });
      await rm(collaborator, { recursive: true, force: true });
    }
  });

  it("publishes children before creating and publishing an aggregate gitlink", async () => {
    const fixtureRoot = await mkdtemp(join(tmpdir(), "git-history-squash-submodule-"));
    const childRemote = join(fixtureRoot, "child-remote.git");
    const childSeed = join(fixtureRoot, "child-seed");
    const parentRemote = join(fixtureRoot, "parent-remote.git");
    const parent = join(fixtureRoot, "workspace");
    try {
      await mkdir(childRemote);
      command(childRemote, "git", "init", "--bare");
      command(childRemote, "git", "symbolic-ref", "HEAD", "refs/heads/main");
      await mkdir(childSeed);
      command(childSeed, "git", "init", "-b", "main");
      command(childSeed, "git", "config", "user.name", "Skill Test");
      command(childSeed, "git", "config", "user.email", "skill-test@example.invalid");
      const childBase = await commitFile(childSeed, "child.txt", "base\n", "child base");
      await commitFile(childSeed, "child.txt", "one\n", "child one");
      const childEnd = await commitFile(childSeed, "child.txt", "two\n", "child two");
      command(childSeed, "git", "remote", "add", "origin", childRemote);
      command(childSeed, "git", "push", "-u", "origin", "main");

      await mkdir(parentRemote);
      command(parentRemote, "git", "init", "--bare");
      command(parentRemote, "git", "symbolic-ref", "HEAD", "refs/heads/main");
      await mkdir(parent);
      command(parent, "git", "init", "-b", "main");
      command(parent, "git", "config", "user.name", "Skill Test");
      command(parent, "git", "config", "user.email", "skill-test@example.invalid");
      await writeFile(join(parent, ".git", "info", "exclude"), "/request.json\n/.agents/speculo/.speculo/\n", "utf8");
      const parentBase = await commitFile(parent, "parent.txt", "base\n", "parent base");
      command(parent, "git", "-c", "protocol.file.allow=always", "submodule", "add", "-b", "main", childRemote, "child");
      command(join(parent, "child"), "git", "config", "user.name", "Skill Test");
      command(join(parent, "child"), "git", "config", "user.email", "skill-test@example.invalid");
      command(parent, "git", "commit", "-am", "add child");
      const parentStart = command(parent, "git", "rev-parse", "HEAD");
      const parentEnd = await commitFile(parent, "parent.txt", "end\n", "parent end");
      command(parent, "git", "remote", "add", "origin", parentRemote);
      command(parent, "git", "push", "-u", "origin", "main");
      await mkdir(join(parent, ".agents/speculo", ".speculo"), { recursive: true });

      const repositories = [
        requestEntry({
          id: "child",
          path: "child",
          start: childBase,
          end: childEnd,
          remote: { name: "origin", branch: "refs/heads/main", publish: true },
          submodule_of: { repository: "workspace", gitlink_path: "child" },
        }),
        requestEntry({
          id: "workspace",
          path: ".",
          start: parentStart,
          end: parentEnd,
          boundary: "inclusive",
          remote: { name: "origin", branch: "refs/heads/main", publish: true },
        }),
      ];
      const planned = output(await plan(parent, repositories, "submodule-graph"));
      let state = await readJson(join(parent, ".agents/speculo", ".speculo", "skills", "git-history-squash", planned.change, "state.json"));
      assert.deepEqual(state.local_manifest.map((item: any) => item.repository), ["child"]);

      const childApplied = output(runChange(parent, "apply", planned.change, planned.plan_digest));
      assert.equal(childApplied.next_action, "confirm-publish");
      const childPublished = output(runChange(parent, "publish", planned.change, childApplied.publish_digest));
      assert.equal(childPublished.next_action, "confirm-local");
      state = await readJson(join(parent, ".agents/speculo", ".speculo", "skills", "git-history-squash", planned.change, "state.json"));
      assert.deepEqual(state.local_manifest.map((item: any) => item.repository), ["workspace"]);
      const childNew = state.repositories.find((item: any) => item.id === "child").new_head;
      assert.equal(command(childRemote, "git", "rev-parse", "refs/heads/main"), childNew);

      const parentApplied = output(runChange(parent, "apply", planned.change, childPublished.plan_digest));
      const parentPublished = output(runChange(parent, "publish", planned.change, parentApplied.publish_digest));
      assert.equal(parentPublished.phase, "completed-published");
      state = await readJson(join(parent, ".agents/speculo", ".speculo", "skills", "git-history-squash", planned.change, "state.json"));
      const parentNew = state.repositories.find((item: any) => item.id === "workspace").new_head;
      const gitlink = command(parent, "git", "ls-tree", parentNew, "child").split(/\s+/)[2];
      assert.equal(gitlink, childNew);
      assert.equal(command(parentRemote, "git", "rev-parse", "refs/heads/main"), parentNew);
      assert.equal(command(parent, "git", "status", "--porcelain"), "");
      assert.notEqual(parentBase, parentNew);
    } finally {
      await rm(fixtureRoot, { recursive: true, force: true });
    }
  });
});
