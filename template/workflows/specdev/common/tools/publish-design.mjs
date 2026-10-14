import { link, lstat, mkdir, open, readFile, readdir, rename, unlink } from 'node:fs/promises';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { hostname } from 'node:os';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { canonicalToolPath } from './plan-contract.mjs';
import * as runtime from '../../../../lib/speculo-runtime.mjs';
import { prototypeDigest, sha256, validateProjectDesign, designContext } from './design-artifacts.mjs';

const OWNER = 'specdev/archive-and-consolidate';
const HASH = /^[a-f0-9]{64}$/;
const CHANGE = /^\d{4}-\d{2}-\d{2}-[a-z0-9]+(?:-[a-z0-9]+)*$/;
const REVISION = /^DESIGN-(\d{4,})$/;
const portable = path => path.split(sep).join('/');
const present = async path => { try { return await lstat(path); } catch (e) { if (e.code === 'ENOENT') return null; throw e; } };
const fail = message => { throw new Error(message); };

/** Reject symlinks in every existing component, including not-yet-created leaves. */
async function safe(root, path) {
  const target = resolve(path), rel = portable(relative(root, target));
  return runtime.safeWorkPathSync(root, rel, {allowRoot:true});
}

async function localFile(context, locator, binding = null) {
  let root = context.projectRoot;
  if (binding?.base === 'change') {
    if (binding.change !== context.sourceName) fail('change-relative approval locator has the wrong owning identity');
    root = (await changeFor(context, binding.change)).root;
  } else if (binding?.base !== undefined && binding.base !== 'project') fail('unknown design locator base');
  if (typeof locator !== 'string' || !locator || isAbsolute(locator) || locator.includes('\\')) fail('unsafe design source locator');
  let logical = /^<Path>([^<>]+)<\/Path>$/.exec(locator)?.[1] ?? locator;
  if (logical.startsWith('{roots.')) {
    if (binding?.base === 'change') fail('change-relative locator cannot contain root aliases');
    const roots = {state:context.stateRoot,speculo:context.methodRoot,workflows:join(context.methodRoot,'workflows'),references:join(context.methodRoot,'references'),skills:join(context.projectRoot,'.agents/skills'),commands:join(context.methodRoot,'commands'),config:join(context.methodRoot,'config.json')};
    const match = /^\{roots\.(\w+)\}\/(.+)$/.exec(logical);
    if (!match || !roots[match[1]]) fail('unknown design locator alias');
    root = roots[match[1]]; logical = match[2];
  }
  const path = runtime.safeWorkPathSync(root, logical, {mustExist:true,type:'file'});
  await safe(context.projectRoot, path);
  return path;
}

async function fileHash(path) { return sha256(await readFile(path)); }

/** Write a complete fsynced file, then publish it with no replacement or rename. */
async function atomicFile(context, target, content, exclusive = false) {
  await safe(context.projectRoot, target);
  const temporary = join(dirname(target), `.design-${randomUUID()}.tmp`);
  const existing = await present(target);
  if (existing && !existing.isFile()) fail('design target is not a regular file');
  const handle = await open(temporary, 'wx', existing ? existing.mode & 0o777 : 0o644);
  try {
    try { await handle.writeFile(content); await handle.sync(); } finally { await handle.close(); }
    await safe(context.projectRoot, target);
    if (exclusive) await link(temporary, target); // atomic create-if-absent; rename would clobber another bootstrap
    else await rename(temporary, target);
  } finally {
    try { await unlink(temporary); } catch (e) { if (e.code !== 'ENOENT') throw e; }
  }
}

function processEnded(pid) {
  if (!Number.isSafeInteger(pid) || pid < 1) return false;
  try { process.kill(pid, 0); return false; } catch (e) { return e.code === 'ESRCH'; }
}

