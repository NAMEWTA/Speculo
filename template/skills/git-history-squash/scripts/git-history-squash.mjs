#!/usr/bin/env node

import { createHash, randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import {
  closeSync,
  existsSync,
  fsyncSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  openSync,
  readFileSync,
  realpathSync,
  readdirSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';

export const SCHEMA_VERSION = 1;
const TERMINAL = new Set(['local-only', 'published']);
const REPOSITORY_STATUSES = new Set(['planned', 'object-created', 'local-updated', 'local-verified', 'local-only', 'publishing', 'published', 'blocked']);
const KEBAB = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ZERO_OID = '0'.repeat(40);
const OID = /^[0-9a-f]{40}$/;

export class SquashError extends Error {}

function usage(code = 0) {
  const out = code === 0 ? console.log : console.error;
  out(`Usage:
  git-history-squash.mjs plan --root <path> --state-root <path> --evidence-root <path> --request <json> [--date YYYY-MM-DD]
  git-history-squash.mjs apply --root <path> --state-root <path> --change <name> --confirm-plan <sha256>
  git-history-squash.mjs publish --root <path> --state-root <path> --change <name> --confirm-publish <sha256>
  git-history-squash.mjs status --root <path> --state-root <path> --change <name>

Examples:
  node git-history-squash.mjs plan --root . --state-root speculo/.speculo/skills/git-history-squash --evidence-root speculo/.speculo --request request.json
  node git-history-squash.mjs apply --root . --state-root speculo/.speculo/skills/git-history-squash --change 2026-09-02-account-profile --confirm-plan <digest>`);
  process.exit(code);
}

function parseArgs(argv) {
  const operation = argv[0];
  if (!operation || operation === '--help' || operation === '-h') usage(0);
  const values = {};
  for (let index = 1; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help' || arg === '-h') usage(0);
    if (!arg.startsWith('--')) throw new SquashError(`unexpected argument: ${arg}`);
    const value = argv[++index];
    if (value === undefined || value.startsWith('--')) throw new SquashError(`${arg} requires a value`);
    const key = arg.slice(2).replaceAll('-', '_');
    if (key in values) throw new SquashError(`duplicate option: ${arg}`);
    values[key] = value;
  }
  return { operation, values };
}

function required(values, key) {
  if (!values[key]) throw new SquashError(`--${key.replaceAll('_', '-')} is required`);
  return values[key];
}

function now() {
  return new Date().toISOString();
}

function today() {
  return now().slice(0, 10);
}

function sha256(value) {
  return createHash('sha256').update(typeof value === 'string' ? value : stableJson(value)).digest('hex');
}

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  }
  return value;
}

function stableJson(value) {
  return JSON.stringify(stable(value));
}

function sanitize(value, root = null) {
  let text = String(value ?? '');
  if (root) text = text.replaceAll(resolve(root), '.');
  return text
    .replace(/\b(?:https?|ssh):\/\/[^\s]+/gi, '<redacted-url>')
    .replace(/\b[A-Za-z][A-Za-z0-9+.-]*:\/\/[^\s]+/g, '<redacted-url>')
    .replace(/([?&](?:token|access_token|auth|key)=)[^&\s]+/gi, '$1<redacted>')
    .replace(/\b(?:ghp|github_pat|glpat)-?[A-Za-z0-9_]{12,}\b/g, '<redacted-token>')
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '<redacted-email>');
}

function shellQuote(value) {
  return `'${String(value).replaceAll("'", `'"'"'`)}'`;
}

function run(cwd, command, args, options = {}) {
  const allowed = options.allowed ?? [0];
  const result = spawnSync(command, args, {
    cwd,
    encoding: 'utf8',
    input: options.input,
    env: { ...process.env, ...(options.env ?? {}) },
    maxBuffer: 64 * 1024 * 1024,
    timeout: options.timeout ?? 120_000,
  });
  if (result.error) throw new SquashError(`${command} failed: ${result.error.message}`);
  const status = result.status ?? 1;
  if (!allowed.includes(status)) {
    const detail = sanitize(result.stderr || result.stdout || `exit ${status}`, cwd).trim();
    throw new SquashError(`${command} ${args[0] ?? ''} failed (${status}): ${detail}`);
  }
  return { status, stdout: result.stdout ?? '', stderr: result.stderr ?? '' };
}

function git(repo, args, options = {}) {
  return run(repo, 'git', args, options);
}

function inside(root, value, label, { allowRoot = false, mustExist = true } = {}) {
  const target = resolve(root, value);
  const relation = relative(resolve(root), target);
  if (isAbsolute(relation) || relation === '..' || relation.startsWith(`..${sep}`)) {
    throw new SquashError(`${label} must stay under project root`);
  }
  if (!allowRoot && !relation) throw new SquashError(`${label} must not equal project root`);
  let current = resolve(root);
  for (const segment of relation.split(sep).filter(Boolean)) {
    current = join(current, segment);
    if (!existsSync(current)) {
      if (mustExist) throw new SquashError(`${label} does not exist`);
      break;
    }
    if (lstatSync(current).isSymbolicLink()) throw new SquashError(`${label} must not traverse a symlink`);
  }
  return target;
}

function ensureDirectory(path, label) {
  if (!existsSync(path) || !statSync(path).isDirectory()) throw new SquashError(`${label} is not a directory`);
  if (lstatSync(path).isSymbolicLink()) throw new SquashError(`${label} must not be a symlink`);
}

function readJson(path, label) {
  if (!existsSync(path)) throw new SquashError(`${label} does not exist`);
  if (lstatSync(path).isSymbolicLink()) throw new SquashError(`${label} must not be a symlink`);
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    throw new SquashError(`${label} is not valid JSON: ${error.message}`);
  }
}

function atomicWrite(path, content) {
  mkdirSync(dirname(path), { recursive: true });
  if (existsSync(path) && lstatSync(path).isSymbolicLink()) throw new SquashError(`refusing to replace symlink: ${basename(path)}`);
  const temporary = join(dirname(path), `.${basename(path)}.${process.pid}.${randomBytes(4).toString('hex')}.tmp`);
  const fd = openSync(temporary, 'wx', 0o600);
  try {
    writeFileSync(fd, content, 'utf8');
    fsyncSync(fd);
  } finally {
    closeSync(fd);
  }
  renameSync(temporary, path);
}

function atomicJson(path, value) {
  atomicWrite(path, `${JSON.stringify(value, null, 2)}\n`);
}

function validateRootCursor(stateRoot) {
  const path = join(stateRoot, 'state.json');
  if (!existsSync(path)) return;
  const value = readJson(path, 'root state');
  exactKeys(value, ['schema_version', 'current_change'], 'root state');
  if (value.schema_version !== SCHEMA_VERSION) throw new SquashError(`unsupported root state schema: ${value.schema_version}`);
  if (value.current_change !== null && typeof value.current_change !== 'string') throw new SquashError('root state current_change must be a string or null');
}

function resolveCommit(repo, ref, requiredValue = true) {
  const result = git(repo, ['rev-parse', '--verify', `${ref}^{commit}`], { allowed: [0, 128] });
  if (result.status === 0) return result.stdout.trim();
  if (requiredValue) throw new SquashError(`missing commit: ${ref}`);
  return null;
}

function resolveTree(repo, ref) {
  return git(repo, ['rev-parse', '--verify', `${ref}^{tree}`]).stdout.trim();
}

function revList(repo, args) {
  return git(repo, ['rev-list', ...args]).stdout.split('\n').filter(Boolean);
}

function isAncestor(repo, ancestor, descendant) {
  return git(repo, ['merge-base', '--is-ancestor', ancestor, descendant], { allowed: [0, 1] }).status === 0;
}

