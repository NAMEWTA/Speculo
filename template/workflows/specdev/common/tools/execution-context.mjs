/** Change workspace and Ticket scheduling contracts. Inspection only; never creates worktrees or agents. */
import { readFileSync, realpathSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { basename, join, relative, resolve } from 'node:path';
import * as runtime from '../../../../lib/speculo-runtime.mjs';
import { validateCompletionReview } from './review-evidence.mjs';

export const EXECUTION_VERSION = 1;
export const EXECUTION_CONTEXT = 'README.md#execution-context';
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const text = value => typeof value === 'string' && value.trim().length > 0;
const sha = value => /^[a-f0-9]{40}(?:[a-f0-9]{24})?$/.test(value ?? '');
const positive = value => Number.isInteger(value) && value > 0;
const git = (root, args) => execFileSync('git', ['-C', root, ...args], {encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();

export function readExecutionContext(change) {
  const path = runtime.safeWorkPathSync(change, 'README.md', {mustExist:true,type:'file'});
  const source = readFileSync(path, 'utf8');
  const headings = runtime.markdownBodyLines(source, path).filter(line => line.text === '## Execution Context');
  if (!headings.length) return null;
  if (headings.length !== 1) throw new Error('duplicate Execution Context');
  const section = runtime.readArtifactSectionSync(path, 'execution-context').text;
  const blocks = [...section.matchAll(/```json\s*\n([\s\S]*?)\n```/g)];
  if (blocks.length !== 1) throw new Error('Execution Context requires one JSON object');
  const value = JSON.parse(blocks[0][1]);
  const required = ['schema_version','change','workspace_policy','workspace_ref','branch','base_sha','owner','ticket_execution'];
  const allowed = [...required,'max_parallel_tickets','concurrent_implementation_limit','integration_attempt_limit'];
  if (!object(value) || required.some(key => !(key in value)) || Object.keys(value).some(key => !allowed.includes(key))) throw new Error('invalid Execution Context fields');
  if (value.schema_version !== EXECUTION_VERSION || value.change !== basename(change)) throw new Error('Execution Context version/change mismatch; explicit reconciliation required');
  if (!['current','worktree'].includes(value.workspace_policy) || !['auto','serial','parallel'].includes(value.ticket_execution)) throw new Error('invalid workspace_policy or ticket_execution');
  if (!text(value.branch) || !text(value.owner) || !sha(value.base_sha)) throw new Error('Execution Context requires branch, owner and immutable base_sha');
  for (const key of ['max_parallel_tickets','concurrent_implementation_limit','integration_attempt_limit']) if (key in value && !positive(value[key])) throw new Error(`${key} must be a positive integer`);
  if (value.workspace_policy === 'current' ? value.workspace_ref !== 'current' : !text(value.workspace_ref) || value.workspace_ref === 'current' || /[\\:\x00-\x1f]/.test(value.workspace_ref) || value.workspace_ref.split('/').some(part => !part || part === '.' || part === '..' || part === '.git')) throw new Error('workspace_ref must identify the selected portable change workspace');
  return value;
}

/** Defaults do not impose an Agent count. Parent and child Ticket caps remain separate from it. */
export function ticketPolicy(...sources) {
  const values = sources.filter(Boolean);
  const modes = values.map(value => value.ticket_execution).filter(Boolean);
  const limits = values.map(value => value.max_parallel_tickets).filter(value => value !== undefined);
  if (modes.some(mode => !['auto','serial','parallel'].includes(mode)) || limits.some(limit => !positive(limit))) throw new Error('invalid Ticket scheduling policy');
  return {ticket_execution:modes.includes('serial') ? 'serial' : modes[0] ?? 'auto', max_parallel_tickets:modes.includes('serial') ? 1 : limits.length ? Math.min(...limits) : null};
}

export function resolveExecutionWorkspace(repoRoot, context) {
  if (!context || !repoRoot) return repoRoot;
  const root = realpathSync.native(repoRoot);
  const workspace = context.workspace_ref === 'current' ? root : runtime.safeWorkPathSync(root, context.workspace_ref, {mustExist:true,type:'directory'});
  if (relative(realpathSync.native(workspace), realpathSync.native(git(workspace,['rev-parse','--show-toplevel']))) !== '') throw new Error('selected workspace is not a real Git checkout');
  const common = cwd => realpathSync.native(resolve(cwd, git(cwd,['rev-parse','--git-common-dir'])));
  if (common(root) !== common(workspace)) throw new Error('selected workspace belongs to another repository');
  if (git(workspace,['symbolic-ref','--short','HEAD']) !== context.branch) throw new Error('selected workspace branch drifted');
  git(workspace,['cat-file','-e',`${context.base_sha}^{commit}`]);
  git(workspace,['merge-base','--is-ancestor',context.base_sha,'HEAD']);
  if (context.workspace_policy === 'worktree') {
    const paths = git(root,['worktree','list','--porcelain','-z']).split('\0').filter(row=>row.startsWith('worktree ')).map(row=>realpathSync.native(row.slice(9)));
    if (!paths.includes(realpathSync.native(workspace)) || realpathSync.native(workspace) === root) throw new Error('selected change worktree is not registered');
  }
  return workspace;
}

function evidenceText(change, locator) {
  if (!text(locator) || !locator.includes('#')) throw new Error('verification evidence requires an explicit artifact anchor');
  const [file, anchor, extra] = locator.split('#');
  if (!anchor || extra !== undefined) throw new Error('invalid evidence locator');
  const path = runtime.safeWorkPathSync(change, file, {mustExist:true,type:'file'});
  return runtime.readArtifactSectionSync(path, anchor).text;
}

export function validateExecutionRecord(change, record, context, {repoRoot=null, sourceRoot=repoRoot, checkCurrent=false} = {}) {
  const errors = [], unit = record.ticket_id ?? record.purpose;
  try {
    const identity = record.ticket_id ? ['ticket_id'] : ['purpose','change'];
    const keys = ['schema_version',...identity,'workspace_context','implementation_owners','status','checkpoint','verification','attempts'];
    if (record.schema_version !== EXECUTION_VERSION || keys.some(key=>!(key in record)) || Object.keys(record).some(key=>!keys.includes(key))) throw new Error('invalid execution record: only schema_version: 1 and its declared fields are supported');
    if (record.ticket_id ? !/^T-\d{2,}$/.test(record.ticket_id) : record.purpose !== 'direct-spec' || record.change !== basename(change)) throw new Error('execution identity does not match this change');
    if (!context || record.workspace_context !== EXECUTION_CONTEXT) throw new Error('execution must reference the unique change Execution Context');
    if (!['active','review','verified','blocked','cancelled'].includes(record.status)) throw new Error('invalid execution status');
    if (!Array.isArray(record.implementation_owners) || !record.implementation_owners.length || record.implementation_owners.some(owner=>!text(owner)) || new Set(record.implementation_owners).size !== record.implementation_owners.length) throw new Error('implementation_owners must list the actual distinct implementers');
    if (!Number.isInteger(record.attempts) || record.attempts < 0 || record.attempts > (context.integration_attempt_limit ?? 3)) throw new Error('verification attempts exceed the effective limit');
    if (record.checkpoint !== null && !text(record.checkpoint)) throw new Error('checkpoint must be null or a frozen review input locator');
    const verification = record.verification;
    if (!object(verification) || Object.keys(verification).sort().join(',') !== 'e2e,evidence,status' || !['pending','passed','failed'].includes(verification.status)) throw new Error('invalid workspace verification');
    const e2e = verification.e2e;
    if (!object(e2e) || Object.keys(e2e).sort().join(',') !== 'evidence,reason,required,status' || typeof e2e.required !== 'boolean' || !['pending','passed','failed','not-required'].includes(e2e.status)) throw new Error('invalid E2E disposition');
    for (const value of [verification.evidence,e2e.evidence,e2e.reason]) if (value !== null && !text(value)) throw new Error('evidence/reason must be null or non-empty text');
    if (!e2e.required && (e2e.status !== 'not-required' || !text(e2e.reason)) || e2e.required && e2e.status === 'not-required') throw new Error('E2E disposition needs a truthful result/reason');
    if (record.status === 'verified') {
      if (verification.status !== 'passed' || !['passed','not-required'].includes(e2e.status) || !record.checkpoint) throw new Error('verified execution requires passed checks, E2E and a frozen checkpoint');
      const observed = evidenceText(change,verification.evidence);
      if (!/^Result: passed\s*$/m.test(observed) || !/^Observed: \S/m.test(observed) || /^Command: /m.test(observed) && !/^Exit: 0\s*$/m.test(observed)) throw new Error('verification requires actual observations and successful command exits');
      if (e2e.required) {
        const result = evidenceText(change,e2e.evidence);
        if (!/^Result: passed\s*$/m.test(result) || !/^Observed: \S/m.test(result) || /^Command: /m.test(result) && !/^Exit: 0\s*$/m.test(result) || !result.split('\n').some(line=>line.trim() === `Owner: ${context.owner}`)) throw new Error('required E2E needs observed passing evidence owned by the Lead');
      }
      const artifact = `evidence/${record.ticket_id ?? 'direct-spec'}.md`;
      const source = readFileSync(runtime.safeWorkPathSync(change,artifact,{mustExist:true,type:'file'}),'utf8');
      if (!source.split('\n').some(line=>line.trim() === `Input: ${record.checkpoint}`)) throw new Error('checkpoint must match the actual Review input');
      errors.push(...validateCompletionReview(change,artifact,{repoRoot,sourceRoot,ticketId:record.ticket_id,requiredImplementers:record.implementation_owners,checkCurrent,requireDelivery:checkCurrent}));
    }
  } catch(error) { errors.push(`${unit}: ${error.message}`); }
  return errors;
}

