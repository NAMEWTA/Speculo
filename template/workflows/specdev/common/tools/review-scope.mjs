/** Read-only review selection. Freezes local files or Git refs; never fetches or writes state. */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { closeSync, constants, fstatSync, lstatSync, openSync, readFileSync, readlinkSync, realpathSync, statSync } from 'node:fs';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';

const modes = new Set(['baseline', 'range', 'commit', 'pr', 'source-files', 'working-tree']);
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
function portableFile(path) {
  if (typeof path !== 'string' || !path || isAbsolute(path) || /[\\:\x00-\x1f]/.test(path) || path.split('/').some(part => !part || part === '.' || part === '..' || part.toLowerCase() === '.git')) {
    throw new Error('review-scope: file must be an explicit portable project-relative path outside .git');
  }
  return path;
}

// Read a link itself, never its target. Directory links are rejected before any
// file read; a file replaced by a directory is a deletion plus added children.
function workingFile(root, path) {
  portableFile(path);
  const requested = resolve(root, path);
  for (let parent = dirname(requested); parent !== root; parent = dirname(parent)) {
    try { if (lstatSync(parent).isSymbolicLink()) throw new Error('review-scope: symlink directory in working-tree scope'); }
    catch (error) { if (error.code !== 'ENOENT' && error.code !== 'ENOTDIR') throw error; }
  }
  let info;
  try { info = lstatSync(requested); }
  catch (error) { if (error.code === 'ENOENT' || error.code === 'ENOTDIR') return null; throw error; }
  if (info.isDirectory()) return null;
  if (info.isSymbolicLink()) {
    const bytes = readlinkSync(requested, {encoding:'buffer'});
    return {kind:'symlink', mode:'120000', sha256:digest(bytes), bytes:bytes.length};
  }
  if (!info.isFile()) throw new Error('review-scope: unsupported working-tree file type');
  const fd = openSync(requested, constants.O_RDONLY | constants.O_NONBLOCK | (constants.O_NOFOLLOW ?? 0));
  try {
    const before = fstatSync(fd, {bigint:true});
    if (!before.isFile()) throw new Error('review-scope: working-tree file type changed');
    const bytes = readFileSync(fd), after = fstatSync(fd, {bigint:true}), current = lstatSync(requested, {bigint:true});
    if (!['dev','ino','size','mode','mtimeNs','ctimeNs'].every(key => before[key] === after[key] && after[key] === current[key])) throw new Error('review-scope: working-tree changed while freezing inputs');
    return {kind:'file', mode:before.mode & 0o111n ? '100755' : '100644', sha256:digest(bytes), bytes:bytes.length};
  } finally { closeSync(fd); }
}