function validateRef(repo, ref, label) {
  if (typeof ref !== 'string' || !ref.startsWith('refs/heads/')) throw new SquashError(`${label} must be a full refs/heads ref`);
  if (git(repo, ['check-ref-format', ref], { allowed: [0, 1] }).status !== 0) throw new SquashError(`${label} is invalid`);
}

function validateOid(value, label, { nullable = false } = {}) {
  if (nullable && value === null) return;
  if (typeof value !== 'string' || !OID.test(value)) throw new SquashError(`${label} must be a full object id`);
}

function safePath(value, label) {
  if (typeof value !== 'string' || !value || value.includes('\\') || isAbsolute(value) || value.split('/').includes('..')) {
    throw new SquashError(`${label} must be a POSIX project-relative path`);
  }
}

function exactKeys(value, keys, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new SquashError(`${label} must be an object`);
  const actual = Object.keys(value).sort().join(',');
  const expected = [...keys].sort().join(',');
  if (actual !== expected) throw new SquashError(`${label} must contain exactly: ${[...keys].sort().join(', ')}`);
}

function loadRequest(path) {
  const request = readJson(resolve(path), 'request');
  exactKeys(request, ['schema_version', 'topic', 'repositories'], 'request');
  if (request.schema_version !== SCHEMA_VERSION) throw new SquashError(`unsupported request schema: ${request.schema_version}`);
  if (!KEBAB.test(request.topic)) throw new SquashError('request.topic must be lowercase ASCII kebab-case');
  if (!Array.isArray(request.repositories) || request.repositories.length === 0) throw new SquashError('request.repositories must be non-empty');
  const ids = new Set();
  for (const [index, item] of request.repositories.entries()) {
    exactKeys(item, ['id', 'path', 'branch', 'start', 'end', 'boundary', 'message', 'sign', 'remote', 'submodule_of'], `repositories[${index}]`);
    if (!KEBAB.test(item.id) || ids.has(item.id)) throw new SquashError(`repository id must be unique kebab-case: ${item.id}`);
    ids.add(item.id);
    safePath(item.path, `${item.id}.path`);
    if (typeof item.branch !== 'string' || !item.branch) throw new SquashError(`${item.id}.branch is required`);
    if (typeof item.start !== 'string' || !item.start || typeof item.end !== 'string' || !item.end) throw new SquashError(`${item.id}.start and end are required`);
    if (!new Set(['inclusive', 'exclusive']).has(item.boundary)) throw new SquashError(`${item.id}.boundary must be inclusive or exclusive`);
    if (typeof item.message !== 'string' || !item.message.trim() || item.message.includes('\0')) throw new SquashError(`${item.id}.message must be non-empty and contain no NUL`);
    if (typeof item.sign !== 'boolean') throw new SquashError(`${item.id}.sign must be boolean`);
    if (item.remote !== null) {
      exactKeys(item.remote, ['name', 'branch', 'publish'], `${item.id}.remote`);
      if (typeof item.remote.name !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(item.remote.name)) throw new SquashError(`${item.id}.remote.name is invalid`);
      if (typeof item.remote.branch !== 'string' || !item.remote.branch.startsWith('refs/heads/')) throw new SquashError(`${item.id}.remote.branch must be a full branch ref`);
      if (typeof item.remote.publish !== 'boolean') throw new SquashError(`${item.id}.remote.publish must be boolean`);
    }
    if (item.submodule_of !== null) {
      exactKeys(item.submodule_of, ['repository', 'gitlink_path'], `${item.id}.submodule_of`);
      if (!KEBAB.test(item.submodule_of.repository)) throw new SquashError(`${item.id}.submodule_of.repository is invalid`);
      safePath(item.submodule_of.gitlink_path, `${item.id}.submodule_of.gitlink_path`);
    }
  }
  for (const item of request.repositories) {
    if (item.submodule_of && !ids.has(item.submodule_of.repository)) throw new SquashError(`${item.id} references unknown parent ${item.submodule_of.repository}`);
    if (item.submodule_of && (!item.remote || !item.remote.publish)) throw new SquashError(`${item.id} must publish before parent gitlink can advance`);
  }
  validateAcyclic(request.repositories);
  return request;
}

function validateAcyclic(repositories) {
  const parent = new Map(repositories.map((item) => [item.id, item.submodule_of?.repository ?? null]));
  for (const id of parent.keys()) {
    const seen = new Set();
    let current = id;
    while (current) {
      if (seen.has(current)) throw new SquashError(`submodule dependency cycle includes ${current}`);
      seen.add(current);
      current = parent.get(current) ?? null;
    }
  }
}

function repositoryRoot(path) {
  if (git(path, ['rev-parse', '--is-inside-work-tree'], { allowed: [0, 128] }).stdout.trim() !== 'true') {
    throw new SquashError('repository path is not a Git worktree');
  }
  return realpathSync(git(path, ['rev-parse', '--show-toplevel']).stdout.trim());
}

function portable(root, path, externalIndex) {
  const rel = relative(realpathSync(root), realpathSync(path));
  if (!isAbsolute(rel) && rel !== '..' && !rel.startsWith(`..${sep}`)) return rel ? rel.split(sep).join('/') : '.';
  return `<external-worktree:${externalIndex}>`;
}

function worktrees(repo, projectRoot) {
  const tokens = git(repo, ['worktree', 'list', '--porcelain', '-z'], { env: { GIT_OPTIONAL_LOCKS: '0' } }).stdout.split('\0');
  const entries = [];
  let current = null;
  for (const token of tokens) {
    if (!token) continue;
    const space = token.indexOf(' ');
    const key = space === -1 ? token : token.slice(0, space);
    const value = space === -1 ? true : token.slice(space + 1);
    if (key === 'worktree') {
      if (current) entries.push(current);
      current = { absolute: resolve(String(value)), branch: null, head: null, detached: false, locked: false, prunable: false };
    } else if (current) {
      if (key === 'branch') current.branch = value;
      else if (key === 'HEAD') current.head = value;
      else if (key === 'detached') current.detached = true;
      else if (key === 'locked') current.locked = true;
      else if (key === 'prunable') current.prunable = true;
    }
  }
  if (current) entries.push(current);
  return entries.map((entry, index) => {
    let dirty = true;
    let operations = ['unreadable'];
    if (!entry.prunable && existsSync(entry.absolute)) {
      const status = git(entry.absolute, ['status', '--porcelain=v2', '-z', '--untracked-files=all'], { env: { GIT_OPTIONAL_LOCKS: '0' } }).stdout;
      dirty = status.length > 0;
      operations = operationMarkers(entry.absolute);
    }
    return {
      locator: portable(projectRoot, entry.absolute, index + 1),
      branch: entry.branch,
      head: entry.head,
      detached: entry.detached,
      locked: entry.locked,
      prunable: entry.prunable,
      dirty,
      operations,
    };
  });
}

function operationMarkers(worktree) {
  const names = ['MERGE_HEAD', 'CHERRY_PICK_HEAD', 'REVERT_HEAD', 'BISECT_LOG', 'rebase-merge', 'rebase-apply', 'sequencer', 'index.lock', 'HEAD.lock'];
  const present = [];
  for (const name of names) {
    const path = git(worktree, ['rev-parse', '--path-format=absolute', '--git-path', name], { env: { GIT_OPTIONAL_LOCKS: '0' } }).stdout.trim();
    if (path && existsSync(path)) present.push(name);
  }
  return present;
}

function affectedRefs(repo, replaced) {
  const refs = [];
  const lines = git(repo, ['for-each-ref', '--format=%(refname)\t%(objectname)', 'refs/heads', 'refs/remotes', 'refs/tags'], { env: { GIT_OPTIONAL_LOCKS: '0' } }).stdout.split('\n').filter(Boolean);
  for (const line of lines) {
    const [ref] = line.split('\t');
    const commit = resolveCommit(repo, ref, false);
    if (commit && replaced.has(commit)) refs.push({ ref, commit });
  }
  return refs;
}