/** A short-lived file mutex, not a workflow transaction or a lock takeover service. */
async function acquire(context, operation, source, resume) {
  const path = join(context.store, '.publish-lock');
  const recovery = join(context.store, '.publish-resume');
  await safe(context.projectRoot, path);
  await safe(context.projectRoot, recovery);
  if (await present(recovery)) fail('design recovery is unfinished; inspect original gateway evidence');
  const record = { owner: OWNER, operation, source, host: hostname(), pid: process.pid, token: randomUUID() };
  if (await present(path)) {
    if (!resume) fail('design publication is locked; do not remove another owner lock');
    const originalBytes = await readFile(path), previous = JSON.parse(originalBytes);
    if (previous.owner !== OWNER || previous.operation !== operation || previous.source !== source || previous.host !== hostname() || !processEnded(previous.pid)) fail('design lock cannot be resumed by this operation');
    // An exclusive recovery guard prevents two resumptions from deleting each other's new lock.
    await atomicFile(context, recovery, JSON.stringify(record), true);
    try {
      if (!originalBytes.equals(await readFile(path))) fail('design lock changed during recovery');
      if (!processEnded(previous.pid)) fail('original publication process is still running');
      await unlink(path);
      await atomicFile(context, path, JSON.stringify(record), true);
    } finally {
      if (JSON.parse(await readFile(recovery, 'utf8')).token === record.token) await unlink(recovery);
    }
  } else {
    try { await atomicFile(context, path, JSON.stringify(record), true); }
    catch (e) { if (e.code === 'EEXIST') fail('design publication is locked'); throw e; }
  }
  const release = async () => {
    const actual = await present(path);
    if (!actual) return;
    await safe(context.projectRoot, path);
    const current = JSON.parse(await readFile(path, 'utf8'));
    if (current.token !== record.token) fail('design lock owner changed; preserving lock');
    await unlink(path);
  };
  if (await present(recovery)) { await release(); fail('design recovery is in progress'); }
  return release;
}

async function changeFor(context, id) {
  const location = runtime.resolveChangeSync(context, id, {includeArchived:true});
  const facts = location.kind === 'legacy-archive' ? runtime.readLegacyChangeEvidenceSync(context, location) : runtime.readChangeFactsSync(context, location);
  return {root:location.root, location, facts};
}

function within(root, path) {
  const rel = relative(root, path);
  return rel !== '..' && !rel.startsWith(`..${sep}`) && !isAbsolute(rel);
}

async function assertWriterState(context, change, mode, alreadyPublished = false) {
  if (change.location.kind === 'legacy-archive') fail('legacy archive is read-only; it cannot own a new design publication');
  if (change.location.kind === 'archive' && !alreadyPublished) fail('new design publication must complete before change archival');
  const { readChangeOwner } = await import('./change-artifacts.mjs');
  const owner = readChangeOwner(context, change.location.name);
  if (mode === 'bootstrap' && !alreadyPublished) {
    if (change.facts.outcome !== 'active') fail('bootstrap must remain in its active change');
    if (owner.work !== 'specdev/prototype') fail('bootstrap requires the owning prototype Work and its evidence');
  }
  if (mode === 'promotion') {
    if (change.facts.outcome !== 'completed') fail('design promotion requires completed change evidence');
    const { validateChange } = await import('./validate-specdev.mjs');
    const result = validateChange(change.root, 'complete', context.projectRoot, null, null, {context});
    if (result.errors.length) fail(`design promotion requires complete acceptance evidence: ${result.errors.join('; ')}`);
  }
}