function workingTree(options) {
  if (['head','commit','parent'].some(key => options[key] !== undefined)) throw new Error('review-scope: working-tree accepts base, not head/commit/parent');
  // Native realpath expands Windows short names; relative also handles drive
  // casing without admitting a nested directory that borrows its parent's Git.
  const root = realpathSync.native(resolve(options.repo));
  if (relative(root,realpathSync.native(git(root, ['rev-parse','--show-toplevel']).trim())) !== '') throw new Error('review-scope: working-tree requires the actual project Git root');
  const base = commit(root, options.base, 'base');
  const files = options.files?.map(portableFile);
  if (files && (!files.length || new Set(files).size !== files.length)) throw new Error('review-scope: empty or duplicate working-tree scope');
  const capture = () => {
    if (git(root, ['ls-files','--unmerged','-z'])) throw new Error('review-scope: unresolved index conflicts');
    const head = commit(root, 'HEAD', 'HEAD');
    const index = git(root, ['ls-files','--stage','-z']);
    const inventory = git(root, ['status','--porcelain=v1','-z','--untracked-files=all']);
    const baseEntries = new Map(git(root, ['ls-tree','-r','-z','--full-tree',base]).split('\0').filter(Boolean).map(row => {
      const tab = row.indexOf('\t'), [mode,type,oid] = row.slice(0,tab).split(' ');
      return [row.slice(tab+1), {mode,type,oid}];
    }));
    const diffArgs = ['diff','--no-color','--no-ext-diff','--no-textconv','--binary','--no-renames',base,'--'];
    const changed = [...new Set([
      ...git(root, ['diff','--no-ext-diff','--no-textconv','--no-renames','--name-only','-z',base,'--']).split('\0'),
      ...git(root, ['ls-files','--others','--exclude-standard','-z']).split('\0'),
    ].filter(Boolean))].sort();
    const selected = files ? [...files].sort() : changed;
    const snapshot = selected.map(path => {
      portableFile(path);
      const entry = baseEntries.get(path);
      if (entry && entry.type !== 'blob') throw new Error('review-scope: submodules require separate review; working-tree snapshot is unverified');
      const before = entry ? {mode:entry.mode, oid:entry.oid, sha256:digest(git(root, ['cat-file','blob',entry.oid], null))} : null;
      const after = workingFile(root, path);
      if (!before && !after) throw new Error(`review-scope: missing or unsupported working-tree path ${path}`);
      const change = !before ? 'added' : !after ? 'deleted' : before.mode === after.mode && before.sha256 === after.sha256 ? 'unchanged' : before.mode.slice(0,3) !== after.mode.slice(0,3) ? 'type-changed' : 'modified';
      return {path, change, before, after};
    });
    const args = [...diffArgs, ...selected.map(path => `:(literal)${path}`)];
    const scope = {
      version:1, mode:'working-tree', review_mode:'working-tree',
      outcome:snapshot.some(file => file.change !== 'unchanged') ? 'changes' : 'no-diff',
      base_sha:base, observed_head:head, selection:files ? 'explicit-files' : 'all-changes', scope_paths:selected,
      changed_paths:snapshot.filter(file => file.change !== 'unchanged').map(file => file.path),
      excluded_paths:changed.filter(path => !selected.includes(path)),
      working_snapshot:snapshot, index_sha256:digest(index), inventory_sha256:digest(inventory),
      tracked_diff_sha256:digest(git(root,args,null)), tracked_diff_command:['git',...args],
    };
    return {...scope, input_sha256:digest(JSON.stringify(scope))};
  };
  const first = capture(), second = capture();
  if (first.input_sha256 !== second.input_sha256) throw new Error('review-scope: working-tree changed while freezing inputs; stop writers and retry');
  return first;
}
function contained(root, path) {
  const rel = relative(root, path);
  if (!rel || rel === '..' || rel.startsWith(`..${sep}`) || isAbsolute(rel)) {
    throw new Error('review-scope: each source file must remain within the explicit project root');
  }
  return rel.split(sep).join('/');
}
function sourceFiles(options) {
  if (['base', 'head', 'commit', 'parent'].some(key => options[key] !== undefined)) {
    throw new Error('review-scope: source-files does not accept Git comparison options');
  }
  if (!Array.isArray(options.files) || !options.files.length) throw new Error('review-scope: source-files requires at least one --file');
  const root = realpathSync(resolve(options.repo));
  if (!statSync(root).isDirectory()) throw new Error('review-scope: repo must be a project directory');
  const seen = new Set(), source_snapshot = [];
  for (const path of options.files) {
    if (typeof path !== 'string' || !path || isAbsolute(path) || /[\\:\x00-\x1f]/.test(path) || path.split('/').some(part => !part || part === '.' || part === '..')) {
      throw new Error('review-scope: --file must be an explicit portable project-relative file path');
    }
    const requested = resolve(root, path), actual = realpathSync(requested);
    const resolved_path = contained(root, actual);
    if (seen.has(actual)) throw new Error('review-scope: duplicate source file or alias');
    seen.add(actual);
    if (!statSync(actual).isFile()) throw new Error('review-scope: --file must select a regular file');
    const descriptor = openSync(actual, constants.O_RDONLY | constants.O_NONBLOCK | (constants.O_NOFOLLOW ?? 0));
    try {
      const before = fstatSync(descriptor, { bigint: true });
      if (!before.isFile()) throw new Error('review-scope: --file must select a regular file');
      const bytes = readFileSync(descriptor);
      const after = fstatSync(descriptor, { bigint: true });
      const current = statSync(actual, { bigint: true });
      const stable = ['dev', 'ino', 'size', 'mtimeNs', 'ctimeNs'].every(key => before[key] === after[key] && after[key] === current[key]);
      if (!stable || realpathSync(requested) !== actual) throw new Error('review-scope: source file changed while freezing inputs; retry from current evidence');
      source_snapshot.push({ path, sha256: createHash('sha256').update(bytes).digest('hex'), bytes: bytes.length, ...(resolved_path === path ? {} : { resolved_path }) });
    } finally { closeSync(descriptor); }
  }
  return { version: 1, mode: 'source-files', review_mode: 'source-files', outcome: 'source-snapshot', source_snapshot };
}
function git(repo, args, encoding = 'utf8') {
  return execFileSync('git', ['-C', repo, ...args], {
    encoding, maxBuffer: 32 * 1024 * 1024, timeout: 30000,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, GIT_OPTIONAL_LOCKS: '0', GIT_TERMINAL_PROMPT: '0' },
  });
}
function commit(repo, ref, field) {
  if (typeof ref !== 'string' || !ref || ref.startsWith('-') || ref.includes('\0')) {
    throw new Error(`review-scope: ${field} must be an explicit Git ref`);
  }
  try {
    return git(repo, ['rev-parse', '--verify', '--end-of-options', `${ref}^{commit}`]).trim();
  } catch {
    throw new Error(`review-scope: ${field} cannot resolve to a local commit; read/fetch the authorized object first`);
  }
}