function gitlinkAt(repo, tree, path) {
  const output = git(repo, ['ls-tree', tree, '--', path]).stdout.trim();
  if (!output) return null;
  const match = output.match(/^([0-9]+)\s+(\S+)\s+([0-9a-f]+)\t/);
  return match ? { mode: match[1], type: match[2], oid: match[3] } : null;
}

function pushUrls(repo, remote) {
  return git(repo, ['remote', 'get-url', '--push', '--all', remote]).stdout.split('\n').filter(Boolean);
}

function githubCoordinates(url) {
  const patterns = [
    /^git@github\.com:([^/]+)\/([^/]+?)(?:\.git)?$/,
    /^(?:https?|ssh):\/\/(?:git@)?github\.com\/([^/]+)\/([^/]+?)(?:\.git)?$/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return { owner: match[1], repo: match[2] };
  }
  return null;
}

function localRemote(url) {
  return url.startsWith('file://') || isAbsolute(url) || url.startsWith('./') || url.startsWith('../');
}

function remoteTip(repo, remote, remoteRef) {
  const result = git(repo, ['ls-remote', '--exit-code', '--refs', remote, remoteRef], { allowed: [0, 2], timeout: 180_000 });
  if (result.status === 2) throw new SquashError(`remote branch does not exist: ${remoteRef}`);
  const lines = result.stdout.split('\n').filter(Boolean);
  if (lines.length !== 1) throw new SquashError(`expected one remote ref for ${remoteRef}, found ${lines.length}`);
  return lines[0].split(/\s+/)[0];
}

function githubPolicy(repo, url, remoteRef, sign) {
  const coordinates = githubCoordinates(url);
  if (!coordinates) return { provider: 'unknown', status: 'unknown', rules: [] };
  const branch = remoteRef.slice('refs/heads/'.length);
  const encodedBranch = encodeURIComponent(branch);
  const base = `repos/${encodeURIComponent(coordinates.owner)}/${encodeURIComponent(coordinates.repo)}`;
  const branchResult = run(repo, 'gh', ['api', `${base}/branches/${encodedBranch}`], { allowed: [0, 1, 2, 4, 127], timeout: 60_000 });
  if (branchResult.status !== 0) return { provider: 'github', status: 'unknown', rules: [] };
  let branchInfo;
  try { branchInfo = JSON.parse(branchResult.stdout); } catch { return { provider: 'github', status: 'unknown', rules: [] }; }
  const rulesResult = run(repo, 'gh', ['api', `${base}/rules/branches/${encodedBranch}`, '--paginate', '--slurp'], { allowed: [0, 1, 2, 4, 127], timeout: 60_000 });
  if (rulesResult.status !== 0) return { provider: 'github', status: 'unknown', rules: [] };
  let rules;
  try {
    rules = JSON.parse(rulesResult.stdout);
    if (Array.isArray(rules) && rules.every(Array.isArray)) rules = rules.flat();
  } catch { return { provider: 'github', status: 'unknown', rules: [] }; }
  if (!Array.isArray(rules)) return { provider: 'github', status: 'unknown', rules: [] };
  const types = [...new Set(rules.map((item) => item?.type).filter((value) => typeof value === 'string'))].sort();
  const blockers = types.filter((type) => type !== 'required_linear_history' && !(type === 'required_signatures' && sign));
  if (types.includes('non_fast_forward')) blockers.push('non_fast_forward');
  if (branchInfo.protected) {
    const protection = run(repo, 'gh', ['api', `${base}/branches/${encodedBranch}/protection`], { allowed: [0, 1, 2, 4, 127], timeout: 60_000 });
    if (protection.status !== 0) return { provider: 'github', status: 'unknown', rules: types };
    let value;
    try { value = JSON.parse(protection.stdout); } catch { return { provider: 'github', status: 'unknown', rules: types }; }
    if (value.lock_branch?.enabled || value.allow_force_pushes?.enabled !== true) blockers.push('classic-protection');
    if (value.required_pull_request_reviews || value.required_status_checks) blockers.push('classic-required-gate');
    if (value.required_signatures?.enabled && !sign) blockers.push('required-signatures');
  }
  return {
    provider: 'github',
    status: blockers.length === 0 ? 'verified-allowed' : 'blocked',
    rules: [...new Set([...types, ...blockers])].sort(),
  };
}

function inspectRemote(repo, request, oldHead) {
  validateRef(repo, request.remote.branch, `${request.id}.remote.branch`);
  const urls = pushUrls(repo, request.remote.name);
  if (urls.length !== 1) throw new SquashError(`${request.id} must have exactly one push URL`);
  const old = remoteTip(repo, urls[0], request.remote.branch);
  if (!resolveCommit(repo, old, false)) throw new SquashError(`${request.id} remote tip is not present locally; fetch explicitly and re-plan`);
  if (!isAncestor(repo, old, oldHead)) throw new SquashError(`${request.id} remote branch is not an ancestor of local old head`);
  const protection = localRemote(urls[0])
    ? { provider: 'local', status: 'not-applicable', rules: [] }
    : githubPolicy(repo, urls[0], request.remote.branch, request.sign);
  if (!new Set(['not-applicable', 'verified-allowed']).has(protection.status)) {
    throw new SquashError(`${request.id} remote protection policy is ${protection.status}`);
  }
  return { name: request.remote.name, branch: request.remote.branch, old_sha: old, protection };
}