async function verifyApproval(context, sourceChange, candidate, digest, approval, expectedCurrent) {
  if (!approval.record || !HASH.test(approval.record.sha256 ?? '')) fail('design approval requires a locatable confirmation record and digest');
  const recordPath = await localFile(context, approval.record.path, approval.record);
  const commandReports = join(dirname(context.state), 'commands', 'archive-and-consolidate');
  if (!within(sourceChange.root, recordPath) && !within(commandReports, recordPath) && !within(join(context.state,'maintenance'), recordPath)) fail('design confirmation record is outside the owning change/report');
  const bytes = await readFile(recordPath), text = bytes.toString('utf8');
  if (sha256(bytes) !== approval.record.sha256) fail('design confirmation record digest drift');
  const bindings = [approval.source, approval.confirmed_at, digest, expectedCurrent ?? 'absent'];
  if (approval.preview) bindings.push(approval.preview.sha256, approval.preview.prototype_digest);
  if (bindings.some(value => !text.includes(value))) fail('design confirmation record does not bind the approved content');
  const rootDesign = join(context.projectRoot, 'DESIGN.md');
  await safe(context.projectRoot, rootDesign);
  const existing = await present(rootDesign);
  if (!existing) {
    if (approval.project_design) fail('approved user DESIGN is missing');
    return;
  }
  if (!existing.isFile()) fail('user DESIGN is not a regular file');
  const rootHash = await fileHash(rootDesign), decision = approval.project_design;
  if (!decision || typeof decision.owner !== 'string' || !decision.owner.trim() || /^(?:unknown|unresolved|unspecified|none|n\/a|未知|未解析)/i.test(decision.owner.trim()) || decision.disposition !== 'derived-readonly') fail('user DESIGN owner and derived-readonly authority must be explicit');
  if (decision.sha256 !== rootHash) fail('user DESIGN digest drift');
  if (!candidate.meta.sources.some(source => ['DESIGN.md', '<Path>DESIGN.md</Path>'].includes(source.locator) && source.digest === rootHash)) fail('candidate must cite the existing user DESIGN and its byte digest');
  if ([decision.owner, decision.disposition, rootHash].some(value => !text.includes(value))) fail('confirmation record must bind the preserved user DESIGN authority');
}

async function verifySources(context, meta, mode, alreadyPublished = false) {
  for (const rule of meta.rules) {
    if (mode === 'bootstrap' && rule.verification !== 'approved-intent') fail('bootstrap rules must be approved-intent');
    for (const source of rule.sources) {
      if (isAbsolute(source.locator) || source.locator.includes('\\') || source.locator.split('/').includes('..')) fail('unsafe design evidence locator');
      const change = await changeFor(context, source.change);
      if(rule.verification === 'implemented' && change.facts.readonly && !alreadyPublished) fail(`implemented rule ${rule.id}: legacy archive alone does not prove completed acceptance; preserve its historical snapshot and obtain a current completion chain`);
      if (rule.verification === 'implemented' && !(change.facts.readonly ? change.facts.status.change_status === 'archived' : change.facts.outcome === 'completed')) fail(`implemented rule ${rule.id} requires a completed source change`);
      if (rule.verification === 'implemented' && !change.facts.readonly) {
        const {validateChange} = await import('./validate-specdev.mjs');
        const completed = validateChange(change.root,'complete',context.projectRoot,null,null,{context});
        if (completed.errors.length) fail(`implemented rule ${rule.id} source completion is unverified: ${completed.errors.join('; ')}`);
      }
      // A change-relative locator survives archival without rewriting immutable baselines.
      const projectRelative = source.locator.startsWith('<Path>') || source.locator.startsWith('{roots.') || source.locator.startsWith('.agents/');
      const path = projectRelative ? await localFile(context, source.locator) : runtime.safeWorkPathSync(change.root, source.locator, {mustExist:true,type:'file'});
      if (rule.verification === 'implemented') {
        const rel = portable(relative(change.root, path));
        if (!rel.startsWith('evidence/') || rel.includes('/../')) fail(`implemented rule ${rule.id} requires change Evidence`);
      }
      if (await fileHash(path) !== source.digest) fail(`design evidence digest drift: ${rule.id}`);
    }
  }
}