/** Resolve the exact comparison and return bounded metadata, not the entire diff. */
export function resolveReviewScope(options) {
  const { repo, mode } = options;
  if (typeof repo !== 'string' || !repo || !modes.has(mode)) {
    throw new Error('review-scope: --repo and --mode baseline|range|commit|pr|source-files|working-tree are required');
  }
  if (mode === 'source-files') return sourceFiles(options);
  if (mode === 'working-tree') return workingTree(options);
  if (options.files !== undefined) throw new Error('review-scope: --file requires source-files or working-tree mode');
  git(repo, ['rev-parse', '--git-dir']);
  let base, head;
  let selectedParent = null;
  if (mode === 'commit') {
    if (options.base !== undefined || options.head !== undefined) throw new Error('review-scope: commit mode does not accept base/head');
    head = commit(repo, options.commit, 'commit');
    const parents = git(repo, ['rev-list', '--parents', '-n', '1', head]).trim().split(/\s+/).slice(1);
    if (!parents.length) throw new Error('review-scope: root commit has no committed baseline; do not fabricate a CR fixed_point');
    if (parents.length > 1 && options.parent === undefined) throw new Error('review-scope: merge commit requires explicit --parent');
    selectedParent = options.parent === undefined ? 1 : Number(options.parent);
    if (!Number.isSafeInteger(selectedParent) || selectedParent < 1 || selectedParent > parents.length) throw new Error('review-scope: invalid parent number');
    base = parents[selectedParent - 1];
  } else {
    if (options.commit !== undefined || options.parent !== undefined) throw new Error('review-scope: commit/parent require commit mode');
    base = commit(repo, options.base, 'base');
    head = commit(repo, options.head, 'head');
    if (mode === 'pr' && (![options.base, options.head].every(value => /^[a-f0-9]{40}(?:[a-f0-9]{24})?$/i.test(value)))) {
      throw new Error('review-scope: PR mode requires exact remotely observed base/head SHAs, not moving names');
    }
  }
  let comparisonBase = base;
  if (mode === 'baseline' || mode === 'pr') {
    const bases = git(repo, ['merge-base', '--all', base, head]).trim().split(/\s+/).filter(Boolean);
    if (bases.length !== 1) throw new Error('review-scope: comparison requires one unambiguous merge base');
    comparisonBase = bases[0];
  }
  const diffArgs = ['diff', '--no-color', '--no-ext-diff', '--no-textconv', '--binary', '--no-renames', comparisonBase, head, '--'];
  const diff = git(repo, diffArgs, null);
  const names = git(repo, ['diff', '--no-color', '--no-ext-diff', '--no-textconv', '--no-renames', '--name-only', '-z', comparisonBase, head, '--'])
    .split('\0').filter(Boolean);
  return {
    version: 1, mode, outcome: names.length ? 'changes' : 'no-diff',
    base_sha: base, head_sha: head, fixed_point: comparisonBase,
    parent: selectedParent, diff_sha256: createHash('sha256').update(diff).digest('hex'),
    diff_bytes: diff.length, changed_paths: names, diff_command: ['git', ...diffArgs],
    log_command: ['git', 'log', `${comparisonBase}..${head}`, '--oneline', '--'],
  };
}

/** Strict argv admission; inputs are passed to Git as argv, never as shell text. */
export function reviewScopeCLI(argv) {
  const options = {};
  const allowed = new Set(['repo', 'mode', 'base', 'head', 'commit', 'parent', 'file']);
  for (let i = 0; i < argv.length; i++) {
    const key = argv[i].startsWith('--') ? argv[i].slice(2) : '';
    if (!allowed.has(key) || key !== 'file' && Object.hasOwn(options, key)) throw new Error(`review-scope: invalid or duplicate option ${argv[i]}`);
    const value = argv[++i];
    if (!value || value.startsWith('--')) throw new Error(`review-scope: missing ${key}`);
    if (key === 'file') (options.files ??= []).push(value);
    else options[key] = value;
  }
  console.log(JSON.stringify(resolveReviewScope(options), null, 2));
  return 0;
}