function inspectRepository(projectRoot, request) {
  const repo = inside(projectRoot, request.path, `${request.id}.path`, { allowRoot: true });
  ensureDirectory(repo, `${request.id}.path`);
  if (repositoryRoot(repo) !== realpathSync(repo)) throw new SquashError(`${request.id}.path must be the repository toplevel`);
  validateRef(repo, request.branch, `${request.id}.branch`);
  git(repo, ['update-ref', '--stdin'], { input: 'start\nabort\n', env: { GIT_OPTIONAL_LOCKS: '0' } });
  git(repo, ['var', 'GIT_AUTHOR_IDENT'], { env: { GIT_OPTIONAL_LOCKS: '0' } });
  git(repo, ['var', 'GIT_COMMITTER_IDENT'], { env: { GIT_OPTIONAL_LOCKS: '0' } });
  if (git(repo, ['rev-parse', '--is-shallow-repository'], { env: { GIT_OPTIONAL_LOCKS: '0' } }).stdout.trim() !== 'false') throw new SquashError(`${request.id} shallow repository is unsupported`);
  if (git(repo, ['replace', '-l'], { env: { GIT_OPTIONAL_LOCKS: '0' } }).stdout.trim()) throw new SquashError(`${request.id} replace refs are unsupported`);
  const grafts = git(repo, ['rev-parse', '--path-format=absolute', '--git-path', 'info/grafts'], { env: { GIT_OPTIONAL_LOCKS: '0' } }).stdout.trim();
  if (grafts && existsSync(grafts) && statSync(grafts).size > 0) throw new SquashError(`${request.id} grafts are unsupported`);

  const branchHead = resolveCommit(repo, request.branch);
  const start = resolveCommit(repo, request.start);
  const end = resolveCommit(repo, request.end);
  if (branchHead !== end) throw new SquashError(`${request.id}.end must equal the selected branch tip`);
  const firstParentHistory = new Set(revList(repo, ['--first-parent', end]));
  if (!firstParentHistory.has(start)) throw new SquashError(`${request.id}.start is not on end's first-parent chain`);
  const parents = git(repo, ['show', '-s', '--format=%P', start], { env: { GIT_OPTIONAL_LOCKS: '0' } }).stdout.trim().split(/\s+/).filter(Boolean);
  const baseline = request.boundary === 'exclusive' ? start : (parents[0] ?? null);
  const revision = baseline ? `${baseline}..${end}` : end;
  const firstParent = revList(repo, ['--first-parent', revision]);
  const reachable = revList(repo, [revision]);
  const merges = revList(repo, ['--merges', revision]);
  if (firstParent.length === 0) throw new SquashError(`${request.id} range is empty`);
  if (reachable.length <= 1 && merges.length === 0) throw new SquashError(`${request.id} range does not reduce history`);
  const tree = resolveTree(repo, end);
  const allWorktrees = worktrees(repo, projectRoot);
  for (const item of allWorktrees) {
    if (item.prunable) throw new SquashError(`${request.id} has a prunable worktree: ${item.locator}`);
    if (item.dirty) throw new SquashError(`${request.id} has a dirty worktree: ${item.locator}`);
    if (item.operations.length) throw new SquashError(`${request.id} has an in-progress Git operation in ${item.locator}: ${item.operations.join(', ')}`);
  }
  const stash = resolveCommit(repo, 'refs/stash', false);
  const refs = affectedRefs(repo, new Set(reachable));
  const remote = request.remote?.publish ? inspectRemote(repo, request, end) : null;
  const runIdPart = randomBytes(4).toString('hex');
  return {
    id: request.id,
    path: request.path,
    branch: request.branch,
    boundary: request.boundary,
    start_sha: start,
    end_sha: end,
    baseline_sha: baseline,
    old_tree: tree,
    counts: { first_parent: firstParent.length, reachable: reachable.length, merges: merges.length },
    message: request.message,
    message_subject: request.message.split('\n')[0],
    message_sha256: sha256(request.message),
    sign: request.sign,
    remote,
    publish: request.remote?.publish === true,
    submodule_of: request.submodule_of,
    backup_ref_suffix: runIdPart,
    worktrees: allWorktrees,
    stash_sha: stash,
    affected_refs: refs,
    evidence: [],
    status: 'planned',
    new_tree: null,
    new_head: null,
    error: null,
  };
}

function scanEvidence(evidenceRoot, stateRoot, repositories) {
  const shaToRepo = new Map();
  for (const repo of repositories) {
    const repoPath = resolve(repo.__absolute_path);
    const revision = repo.baseline_sha ? `${repo.baseline_sha}..${repo.end_sha}` : repo.end_sha;
    for (const oid of revList(repoPath, [revision])) {
      if (!shaToRepo.has(oid)) shaToRepo.set(oid, new Set());
      shaToRepo.get(oid).add(repo.id);
    }
  }
  const hits = new Map(repositories.map((repo) => [repo.id, []]));
  const documents = [];
  function visit(path) {
    for (const entry of readdirSync(path, { withFileTypes: true })) {
      const full = join(path, entry.name);
      if (full === stateRoot || full.startsWith(`${stateRoot}${sep}`)) continue;
      if (entry.isSymbolicLink()) continue;
      if (entry.isDirectory()) {
        if (new Set(['back', 'baselines']).has(entry.name)) continue;
        visit(full);
      } else if (entry.isFile() && /\.(?:json|md)$/i.test(entry.name) && statSync(full).size <= 5 * 1024 * 1024) {
        const text = readFileSync(full, 'utf8');
        documents.push({ full, name: entry.name, text });
      }
    }
  }
  visit(evidenceRoot);
  const changeRoots = documents
    .filter((document) => document.name === '.status.json')
    .map((document) => {
      let active = true;
      try {
        const value = JSON.parse(document.text);
        const status = value.change_status ?? value.status;
        active = typeof status !== 'string' || !new Set(['completed', 'archived']).has(status);
      } catch {}
      return { root: dirname(document.full), active };
    })
    .sort((left, right) => right.root.length - left.root.length);
  for (const document of documents) {
    const owner = changeRoots.find((candidate) => document.full === candidate.root || document.full.startsWith(`${candidate.root}${sep}`));
    const active = owner?.active ?? false;
    const locator = relative(evidenceRoot, document.full).split(sep).join('/');
    for (const match of document.text.matchAll(/\b[0-9a-f]{40}\b/g)) {
      const ids = shaToRepo.get(match[0]);
      if (!ids) continue;
      for (const id of ids) hits.get(id).push({ path: locator, active });
    }
  }
  for (const repo of repositories) {
    const unique = new Map(hits.get(repo.id).map((hit) => [`${hit.path}:${hit.active}`, hit]));
    repo.evidence = [...unique.values()].sort((a, b) => a.path.localeCompare(b.path));
    if (repo.evidence.some((hit) => hit.active)) throw new SquashError(`${repo.id} range is referenced by active workflow evidence`);
  }
}

function validateSubmodules(projectRoot, repositories) {
  const byId = new Map(repositories.map((repo) => [repo.id, repo]));
  for (const child of repositories.filter((repo) => repo.submodule_of)) {
    const parent = byId.get(child.submodule_of.repository);
    const expectedChild = resolve(projectRoot, parent.path, child.submodule_of.gitlink_path);
    if (resolve(projectRoot, child.path) !== expectedChild) throw new SquashError(`${child.id}.path must equal its parent gitlink path`);
    const entry = gitlinkAt(resolve(projectRoot, parent.path), parent.end_sha, child.submodule_of.gitlink_path);
    if (!entry || entry.mode !== '160000' || entry.type !== 'commit') throw new SquashError(`${child.id} parent path is not a gitlink at parent end`);
    if (entry.oid !== child.end_sha) throw new SquashError(`${child.id} parent old gitlink does not equal child old end`);
    const modules = git(resolve(projectRoot, parent.path), ['show', `${parent.end_sha}:.gitmodules`], { allowed: [0, 128], env: { GIT_OPTIONAL_LOCKS: '0' } });
    if (modules.status !== 0) throw new SquashError(`${child.id} parent end has no .gitmodules`);
    const escaped = child.submodule_of.gitlink_path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const matches = [...modules.stdout.matchAll(new RegExp(`^\\s*path\\s*=\\s*${escaped}\\s*$`, 'gm'))];
    if (matches.length !== 1) throw new SquashError(`${child.id} gitlink path must appear once in .gitmodules`);
  }
}

function manifestForApply(state) {
  const children = new Map(state.repositories.map((repo) => [repo.id, []]));
  for (const repo of state.repositories) if (repo.submodule_of) children.get(repo.submodule_of.repository).push(repo);
  return state.repositories
    .filter((repo) => repo.status === 'planned' && children.get(repo.id).every((child) => child.status === 'published'))
    .map((repo) => ({
      repository: repo.id,
      path: repo.path,
      branch: repo.branch,
      start_sha: repo.start_sha,
      end_sha: repo.end_sha,
      baseline_sha: repo.baseline_sha,
      old_tree: repo.old_tree,
      counts: repo.counts,
      message: repo.message,
      message_sha256: repo.message_sha256,
      sign: repo.sign,
      backup_ref: repo.backup_ref,
      child_gitlinks: children.get(repo.id).map((child) => ({ path: child.submodule_of.gitlink_path, sha: child.new_head })),
    }));
}

function manifestForPublish(state) {
  return state.repositories
    .filter((repo) => repo.status === 'local-verified' && repo.publish)
    .map((repo) => ({
      repository: repo.id,
      path: repo.path,
      local_ref: repo.branch,
      new_sha: repo.new_head,
      remote: repo.remote.name,
      remote_ref: repo.remote.branch,
      remote_old_sha: repo.remote.old_sha,
      protection: repo.remote.protection,
    }));
}

