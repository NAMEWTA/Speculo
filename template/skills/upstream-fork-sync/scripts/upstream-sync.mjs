#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import {
  closeSync,
  existsSync,
  fsyncSync,
  lstatSync,
  mkdirSync,
  openSync,
  readFileSync,
  renameSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { basename, dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const SCHEMA_VERSION = 1;
export class SyncError extends Error {}

function nowRfc3339() {
  const date = new Date();
  const pad = (value) => String(value).padStart(2, '0');
  const offset = -date.getTimezoneOffset();
  const sign = offset >= 0 ? '+' : '-';
  const absolute = Math.abs(offset);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
    + `T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
    + `${sign}${pad(Math.floor(absolute / 60))}:${pad(absolute % 60)}`;
}

function run(cwd, command, args, { allowed = [0], timeout = 120_000 } = {}) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    timeout,
  });
  if (result.error) {
    const reason = result.error.code === 'ETIMEDOUT' ? 'command timed out' : result.error.message;
    throw new SyncError(`${reason} in ${cwd}: ${[command, ...args].join(' ')}`);
  }
  const status = result.status ?? 1;
  if (!allowed.includes(status)) {
    const detail = (result.stderr || result.stdout || 'no output').trim();
    throw new SyncError(`command failed (${status}) in ${cwd}: ${[command, ...args].join(' ')}\n${detail}`);
  }
  return { status, stdout: result.stdout ?? '', stderr: result.stderr ?? '' };
}

function git(repo, ...args) {
  let options = {};
  if (args.length && typeof args.at(-1) === 'object') options = args.pop();
  return run(repo, 'git', args, options);
}

function ensureRepository(path) {
  if (!existsSync(path)) throw new SyncError(`repository path does not exist: ${path}`);
  if (lstatSync(path).isSymbolicLink()) throw new SyncError(`repository path must not be a symlink: ${path}`);
  if (git(path, 'rev-parse', '--is-inside-work-tree').stdout.trim() !== 'true') {
    throw new SyncError(`not a Git worktree: ${path}`);
  }
}

function inside(root, value, label, { allowRoot = false } = {}) {
  const target = resolve(root, value);
  const relation = relative(root, target);
  if (isAbsolute(relation) || relation === '..' || relation.startsWith(`..${process.platform === 'win32' ? '\\' : '/'}`)) {
    throw new SyncError(`${label} must stay under project root: ${target}`);
  }
  if (!allowRoot && !relation) throw new SyncError(`${label} must not equal project root`);
  let current = root;
  for (const segment of relation.split(/[\\/]/).filter(Boolean)) {
    current = join(current, segment);
    if (!existsSync(current)) break;
    if (lstatSync(current).isSymbolicLink()) throw new SyncError(`${label} must not traverse a symlink: ${current}`);
  }
  return target;
}

export function resolveCommit(repo, ref, required = true) {
  const result = git(repo, 'rev-parse', '--verify', `${ref}^{commit}`, { allowed: [0, 128] });
  if (result.status === 0) return result.stdout.trim();
  if (required) throw new SyncError(`missing commit ref in ${repo}: ${ref}`);
  return null;
}

function isAncestor(repo, ancestor, descendant) {
  return git(repo, 'merge-base', '--is-ancestor', ancestor, descendant, { allowed: [0, 1] }).status === 0;
}

function uniqueMergeBase(repo, left, right) {
  const bases = git(repo, 'merge-base', '--all', left, right).stdout.split('\n').filter(Boolean);
  if (bases.length !== 1) throw new SyncError(`expected one merge base in ${repo}, found ${bases.length} for ${left} and ${right}`);
  return bases[0];
}

function commitParents(repo, commit) {
  const value = git(repo, 'show', '-s', '--format=%P', commit).stdout.trim();
  return value ? value.split(/\s+/) : [];
}

export function dirtyPaths(repo) {
  const tokens = git(repo, 'status', '--porcelain=v1', '-z').stdout.split('\0');
  const paths = new Set();
  for (let index = 0; index < tokens.length;) {
    const token = tokens[index++];
    if (!token || token.length < 4) continue;
    const status = token.slice(0, 2);
    paths.add(token.slice(3));
    if ((status.includes('R') || status.includes('C')) && tokens[index]) paths.add(tokens[index++]);
  }
  return [...paths].sort();
}

function revCounts(repo, left, right) {
  const values = git(repo, 'rev-list', '--left-right', '--count', `${left}...${right}`).stdout.trim().split(/\s+/);
  if (values.length !== 2) throw new SyncError(`unexpected rev-list count output in ${repo}`);
  return { left_only: Number(values[0]), right_only: Number(values[1]) };
}

function fetchRemote(repo, remote) {
  const result = git(repo, 'fetch', '--prune', '--tags', remote, {
    allowed: Array.from({ length: 256 }, (_, index) => index),
    timeout: 180_000,
  });
  return result.status === 0
    ? { ok: true, error: null }
    : {
        ok: false,
        error: (result.stderr || result.stdout || `exit ${result.status}`).trim()
          .replace(/\b(?:https?|ssh):\/\/\S+/gi, '<redacted-url>'),
      };
}

function requireNullableString(value, label) {
  if (value !== null && typeof value !== 'string') throw new SyncError(`${label} must be a string or null`);
}

export function loadRepositoryMap(path, projectRoot) {
  if (existsSync(path) && lstatSync(path).isSymbolicLink()) throw new SyncError(`repository map must not be a symlink: ${path}`);
  let data;
  try { data = JSON.parse(readFileSync(path, 'utf8')); }
  catch (error) { throw new SyncError(`cannot read repository map ${path}: ${error.message}`); }
  if (Object.keys(data).sort().join(',') !== 'repositories,schema_version' || data.schema_version !== SCHEMA_VERSION || !Array.isArray(data.repositories)) {
    throw new SyncError(`unsupported or malformed repository map: ${path}`);
  }
  if (!data.repositories.length) throw new SyncError(`repository map has no repositories: ${path}`);
  const ids = new Set();
  const allowedKeys = [
    'baseline_ref', 'id', 'mirror_ref', 'origin_ref', 'origin_remote', 'path',
    'product_ref', 'risk_paths', 'upstream_ref', 'upstream_remote',
  ].sort().join(',');
  for (const item of data.repositories) {
    if (!item || Object.keys(item).sort().join(',') !== allowedKeys) throw new SyncError(`malformed repository entry in ${path}`);
    if (typeof item.id !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item.id) || ids.has(item.id)) {
      throw new SyncError(`repository id must be unique kebab-case: ${item.id}`);
    }
    ids.add(item.id);
    if (typeof item.path !== 'string' || !item.path || item.path.includes('\\') || isAbsolute(item.path)
      || item.path.split('/').includes('..')) throw new SyncError(`invalid repository path for ${item.id}: ${item.path}`);
    item.absolute_path = inside(projectRoot, item.path, `repository ${item.id}`, { allowRoot: true });
    for (const key of ['product_ref', 'upstream_ref']) {
      if (typeof item[key] !== 'string' || !item[key].startsWith('refs/')) throw new SyncError(`${item.id}.${key} must be a full ref`);
    }
    for (const key of ['origin_ref', 'mirror_ref', 'baseline_ref', 'origin_remote']) requireNullableString(item[key], `${item.id}.${key}`);
    for (const key of ['origin_remote', 'upstream_remote']) {
      if (item[key] !== null && (typeof item[key] !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(item[key]))) {
        throw new SyncError(`${item.id}.${key} must be a safe remote name`);
      }
    }
    if (!item.upstream_remote) throw new SyncError(`${item.id}.upstream_remote is required`);
    if (!Array.isArray(item.risk_paths) || !item.risk_paths.every((value) => typeof value === 'string' && value
      && !value.includes('\\') && !isAbsolute(value) && !value.split('/').includes('..'))) {
      throw new SyncError(`${item.id}.risk_paths must contain safe project-relative globs`);
    }
    ensureRepository(item.absolute_path);
  }
  return data;
}

function validateRepositoryState(path, id, item) {
  if (!item || Object.keys(item).sort().join(',') !== 'integrated_upstream_sha,main_merge_sha,observed_upstream_sha'
    || typeof item.integrated_upstream_sha !== 'string' || typeof item.observed_upstream_sha !== 'string'
    || (item.main_merge_sha !== null && typeof item.main_merge_sha !== 'string')) {
    throw new SyncError(`malformed repository state in ${path}: ${id}`);
  }
}

export function loadState(path, repositoryIds) {
  if (!existsSync(path)) return { schema_version: SCHEMA_VERSION, updated_at: null, current_change: null, repositories: {} };
  if (lstatSync(path).isSymbolicLink()) throw new SyncError(`state file must not be a symlink: ${path}`);
  let data;
  try { data = JSON.parse(readFileSync(path, 'utf8')); }
  catch (error) { throw new SyncError(`cannot read state ${path}: ${error.message}`); }
  if (Object.keys(data).sort().join(',') !== 'current_change,repositories,schema_version,updated_at'
    || data.schema_version !== SCHEMA_VERSION || typeof data.repositories !== 'object' || Array.isArray(data.repositories)
    || (data.updated_at !== null && typeof data.updated_at !== 'string')
    || (data.current_change !== null && typeof data.current_change !== 'string')) {
    throw new SyncError(`unsupported or malformed state: ${path}`);
  }
  for (const [id, item] of Object.entries(data.repositories)) {
    if (!repositoryIds.has(id)) throw new SyncError(`state references unknown repository: ${id}`);
    validateRepositoryState(path, id, item);
  }
  return data;
}

function bootstrapIntegration(repo, productSha, upstreamSha, baselineSha, timestamp) {
  const range = baselineSha ? `${baselineSha}..${productSha}` : productSha;
  const merges = git(repo, 'rev-list', '--first-parent', '--merges', range).stdout.split('\n').filter(Boolean);
  for (const mergeCommit of merges) {
    for (const parent of commitParents(repo, mergeCommit).slice(1)) {
      if (isAncestor(repo, parent, upstreamSha)) {
        return { upstream_sha: parent, product_merge_commit_sha: mergeCommit, source: 'graph-merge', confirmed_at: timestamp };
      }
    }
  }
  return {
    upstream_sha: uniqueMergeBase(repo, productSha, upstreamSha),
    product_merge_commit_sha: null,
    source: 'derived-merge-base',
    confirmed_at: timestamp,
  };
}

function validateSavedIntegration(repo, item, productSha, upstreamSha) {
  resolveCommit(repo, item.integrated_upstream_sha);
  if (!isAncestor(repo, item.integrated_upstream_sha, productSha)) {
    throw new SyncError(`saved checkpoint is no longer in product history in ${repo}: ${item.integrated_upstream_sha}`);
  }
  if (!isAncestor(repo, item.integrated_upstream_sha, upstreamSha)) {
    throw new SyncError(`upstream history no longer contains saved checkpoint in ${repo}: ${item.integrated_upstream_sha}`);
  }
  if (item.main_merge_sha) {
    resolveCommit(repo, item.main_merge_sha);
    if (!isAncestor(repo, item.main_merge_sha, productSha)) {
      throw new SyncError(`saved integration merge is no longer in product history in ${repo}: ${item.main_merge_sha}`);
    }
    if (!commitParents(repo, item.main_merge_sha).slice(1).includes(item.integrated_upstream_sha)) {
      throw new SyncError(`saved checkpoint is not an exact non-first merge parent in ${repo}: ${item.integrated_upstream_sha}`);
    }
  }
}

function parseCommits(repo, start, end) {
  if (start === end) return [];
  return git(repo, 'log', '--reverse', '--format=%H%x1f%h%x1f%ad%x1f%s', '--date=short', `${start}..${end}`).stdout
    .split('\n').filter(Boolean).map((line) => {
      const [sha, short_sha, date, subject] = line.split('\x1f', 4);
      return { sha, short_sha, date, subject };
    });
}

function parseNameStatus(repo, start, end) {
  if (start === end) return [];
  const tokens = git(repo, 'diff', '--name-status', '-z', '--find-renames', start, end).stdout.split('\0');
  const files = [];
  for (let index = 0; index < tokens.length;) {
    const status = tokens[index++];
    if (!status) continue;
    const firstPath = tokens[index++];
    if (status.startsWith('R') || status.startsWith('C')) files.push({ status, old_path: firstPath, path: tokens[index++] });
    else files.push({ status, old_path: null, path: firstPath });
  }
  return files;
}

function parseNumstat(repo, start, end) {
  if (start === end) return {};
  const tokens = git(repo, 'diff', '--numstat', '-z', '--find-renames', start, end).stdout.split('\0');
  const stats = {};
  for (let index = 0; index < tokens.length;) {
    const token = tokens[index++];
    if (!token) continue;
    const [additions, deletions, path] = token.split('\t', 3);
    if (path) stats[path] = { additions, deletions };
    else {
      index += 1;
      const newPath = tokens[index++];
      stats[newPath] = { additions, deletions };
    }
  }
  return stats;
}

function globRegex(glob) {
  let output = '^';
  for (let index = 0; index < glob.length; index += 1) {
    const char = glob[index];
    if (char === '*' && glob[index + 1] === '*') { output += '.*'; index += 1; }
    else if (char === '*') output += '[^/]*';
    else if (char === '?') output += '[^/]';
    else output += char.replace(/[|\\{}()[\]^$+?.]/g, '\\$&');
  }
  return new RegExp(`${output}$`);
}

export function mergeTree(repo, productSha, upstreamSha) {
  const result = git(repo, 'merge-tree', '--write-tree', '--messages', productSha, upstreamSha, { allowed: [0, 1] });
  const lines = result.stdout.split('\n');
  const treeSha = /^[0-9a-f]{40,64}$/.test(lines[0]?.trim()) ? lines[0].trim() : null;
  const conflicts = new Set();
  const messages = [];
  for (const line of lines.slice(1)) {
    const match = line.match(/^\d{6} [0-9a-f]{40,64} [123]\t(.+)$/);
    if (match) conflicts.add(match[1]);
    else if (line.startsWith('CONFLICT') || line.startsWith('Auto-merging')) messages.push(line);
  }
  return {
    status: result.status === 0 ? 'clean' : conflicts.size ? 'conflicted' : 'conflicted-unparsed',
    exit_code: result.status,
    tree_sha: treeSha,
    conflict_paths: [...conflicts].sort(),
    messages,
  };
}

function collectRepository(config, saved, freshness, fetchError, timestamp) {
  const repo = config.absolute_path;
  const productSha = resolveCommit(repo, config.product_ref);
  const upstreamSha = resolveCommit(repo, config.upstream_ref);
  const baselineSha = config.baseline_ref ? resolveCommit(repo, config.baseline_ref) : null;
  const originSha = config.origin_ref ? resolveCommit(repo, config.origin_ref, false) : null;
  const mirrorSha = config.mirror_ref ? resolveCommit(repo, config.mirror_ref, false) : null;
  if (baselineSha && (!isAncestor(repo, baselineSha, productSha) || !isAncestor(repo, baselineSha, upstreamSha))) {
    throw new SyncError(`baseline must be an ancestor of product and upstream in ${repo}: ${baselineSha}`);
  }
  if (mirrorSha && !isAncestor(repo, mirrorSha, upstreamSha)) {
    throw new SyncError(`mirror is not an ancestor of observed upstream in ${repo}: ${mirrorSha} !<= ${upstreamSha}`);
  }
  if (saved) validateSavedIntegration(repo, saved, productSha, upstreamSha);
  const integration = saved
    ? {
        upstream_sha: saved.integrated_upstream_sha,
        product_merge_commit_sha: saved.main_merge_sha,
        source: saved.main_merge_sha ? 'recorded-merge' : 'derived-merge-base',
        confirmed_at: null,
      }
    : bootstrapIntegration(repo, productSha, upstreamSha, baselineSha, timestamp);
  const integratedSha = integration.upstream_sha;
  const files = parseNameStatus(repo, integratedSha, upstreamSha);
  const stats = parseNumstat(repo, integratedSha, upstreamSha);
  const riskMatchers = config.risk_paths.map((pattern) => [pattern, globRegex(pattern)]);
  for (const file of files) {
    Object.assign(file, stats[file.path] ?? { additions: '?', deletions: '?' });
    file.risk_patterns = riskMatchers.filter(([, regex]) => regex.test(file.path)).map(([pattern]) => pattern);
  }
  const upstreamPaths = new Set(files.map((item) => item.path));
  const productPaths = new Set(parseNameStatus(repo, integratedSha, productSha).map((item) => item.path));
  const overlaps = [...upstreamPaths].filter((path) => productPaths.has(path)).sort();
  const dirty = dirtyPaths(repo);
  const dirtySet = new Set(dirty);
  const tree = mergeTree(repo, productSha, upstreamSha);
  const conflictSet = new Set(tree.conflict_paths);
  const riskPaths = files.filter((file) => file.risk_patterns.length)
    .map((file) => ({ path: file.path, patterns: file.risk_patterns }));
  const observation = {
    id: config.id,
    path: config.path,
    freshness,
    fetch_error: fetchError,
    product_sha: productSha,
    origin_sha: originSha,
    upstream_sha: upstreamSha,
    mirror_sha: mirrorSha,
    baseline_sha: baselineSha,
    merge_base_sha: uniqueMergeBase(repo, productSha, upstreamSha),
    integration,
    product_vs_upstream: revCounts(repo, productSha, upstreamSha),
    product_vs_origin: originSha ? revCounts(repo, productSha, originSha) : null,
    upstream_commits: parseCommits(repo, integratedSha, upstreamSha),
    upstream_files: files,
    upstream_shortstat: integratedSha === upstreamSha ? '' : git(repo, 'diff', '--shortstat', integratedSha, upstreamSha).stdout.trim(),
    product_overlap_paths: overlaps,
    automatic_overlap_paths: overlaps.filter((path) => !conflictSet.has(path)),
    dirty_paths: dirty,
    dirty_overlap_paths: [...upstreamPaths].filter((path) => dirtySet.has(path)).sort(),
    risk_paths: riskPaths,
    merge_tree: tree,
  };
  return [observation, {
    integrated_upstream_sha: integratedSha,
    main_merge_sha: integration.product_merge_commit_sha,
    observed_upstream_sha: upstreamSha,
  }];
}

function markdown(value) { return String(value).replaceAll('|', '\\|').replaceAll('\n', ' '); }
function markdownPath(value) { return `\`${String(value).replaceAll('`', '').replaceAll('|', '\\|').replaceAll('\n', ' ')}\``; }

function renderDiffReport(snapshot) {
  const lines = ['# 上游增量 Diff 报告', '', `- Change：\`${snapshot.change}\``, `- 生成时间：\`${snapshot.created_at}\``, ''];
  for (const item of snapshot.repositories) {
    lines.push(`## ${item.id}`, '', '| 固定项 | 值 |', '|---|---|',
      `| 仓库路径 | ${markdownPath(item.path)} |`, `| Product SHA | \`${item.product_sha}\` |`,
      `| 已集成 upstream SHA | \`${item.integration.upstream_sha}\` |`, `| Checkpoint 来源 | \`${item.integration.source}\` |`,
      `| Product merge commit | \`${item.integration.product_merge_commit_sha ?? 'null'}\` |`, `| 观测 upstream SHA | \`${item.upstream_sha}\` |`,
      `| Merge-base | \`${item.merge_base_sha}\` |`, `| Mirror SHA | \`${item.mirror_sha ?? 'null'}\` |`,
      `| Freshness | \`${item.freshness}\` |`, '');
    if (item.fetch_error) lines.push(`> Upstream fetch 失败：${markdown(item.fetch_error)}`, '');
    lines.push(`### 上游新增提交（${item.upstream_commits.length}）`, '');
    if (item.upstream_commits.length) lines.push(...item.upstream_commits.map((entry) => `- \`${entry.short_sha}\` ${entry.date} ${markdown(entry.subject)}`));
    else lines.push('- 无新增上游提交。');
    lines.push('', '### 文件 Diff', '', `统计：${item.upstream_shortstat || '0 files changed'}`, '');
    if (item.upstream_files.length) {
      lines.push('| 状态 | 文件 | 新增 | 删除 | 风险规则 |', '|---|---|---:|---:|---|');
      for (const file of item.upstream_files) {
        const display = file.old_path ? `${file.old_path} -> ${file.path}` : file.path;
        lines.push(`| \`${file.status}\` | ${markdownPath(display)} | ${file.additions} | ${file.deletions} | ${markdown(file.risk_patterns.join(', ') || '-')} |`);
      }
    } else lines.push('无文件变化。');
    lines.push('', '### 产品重叠面', '');
    if (item.product_overlap_paths.length) lines.push(...item.product_overlap_paths.map((path) => `- ${markdownPath(path)}`));
    else lines.push('- 上游增量与产品自 checkpoint 后的文件变化无路径重叠。');
    lines.push('', '### 定制风险路径', '');
    if (item.risk_paths.length) lines.push(...item.risk_paths.map((entry) => `- ${markdownPath(entry.path)}: ${markdown(entry.patterns.join(', '))}`));
    else lines.push('- 未命中 repository map 风险规则；仍需核对 customization map。');
    lines.push('', '### 复现命令', '', '```bash',
      `git -C ${item.path} log --oneline ${item.integration.upstream_sha}..${item.upstream_sha}`,
      `git -C ${item.path} diff --name-status ${item.integration.upstream_sha}..${item.upstream_sha}`,
      `git -C ${item.path} diff ${item.integration.upstream_sha}..${item.upstream_sha} -- <path>`, '```', '');
  }
  lines.push('## 现状清单', '', '| 仓库 | 上游增量 | Git 冲突 | 定制风险路径 | 当前处置 |', '|---|---:|---:|---:|---|');
  for (const item of snapshot.repositories) {
    const disposition = item.upstream_commits.length ? '等待用户选择后续 Work' : '无上游增量';
    lines.push(`| ${item.id} | ${item.upstream_commits.length} commits / ${item.upstream_files.length} files | ${item.merge_tree.conflict_paths.length} | ${item.risk_paths.length} | ${disposition} |`);
  }
  lines.push('', '## 结论边界', '', '本报告只冻结评估证据，不授权或执行 merge、commit、push、tag、分支移动或后续 Work。', '');
  return lines.join('\n');
}

function appendPaths(lines, paths, empty) {
  if (paths.length) lines.push(...paths.map((path) => `- ${markdownPath(path)}`));
  else lines.push(`- ${empty}`);
}

function renderConflictReport(snapshot) {
  const lines = ['# 上游合并冲突客观报告', '', `- Change：\`${snapshot.change}\``, `- 生成时间：\`${snapshot.created_at}\``,
    '- 模拟方式：`git merge-tree --write-tree --messages <product-sha> <upstream-sha>`', ''];
  for (const item of snapshot.repositories) {
    const tree = item.merge_tree;
    lines.push(`## ${item.id}`, '', '| 固定项 | 值 |', '|---|---|', `| Product SHA | \`${item.product_sha}\` |`,
      `| Upstream SHA | \`${item.upstream_sha}\` |`, `| Merge-base | \`${item.merge_base_sha}\` |`,
      `| Merge-tree 状态 | \`${tree.status}\` |`, `| Merge-tree exit code | \`${tree.exit_code}\` |`,
      `| 结果 tree | \`${tree.tree_sha ?? 'null'}\` |`, `| Git 确认冲突数 | \`${tree.conflict_paths.length}\` |`, '',
      '### Git 确认冲突', '');
    appendPaths(lines, tree.conflict_paths, 'Git 未报告文本或树冲突。');
    if (tree.messages.length) lines.push('', '```text', ...tree.messages, '```');
    lines.push('', '### 可自动合并的双方重叠', '');
    appendPaths(lines, item.automatic_overlap_paths, '没有双方同时修改但可自动合并的路径。');
    lines.push('', '### 定制合同风险', '');
    if (item.risk_paths.length) lines.push(...item.risk_paths.map((entry) => `- ${markdownPath(entry.path)}: ${markdown(entry.patterns.join(', '))}`));
    else lines.push('- 未命中 repository map 风险规则；仍须核对 customization map。');
    lines.push('', '### 未提交工作树重叠', '');
    appendPaths(lines, item.dirty_overlap_paths, '未提交路径与本次上游增量无交集。');
    lines.push('', '### 工作树状态', '');
    appendPaths(lines, item.dirty_paths, '工作树 clean。');
    lines.push('', '### 复现命令', '', '```bash',
      `git -C ${item.path} merge-tree --write-tree --messages ${item.product_sha} ${item.upstream_sha}`, '```', '');
  }
  lines.push('## 局限', '', '零文本冲突不代表编译、运行时、API、权限、数据迁移或业务语义安全。', '');
  return lines.join('\n');
}

function atomicText(path, content) {
  if (existsSync(path) && lstatSync(path).isSymbolicLink()) throw new SyncError(`refusing to replace symlink state file: ${path}`);
  mkdirSync(dirname(path), { recursive: true });
  const temporary = join(dirname(path), `.${basename(path)}.${process.pid}.${Date.now()}.tmp`);
  let descriptor;
  try {
    descriptor = openSync(temporary, 'wx');
    writeFileSync(descriptor, content, 'utf8');
    fsyncSync(descriptor);
    closeSync(descriptor);
    descriptor = undefined;
    renameSync(temporary, path);
  } finally {
    if (descriptor !== undefined) closeSync(descriptor);
    if (existsSync(temporary)) unlinkSync(temporary);
  }
}

function atomicJson(path, value) { atomicText(path, `${JSON.stringify(value, null, 2)}\n`); }
function sha256(path) { return createHash('sha256').update(readFileSync(path)).digest('hex'); }

function sanitizeTopic(value) {
  const topic = value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  if (!topic) throw new SyncError('topic must contain ASCII letters or digits');
  return topic;
}

function chooseChange(stateRoot, date, topic) {
  const base = `${date}-${topic}`;
  let name = base;
  for (let counter = 1; existsSync(join(stateRoot, name)); counter += 1) name = `${base}-${String(counter).padStart(2, '0')}`;
  return name;
}

function pathsFromOptions(options) {
  const root = resolve(options.root ?? '.');
  ensureRepository(root);
  if (!options['state-root'] || !options['repository-map']) throw new SyncError('--state-root and --repository-map are required');
  return {
    root,
    stateRoot: inside(root, options['state-root'], 'state root'),
    repositoryMap: inside(root, options['repository-map'], 'repository map'),
  };
}

export function assess(options) {
  const { root, stateRoot, repositoryMap } = pathsFromOptions(options);
  if (!options.topic) throw new SyncError('--topic is required');
  const topic = sanitizeTopic(options.topic);
  const timestamp = nowRfc3339();
  const date = options.date ?? timestamp.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new SyncError(`date must use YYYY-MM-DD: ${date}`);
  const map = loadRepositoryMap(repositoryMap, root);
  const stateFile = join(stateRoot, 'state.json');
  const ids = new Set(map.repositories.map((item) => item.id));
  const state = loadState(stateFile, ids);
  const fetchResults = {};
  if (options.fetch) {
    for (const config of map.repositories) {
      const upstream = fetchRemote(config.absolute_path, config.upstream_remote);
      let origin = null;
      if (config.origin_remote && config.origin_remote !== config.upstream_remote) origin = fetchRemote(config.absolute_path, config.origin_remote);
      fetchResults[config.id] = { upstream, origin };
    }
  }
  const observations = [];
  const nextRepositoryState = {};
  for (const config of map.repositories) {
    const fetched = fetchResults[config.id]?.upstream;
    const freshness = !options.fetch ? 'cached' : fetched?.ok ? 'fresh' : 'stale';
    const [observation, compact] = collectRepository(config, state.repositories[config.id], freshness, fetched?.error ?? null, timestamp);
    observations.push(observation);
    nextRepositoryState[config.id] = compact;
  }
  const change = chooseChange(stateRoot, date, topic);
  const snapshot = { change, created_at: timestamp, topic, fetch_requested: Boolean(options.fetch), fetch_results: fetchResults, repositories: observations };
  if (options['dry-run']) return { dryRun: true, result: snapshot };

  mkdirSync(stateRoot, { recursive: true });
  const finalDir = join(stateRoot, change);
  const temporary = join(stateRoot, `.${change}.${process.pid}.${Date.now()}.tmp`);
  try {
    mkdirSync(temporary);
    const repositories = {};
    for (const item of observations) {
      if (item.integration.upstream_sha !== item.upstream_sha) {
        repositories[item.id] = {
          product_sha: item.product_sha,
          upstream_sha: item.upstream_sha,
          integrated_upstream_sha: item.integration.upstream_sha,
          main_merge_sha: null,
          recorded_at: null,
          verification: [],
        };
      }
    }
    atomicJson(join(temporary, 'state.json'), {
      schema_version: SCHEMA_VERSION,
      created_at: timestamp,
      repository_map_sha256: sha256(repositoryMap),
      repositories,
    });
    atomicText(join(temporary, 'diff-report.md'), renderDiffReport(snapshot));
    atomicText(join(temporary, 'conflict-report.md'), renderConflictReport(snapshot));
    if (existsSync(finalDir)) throw new SyncError(`change directory already exists: ${finalDir}`);
    renameSync(temporary, finalDir);
    atomicJson(stateFile, {
      schema_version: SCHEMA_VERSION,
      updated_at: timestamp,
      current_change: change,
      repositories: nextRepositoryState,
    });
  } finally {
    if (existsSync(temporary)) rmSync(temporary, { recursive: true, force: true });
  }
  return { dryRun: false, result: { state: stateFile, change, change_dir: finalDir } };
}

function loadChangeState(path, repositoryIds) {
  if (existsSync(path) && lstatSync(path).isSymbolicLink()) throw new SyncError(`change state must not be a symlink: ${path}`);
  let data;
  try { data = JSON.parse(readFileSync(path, 'utf8')); }
  catch (error) { throw new SyncError(`cannot read change state ${path}: ${error.message}`); }
  if (Object.keys(data).sort().join(',') !== 'created_at,repositories,repository_map_sha256,schema_version'
    || data.schema_version !== SCHEMA_VERSION || typeof data.created_at !== 'string'
    || typeof data.repository_map_sha256 !== 'string' || typeof data.repositories !== 'object' || Array.isArray(data.repositories)) {
    throw new SyncError(`malformed change state: ${path}`);
  }
  const keys = 'integrated_upstream_sha,main_merge_sha,product_sha,recorded_at,upstream_sha,verification';
  for (const [id, item] of Object.entries(data.repositories)) {
    if (!repositoryIds.has(id) || !item || Object.keys(item).sort().join(',') !== keys
      || !['product_sha', 'upstream_sha', 'integrated_upstream_sha'].every((key) => typeof item[key] === 'string')
      || (item.main_merge_sha !== null && typeof item.main_merge_sha !== 'string')
      || (item.recorded_at !== null && typeof item.recorded_at !== 'string')
      || !Array.isArray(item.verification) || !item.verification.every((value) => typeof value === 'string')) {
      throw new SyncError(`malformed change repository state: ${id}`);
    }
  }
  return data;
}

export function recordIntegration(options) {
  const { root, stateRoot, repositoryMap } = pathsFromOptions(options);
  const map = loadRepositoryMap(repositoryMap, root);
  const ids = new Set(map.repositories.map((item) => item.id));
  const config = map.repositories.find((item) => item.id === options.repository);
  if (!config) throw new SyncError(`unknown --repository: ${options.repository}`);
  if (!options['merge-commit'] || !options['upstream-sha']) throw new SyncError('--merge-commit and --upstream-sha are required');
  if (!options.verification?.length) throw new SyncError('at least one --verification is required');
  const stateFile = join(stateRoot, 'state.json');
  const state = loadState(stateFile, ids);
  const change = options.change ?? state.current_change;
  if (typeof change !== 'string' || basename(change) !== change || change === '.' || change === '..') throw new SyncError('a safe --change is required');
  const changeFile = inside(root, join(stateRoot, change, 'state.json'), 'change state');
  const changeState = loadChangeState(changeFile, ids);
  if (changeState.repository_map_sha256 !== sha256(repositoryMap)) throw new SyncError('repository map changed after assessment');
  const pending = changeState.repositories[config.id];
  if (!pending) throw new SyncError(`repository is not pending in change: ${config.id}`);
  const repo = config.absolute_path;
  const mergeSha = resolveCommit(repo, options['merge-commit']);
  const upstreamSha = resolveCommit(repo, options['upstream-sha']);
  const productSha = resolveCommit(repo, config.product_ref);
  const observedUpstream = resolveCommit(repo, config.upstream_ref);
  if (!isAncestor(repo, mergeSha, productSha)) throw new SyncError(`merge commit is not reachable from product ref: ${mergeSha}`);
  const parents = commitParents(repo, mergeSha);
  if (parents.length < 2) throw new SyncError(`integration commit is not a merge commit: ${mergeSha}`);
  if (!parents.slice(1).includes(upstreamSha)) throw new SyncError(`upstream SHA is not an exact non-first parent: ${upstreamSha}`);
  if (!isAncestor(repo, upstreamSha, observedUpstream)) throw new SyncError(`upstream SHA is not in observed upstream history: ${upstreamSha}`);
  if (pending.upstream_sha !== upstreamSha) throw new SyncError(`upstream SHA does not match frozen target: ${upstreamSha} != ${pending.upstream_sha}`);
  const compact = state.repositories[config.id];
  if (!compact) throw new SyncError(`root state is missing repository: ${config.id}`);
  resolveCommit(repo, compact.integrated_upstream_sha);
  if (!isAncestor(repo, compact.integrated_upstream_sha, upstreamSha)) {
    if (isAncestor(repo, upstreamSha, compact.integrated_upstream_sha)) {
      throw new SyncError(`frozen target would regress the current checkpoint: ${upstreamSha} < ${compact.integrated_upstream_sha}`);
    }
    throw new SyncError(`frozen target diverges from the current checkpoint: ${upstreamSha} and ${compact.integrated_upstream_sha}`);
  }
  const timestamp = nowRfc3339();
  pending.main_merge_sha = mergeSha;
  pending.recorded_at = timestamp;
  pending.verification = [...options.verification];
  compact.integrated_upstream_sha = upstreamSha;
  compact.main_merge_sha = mergeSha;
  state.updated_at = timestamp;
  atomicJson(changeFile, changeState);
  atomicJson(stateFile, state);
  return { repository: config.id, change, recorded_at: timestamp, merge_commit_sha: mergeSha, upstream_sha: upstreamSha };
}

function parseArguments(argv) {
  const command = argv[0];
  if (!['assess', 'record-integration'].includes(command)) throw new SyncError('expected command: assess or record-integration');
  const options = { root: '.', verification: [] };
  const booleans = new Set(['fetch', 'dry-run']);
  const allowed = new Set([
    'root', 'state-root', 'repository-map', 'topic', 'date', 'fetch', 'dry-run', 'change',
    'repository', 'merge-commit', 'upstream-sha', 'verification',
  ]);
  for (let index = 1; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) throw new SyncError(`unexpected argument: ${token}`);
    const key = token.slice(2);
    if (!allowed.has(key)) throw new SyncError(`unknown option: --${key}`);
    if (booleans.has(key)) options[key] = true;
    else {
      const value = argv[++index];
      if (value === undefined || value.startsWith('--')) throw new SyncError(`missing value for --${key}`);
      if (key === 'verification') options.verification.push(value);
      else options[key] = value;
    }
  }
  return { command, options };
}

function help(command) {
  if (command === 'assess') return `Usage:
  upstream-sync.mjs assess --root <project> --state-root <path> --repository-map <file> --topic <topic> [options]

Options:
  --date YYYY-MM-DD  Override the change date for reproducible runs.
  --fetch            Refresh configured remote refs before assessment.
  --dry-run          Print the frozen JSON snapshot without writing state or reports.

Output:
  Creates a non-overwriting change under --state-root and atomically updates state.json.

Example:
  node upstream-sync.mjs assess --root . --state-root <resolved-state-root>/skills/upstream-fork-sync --repository-map <resolved-state-root>/skills/upstream-fork-sync/repository-map.json --topic upstream-refresh
`;
  if (command === 'record-integration') return `Usage:
  upstream-sync.mjs record-integration --root <project> --state-root <path> --repository-map <file> --repository <id> --merge-commit <sha> --upstream-sha <sha> --verification '<command>: exit 0' [--change <name>]

Output:
  Updates the selected change and compact checkpoint only after exact Git ancestry validation.

Example:
  node upstream-sync.mjs record-integration --root . --state-root <resolved-state-root>/skills/upstream-fork-sync --repository-map <resolved-state-root>/skills/upstream-fork-sync/repository-map.json --repository app --merge-commit <sha> --upstream-sha <sha> --verification 'pnpm test: exit 0'
`;
  return `Usage:
  upstream-sync.mjs assess [options]
  upstream-sync.mjs record-integration [options]

Run "upstream-sync.mjs <command> --help" for command-specific inputs, outputs, and examples.
`;
}

export function main(argv = process.argv.slice(2)) {
  try {
    if (argv.length === 1 && new Set(['--help', '-h']).has(argv[0])) {
      process.stdout.write(help());
      return 0;
    }
    if (argv.length === 2 && new Set(['--help', '-h']).has(argv[1])) {
      if (!['assess', 'record-integration'].includes(argv[0])) throw new SyncError(`unknown command: ${argv[0]}`);
      process.stdout.write(help(argv[0]));
      return 0;
    }
    const { command, options } = parseArguments(argv);
    if (command === 'assess') {
      const output = assess(options);
      process.stdout.write(`${JSON.stringify(output.result, null, output.dryRun ? 2 : 0)}\n`);
    } else process.stdout.write(`${JSON.stringify(recordIntegration(options), null, 2)}\n`);
    return 0;
  } catch (error) {
    process.stderr.write(`error: ${error.message}\n`);
    return 2;
  }
}

const invoked = process.argv[1] ? resolve(process.argv[1]) : null;
if (invoked === fileURLToPath(import.meta.url)) process.exitCode = main();
