#!/usr/bin/env node
/** Explicit maintainer conversion. This is never called by init or ordinary Work. */
import { createHash, randomUUID } from 'node:crypto';
import { chmod, cp, link, lstat, mkdir, open, readFile, readdir, readlink, rename, rm, rmdir, unlink } from 'node:fs/promises';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { hostname } from 'node:os';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { TextDecoder } from 'node:util';
import Ajv from 'ajv/dist/2020.js';
import { assertChangeName, discoverChangesSync, parseOutcome, resolveWorkContextSync, safeWorkPathSync } from '../template/lib/speculo-runtime.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SCHEMAS = join(ROOT, 'template/workflows/specdev/common/schemas');
const MARKER = '.markdown-conversion-pending';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const json = value => JSON.stringify(value, null, 2) + '\n';
export const conversionPlanDigest = plan => hash(json(plan));
const posix = path => path.split(sep).join('/');
const fail = message => { throw new Error(`markdown-conversion: ${message}`); };
async function exists(path) { try { await lstat(path); return true; } catch (e) { if (e.code === 'ENOENT') return false; throw e; } }
async function object(path) { const value = JSON.parse(await readFile(path, 'utf8')); if (!value || typeof value !== 'object' || Array.isArray(value)) fail(`invalid object ${path}`); return value; }
async function readMarkdown(path) {
  const bytes = await readFile(path);
  // Retain a valid BOM and all original line endings when appending new facts.
  try { return new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes); }
  catch { fail(`invalid UTF-8 in ${path}; preserve the source and resolve its encoding with the original owner`); }
}
function inside(root, path) { const rel = relative(root, path); return !isAbsolute(rel) && rel !== '..' && !rel.startsWith(`..${sep}`); }
function portable(root, path) { if (!inside(root, path)) fail(`path outside project: ${path}`); return posix(relative(root, path)); }
function checked(root, path, required = false) { return safeWorkPathSync(root, path, { mustExist: required }); }
function processEnded(pid) { if (!Number.isSafeInteger(pid) || pid < 1) return false; try { process.kill(pid, 0); return false; } catch (e) { return e.code === 'ESRCH'; } }
async function schema(value, filename) { const ajv = new Ajv({ allErrors: true, strict: false, validateFormats: false }); const valid = ajv.compile(await object(join(SCHEMAS, filename))); if (!valid(value)) fail(`${filename}: unsupported or unknown fields: ${ajv.errorsText(valid.errors)}`); }
async function sourceIdentity(projectRoot) {
  const identity = [];
  for (const path of ['workspace.json', 'install.json', 'managed.json', 'projections.json']) {
    const locator = `.agents/speculo/.speculo/${path}`, full = checked(projectRoot, locator);
    identity.push({ path: locator, sha256: await exists(full) ? hash(await readFile(full)) : null });
  }
  return identity;
}
async function targetToolIdentity() {
  const paths = ['scripts/migrate-specdev-markdown.mjs', 'template/lib', 'template/workflows/specdev/common/tools', 'template/workflows/specdev/common/schemas', 'template/workflows/specdev/specdev-p-prototype/scripts'];
  return hash(json(await Promise.all(paths.map(async path => ({ path, nodes: await inventory(join(ROOT, path)) })))));
}