function refreshNext(state) {
  state.local_manifest = manifestForApply(state);
  state.publish_manifest = manifestForPublish(state);
  state.local_digest = state.local_manifest.length ? sha256(state.local_manifest) : null;
  state.publish_digest = state.publish_manifest.length ? sha256(state.publish_manifest) : null;
  if (state.publish_manifest.length) {
    state.next_action = 'confirm-publish';
    state.phase = 'local-verified';
  } else if (state.local_manifest.length) {
    state.next_action = 'confirm-local';
    state.phase = 'planned';
  } else if (state.repositories.every((repo) => TERMINAL.has(repo.status))) {
    state.next_action = 'complete';
    state.phase = state.repositories.some((repo) => repo.status === 'published') ? 'completed-published' : 'completed-local';
  } else {
    state.next_action = 'blocked';
    state.phase = 'blocked-partial';
  }
  state.updated_at = now();
}

function reportText(state) {
  const lines = [
    '---',
    'skill: git-history-squash',
    `schema_version: ${SCHEMA_VERSION}`,
    `run_id: ${state.run_id}`,
    `status: ${state.phase}`,
    `topic: ${state.topic}`,
    `generated_at: "${state.updated_at}"`,
    '---',
    '',
    '# Git History Squash Report',
    '',
    '## Scope',
    '',
    `- Project: \`.\``,
    `- Mode: \`${state.next_action}\``,
    `- Run: \`${state.change}\``,
    '',
    '## Repository Plan',
    '',
    '| Repository | Path | Branch | Boundary | Baseline | Old head | First-parent | Reachable | Merges | Message | Status |',
    '|---|---|---|---|---|---|---:|---:|---:|---|---|',
  ];
  for (const repo of state.repositories) {
    lines.push(`| ${repo.id} | \`${repo.path}\` | \`${repo.branch}\` | ${repo.boundary} | \`${repo.baseline_sha ?? '<root>'}\` | \`${repo.end_sha}\` | ${repo.counts.first_parent} | ${repo.counts.reachable} | ${repo.counts.merges} | ${repo.message_subject.replaceAll('|', '\\|')} (\`${repo.message_sha256}\`) | ${repo.status} |`);
  }
  lines.push('', '## Local Effects', '');
  for (const repo of state.repositories) {
    lines.push(`### ${repo.id}`, '', `- Backup ref: \`${repo.backup_ref}\``);
    lines.push(`- New head: \`${repo.new_head ?? '<not-created>'}\``);
    lines.push(`- Tree contract: \`${repo.new_tree ?? repo.old_tree}\``);
    lines.push(`- Stash observed: ${repo.stash_sha ? `\`${repo.stash_sha}\` (preserved)` : 'none'}`);
    lines.push(`- Affected refs preserved: ${repo.affected_refs.length ? repo.affected_refs.map((item) => `\`${item.ref}\``).join(', ') : 'none'}`);
    lines.push(`- Worktrees: ${repo.worktrees.map((item) => `\`${item.locator}\` (${item.branch ?? 'detached'} @ ${item.head})`).join(', ')}`);
    lines.push(`- Workflow evidence: ${repo.evidence.length ? repo.evidence.map((item) => `\`${item.path}\`${item.active ? ' [active]' : ''}`).join(', ') : 'none'}`);
    if (repo.error) lines.push(`- Error: ${sanitize(repo.error)}`);
    lines.push('');
  }
  lines.push('## Confirmation Digests', '');
  lines.push(`- Local: \`${state.local_digest ?? '<none>'}\``);
  lines.push(`- Publish: \`${state.publish_digest ?? '<none>'}\``);
  lines.push('- A digest is valid only after the exact manifest is shown and confirmed in the current conversation.', '');
  lines.push('## Remote Results', '');
  for (const repo of state.repositories) {
    if (!repo.publish) lines.push(`- ${repo.id}: local-only`);
    else lines.push(`- ${repo.id}: ${repo.status}; \`${repo.remote.name}\` \`${repo.remote.branch}\` old=\`${repo.remote.old_sha}\` new=\`${repo.new_head ?? '<not-created>'}\`; policy=${repo.remote.protection.status}`);
  }
  lines.push('', '## Recovery', '');
  for (const repo of state.repositories.filter((item) => item.new_head)) {
    lines.push(`- Local ${repo.id}: \`git -C ${shellQuote(repo.path)} update-ref ${repo.branch} ${repo.end_sha} ${repo.new_head}\``);
    if (repo.status === 'published') lines.push(`- Remote ${repo.id}: \`git -C ${shellQuote(repo.path)} push ${repo.remote.name} --force-with-lease=${repo.remote.branch}:${repo.new_head} ${repo.backup_ref}:${repo.remote.branch}\``);
  }
  if (state.error) lines.push('', '## Blocking Error', '', sanitize(state.error), '');
  lines.push('', 'Recovery and cleanup require a new exact plan and explicit authorization. Backup refs, worktrees, branches, stash, reflog, and workflow evidence remain preserved.', '');
  return sanitize(lines.join('\n'));
}

function persist(stateRoot, state) {
  const changeDir = join(stateRoot, state.change);
  atomicJson(join(changeDir, 'state.json'), state);
  atomicWrite(join(changeDir, 'report.md'), reportText(state));
  atomicJson(join(stateRoot, 'state.json'), { schema_version: SCHEMA_VERSION, current_change: state.change });
}

function loadRun(projectRoot, stateRootArg, change) {
  const stateRoot = inside(projectRoot, stateRootArg, 'state root', { mustExist: true });
  ensureDirectory(stateRoot, 'state root');
  validateRootCursor(stateRoot);
  if (!/^\d{4}-\d{2}-\d{2}-[a-z0-9]+(?:-[a-z0-9]+)*(?:-\d{2})?$/.test(change)) throw new SquashError('invalid change name');
  const changeDir = inside(stateRoot, change, 'change', { mustExist: true });
  const state = readJson(join(changeDir, 'state.json'), 'change state');
  if (state.schema_version !== SCHEMA_VERSION || state.skill !== 'git-history-squash' || state.change !== change) throw new SquashError('unsupported or mismatched change state');
  validateRunState(projectRoot, state);
  return { stateRoot, state, changeDir };
}