async function indexContent(context, current) {
  const lines = ['# Project design revisions', '', '当前规范：`DESIGN.md`。本索引是可重建投影，历史快照不可变。', '', '| Revision | Current | SHA-256 | Supersedes |', '|---|---|---|---|'];
  let currentRecord;
  for (const name of (await readdir(context.revisions)).filter(name => /^DESIGN-\d{4,}\.md$/.test(name)).sort()) {
    const path = await safe(context.projectRoot, join(context.revisions, name));
    const record = await validateProjectDesign(path);
    if (name !== `${record.meta.revision}.md`) fail('design revision filename mismatch');
    if (record.meta.revision === current) currentRecord = record;
    lines.push(`| [${record.meta.revision}](revisions/${name}) | ${record.meta.revision === current ? 'yes' : ''} | ${await fileHash(path)} | ${record.meta.supersedes ?? 'none'} |`);
  }
  const cell = value => String(value).replaceAll('|', '\\|').replace(/[\r\n]+/g, ' ');
  lines.push('', '## Current rule lookup', '', '| Rule ID | Scope | Verification | Locator |', '|---|---|---|---|');
  for (const rule of currentRecord?.meta.rules ?? []) lines.push(`| ${cell(rule.id)} | ${cell(rule.scope.join(', '))} | ${rule.verification} | [DESIGN.md](DESIGN.md) |`);
  return `${lines.join('\n')}\n`;
}

