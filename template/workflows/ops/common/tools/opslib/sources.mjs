/** Explicit pinned Git acquisition into controller-owned immutable source snapshots. */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { identifier, now, OpsError, privateDir, withLock, writeJson } from "./core.mjs";
import { load } from "./model.mjs";
import { analyze } from "./cli.mjs";

export function fetchSource(state, projectId, repo, commit, allowNetwork) {
  load(state);
  identifier(projectId);
  let u;
  try { u = new URL(repo); } catch { throw new OpsError("use an explicit credential-free HTTPS repository URL; authentication belongs in an approved Git helper"); }
  if (!allowNetwork) throw new OpsError("source-fetch requires explicit --allow-network");
  if (u.protocol !== "https:" || !u.hostname || u.username || u.password) {
    throw new OpsError("use an explicit credential-free HTTPS repository URL; authentication belongs in an approved Git helper");
  }
  if (!/^[a-f0-9]{40}$/.test(commit)) throw new OpsError("Git source must be pinned by full 40-character commit SHA");
  const dest = join(state, "sources", projectId, commit);
  const hooks = join(state, "sources", ".empty-hooks");
  privateDir(hooks);
  return withLock(join(state, ".locks", "source"), { project_id: projectId, commit }, () => {
    const env = {
      ...process.env,
      GIT_TERMINAL_PROMPT: "0",
      GIT_CONFIG_NOSYSTEM: "1",
      GIT_CONFIG_GLOBAL: process.platform === "win32" ? "NUL" : "/dev/null",
      GIT_LFS_SKIP_SMUDGE: "1",
    };
    const git = ["git", "-c", "core.hooksPath=" + hooks];
    const run = (argv, timeout) => {
      const p = spawnSync(argv[0], argv.slice(1), { env, encoding: "utf8", timeout });
      if (p.error) throw p.error;
      if (p.status !== 0) throw new Error(p.stderr || "git failed");
      return p;
    };
    if (!existsSync(dest)) {
      privateDir(join(state, "sources", projectId));
      run([...git, "clone", "--no-checkout", "--", repo, dest], 600000);
      run([...git, "-C", dest, "checkout", "--detach", commit], 300000);
    }
    const actual = run([...git, "-C", dest, "rev-parse", "HEAD"], 30000).stdout.trim();
    if (actual !== commit) throw new OpsError("source snapshot identity mismatch; do not overwrite existing checkout");
    const result = {
      project_id: projectId,
      repository: repo,
      commit,
      path: dest,
      at: now(),
      analysis: analyze(dest),
      submodules: "not initialized; each requires independent pinned review",
    };
    writeJson(join(state, "sources", projectId, commit + ".source.json"), result);
    return result;
  });
}