function validateRunState(projectRoot, state) {
  if (!Array.isArray(state.repositories) || !Array.isArray(state.local_manifest) || !Array.isArray(state.publish_manifest)) {
    throw new SquashError('change state manifest fields must be arrays');
  }
  if (!Array.isArray(state.confirmations) || typeof state.run_id !== 'string' || !state.run_id || !KEBAB.test(state.topic)) {
    throw new SquashError('change state metadata is invalid');
  }
  const ids = new Set();
  for (const repo of state.repositories) {
    if (!repo || typeof repo !== 'object' || Array.isArray(repo) || !KEBAB.test(repo.id) || ids.has(repo.id)) {
      throw new SquashError('change state repository ids must be unique kebab-case');
    }
    ids.add(repo.id);
    safePath(repo.path, `${repo.id}.path`);
    const path = inside(projectRoot, repo.path, `${repo.id}.path`, { allowRoot: true, mustExist: true });
    ensureDirectory(path, `${repo.id}.path`);
    if (repositoryRoot(path) !== realpathSync(path)) throw new SquashError(`${repo.id}.path must remain a repository toplevel`);
    validateRef(path, repo.branch, `${repo.id}.branch`);
    validateOid(repo.start_sha, `${repo.id}.start_sha`);
    validateOid(repo.end_sha, `${repo.id}.end_sha`);
    validateOid(repo.baseline_sha, `${repo.id}.baseline_sha`, { nullable: true });
    validateOid(repo.old_tree, `${repo.id}.old_tree`);
    validateOid(repo.new_tree, `${repo.id}.new_tree`, { nullable: true });
    validateOid(repo.new_head, `${repo.id}.new_head`, { nullable: true });
    if (typeof repo.message !== 'string' || sha256(repo.message) !== repo.message_sha256) throw new SquashError(`${repo.id} message digest is invalid`);
    if (typeof repo.sign !== 'boolean' || typeof repo.publish !== 'boolean' || !REPOSITORY_STATUSES.has(repo.status)) {
      throw new SquashError(`${repo.id} execution fields are invalid`);
    }
    const expectedBackup = `refs/speculo/backups/git-history-squash/${state.run_id}/${repo.id}`;
    if (repo.backup_ref !== expectedBackup || git(path, ['check-ref-format', repo.backup_ref], { allowed: [0, 1] }).status !== 0) {
      throw new SquashError(`${repo.id} backup ref is invalid`);
    }
    if (repo.publish) {
      if (!repo.remote || typeof repo.remote.name !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(repo.remote.name)) throw new SquashError(`${repo.id} remote state is invalid`);
      validateRef(path, repo.remote.branch, `${repo.id}.remote.branch`);
      validateOid(repo.remote.old_sha, `${repo.id}.remote.old_sha`);
    } else if (repo.remote !== null) {
      throw new SquashError(`${repo.id} local-only state must not contain a remote manifest`);
    }
    if (repo.submodule_of !== null) {
      if (!repo.submodule_of || !KEBAB.test(repo.submodule_of.repository)) throw new SquashError(`${repo.id} submodule state is invalid`);
      safePath(repo.submodule_of.gitlink_path, `${repo.id}.submodule_of.gitlink_path`);
    }
  }
  for (const repo of state.repositories) {
    if (repo.submodule_of && !ids.has(repo.submodule_of.repository)) throw new SquashError(`${repo.id} state references an unknown parent`);
  }
}

function validateConfirmationManifest(state, kind) {
  const manifest = kind === 'local' ? manifestForApply(state) : manifestForPublish(state);
  const saved = kind === 'local' ? state.local_manifest : state.publish_manifest;
  const digest = kind === 'local' ? state.local_digest : state.publish_digest;
  if (stableJson(saved) !== stableJson(manifest) || digest !== sha256(manifest)) {
    throw new SquashError(`${kind} confirmation manifest no longer matches change state`);
  }
}

function allocateChange(stateRoot, date, topic) {
  const base = `${date}-${topic}`;
  for (let index = 0; index <= 99; index += 1) {
    const name = index === 0 ? base : `${base}-${String(index).padStart(2, '0')}`;
    const path = join(stateRoot, name);
    if (!existsSync(path)) {
      mkdirSync(path, { recursive: false });
      return name;
    }
  }
  throw new SquashError(`no free change name for ${base}`);
}

function plan(values) {
  const projectRoot = resolve(required(values, 'root'));
  ensureDirectory(projectRoot, 'project root');
  const stateRoot = inside(projectRoot, required(values, 'state_root'), 'state root', { allowRoot: false, mustExist: false });
  mkdirSync(stateRoot, { recursive: true });
  ensureDirectory(stateRoot, 'state root');
  validateRootCursor(stateRoot);
  const evidenceRoot = inside(projectRoot, required(values, 'evidence_root'), 'evidence root', { allowRoot: false, mustExist: true });
  const date = values.date ?? today();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new SquashError('--date must be YYYY-MM-DD');
  const request = loadRequest(required(values, 'request'));
  const change = allocateChange(stateRoot, date, request.topic);
  const runId = `${date.replaceAll('-', '')}T${now().slice(11, 19).replaceAll(':', '')}Z-${randomBytes(4).toString('hex')}`;
  try {
    const repositories = request.repositories.map((item) => {
      const inspected = inspectRepository(projectRoot, item);
      inspected.__absolute_path = resolve(projectRoot, item.path);
      inspected.backup_ref = `refs/speculo/backups/git-history-squash/${runId}/${item.id}`;
      return inspected;
    });
    validateSubmodules(projectRoot, repositories);
    scanEvidence(evidenceRoot, stateRoot, repositories);
    for (const repo of repositories) delete repo.__absolute_path;
    const state = {
      schema_version: SCHEMA_VERSION,
      skill: 'git-history-squash',
      change,
      run_id: runId,
      topic: request.topic,
      phase: 'planned',
      next_action: null,
      created_at: now(),
      updated_at: now(),
      confirmations: [],
      repositories,
      local_manifest: [],
      publish_manifest: [],
      local_digest: null,
      publish_digest: null,
      error: null,
    };
    refreshNext(state);
    persist(stateRoot, state);
    return { change, report: `${relative(projectRoot, join(stateRoot, change, 'report.md')).split(sep).join('/')}`, phase: state.phase, next_action: state.next_action, plan_digest: state.local_digest, publish_digest: state.publish_digest };
  } catch (error) {
    const state = {
      schema_version: SCHEMA_VERSION,
      skill: 'git-history-squash',
      change,
      run_id: runId,
      topic: request.topic,
      phase: 'blocked-partial',
      next_action: 'blocked',
      created_at: now(),
      updated_at: now(),
      confirmations: [],
      repositories: [],
      local_manifest: [],
      publish_manifest: [],
      local_digest: null,
      publish_digest: null,
      error: sanitize(error.message, projectRoot),
    };
    persist(stateRoot, state);
    throw new SquashError(`${change} blocked; report=${relative(projectRoot, join(stateRoot, change, 'report.md')).split(sep).join('/')}: ${error.message}`);
  }
}

function expectedGitlinkDrift(repoPath, allowedPaths) {
  const cached = git(repoPath, ['diff', '--cached', '--name-only', '-z']).stdout.split('\0').filter(Boolean);
  const unstaged = git(repoPath, ['diff', '--name-only', '-z']).stdout.split('\0').filter(Boolean);
  const untracked = git(repoPath, ['ls-files', '--others', '--exclude-standard', '-z']).stdout.split('\0').filter(Boolean);
  return cached.length === 0
    && untracked.length === 0
    && unstaged.length > 0
    && unstaged.every((item) => allowedPaths.has(item));
}

function revalidateLocal(projectRoot, state, repo) {
  const path = resolve(projectRoot, repo.path);
  if (resolveCommit(path, repo.branch) !== repo.end_sha && resolveCommit(path, repo.branch) !== repo.new_head) throw new SquashError(`${repo.id} target branch drifted`);
  const publishedChildren = state.repositories.filter((item) => item.submodule_of?.repository === repo.id && item.status === 'published');
  const allowedGitlinks = new Set(publishedChildren.map((item) => item.submodule_of.gitlink_path));
  for (const item of worktrees(path, projectRoot)) {
    const allowedTransition = item.dirty
      && item.branch === repo.branch
      && item.locator === repo.path
      && allowedGitlinks.size > 0
      && expectedGitlinkDrift(path, allowedGitlinks);
    if (item.prunable || (item.dirty && !allowedTransition) || item.operations.length) throw new SquashError(`${repo.id} worktree precondition drifted: ${item.locator}`);
  }
}