/** Caller owns user authorization and persistence of this bounded publication receipt. */
export async function publishDesign({ repoRoot, methodRoot, stateRoot, context: suppliedContext, candidatePath, approval, mode = 'bootstrap', expectedCurrent = null, apply = false, resume = false }) {
  const receipt = { owner: OWNER, mode, applied: false, checkpoints: [], paths: {}, recovery: null };
  let release;
  try {
    if (!['bootstrap', 'promotion'].includes(mode)) fail('invalid design publication mode');
    if (expectedCurrent !== null && !HASH.test(expectedCurrent)) fail('invalid expected current digest');
    const workContext = designContext(candidatePath, {repoRoot,methodRoot,stateRoot,context:suppliedContext});
    const context = {...workContext, state:workContext.specdevRoot};
    context.store = join(context.state, 'design');
    context.revisions = join(context.store, 'revisions');
    const currentPath = join(context.store, 'DESIGN.md'), indexPath = join(context.store, 'INDEX.md');
    const candidate = await safe(context.projectRoot, canonicalToolPath(context, candidatePath));
    const rel = portable(relative(context.state, candidate));
    const matched = /^(?:changes(?:\/archive)?|archive\/\d{4}-\d{2})\/(\d{4}-\d{2}-\d{2}-[a-z0-9]+(?:-[a-z0-9]+)*)\/.+\.md$/.exec(rel);
    if (!matched) fail('design candidate must belong to a SpecDev change');
    const sourceChange = await changeFor(context, matched[1]);
    const withinChange = relative(sourceChange.root, candidate);
    if (withinChange === '..' || withinChange.startsWith(`..${sep}`) || isAbsolute(withinChange)) fail('candidate does not belong to the resolved source change');
    context.sourceName = matched[1];
    const record = await validateProjectDesign(candidate), bytes = await readFile(candidate), digest = sha256(bytes);
    if (!approval || approval.approved !== true || typeof approval.source !== 'string' || !approval.source.trim() || !/^\d{4}-\d{2}-\d{2}T/.test(approval.confirmed_at ?? '') || Number.isNaN(Date.parse(approval.confirmed_at))) fail('explicit design approval record is required');
    if (approval.candidate_sha256 !== digest || approval.current_sha256 !== expectedCurrent) fail('design approval digest does not match candidate/current');
    if (approval.locator_version !== undefined && approval.locator_version !== 2) fail('unknown approval locator version');
    if (approval.locator_version !== 2 && [approval.record,approval.preview].some(value => value && ('base' in value || 'change' in value))) fail('relative locator bases require approval locator_version: 2');
    if (approval.locator_version === 2) for (const [kind,locator] of [['record',approval.record],['preview',approval.preview]]) {
      if (!locator && kind === 'preview') continue;
      const keys = new Set(kind === 'record' ? ['base','change','path','sha256'] : ['base','change','path','sha256','package_path','prototype_digest']);
      if (!locator || !['project','change'].includes(locator.base) || Object.keys(locator).some(key=>!keys.has(key)) || (locator.base === 'change' ? locator.change !== context.sourceName : locator.change !== undefined)) fail('v2 approval locator must declare its exact project/change base and owner');
    }
    const preview = approval.preview;
    if (mode === 'bootstrap' && (!preview || !HASH.test(preview.sha256 ?? '') || !HASH.test(preview.prototype_digest ?? '') || typeof preview.package_path !== 'string')) fail('bootstrap approval must include the displayed HTML preview and complete package digest');
    async function verifyPreview() {
      if (!preview) return;
      const previewPath = await localFile(context, preview.path, preview);
      if (!/\.html?$/i.test(previewPath) || await fileHash(previewPath) !== preview.sha256) fail('design preview digest drift');
      const packagePath = await localFile(context, preview.package_path, preview);
      const packageRelative = portable(relative(sourceChange.root, packagePath));
      if (!/^prototypes\/UI-\d{3,}\/design-system\.md$/.test(packageRelative) || previewPath !== join(dirname(packagePath), 'final', 'index.html')) fail('design approval preview must belong to its change prototype package');
      if (await prototypeDigest(packagePath) !== preview.prototype_digest) fail('design prototype package digest drift');
      if (mode === 'bootstrap') {
        const { validate } = await import('../../specdev-p-prototype/scripts/validate-design-package.mjs');
        await validate(packagePath, {checkPreview:true,context});
        const { readDesign } = await import('./design-artifacts.mjs');
        const changeDesign = await readDesign(join(sourceChange.root,'DESIGN.md'));
        if (changeDesign.meta.baseline.revision !== record.meta.revision || changeDesign.meta.baseline.digest !== record.digest) fail('bootstrap change DESIGN must bind the approved candidate baseline revision/digest');
      }
    }
    await verifyPreview();
    await verifyApproval(context, sourceChange, record, digest, approval, expectedCurrent);
    const snapshot = join(context.revisions, `${record.meta.revision}.md`);
    for (const path of [context.state, context.store, context.revisions, currentPath, indexPath, snapshot]) await safe(context.projectRoot, path);
    receipt.paths = Object.fromEntries(Object.entries({ current: currentPath, revision: snapshot, index: indexPath }).map(([key, path]) => [key, portable(relative(context.projectRoot, path))]));
    receipt.revision = record.meta.revision;
    receipt.candidate_sha256 = digest;
    receipt.design_digest = record.digest;
    const operation = sha256(JSON.stringify({ mode, digest, expectedCurrent, source: approval.source, confirmed_at: approval.confirmed_at, record: approval.record, project_design: approval.project_design, preview }));
    receipt.operation = operation;
    async function verifyCurrent() {
      const existing = await present(currentPath);
      if (!existing) {
        if (expectedCurrent !== null || mode !== 'bootstrap' || record.meta.revision !== 'DESIGN-0001' || record.meta.supersedes !== null) fail('design current is missing or bootstrap revision is invalid');
        return false;
      }
      await safe(context.projectRoot, currentPath);
      const current = await validateProjectDesign(currentPath), currentHash = await fileHash(currentPath);
      const oldSnapshot = await safe(context.projectRoot, join(context.revisions, `${current.meta.revision}.md`));
      if (!await present(oldSnapshot) || await fileHash(oldSnapshot) !== currentHash) fail('current DESIGN differs from its immutable revision');
      if (currentHash === digest) return true;
      if (currentHash !== expectedCurrent || mode !== 'promotion') fail('design current digest drift; rebase the candidate');
      const next = Number(REVISION.exec(current.meta.revision)?.[1]) + 1;
      if (!Number.isSafeInteger(next) || record.meta.revision !== `DESIGN-${String(next).padStart(4, '0')}` || record.meta.supersedes !== current.meta.revision) fail('design revision must be the next revision and supersede current');
      return false;
    }
    let alreadyPublished = await verifyCurrent();
    await verifySources(context, record.meta, mode, alreadyPublished);
    await assertWriterState(context, sourceChange, mode, alreadyPublished);
    if (await present(snapshot) && await fileHash(snapshot) !== digest) fail('immutable design revision conflict');
    receipt.checkpoints.push('validated');
    receipt.already_published = alreadyPublished;
    if (!apply) {
      if (await present(join(context.store, '.publish-lock')) || await present(join(context.store, '.publish-resume'))) fail('design publication is locked');
      return receipt;
    }
    await mkdir(context.store, { recursive: true });
    await safe(context.projectRoot, context.store);
    release = await acquire(context, operation, approval.source, resume);
    await mkdir(context.revisions, { recursive: true });
    await safe(context.projectRoot, context.revisions);
    await assertWriterState(context, await changeFor(context, matched[1]), mode, await verifyCurrent());
    if (await fileHash(candidate) !== digest) fail('design candidate changed after approval');
    await verifyPreview();
    await verifyApproval(context, sourceChange, record, digest, approval, expectedCurrent);
    alreadyPublished = await verifyCurrent();
    await verifySources(context, record.meta, mode, alreadyPublished);
    if (await present(snapshot)) {
      if (await fileHash(snapshot) !== digest) fail('immutable design revision conflict');
    } else await atomicFile(context, snapshot, bytes, true);
    if (await fileHash(snapshot) !== digest) fail('design revision readback failed');
    receipt.checkpoints.push('revision-written');
    if (!alreadyPublished) await atomicFile(context, currentPath, bytes, mode === 'bootstrap');
    if (await fileHash(currentPath) !== digest) fail('design current readback failed');
    receipt.applied = true;
    receipt.checkpoints.push('current-published');
    const index = await indexContent(context, record.meta.revision);
    await atomicFile(context, indexPath, index);
    if (await readFile(indexPath, 'utf8') !== index) fail('design index readback failed');
    receipt.checkpoints.push('index-written');
    return receipt;
  } catch (error) {
    receipt.recovery = 'Read the original approval/report and actual current/revision; retry the identical operation only after resolving its blocker.';
    error.receipt = receipt;
    throw error;
  } finally {
    if (release) {
      try { await release(); }
      catch (error) { error.receipt = receipt; throw error; }
    }
  }
}

