/** Read-only Git review selection. Resolves refs once; never fetches or writes state. */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const modes = new Set(['baseline', 'range', 'commit', 'pr']);
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
    throw new Error('review-scope: --repo and --mode baseline|range|commit|pr are required');
  }
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
  const allowed = new Set(['repo', 'mode', 'base', 'head', 'commit', 'parent']);
  for (let i = 0; i < argv.length; i++) {
    const key = argv[i].startsWith('--') ? argv[i].slice(2) : '';
    if (!allowed.has(key) || Object.hasOwn(options, key)) throw new Error(`review-scope: invalid or duplicate option ${argv[i]}`);
    const value = argv[++i];
    if (!value || value.startsWith('--')) throw new Error(`review-scope: missing ${key}`);
    options[key] = value;
  }
  console.log(JSON.stringify(resolveReviewScope(options), null, 2));
  return 0;
}