function buildTree(projectRoot, state, repo) {
  const children = state.repositories.filter((item) => item.submodule_of?.repository === repo.id);
  if (children.length === 0) return repo.old_tree;
  for (const child of children) if (child.status !== 'published' || !child.new_head) throw new SquashError(`${repo.id} child ${child.id} is not remotely published`);
  const path = resolve(projectRoot, repo.path);
  const temporary = mkdtempSync(join(tmpdir(), 'speculo-git-squash-'));
  const indexPath = join(temporary, 'index');
  const env = { GIT_INDEX_FILE: indexPath, GIT_OPTIONAL_LOCKS: '0' };
  try {
    git(path, ['read-tree', repo.old_tree], { env });
    for (const child of children) {
      git(path, ['update-index', '--add', '--cacheinfo', `160000,${child.new_head},${child.submodule_of.gitlink_path}`], { env });
    }
    const tree = git(path, ['write-tree'], { env }).stdout.trim();
    const changed = git(path, ['diff-tree', '--no-commit-id', '--name-only', '-r', repo.old_tree, tree]).stdout.split('\n').filter(Boolean).sort();
    const expected = children.map((child) => child.submodule_of.gitlink_path).sort();
    if (JSON.stringify(changed) !== JSON.stringify(expected)) throw new SquashError(`${repo.id} planned tree changed paths outside declared gitlinks`);
    for (const child of children) {
      const entry = gitlinkAt(path, tree, child.submodule_of.gitlink_path);
      if (!entry || entry.mode !== '160000' || entry.oid !== child.new_head) throw new SquashError(`${repo.id} planned gitlink verification failed for ${child.id}`);
    }
    return tree;
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
}

function createCommit(projectRoot, repo, tree) {
  const path = resolve(projectRoot, repo.path);
  const args = ['commit-tree', tree];
  if (repo.baseline_sha) args.push('-p', repo.baseline_sha);
  if (repo.sign) args.push('-S');
  args.push('-F', '-');
  const newHead = git(path, args, { input: repo.message.endsWith('\n') ? repo.message : `${repo.message}\n`, timeout: 180_000 }).stdout.trim();
  if (resolveTree(path, newHead) !== tree) throw new SquashError(`${repo.id} new commit tree verification failed`);
  const parents = git(path, ['show', '-s', '--format=%P', newHead]).stdout.trim().split(/\s+/).filter(Boolean);
  const expectedParents = repo.baseline_sha ? [repo.baseline_sha] : [];
  if (JSON.stringify(parents) !== JSON.stringify(expectedParents)) throw new SquashError(`${repo.id} new commit parent verification failed`);
  if (sha256(git(path, ['show', '-s', '--format=%B', newHead]).stdout.trimEnd()) !== sha256(repo.message.trimEnd())) throw new SquashError(`${repo.id} new commit message verification failed`);
  if (repo.sign && git(path, ['verify-commit', newHead], { allowed: [0, 1] }).status !== 0) throw new SquashError(`${repo.id} new commit signature verification failed`);
  return newHead;
}

function updateRefs(projectRoot, repo) {
  const path = resolve(projectRoot, repo.path);
  if (resolveCommit(path, repo.backup_ref, false)) throw new SquashError(`${repo.id} backup ref already exists`);
  const input = [
    'start',
    `create ${repo.backup_ref} ${repo.end_sha}`,
    `update ${repo.branch} ${repo.new_head} ${repo.end_sha}`,
    'prepare',
    'commit',
    '',
  ].join('\n');
  git(path, ['update-ref', '--create-reflog', '-m', `speculo git-history-squash ${repo.id}`, '--stdin'], { input });
}

function alignAggregateWorktree(projectRoot, state, repo) {
  const children = state.repositories.filter((item) => item.submodule_of?.repository === repo.id);
  if (!children.length) return;
  const repoPath = resolve(projectRoot, repo.path);
  const checkedOut = worktrees(repoPath, projectRoot).filter((item) => item.branch === repo.branch);
  if (checkedOut.length > 1) throw new SquashError(`${repo.id} target branch is checked out more than once`);
  if (!checkedOut.length) return;
  if (checkedOut[0].locator !== repo.path && !(repo.path === '.' && checkedOut[0].locator === '.')) {
    throw new SquashError(`${repo.id} aggregate branch must be checked out at its declared repository path`);
  }
  for (const child of children) {
    const childPath = resolve(projectRoot, child.path);
    const symbolic = git(childPath, ['symbolic-ref', '-q', 'HEAD'], { allowed: [0, 1] });
    if (symbolic.status === 0) {
      if (symbolic.stdout.trim() !== child.branch || resolveCommit(childPath, 'HEAD') !== child.new_head) throw new SquashError(`${child.id} checked-out branch is not at its new head`);
    } else {
      const head = resolveCommit(childPath, 'HEAD');
      if (head === child.end_sha) git(childPath, ['update-ref', '--no-deref', 'HEAD', child.new_head, child.end_sha]);
      else if (head !== child.new_head) throw new SquashError(`${child.id} detached HEAD drifted`);
    }
    git(repoPath, ['update-index', '--add', '--cacheinfo', `160000,${child.new_head},${child.submodule_of.gitlink_path}`]);
  }
  if (git(repoPath, ['write-tree']).stdout.trim() !== repo.new_tree) throw new SquashError(`${repo.id} real index does not match planned tree`);
}

function verifyApplied(projectRoot, state, repo) {
  const path = resolve(projectRoot, repo.path);
  if (resolveCommit(path, repo.branch) !== repo.new_head) throw new SquashError(`${repo.id} target branch did not move to new head`);
  if (resolveCommit(path, repo.backup_ref) !== repo.end_sha) throw new SquashError(`${repo.id} backup ref does not point to old head`);
  if (resolveTree(path, repo.new_head) !== repo.new_tree) throw new SquashError(`${repo.id} final tree verification failed`);
  const parents = git(path, ['show', '-s', '--format=%P', repo.new_head]).stdout.trim().split(/\s+/).filter(Boolean);
  const expectedParents = repo.baseline_sha ? [repo.baseline_sha] : [];
  if (JSON.stringify(parents) !== JSON.stringify(expectedParents)) throw new SquashError(`${repo.id} final parent verification failed`);
  if (sha256(git(path, ['show', '-s', '--format=%B', repo.new_head]).stdout.trimEnd()) !== sha256(repo.message.trimEnd())) throw new SquashError(`${repo.id} final message verification failed`);
  if (repo.sign && git(path, ['verify-commit', repo.new_head], { allowed: [0, 1] }).status !== 0) throw new SquashError(`${repo.id} final signature verification failed`);
  const children = state.repositories.filter((item) => item.submodule_of?.repository === repo.id);
  if (children.length === 0 && repo.new_tree !== repo.old_tree) throw new SquashError(`${repo.id} final tree differs from old end tree`);
  if (children.length) {
    const changed = git(path, ['diff-tree', '--no-commit-id', '--name-only', '-r', repo.old_tree, repo.new_tree]).stdout.split('\n').filter(Boolean).sort();
    const expected = children.map((child) => child.submodule_of.gitlink_path).sort();
    if (JSON.stringify(changed) !== JSON.stringify(expected)) throw new SquashError(`${repo.id} final tree changed paths outside declared gitlinks`);
    for (const child of children) {
      const entry = gitlinkAt(path, repo.new_tree, child.submodule_of.gitlink_path);
      if (!entry || entry.mode !== '160000' || entry.oid !== child.new_head) throw new SquashError(`${repo.id} final gitlink verification failed for ${child.id}`);
    }
  }
  const revision = repo.baseline_sha ? `${repo.baseline_sha}..${repo.new_head}` : repo.new_head;
  if (revList(path, [revision]).length !== 1) throw new SquashError(`${repo.id} baseline to new head does not contain exactly one commit`);
  for (const item of worktrees(path, projectRoot)) {
    if (item.branch === repo.branch && (item.dirty || item.operations.length)) throw new SquashError(`${repo.id} target worktree is not clean after rewrite`);
  }
}

function apply(values) {
  const projectRoot = resolve(required(values, 'root'));
  const { stateRoot, state } = loadRun(projectRoot, required(values, 'state_root'), required(values, 'change'));
  validateConfirmationManifest(state, 'local');
  const confirmation = required(values, 'confirm_plan');
  if (state.next_action !== 'confirm-local' || !state.local_digest || confirmation !== state.local_digest) throw new SquashError('local confirmation digest does not match the current manifest');
  const ids = state.local_manifest.map((item) => item.repository);
  state.confirmations.push({ kind: 'local', digest: confirmation, confirmed_at: now(), repositories: ids });
  state.phase = 'local-applying';
  state.updated_at = now();
  persist(stateRoot, state);
  for (const id of ids) {
    const repo = state.repositories.find((item) => item.id === id);
    try {
      revalidateLocal(projectRoot, state, repo);
      if (resolveCommit(resolve(projectRoot, repo.path), repo.branch) !== repo.end_sha) throw new SquashError(`${repo.id} branch moved after plan`);
      repo.new_tree = buildTree(projectRoot, state, repo);
      repo.new_head = createCommit(projectRoot, repo, repo.new_tree);
      repo.status = 'object-created';
      state.updated_at = now();
      persist(stateRoot, state);
      updateRefs(projectRoot, repo);
      repo.status = 'local-updated';
      state.updated_at = now();
      persist(stateRoot, state);
      alignAggregateWorktree(projectRoot, state, repo);
      verifyApplied(projectRoot, state, repo);
      repo.status = repo.publish ? 'local-verified' : 'local-only';
      state.updated_at = now();
      persist(stateRoot, state);
    } catch (error) {
      repo.error = sanitize(error.message, projectRoot);
      repo.status = 'blocked';
      state.error = repo.error;
      state.phase = 'blocked-partial';
      state.next_action = 'blocked';
      state.updated_at = now();
      persist(stateRoot, state);
      throw error;
    }
  }
  refreshNext(state);
  persist(stateRoot, state);
  return { change: state.change, phase: state.phase, next_action: state.next_action, plan_digest: state.local_digest, publish_digest: state.publish_digest };
}

function publish(values) {
  const projectRoot = resolve(required(values, 'root'));
  const { stateRoot, state } = loadRun(projectRoot, required(values, 'state_root'), required(values, 'change'));
  validateConfirmationManifest(state, 'publish');
  const confirmation = required(values, 'confirm_publish');
  if (state.next_action !== 'confirm-publish' || !state.publish_digest || confirmation !== state.publish_digest) throw new SquashError('publish confirmation digest does not match the current manifest');
  const ids = state.publish_manifest.map((item) => item.repository);
  state.confirmations.push({ kind: 'publish', digest: confirmation, confirmed_at: now(), repositories: ids });
  state.phase = 'publishing';
  state.updated_at = now();
  persist(stateRoot, state);
  for (const id of ids) {
    const repo = state.repositories.find((item) => item.id === id);
    const path = resolve(projectRoot, repo.path);
    try {
      revalidateLocal(projectRoot, state, repo);
      if (resolveCommit(path, repo.branch) !== repo.new_head || resolveCommit(path, repo.backup_ref) !== repo.end_sha) throw new SquashError(`${repo.id} local rewrite drifted before publish`);
      const remote = inspectRemote(path, { id: repo.id, remote: { name: repo.remote.name, branch: repo.remote.branch }, sign: repo.sign }, repo.end_sha);
      if (remote.old_sha !== repo.remote.old_sha) throw new SquashError(`${repo.id} remote lease drifted before publish`);
      repo.status = 'publishing';
      state.updated_at = now();
      persist(stateRoot, state);
      git(path, ['push', repo.remote.name, `--force-with-lease=${repo.remote.branch}:${repo.remote.old_sha}`, `${repo.branch}:${repo.remote.branch}`], { timeout: 180_000 });
      const pushUrl = pushUrls(path, repo.remote.name)[0];
      if (remoteTip(path, pushUrl, repo.remote.branch) !== repo.new_head) throw new SquashError(`${repo.id} remote verification did not return new head`);
      repo.status = 'published';
      state.updated_at = now();
      persist(stateRoot, state);
    } catch (error) {
      repo.error = sanitize(error.message, projectRoot);
      repo.status = 'blocked';
      state.error = repo.error;
      state.phase = 'blocked-partial';
      state.next_action = 'blocked';
      state.updated_at = now();
      persist(stateRoot, state);
      throw error;
    }
  }
  refreshNext(state);
  persist(stateRoot, state);
  return { change: state.change, phase: state.phase, next_action: state.next_action, plan_digest: state.local_digest, publish_digest: state.publish_digest };
}

function status(values) {
  const projectRoot = resolve(required(values, 'root'));
  const { stateRoot, state } = loadRun(projectRoot, required(values, 'state_root'), required(values, 'change'));
  if (state.repositories.length === 0) throw new SquashError(`saved run is blocked: ${state.error ?? 'repository plan is unavailable'}`);
  const observed = [];
  const problems = [];
  for (const repo of state.repositories) {
    const path = resolve(projectRoot, repo.path);
    const branch = resolveCommit(path, repo.branch, false);
    const backup = resolveCommit(path, repo.backup_ref, false);
    let remote = null;
    if (repo.publish && repo.remote) {
      try {
        const urls = pushUrls(path, repo.remote.name);
        if (urls.length !== 1) throw new SquashError('remote must still have exactly one push URL');
        remote = remoteTip(path, urls[0], repo.remote.branch);
      } catch (error) {
        problems.push(`${repo.id}: ${sanitize(error.message, projectRoot)}`);
      }
    }
    if (!problems.some((problem) => problem.startsWith(`${repo.id}:`))) {
      if (branch === repo.end_sha && backup === null) {
        if (repo.publish && remote !== repo.remote.old_sha) {
          problems.push(`${repo.id}: remote/local state is a recoverable partial combination`);
        } else {
          try {
            revalidateLocal(projectRoot, state, repo);
            repo.status = 'planned';
            repo.new_head = null;
            repo.new_tree = null;
          } catch (error) {
            problems.push(`${repo.id}: ${sanitize(error.message, projectRoot)}`);
          }
        }
      } else if (branch === repo.new_head && backup === repo.end_sha) {
        try {
          verifyApplied(projectRoot, state, repo);
          if (!repo.publish) repo.status = 'local-only';
          else if (remote === repo.new_head) repo.status = 'published';
          else if (remote === repo.remote.old_sha) repo.status = 'local-verified';
          else problems.push(`${repo.id}: remote branch has unknown drift`);
        } catch (error) {
          problems.push(`${repo.id}: ${sanitize(error.message, projectRoot)}`);
        }
      } else {
        problems.push(`${repo.id}: branch/backup refs have unknown drift`);
      }
    }
    observed.push({ repository: repo.id, branch, backup, remote });
  }
  if (problems.length) {
    state.error = problems.join('; ');
    state.phase = 'blocked-partial';
    state.next_action = 'blocked';
    state.updated_at = now();
    persist(stateRoot, state);
    throw new SquashError(`saved run is blocked: ${state.error}`);
  }
  state.error = null;
  for (const repo of state.repositories) repo.error = null;
  refreshNext(state);
  persist(stateRoot, state);
  return { change: state.change, phase: state.phase, next_action: state.next_action, plan_digest: state.local_digest, publish_digest: state.publish_digest, observed };
}

export function main(argv = process.argv.slice(2)) {
  const { operation, values } = parseArgs(argv);
  let output;
  if (operation === 'plan') output = plan(values);
  else if (operation === 'apply') output = apply(values);
  else if (operation === 'publish') output = publish(values);
  else if (operation === 'status') output = status(values);
  else throw new SquashError(`unknown operation: ${operation}`);
  console.log(JSON.stringify(output));
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    main();
  } catch (error) {
    console.error(`git-history-squash: ${sanitize(error.message)}`);
    process.exit(2);
  }
}