/** Records every node, permission, empty directory and link without dereferencing it. */
export async function inventory(root, omit = []) {
  const records = [];
  if (!await exists(root)) return records;
  async function visit(path, name) {
    if (omit.includes(name)) return;
    const info = await lstat(path), mode = info.mode & 0o7777;
    if (info.isSymbolicLink()) records.push({ path: name, type: 'link', mode, target: await readlink(path) });
    else if (info.isDirectory()) { records.push({ path: name, type: 'directory', mode }); for (const entry of (await readdir(path)).sort()) await visit(join(path, entry), name ? `${name}/${entry}` : entry); }
    else if (info.isFile()) { const bytes = await readFile(path); records.push({ path: name, type: 'file', mode, bytes: bytes.length, sha256: hash(bytes) }); }
    else fail(`unsupported node ${path}`);
  }
  await visit(root, ''); return records;
}
async function exactCopy(source, target) {
  await cp(source, target, { recursive: true, dereference: false, verbatimSymlinks: true, errorOnExist: true, force: false, preserveTimestamps: true });
  const before = await inventory(source);
  for (const node of [...before].reverse()) if (node.type !== 'link' && process.platform !== 'win32') await chmod(join(target, node.path), node.mode);
  if (json(before) !== json(await inventory(target))) fail('backup does not preserve bytes, modes, directories or links');
}
function gitInventory(projectRoot, specdevRoot) {
  try {
    const run = args => execFileSync('git', ['-C', projectRoot, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).split('\0').filter(Boolean);
    const path = portable(projectRoot, specdevRoot);
    return { tracked: run(['ls-files', '-z', '--', path]), untracked: run(['ls-files', '--others', '--exclude-standard', '-z', '--', path]), ignored: run(['ls-files', '--others', '--ignored', '--exclude-standard', '-z', '--', path]) };
  } catch { return { unavailable: 'No readable Git index; filesystem inventory remains authoritative.' }; }
}
async function assertNoTransactions(projectRoot, specdevRoot) {
  for (const path of ['.agents/.speculo-install.lock', '.agents/.speculo-transactions']) {
    const full = checked(projectRoot, path);
    if (await exists(full) && (path.endsWith('.lock') || (await readdir(full)).length)) fail(`installation recovery is unresolved: ${path}`);
  }
  for (const record of await inventory(specdevRoot)) {
    if (/\.(?:publish-lock|publish-resume)$/.test(record.path) || /(?:^|\/)(?:pending-transaction|transaction-pending)(?:\.|$)/.test(record.path)) fail(`unresolved design/transaction evidence: ${record.path}`);
  }
}

/** Default operation: pure reads. The returned plan is fixed by its source digest. */
export async function planConversion({ projectRoot, stateRoot, sourceVersion, id = randomUUID(), owner }) {
  projectRoot = resolve(projectRoot); stateRoot = checked(projectRoot, portable(projectRoot, resolve(projectRoot, stateRoot)), true);
  const installed = await exists(join(projectRoot, '.agents/speculo/.speculo/workspace.json'));
  const context = resolveWorkContextSync({ projectRoot, stateRoot: portable(projectRoot, stateRoot), ...(!installed ? { methodRoot: join(ROOT, 'template') } : {}) });
  projectRoot = context.projectRoot; stateRoot = context.stateRoot;
  if (!/^[a-zA-Z0-9][a-zA-Z0-9-]{0,79}$/.test(id) || typeof owner !== 'string' || !owner.trim() || typeof sourceVersion !== 'string' || !sourceVersion.trim()) fail('id, owner and exact source method/tool version are required');
  const specdevRoot = checked(stateRoot, 'specdev', true);
  if (await exists(join(specdevRoot, MARKER))) fail('pending conversion must be recovered by its original owner');
  await assertNoTransactions(projectRoot, specdevRoot);
  discoverChangesSync(specdevRoot, { includeArchived: true, includeLegacy: true });
  const global = await object(checked(specdevRoot, 'status.json', true)); await schema(global, 'status.schema.json');
  const names = global.active.map(item => item.change).sort();
  if (new Set(names).size !== names.length || global.archived.some(name => names.includes(name))) fail('duplicate active/history identities');
  for (const name of [...names, ...global.archived]) assertChangeName(name);
  const disk = await exists(join(specdevRoot, 'changes')) ? await readdir(join(specdevRoot, 'changes'), { withFileTypes: true }) : [];
  const actual = [];
  for (const entry of disk) {
    if (entry.name === '.gitkeep') continue;
    if (entry.name === 'archive') { if ((await readdir(checked(specdevRoot, 'changes/archive', true))).length) fail('mixed new archives require explicit review'); continue; }
    if (!entry.isDirectory() || entry.isSymbolicLink()) fail(`invalid active object ${entry.name}`);
    assertChangeName(entry.name); actual.push(entry.name);
  }
  if (json(actual.sort()) !== json(names)) fail('plan must cover every active directory and global parent/child dependency');
  // Config has real tool consumers and stays byte-for-byte. Unknown schema/fields are not guessed away.
  if (await exists(join(specdevRoot, 'config.json'))) await schema(await object(checked(specdevRoot, 'config.json', true)), 'config.schema.json');
  const before = await inventory(specdevRoot), actions = [], changes = [];
  const write = async (path, content, sourceMode) => {
    const full = checked(specdevRoot, path), original = await exists(full) ? await readFile(full) : null;
    const node = before.find(item => item.path === path);
    actions.push({ path, kind: 'write', before: original ? hash(original) : null, mode: sourceMode ?? node?.mode ?? 0o644, content: Buffer.from(content).toString('base64') });
  };
  for (const name of names) {
    const prefix = `changes/${name}`, statusPath = `${prefix}/.status.json`, bytes = await readFile(checked(specdevRoot, statusPath, true)), status = JSON.parse(bytes);
    await schema(status, 'change-status.schema.json');
    if (status.change !== name || status.archived || status.archive_path !== null || status.change_status === 'archived') fail(`active identity/location mismatch: ${name}`);
    if (status.claimed_investigations.length) fail(`active investigation claims must be resolved by original owner: ${name}`);
    if (status.change_status === 'completed' && status.blockers.length) fail(`completed object still has unresolved blockers: ${name}`);
    if (status.worktrees.some(w => ['active', 'integrating', 'review'].includes(w.status) || ['applying'].includes(w.integration.promotion_status))) fail(`active writer/worktree result unresolved: ${name}`);
    const outcome = status.change_status === 'completed' ? 'completed' : 'active';
    const originalPath = `${prefix}/conversion/${id}-status.original.json`, factsPath = `${prefix}/conversion/${id}-facts.md`;
    if (await exists(join(specdevRoot, originalPath)) || await exists(join(specdevRoot, factsPath))) fail(`conversion destination exists: ${name}`);
    let readme = await exists(join(specdevRoot, prefix, 'README.md')) ? await readMarkdown(checked(specdevRoot, `${prefix}/README.md`, true)) : `# ${name}\n`;
    if (/^Outcome\s*:/m.test(readme)) fail(`mixed README Outcome and old status: ${name}`);
    if (/^## Ownership\s*$/m.test(readme)) fail(`existing Ownership section needs explicit handoff reconciliation: ${name}`);
    readme += `\nOutcome: ${outcome}\n\n## Ownership\n\nOwner: ${status.leadership.current}\n${status.current_work ? `Work: ${status.current_work}\n` : ''}Evidence: conversion/${id}-facts.md\n\n## Conversion and handoff\n\nOriginal facts and continuation: [conversion evidence](conversion/${id}-facts.md).\nOriginal JSON is retained as [immutable source](conversion/${id}-status.original.json), not an active writer authority.\n`;
    if (await exists(join(specdevRoot, prefix, 'spec.md'))) readme += '\nScope and acceptance: [existing specification](spec.md).\n';
    if (await exists(join(specdevRoot, prefix, 'goal-plan.md'))) readme += '\nProgress and dependencies: [existing Goal plan](goal-plan.md).\n';
    parseOutcome(readme, `${prefix}/README.md`);
    await write(originalPath, bytes, before.find(item => item.path === statusPath).mode);
    await write(factsPath, `# Conversion evidence: ${name}\n\nConversion: ${id}\nSource tool: ${sourceVersion}\nSource SHA-256: ${hash(bytes)}\n\nThe following original facts retain their provenance. Authorization entries are evidence for review, never a new grant. Unknown external results remain unknown.\n\n## Current owner and handoff\n\nOwner: ${status.leadership.current}\nWork: ${status.current_work ?? 'none'}\nSource: ${id}-status.original.json\n\n## Blockers and deviations\n\n${json({ blockers: status.blockers, deviations: status.deviations })}\n## Original authorization and handoff facts\n\n\`\`\`json\n${json({ execution_authorization: status.execution_authorization, leadership: status.leadership })}\`\`\`\n\nHistorical invocation list and timestamps remain in [original JSON](${id}-status.original.json). Workspace execution facts are owned by each Ticket Evidence.\n`);
    for (const worktree of status.worktrees) {
      const evidence = `${prefix}/evidence/${worktree.ticket_id}.md`;
      const current = await exists(join(specdevRoot, evidence)) ? await readMarkdown(checked(specdevRoot, evidence, true)) : `# ${worktree.ticket_id} evidence\n`;
      if (/^## Workspace Execution Record\s*$/m.test(current)) fail(`workspace evidence already has an execution record: ${name}/${worktree.ticket_id}`);
      await write(evidence, current + `\n## Workspace Execution Record\n\n\`\`\`json\n${json(worktree)}\`\`\`\n\nOriginal owner, source/candidate/result and Git verification provenance: [original status](../conversion/${id}-status.original.json). No result was inferred by conversion.\n`);
    }
    await write(`${prefix}/README.md`, readme);
    changes.push({ name, outcome, original: originalPath, facts: factsPath, currentOwner: status.leadership.current });
  }
  const globalOriginal = `conversion/${id}-global-status.original.json`;
  if (await exists(join(specdevRoot, globalOriginal))) fail('global evidence destination exists');
  await write(globalOriginal, await readFile(join(specdevRoot, 'status.json')), before.find(item => item.path === 'status.json').mode);
  for (const name of names) { const path = `changes/${name}/.status.json`; actions.push({ path, kind: 'remove', before: before.find(node => node.path === path).sha256 }); }
  actions.push({ path: 'status.json', kind: 'remove', before: before.find(node => node.path === 'status.json').sha256 });
  return { schema_version: 1, kind: 'specdev-markdown-conversion', id, owner, projectRoot, stateRoot, sourceContext: context, sourceIdentity: await sourceIdentity(projectRoot), targetToolSha256: await targetToolIdentity(), sourceVersion, supported: { global: 5, change: 6, config: 7 }, inputSha256: hash(json(before)), inventory: before, git: gitInventory(projectRoot, specdevRoot), changes, actions, historicalPolicy: 'frozen-in-place', limits: 'No remote, history move or global rollback. Stop all old writers; complete conversion before new writers resume.' };
}

async function atomicWrite(path, bytes, mode, exclusive = false) {
  await mkdir(dirname(path), { recursive: true }); const tmp = join(dirname(path), `.conversion-${randomUUID()}.tmp`);
  const handle = await open(tmp, 'wx', mode);
  try { await handle.writeFile(bytes); await handle.sync(); } finally { await handle.close(); }
  try {
    if (exclusive) await link(tmp, path); // Atomic no-overwrite, including the initial plan/receipt.
    else await rename(tmp, path);
    if (process.platform !== 'win32') await chmod(path, mode);
  } finally { await rm(tmp, { force: true }); }
}
async function actionState(root, action) {
  const path = checked(root, action.path);
  if (!await exists(path)) return null;
  const info = await lstat(path); if (!info.isFile()) fail(`action node type drift: ${action.path}`);
  return hash(await readFile(path));
}
async function applyAction(root, action) {
  const now = await actionState(root, action), next = action.kind === 'write' ? hash(Buffer.from(action.content, 'base64')) : null;
  if (now === next) return;
  if (now !== action.before) fail(`input drift: ${action.path}`);
  if (action.kind === 'write') await atomicWrite(checked(root, action.path), Buffer.from(action.content, 'base64'), action.mode, action.before === null);
  else await unlink(checked(root, action.path, true));
}
async function validateConverted(root, plan, snapshot = false) {
  const { readChangeOwner } = await import('../template/workflows/specdev/common/tools/change-artifacts.mjs');
  const { validateChange } = await import('../template/workflows/specdev/common/tools/validate-specdev.mjs');
  for (const change of plan.changes) {
    parseOutcome(await readMarkdown(join(root, 'changes', change.name, 'README.md')));
    readChangeOwner(root, change.name);
    // Validate all existing new-format consumers. Completed additionally runs full engineering gates.
    const options = snapshot ? { readOnlySnapshot: { sourceContext: plan.sourceContext, specdevRoot: root } } : { context: plan.sourceContext };
    const result = validateChange(join(root, 'changes', change.name), change.outcome === 'completed' ? 'complete' : null, plan.projectRoot, null, null, options);
    if (result.errors.length) fail(`${change.outcome === 'completed' ? 'completion evidence' : 'new consumers'} do not pass for ${change.name}: ${result.errors.join('; ')}`);
  }
}
async function writerEvidence(plan, { writerPids, writerHost, handoffSource, approvalSource }) {
  if (writerHost !== hostname() || !Array.isArray(writerPids) || !writerPids.length || new Set(writerPids).size !== writerPids.length || writerPids.some(pid => !processEnded(pid))) fail('all inventoried writer PIDs must be demonstrably exited on this host; a stopped boolean is insufficient');
  const evidence = {};
  for (const [key, path] of Object.entries({ handoffSource, approvalSource })) {
    if (typeof path !== 'string' || !path) fail(`${key} must identify readable original evidence`);
    const bytes = await readFile(checked(plan.projectRoot, path, true)); if (!bytes.length) fail(`${key} is empty`);
    evidence[key] = { path, sha256: hash(bytes) };
    const fields = {};
    for (const line of bytes.toString('utf8').split(/\r?\n/)) {
      const match = /^(Plan|Plan-SHA256|Input-SHA256|Owner|Host|PIDs|Writers|Observed): (.+)$/.exec(line);
      if (match) { if (fields[match[1]] !== undefined) fail(`duplicate ${key} field ${match[1]}`); fields[match[1]] = match[2]; }
    }
    if (key === 'approvalSource' && (fields.Plan !== plan.id || fields.Owner !== plan.owner || fields['Input-SHA256'] !== plan.inputSha256 || fields['Plan-SHA256'] !== conversionPlanDigest(plan))) fail('approval evidence must bind the exact plan, owner, input and write-set digest');
    if (key === 'handoffSource' && (fields.Host !== writerHost || fields.PIDs !== [...writerPids].sort((a,b) => a-b).join(',') || fields.Writers !== 'stopped' || !fields.Observed?.trim())) fail('handoff evidence must identify inventoried host/PIDs and observed termination');
  }
  return { host: writerHost, pids: writerPids, ...evidence };
}
async function runLocked(operation, task) {
  const lock = join(operation, 'process.lock'), token = randomUUID();
  try { await mkdir(lock); } catch (e) {
    if (e.code !== 'EEXIST') throw e;
    const guard = join(operation, 'process.resume');
    try { await mkdir(guard); } catch (e) { if (e.code === 'EEXIST') fail('another resume owns this conversion; preserve recovery guard'); throw e; }
    try {
      const before = await readFile(join(lock, 'owner.json')), previous = JSON.parse(before);
      if (previous.host !== hostname() || typeof previous.token !== 'string' || !processEnded(previous.pid)) fail('conversion process is still live or unknown; preserve its lock');
      if (!(await readFile(join(lock, 'owner.json'))).equals(before) || !processEnded(previous.pid)) fail('conversion lock changed during recovery');
      await rm(lock, { recursive: true }); await mkdir(lock);
    } finally { await rmdir(guard); }
  }
  await atomicWrite(join(lock, 'owner.json'), Buffer.from(json({ host: hostname(), pid: process.pid, token })), 0o600);
  try { return await task(); } finally {
    const current = await object(join(lock, 'owner.json'));
    if (current.token !== token) fail('conversion lock owner changed; preserving it');
    await rm(lock, { recursive: true });
  }
}

/** Explicit apply or same-owner resume; hook is fault injection for disposable tests only. */
export async function applyConversion(plan, options) {
  if (process.platform === 'win32') fail('Windows apply requires an ACL/link-preserving converter; this maintenance tool supports read-only planning only');
  if (plan.schema_version !== 1 || plan.kind !== 'specdev-markdown-conversion' || options.owner !== plan.owner || options.apply !== true) fail('explicit apply and original plan owner are required');
  const evidence = await writerEvidence(plan, options);
  if (json(await sourceIdentity(plan.projectRoot)) !== json(plan.sourceIdentity)) fail('original installation identity changed; preserve conversion recovery');
  if (await targetToolIdentity() !== plan.targetToolSha256) fail('conversion/validator version drift; recover with the original reviewed tool version');
  const specdevRoot = checked(plan.stateRoot, 'specdev', true);
  const backupRoot = checked(plan.projectRoot, portable(plan.projectRoot, resolve(plan.projectRoot, options.backupRoot)));
  if (inside(plan.stateRoot, backupRoot) || inside(backupRoot, plan.stateRoot) || portable(plan.projectRoot, backupRoot).split('/').includes('.speculo')) fail('backupRoot must be outside replaced runtime and CLI-owned back');
  const operation = join(backupRoot, plan.id), receiptPath = join(operation, 'receipt.json'), markerPath = join(specdevRoot, MARKER);
  await mkdir(backupRoot, { recursive: true });
  const resume = await exists(receiptPath);
  if (!resume) {
    const current = await planConversion(plan);
    if (json(current) !== json(plan)) fail('reviewed plan/input drift; generate and review a new plan');
    if (await exists(operation)) fail('backup destination exists without a conversion receipt; preserve it');
    await mkdir(operation);
  }
  return runLocked(operation, async () => {
    let receipt;
    if (resume) {
      receipt = await object(receiptPath);
      if (receipt.owner !== options.owner || receipt.planSha256 !== hash(json(plan)) || receipt.backupRoot !== backupRoot) fail('conversion owner/plan/backup mismatch');
      if (json(receipt.evidence) !== json(evidence)) fail('original approval or writer handoff evidence drift');
      if (json(await object(join(operation, 'plan.json'))) !== json(plan)) fail('saved plan drift');
      if (json(await inventory(join(operation, 'before'))) !== json(plan.inventory)) fail('backup corrupt');
      if (['rolled-back', 'rolling-back'].includes(receipt.state)) fail('conversion rollback must finish before generating a new plan');
    } else {
      await atomicWrite(join(operation, 'plan.json'), Buffer.from(json(plan)), 0o600, true);
      await exactCopy(specdevRoot, join(operation, 'before'));
      if (json(await inventory(join(operation, 'before'))) !== json(plan.inventory)) fail('input drift while backing up; original runtime remains untouched');
      // Verify restoration, not merely existence of an archive or Git history.
      await exactCopy(join(operation, 'before'), join(operation, 'restore-probe'));
      await rm(join(operation, 'restore-probe'), { recursive: true });
      await exactCopy(specdevRoot, join(operation, 'staging'));
      for (const action of plan.actions) await applyAction(join(operation, 'staging'), action);
      await validateConverted(join(operation, 'staging'), plan, true);
      receipt = { schema_version: 1, id: plan.id, owner: options.owner, planSha256: hash(json(plan)), backupRoot, evidence, state: 'prepared', completed: 0, outputInventory: await inventory(join(operation, 'staging')) };
      await atomicWrite(receiptPath, Buffer.from(json(receipt)), 0o600, true);
    }
    // Entire tree comparison catches unrelated/new business writes before any resumption.
    const expected = join(operation, 'expected'); await rm(expected, { recursive: true, force: true }); await exactCopy(join(operation, 'before'), expected);
    for (let i = 0; i < receipt.completed; i++) await applyAction(expected, plan.actions[i]);
    let observed = await inventory(specdevRoot, [MARKER]);
    if (json(observed) !== json(await inventory(expected))) {
      if (receipt.completed < plan.actions.length) { await applyAction(expected, plan.actions[receipt.completed]); if (json(observed) === json(await inventory(expected))) receipt.completed++; else fail('runtime drift since conversion checkpoint; preserve pending and backup'); }
      else fail('runtime drift after conversion; forward repair is required');
    }
    await rm(expected, { recursive: true });
    if (receipt.state === 'completed' && !await exists(markerPath)) { await validateConverted(specdevRoot, plan); return receipt; }
    await assertNoTransactions(plan.projectRoot, specdevRoot); await writerEvidence(plan, options);
    if (json(await sourceIdentity(plan.projectRoot)) !== json(plan.sourceIdentity)) fail('installation identity changed before conversion write');
    if (await targetToolIdentity() !== plan.targetToolSha256) fail('conversion/validator changed after staging; preserve original pending recovery');
    const marker = { id: plan.id, owner: plan.owner, plan: portable(plan.projectRoot, join(operation, 'plan.json')), receipt: portable(plan.projectRoot, receiptPath), inputSha256: plan.inputSha256 };
    if (await exists(markerPath)) { if (json(await object(markerPath)) !== json(marker)) fail('pending marker belongs to another or unknown operation'); }
    else { if (receipt.completed > 0) fail('pending marker is missing after partial conversion'); const h = await open(markerPath, 'wx', 0o600); try { await h.writeFile(json(marker)); await h.sync(); } finally { await h.close(); } }
    await options.hook?.('pending-created');
    for (let i = receipt.completed; i < plan.actions.length; i++) {
      await applyAction(specdevRoot, plan.actions[i]); await options.hook?.(`action:${i}`);
      receipt.completed = i + 1; receipt.state = 'applying'; await atomicWrite(receiptPath, Buffer.from(json(receipt)), 0o600);
    }
    if (json(await inventory(specdevRoot, [MARKER])) !== json(receipt.outputInventory)) fail('final inventory differs from validated staging');
    if (await targetToolIdentity() !== plan.targetToolSha256 || json(await sourceIdentity(plan.projectRoot)) !== json(plan.sourceIdentity)) fail('verification/installation identity drift before clearing pending');
    if (json(await writerEvidence(plan, options)) !== json(receipt.evidence)) fail('authorization/handoff drift before clearing pending');
    receipt.state = 'completed'; await atomicWrite(receiptPath, Buffer.from(json(receipt)), 0o600);
    await options.hook?.('validated');
    if (json(await object(markerPath)) !== json(marker)) fail('pending marker changed; preserve it');
    await unlink(markerPath);
    try {
      if (json(await inventory(specdevRoot)) !== json(receipt.outputInventory)) fail('post-completion drift');
      await validateConverted(specdevRoot, plan);
    } catch (error) {
      await atomicWrite(markerPath, Buffer.from(json(marker)), 0o600, true);
      receipt.state = 'verification-failed'; await atomicWrite(receiptPath, Buffer.from(json(receipt)), 0o600);
      throw error;
    }
    return receipt;
  });
}

/** Restore only a verified partial prefix; never roll back facts written by a new writer. */
export async function recoverConversion(plan, options) {
  if (process.platform === 'win32') fail('Windows recovery requires an ACL/link-preserving converter; preserve original evidence');
  if (options.mode !== 'rollback') return applyConversion(plan, options);
  if (options.owner !== plan.owner || options.apply !== true) fail('rollback requires original owner and explicit apply');
  const evidence = await writerEvidence(plan, options);
  if (json(await sourceIdentity(plan.projectRoot)) !== json(plan.sourceIdentity)) fail('original installation identity changed; rollback is unsafe');
  if (await targetToolIdentity() !== plan.targetToolSha256) fail('rollback requires the original reviewed tool version');
  const operation = checked(plan.projectRoot, portable(plan.projectRoot, resolve(plan.projectRoot, options.backupRoot, plan.id)), true);
  return runLocked(operation, async () => {
    const receiptPath = join(operation, 'receipt.json'), receipt = await object(receiptPath), root = checked(plan.stateRoot, 'specdev', true), markerPath = join(root, MARKER);
    if (receipt.state === 'completed') fail('completed conversion cannot be rolled back over new business facts');
    if (receipt.owner !== plan.owner || receipt.planSha256 !== hash(json(plan)) || json(await inventory(join(operation, 'before'))) !== json(plan.inventory)) fail('recovery owner/plan/backup mismatch');
    if (json(receipt.evidence) !== json(evidence) || json(await object(join(operation, 'plan.json'))) !== json(plan)) fail('original recovery plan or authorization evidence drift');
    if (receipt.state === 'rolled-back' && !await exists(markerPath)) {
      if (json(await inventory(root)) !== json(plan.inventory)) fail('business facts changed after rollback');
      return receipt;
    }
    const marker = await object(markerPath); if (marker.id !== plan.id || marker.owner !== plan.owner) fail('pending marker owner mismatch');
    const expected = join(operation, 'rollback-probe'); await rm(expected, { recursive: true, force: true }); await exactCopy(join(operation, 'before'), expected);
    if (receipt.state !== 'rolling-back' && receipt.state !== 'rolled-back') {
      let matched = false;
      for (let i = 0; i <= plan.actions.length; i++) {
        if (json(await inventory(root, [MARKER])) === json(await inventory(expected))) { matched = true; receipt.rollbackFrom = i; break; }
        if (i < plan.actions.length) await applyAction(expected, plan.actions[i]);
      }
      if (!matched) fail('new/drifting business facts prohibit rollback');
      receipt.state = 'rolling-back'; receipt.rollbackCompleted = 0;
      await atomicWrite(receiptPath, Buffer.from(json(receipt)), 0o600);
    } else {
      for (let i = 0; i < receipt.rollbackFrom; i++) await applyAction(expected, plan.actions[i]);
    }
    const originalDirs = new Set(plan.inventory.filter(n => n.type === 'directory').map(n => n.path));
    const cleanup = [...receipt.outputInventory].reverse().filter(node => node.type === 'directory' && !originalDirs.has(node.path)).map(node => ({ path: node.path, kind: 'prune' }));
    const undo = [...plan.actions].reverse().concat(cleanup);
    async function restore(target, action) {
      const original = join(operation, 'before', action.path), destination = checked(target, action.path);
      if (action.kind === 'prune') { if (await exists(destination)) await rmdir(destination); return; }
      if (await exists(original)) { const mode = (await lstat(original)).mode & 0o7777; await atomicWrite(destination, await readFile(original), mode); }
      else await rm(destination, { force: true });
    }
    for (let i = 0; i < receipt.rollbackCompleted; i++) await restore(expected, undo[i]);
    if (json(await inventory(root, [MARKER])) !== json(await inventory(expected))) {
      if (receipt.rollbackCompleted < undo.length) await restore(expected, undo[receipt.rollbackCompleted]);
      if (json(await inventory(root, [MARKER])) !== json(await inventory(expected))) fail('new/drifting business facts prohibit rollback resumption');
      receipt.rollbackCompleted++;
    }
    // Pending blocks ordinary writers throughout the individually checkpointed restore.
    for (let i = receipt.rollbackCompleted; i < undo.length; i++) {
      await restore(root, undo[i]); await options.hook?.(`rollback:${i}`);
      receipt.rollbackCompleted = i + 1; await atomicWrite(receiptPath, Buffer.from(json(receipt)), 0o600);
    }
    if (json(await inventory(root, [MARKER])) !== json(plan.inventory)) fail('restored files differ from original backup');
    receipt.state = 'rolled-back'; await atomicWrite(receiptPath, Buffer.from(json(receipt)), 0o600); await unlink(markerPath); await rm(expected, { recursive: true }); return receipt;
  });
}

async function main() {
  const argv = process.argv.slice(2), mode = argv.shift() ?? 'plan', args = {};
  for (let i = 0; i < argv.length; i++) { const flag = argv[i]; if (!/^--[a-z-]+$/.test(flag) || args[flag.slice(2)] !== undefined) fail(`invalid option ${flag}`); if (flag === '--apply') args.apply = true; else { if (!argv[i + 1] || argv[i + 1].startsWith('--')) fail(`missing value ${flag}`); args[flag.slice(2)] = argv[++i]; } }
  const allowed = new Set(['project-root', 'state-root', 'source-version', 'owner', 'id', 'plan', 'apply', 'backup-root', 'writer-pids', 'writer-host', 'handoff-source', 'approval-source', 'mode']);
  for (const key of Object.keys(args)) if (!allowed.has(key)) fail(`unknown option --${key}`);
  let result;
  if (mode === 'plan') result = await planConversion({ projectRoot: args['project-root'], stateRoot: args['state-root'], sourceVersion: args['source-version'], owner: args.owner, id: args.id });
  else if (['apply', 'recover'].includes(mode)) { const plan = await object(resolve(args.plan)); const options = { apply: args.apply, owner: args.owner, backupRoot: args['backup-root'], writerPids: (args['writer-pids'] ?? '').split(',').map(Number), writerHost: args['writer-host'], handoffSource: args['handoff-source'], approvalSource: args['approval-source'], mode: args.mode }; result = await (mode === 'recover' ? recoverConversion : applyConversion)(plan, options); }
  else fail('expected plan, apply or recover');
  process.stdout.write(json(result));
}
if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) main().catch(error => { process.stderr.write(`${error.message}\n`); process.exitCode = 1; });