async function main() {
  const args = process.argv.slice(2), options = {};
  for (let i = 0; i < args.length; i++) {
    const key = args[i];
    if (['--apply', '--resume', '--expect-absent'].includes(key)) { options[key.slice(2)] = true; continue; }
    if (!['--candidate', '--state-root', '--repo', '--method-root', '--approval', '--mode', '--expected-current'].includes(key) || !args[i + 1] || args[i + 1].startsWith('--')) fail(`unknown or incomplete argument: ${key}`);
    options[key.slice(2)] = args[++i];
  }
  if (!options.candidate || !options['state-root'] || !options.approval || Boolean(options['expect-absent']) === Boolean(options['expected-current'])) fail('provide --candidate, --state-root, --approval and exactly one expected-current option');
  const context = designContext(options.candidate, {repoRoot:options.repo,methodRoot:options['method-root'],stateRoot:options['state-root']});
  const approvalPath = await safe(context.projectRoot, resolve(context.projectRoot,options.approval));
  const approval = JSON.parse(await readFile(approvalPath, 'utf8'));
  return publishDesign({ context, stateRoot: options['state-root'], candidatePath: options.candidate, approval, mode: options.mode, expectedCurrent: options['expected-current'] ?? null, apply: Boolean(options.apply), resume: Boolean(options.resume) });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().then(result => process.stdout.write(`${JSON.stringify(result, null, 2)}\n`)).catch(error => {
    process.stderr.write(`${JSON.stringify({ error: error.message, receipt: error.receipt ?? null }, null, 2)}\n`);
    process.exitCode = 1;
  });
}
