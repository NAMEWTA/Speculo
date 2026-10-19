import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, mkdir, readFile, writeFile, rm, readdir, rename, symlink } from 'node:fs/promises';
import { join, dirname, relative as relativePath } from 'node:path';
import { tmpdir, hostname } from 'node:os';
import { createHash, randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { changeFixture } from './workspace-fixture.js';
import { writeDesignFixture, document } from './helpers/design-fixture.js';
import { attachReviewFixture } from './helpers/review-fixture.js';

const load = () => import(pathToFileURL(join(process.cwd(), 'template/workflows/specdev/common/tools/publish-design.mjs')).href);
const artifacts = () => import(pathToFileURL(join(process.cwd(), 'template/workflows/specdev/common/tools/design-artifacts.mjs')).href);
const hash = (bytes: string | Buffer) => createHash('sha256').update(bytes).digest('hex');
const relative = (from: string, to: string) => relativePath(from,to).split('\\').join('/');
const id = '2026-10-14-design-baseline';
const text = (meta: any, body = '# Project design\n\nUse semantic colors and visible keyboard focus.\n') => `---\n${JSON.stringify(meta, null, 2)}\n---\n${body}`;

function metadata() {
  return { schema_version: 1, artifact: 'project-design', revision: 'DESIGN-0001', owner: 'specdev/archive-and-consolidate',
    scope: ['web'], tokens: { color: { surface: '#ffffff', text: '#151515' } },
    rules: [{ id: 'focus-visible', statement: 'Keyboard focus remains visible.', scope: ['web'], verification: 'approved-intent', sources: [] }],
    sources: [{ id: 'project', locator: 'project code and user design confirmation' }], supersedes: null, updated_at: '2026-10-14T00:00:00Z' };
}

async function lifecycle(change: string, outcome = 'active', work = 'specdev/prototype') {
  const verification = 'Method: isolated implementation fixture\nSource: fixture source and expectations\nObserved: keyboard focus passed\nResult: passed\n';
  await writeFile(join(change,'verification.md'),verification);
  await writeFile(join(change,'ownership.md'),`Owner: design-fixture-session\nWork: ${work}\nSource: simulated test user request\n`);
  await writeFile(join(change,'README.md'),`# Design change\n\nOutcome: ${outcome}\n\n## Ownership\nOwner: design-fixture-session\nWork: ${work}\nEvidence: ownership.md\n\n<a id="scope"></a>\n## Scope\nPreserve keyboard focus in the request workflow.\n\n<a id="acceptance"></a>\n## Acceptance\n- AC-1: keyboard focus stays visible.\n\n## Current Work\n- [${outcome === 'completed' ? 'x' : ' '}] Validate keyboard focus implementation.\n\n<a id="verification"></a>\n## Verification\n| AC | Result | Evidence | SHA256 |\n|---|---|---|---|\n| AC-1 | passed | verification.md | ${hash(verification)} |\n\n## Next Steps\n${outcome === 'completed' ? 'Archive after knowledge publication.' : 'Complete preview review with the user.'}\n`);
}
async function prototype(repo: string, change: string, contextOptions: Record<string,unknown> = {}) {
  await lifecycle(change);
  const packagePath = await writeDesignFixture(change, 'ready', true, contextOptions), packageRoot=dirname(packagePath), preview=join(packageRoot,'final/index.html');
  const api = await artifacts(), design = await api.readDesign(join(change,'DESIGN.md'));
  design.meta.status='draft';design.meta.confirmation=null;
  await writeFile(join(change,'DESIGN.md'),document(design.meta,design.body));
  await rm(join(dirname(dirname(change)),'design'),{recursive:true,force:true});
  return {packageRoot,packagePath,preview,receipt:{path:relative(repo,preview),sha256:hash(await readFile(preview)),package_path:relative(repo,packagePath),prototype_digest:await api.prototypeDigest(packagePath)}};
}

async function confirmation(repo: string, folder: string, approval: any) {
  const path = join(folder, `approval-${randomUUID()}.md`);
  const candidate=join(folder,'baseline-draft.md');
  try {
    const api=await artifacts(), baseline=await api.readDesign(candidate), changeRoot=dirname(dirname(folder)), design=await api.readDesign(join(changeRoot,'DESIGN.md'));
    if (approval.current_sha256 === null) { design.meta.baseline={revision:baseline.meta.revision,digest:baseline.digest}; await writeFile(join(changeRoot,'DESIGN.md'),document(design.meta,design.body)); }
  } catch(error:any) { if(error.code !== 'ENOENT') throw error; }
  const bindings = [approval.source, approval.confirmed_at, approval.candidate_sha256, approval.current_sha256 ?? 'absent',
    approval.preview?.sha256, approval.preview?.prototype_digest, approval.project_design?.owner, approval.project_design?.disposition, approval.project_design?.sha256].filter(Boolean);
  await writeFile(path, `# User design approval\n\nApproved the displayed content and scope:\n${bindings.join('\n')}\n`);
  return { ...approval, record: { path: relative(repo, path), sha256: hash(await readFile(path)) } };
}

const status = (change: string, change_status: string, current_work: string | null = null) => ({ schema_version: 6, artifact: 'change-status', change, change_status, current_work });

async function fixture(direct=false) {
  const repo = await mkdtemp(join(tmpdir(), 'speculo-design-'));
  const change = direct ? join(repo,'data/specdev/changes',id) : await changeFixture(repo,id);
  await mkdir(change,{recursive:true});
  const state=dirname(dirname(change)),store=join(state,'design');
  const contextOptions=direct ? {repoRoot:repo,methodRoot:join(process.cwd(),'template'),stateRoot:'data/specdev'} : {};
  await lifecycle(change);
  const generated = await prototype(repo, change, contextOptions), { preview, packagePath } = generated;
  const candidate = join(generated.packageRoot, 'baseline-draft.md');
  await writeFile(candidate, text(metadata()));
  const approval = await confirmation(repo, generated.packageRoot, { approved: true, source: `${id}/LOG.md#USER-001`, confirmed_at: '2026-10-14T00:01:00Z',
    candidate_sha256: hash(await readFile(candidate)), current_sha256: null,
    preview: generated.receipt });
  return { repo, change, state, store, candidate, preview, packagePath, approval, contextOptions };
}
async function completeFixture(f: Awaited<ReturnType<typeof fixture>>) {
  await lifecycle(f.change,'completed','specdev/archive-and-consolidate');
  const candidate=join(f.change,'baseline-draft.md');
  await rename(f.candidate,candidate);f.candidate=candidate;
  // The implementation branch in this gateway fixture is non-UI; its old prototypes remain archived as evidence outside the active package tree.
  await rename(join(f.change,'prototypes'),join(f.change,'prototype-history'));
  await rename(join(f.change,'DESIGN.md'),join(f.change,'draft-design-history.md'));
  attachReviewFixture(f.repo,f.change);
}
const options = (f: Awaited<ReturnType<typeof fixture>>) => ({ repoRoot: f.repo, ...f.contextOptions, candidatePath: f.candidate, approval: f.approval, mode: 'bootstrap', expectedCurrent: null });
async function scoped(run: (f: Awaited<ReturnType<typeof fixture>>) => Promise<void>) {
  const f = await fixture(); try { await run(f); } finally { await rm(f.repo, { recursive: true, force: true }); }
}

test('design dry-run has no writes; approved bootstrap preserves P state and user DESIGN', () => scoped(async f => {
  const { publishDesign } = await load();
  await writeFile(join(f.repo, 'DESIGN.md'), 'User-owned project design\r\n');
  const rootHash = hash(await readFile(join(f.repo, 'DESIGN.md'))), meta = metadata();
  await writeFile(f.candidate, text({ ...meta, sources: [...meta.sources, { id: 'user-design', locator: 'DESIGN.md', digest: rootHash }] }));
  f.approval = await confirmation(f.repo, dirname(f.candidate), { ...f.approval, candidate_sha256: hash(await readFile(f.candidate)),
    project_design: { owner: 'project-maintainer', disposition: 'derived-readonly', sha256: rootHash } });
  const before = await readFile(join(f.change, 'README.md'));
  const dry = await publishDesign(options(f));
  assert.deepEqual(dry.checkpoints, ['validated']);
  await assert.rejects(readFile(join(f.store, 'DESIGN.md')), /ENOENT/);
  const result = await publishDesign({ ...options(f), apply: true });
  assert.deepEqual(result.checkpoints, ['validated', 'revision-written', 'current-published', 'index-written']);
  assert.equal(result.applied, true);
  assert.deepEqual(await readFile(join(f.store, 'DESIGN.md')), await readFile(f.candidate));
  assert.deepEqual(await readFile(join(f.store, 'revisions/DESIGN-0001.md')), await readFile(f.candidate));
  assert.deepEqual(await readFile(join(f.change, 'README.md')), before);
  assert.equal(await readFile(join(f.repo, 'DESIGN.md'), 'utf8'), 'User-owned project design\r\n');
  await assert.rejects(readFile(join(f.store, '.publish-lock')), /ENOENT/);
}));

test('design approval binds candidate, current and displayed HTML; bootstrap never claims implemented', () => scoped(async f => {
  const { publishDesign } = await load();
  await assert.rejects(publishDesign({ ...options(f), approval: null, apply: true }), /approval/);
  await assert.rejects(publishDesign({ ...options(f), approval: { ...f.approval, preview: undefined }, apply: true }), /displayed HTML/);
  await writeFile(f.preview, '<!doctype html><title>Changed preview</title>');
  await assert.rejects(publishDesign({ ...options(f), apply: true }), /preview digest drift/);
  f.approval.preview.sha256 = hash(await readFile(f.preview));
  f.approval.preview.prototype_digest = await (await artifacts()).prototypeDigest(f.packagePath);
  await writeFile(f.candidate, text({ ...metadata(), rules: [{ ...metadata().rules[0], verification: 'implemented' }] }));
  f.approval.candidate_sha256 = hash(await readFile(f.candidate));
  await assert.rejects(publishDesign({ ...options(f), apply: true }), /implementation evidence|approved-intent/);
  await assert.rejects(readFile(join(f.store, 'DESIGN.md')), /ENOENT/);
}));

test('simultaneous first baselines cannot overwrite one another', () => scoped(async f => {
  const { publishDesign } = await load();
  const other = await changeFixture(f.repo, '2026-10-14-other-design');
  await lifecycle(other);
  const otherPrototype = await prototype(f.repo, other);
  const candidate = join(otherPrototype.packageRoot, 'baseline-draft.md');
  await writeFile(candidate, text(metadata(), '# Another design\n\nUse a different layout.\n'));
  const second = { ...options(f), candidatePath: candidate, approval: await confirmation(f.repo, otherPrototype.packageRoot, { ...f.approval, source: 'other/USER-001', candidate_sha256: hash(await readFile(candidate)), preview: otherPrototype.receipt }) };
  const outcomes = await Promise.allSettled([publishDesign({ ...options(f), apply: true }), publishDesign({ ...second, apply: true })]);
  assert.equal(outcomes.filter(item => item.status === 'fulfilled').length, 1);
  assert.equal(outcomes.filter(item => item.status === 'rejected').length, 1);
  const current = await readFile(join(f.store, 'DESIGN.md'));
  assert.ok(current.equals(await readFile(f.candidate)) || current.equals(await readFile(candidate)));
  assert.deepEqual(current, await readFile(join(f.store, 'revisions/DESIGN-0001.md')));
}));

test('bootstrap approval detects stylesheet drift even when HTML is unchanged', () => scoped(async f => {
  const { publishDesign } = await load();
  const htmlBefore = hash(await readFile(f.preview));
  await writeFile(join(dirname(f.preview), 'styles.css'), 'button { outline: none; }');
  assert.equal(hash(await readFile(f.preview)), htmlBefore);
  await assert.rejects(publishDesign({ ...options(f), apply: true }), /prototype package digest drift/);
  await assert.rejects(readFile(join(f.store, 'DESIGN.md')), /ENOENT/);
}));

test('publication requires an actual unchanged confirmation record with matching scope', () => scoped(async f => {
  const { publishDesign } = await load();
  await assert.rejects(publishDesign({ ...options(f), approval: { ...f.approval, record: undefined }, apply: true }), /locatable confirmation record/);
  const recordPath = join(f.repo, f.approval.record.path);
  await writeFile(recordPath, '# Different approval\n');
  await assert.rejects(publishDesign({ ...options(f), apply: true }), /record digest drift/);
  const altered = { ...f.approval, record: { ...f.approval.record, sha256: hash(await readFile(recordPath)) } };
  await assert.rejects(publishDesign({ ...options(f), approval: altered, apply: true }), /does not bind the approved content/);
  await assert.rejects(readFile(join(f.store, 'DESIGN.md')), /ENOENT/);
}));

test('root user DESIGN with unknown owner, missing provenance or drift blocks a second authority', () => scoped(async f => {
  const { publishDesign } = await load();
  const root = join(f.repo, 'DESIGN.md');
  await writeFile(root, '# User project rules\nPreserve the existing brand.\n');
  await assert.rejects(publishDesign({ ...options(f), apply: true }), /user DESIGN owner/);
  const rootHash = hash(await readFile(root));
  const unknown = await confirmation(f.repo, dirname(f.candidate), { ...f.approval, project_design: { owner: 'unknown', disposition: 'derived-readonly', sha256: rootHash } });
  await assert.rejects(publishDesign({ ...options(f), approval: unknown, apply: true }), /user DESIGN owner/);
  const known = await confirmation(f.repo, dirname(f.candidate), { ...f.approval, project_design: { owner: 'project-maintainer', disposition: 'derived-readonly', sha256: rootHash } });
  await assert.rejects(publishDesign({ ...options(f), approval: known, apply: true }), /candidate must cite/);
  const meta = metadata();
  await writeFile(f.candidate, text({ ...meta, sources: [...meta.sources, { id: 'user-design', locator: 'DESIGN.md', digest: rootHash }] }));
  const valid = await confirmation(f.repo, dirname(f.candidate), { ...known, candidate_sha256: hash(await readFile(f.candidate)) });
  await writeFile(root, '# User changed the existing design\n');
  await assert.rejects(publishDesign({ ...options(f), approval: valid, apply: true }), /user DESIGN digest drift/);
  await assert.rejects(readFile(join(f.store, 'DESIGN.md')), /ENOENT/);
}));

test('unknown change schema and another Work owner block the publication branch', () => scoped(async f => {
  const { publishDesign } = await load();
  await writeFile(join(f.change, '.status.json'), JSON.stringify({ ...status(id, 'active', 'specdev/prototype'), schema_version: 5 }));
  await assert.rejects(publishDesign({ ...options(f), apply: true }), /mixed-protocol|unsupported/);
  await rm(join(f.change,'.status.json'));
  await lifecycle(f.change,'active','specdev/grill-with-docs');
  await assert.rejects(publishDesign({ ...options(f), apply: true }), /owning prototype Work/);
  await assert.rejects(readFile(join(f.store, 'DESIGN.md')), /ENOENT/);
}));

test('identical retry repairs INDEX without allocating a revision or modifying its snapshot', () => scoped(async f => {
  const { publishDesign } = await load();
  await publishDesign({ ...options(f), apply: true });
  const snapshot = await readFile(join(f.store, 'revisions/DESIGN-0001.md'));
  await rm(join(f.store, 'INDEX.md'));
  const recovered = await publishDesign({ ...options(f), apply: true });
  assert.equal(recovered.already_published, true);
  assert.deepEqual(await readdir(join(f.store, 'revisions')), ['DESIGN-0001.md']);
  assert.deepEqual(await readFile(join(f.store, 'revisions/DESIGN-0001.md')), snapshot);
  assert.match(await readFile(join(f.store, 'INDEX.md'), 'utf8'), /DESIGN-0001/);
}));

test('an existing revision is immutable, and a current file without its snapshot blocks', () => scoped(async f => {
  const { publishDesign } = await load();
  await mkdir(join(f.store, 'revisions'), { recursive: true });
  await writeFile(join(f.store, 'revisions/DESIGN-0001.md'), 'conflicting snapshot');
  await assert.rejects(publishDesign({ ...options(f), apply: true }), /immutable design revision conflict/);
  await rm(join(f.store, 'revisions/DESIGN-0001.md'));
  await writeFile(join(f.store, 'DESIGN.md'), await readFile(f.candidate));
  await assert.rejects(publishDesign({ ...options(f), apply: true }), /immutable revision/);
}));

test('a revision published before interruption can resume without overwriting history', () => scoped(async f => {
  const { publishDesign } = await load();
  await mkdir(join(f.store, 'revisions'), { recursive: true });
  await writeFile(join(f.store, 'revisions/DESIGN-0001.md'), await readFile(f.candidate));
  const result = await publishDesign({ ...options(f), apply: true });
  assert.equal(result.applied, true);
  assert.deepEqual(await readFile(join(f.store, 'DESIGN.md')), await readFile(f.candidate));
}));

test('index failure returns real publication checkpoint and retries only the missing projection', () => scoped(async f => {
  const { publishDesign } = await load();
  await mkdir(join(f.store, 'INDEX.md'), { recursive: true });
  await assert.rejects(publishDesign({ ...options(f), apply: true }), (e: any) => {
    assert.equal(e.receipt.applied, true);
    assert.ok(e.receipt.checkpoints.includes('current-published'));
    assert.ok(!e.receipt.checkpoints.includes('index-written'));
    return /regular file/.test(e.message);
  });
  await rm(join(f.store, 'INDEX.md'), { recursive: true });
  const result = await publishDesign({ ...options(f), apply: true });
  assert.equal(result.already_published, true);
}));

test('a foreign or live lock is preserved; original dead process resumes with matching approval', () => scoped(async f => {
  const { publishDesign } = await load();
  const dry = await publishDesign(options(f));
  await mkdir(f.store, { recursive: true });
  const lock = join(f.store, '.publish-lock');
  const record = { owner: 'specdev/archive-and-consolidate', operation: dry.operation, source: f.approval.source, host: hostname(), pid: process.pid, token: 'original' };
  const live = JSON.stringify(record);
  await writeFile(lock, live);
  await assert.rejects(publishDesign({ ...options(f), apply: true, resume: true }), /cannot be resumed/);
  assert.equal(await readFile(lock, 'utf8'), live);
  await writeFile(lock, JSON.stringify({ ...record, pid: 2147483647 }));
  await assert.rejects(publishDesign({ ...options(f), apply: true }), /locked/);
  const result = await publishDesign({ ...options(f), apply: true, resume: true });
  assert.equal(result.applied, true);
  await assert.rejects(readFile(lock), /ENOENT/);
}));

test('promotion needs real completed change Evidence and preserves the old baseline', () => scoped(async f => {
  const { publishDesign } = await load();
  await publishDesign({ ...options(f), apply: true });
  const previous = await readFile(join(f.store, 'DESIGN.md'));
  await mkdir(join(f.change, 'evidence'));
  await writeFile(join(f.change, 'evidence/T-01.md'), '# Evidence\nKeyboard focus verified in implementation and browser.\n');
  await completeFixture(f);
  const meta = metadata();
  const promoted: any = { ...meta, revision: 'DESIGN-0002', supersedes: 'DESIGN-0001', rules: [{ ...meta.rules[0], verification: 'implemented', sources: [{ change: id, locator: 'evidence/T-01.md', digest: hash(await readFile(join(f.change, 'evidence/T-01.md'))) }] }] };
  await writeFile(f.candidate, text(promoted));
  const approval = await confirmation(f.repo, dirname(f.candidate), { ...f.approval, candidate_sha256: hash(await readFile(f.candidate)), current_sha256: hash(previous), preview: undefined });
  const result = await publishDesign({ ...options(f), mode: 'promotion', expectedCurrent: hash(previous), approval, apply: true });
  assert.equal(result.revision, 'DESIGN-0002');
  assert.deepEqual(await readFile(join(f.store, 'revisions/DESIGN-0001.md')), previous);
  assert.deepEqual(await readFile(join(f.store, 'DESIGN.md')), await readFile(f.candidate));
  await writeFile(f.candidate, text({ ...promoted, revision: 'DESIGN-0003', supersedes: 'DESIGN-0002' }));
  const staleApproval = await confirmation(f.repo, dirname(f.candidate), { ...approval, candidate_sha256: hash(await readFile(f.candidate)) });
  await assert.rejects(publishDesign({ ...options(f), mode: 'promotion', expectedCurrent: hash(previous), approval: staleApproval, apply: true }), /current digest drift/);
}));

test('completed alone does not turn a LOG entry or drifted evidence into implemented knowledge', () => scoped(async f => {
  const { publishDesign } = await load();
  await publishDesign({ ...options(f), apply: true });
  const previous = hash(await readFile(join(f.store, 'DESIGN.md')));
  await completeFixture(f);
  await writeFile(join(f.change, 'LOG.md'), '# Proposed focus design\n');
  const meta = metadata();
  await writeFile(f.candidate, text({ ...meta, revision: 'DESIGN-0002', supersedes: 'DESIGN-0001', rules: [{ ...meta.rules[0], verification: 'implemented', sources: [{ change: id, locator: 'LOG.md', digest: hash(await readFile(join(f.change, 'LOG.md'))) }] }] }));
  const approval = await confirmation(f.repo, dirname(f.candidate), { ...f.approval, candidate_sha256: hash(await readFile(f.candidate)), current_sha256: previous, preview: undefined });
  await assert.rejects(publishDesign({ ...options(f), mode: 'promotion', expectedCurrent: previous, approval, apply: true }), /requires change Evidence/);
  assert.equal(hash(await readFile(join(f.store, 'DESIGN.md'))), previous);
}));

test('archival before first publication rejects dry-run and apply without creating knowledge', () => scoped(async f => {
  const { publishDesign } = await load();
  f.approval = { ...f.approval, locator_version: 2,
    record: { ...f.approval.record, base: 'change', change: id, path: relative(f.change, join(f.repo, f.approval.record.path)) },
    preview: { ...f.approval.preview, base: 'change', change: id, path: relative(f.change, f.preview), package_path: relative(f.change, f.packagePath) } };
  await lifecycle(f.change, 'completed', 'specdev/archive-and-consolidate');
  const archived = join(f.state, 'changes/archive', id);
  await mkdir(dirname(archived), { recursive: true });
  await rename(f.change, archived);
  const candidatePath = join(archived, relative(f.change, f.candidate));
  const before = await Promise.all(['README.md', relative(f.change, f.candidate)].map(path => readFile(join(archived, path))));
  for (const apply of [false, true]) {
    await assert.rejects(publishDesign({ ...options(f), candidatePath, apply }), /new design publication must complete before change archival/);
    await assert.rejects(readdir(f.store), /ENOENT/);
  }
  assert.deepEqual(await Promise.all(['README.md', relative(f.change, f.candidate)].map(path => readFile(join(archived, path)))), before);
}));

test('stable change-relative approval survives movement and retries the same operation', () => scoped(async f => {
  const {publishDesign}=await load();
  f.approval={...f.approval,locator_version:2,record:{...f.approval.record,base:'change',change:id,path:relative(f.change,join(f.repo,f.approval.record.path))},preview:{...f.approval.preview,base:'change',change:id,path:relative(f.change,f.preview),package_path:relative(f.change,f.packagePath)}};
  const first=await publishDesign({...options(f),apply:true});
  const snapshot=await readFile(join(f.store,'revisions/DESIGN-0001.md'));
  await lifecycle(f.change,'completed','specdev/archive-and-consolidate');
  const archived=join(f.state,'changes/archive',id);await mkdir(dirname(archived),{recursive:true});await rename(f.change,archived);
  await rm(join(f.store,'INDEX.md'));
  const result=await publishDesign({...options(f),candidatePath:join(archived,relative(f.change,f.candidate)),apply:true});
  assert.equal(result.operation,first.operation);assert.equal(result.already_published,true);
  assert.deepEqual(await readFile(join(f.store,'revisions/DESIGN-0001.md')),snapshot);
}));

test('versioned approval locators reject foreign owners, unknown bases and ambiguous keys without writes', () => scoped(async f => {
  const {publishDesign}=await load();
  const approval={...f.approval,locator_version:2,record:{...f.approval.record,base:'change',change:id,path:relative(f.change,join(f.repo,f.approval.record.path))},preview:{...f.approval.preview,base:'change',change:id,path:relative(f.change,f.preview),package_path:relative(f.change,f.packagePath)}};
  for(const invalid of [
    {...approval,locator_version:3},
    {...approval,locator_version:undefined},
    {...approval,record:{...approval.record,change:'2026-10-14-foreign'}},
    {...approval,record:{...approval.record,base:'arbitrary'}},
    {...approval,record:{...approval.record,fallback_root:'.'}},
    {...approval,preview:{...approval.preview,change:'2026-10-14-foreign'}},
  ]) await assert.rejects(publishDesign({...options(f),approval:invalid,apply:true}),/locator/);
  await assert.rejects(readFile(join(f.store,'DESIGN.md')),/ENOENT/);
  await assert.rejects(readFile(join(f.store,'.publish-lock')),/ENOENT/);
}));

test('legacy archived evidence remains unchanged and cannot prove a new implemented promotion', () => scoped(async f => {
  const {publishDesign}=await load();
  await publishDesign({...options(f),apply:true});
  const previous=hash(await readFile(join(f.store,'DESIGN.md')));
  await completeFixture(f);
  const legacyName='2026-09-14-existing-focus',legacy=join(f.state,'changes/archive',legacyName);
  await mkdir(join(legacy,'evidence'),{recursive:true});
  const historicalStatus=JSON.stringify({schema_version:6,change:legacyName,change_status:'archived'}),historicalEvidence='# Existing focus evidence\n\nKeyboard focus was observed in the deployed interaction.\r\n';
  await writeFile(join(legacy,'.status.json'),historicalStatus);await writeFile(join(legacy,'evidence/T-01.md'),historicalEvidence);
  const meta=metadata();
  await writeFile(f.candidate,text({...meta,revision:'DESIGN-0002',supersedes:'DESIGN-0001',rules:[{...meta.rules[0],verification:'implemented',sources:[{change:legacyName,locator:'evidence/T-01.md',digest:hash(historicalEvidence)}]}]}));
  const approval=await confirmation(f.repo,dirname(f.candidate),{...f.approval,candidate_sha256:hash(await readFile(f.candidate)),current_sha256:previous,preview:undefined});
  await assert.rejects(publishDesign({...options(f),mode:'promotion',expectedCurrent:previous,approval,apply:true}),/unsupported|mixed-protocol|legacy|missing-readme/);
  assert.equal(hash(await readFile(join(f.store,'DESIGN.md'))),previous);
  assert.equal(await readFile(join(legacy,'.status.json'),'utf8'),historicalStatus);
  assert.equal(await readFile(join(legacy,'evidence/T-01.md'),'utf8'),historicalEvidence);
  await assert.rejects(readFile(join(legacy,'README.md')),/ENOENT/);
  const legacyCandidate=join(legacy,'candidate.md');await writeFile(legacyCandidate,await readFile(f.candidate));
  await assert.rejects(publishDesign({...options(f),candidatePath:legacyCandidate,mode:'promotion',expectedCurrent:previous,approval,apply:true}),/unsupported|mixed-protocol|legacy|confirmation record is outside|missing-readme/);
}));

test('unsafe roots, symlink stores and traversal evidence cannot write knowledge', () => scoped(async f => {
  const { publishDesign } = await load();
  await assert.rejects(publishDesign({ ...options(f), stateRoot: join(f.repo, '.speculo/specdev'), apply: true }), /state-root|root-ambiguous|path-unsafe/);
  await mkdir(join(f.repo, 'unrelated'));
  await symlink(join(f.repo, 'unrelated'), f.store);
  await assert.rejects(publishDesign({ ...options(f), apply: true }), /symlink|symbolic links/);
  assert.deepEqual(await readdir(join(f.repo, 'unrelated')), []);
  await rm(f.store);
  const meta = metadata();
  await writeFile(f.candidate, text({ ...meta, rules: [{ ...meta.rules[0], sources: [{ change: id, locator: '../other/LOG.md', digest: 'a'.repeat(64) }] }] }));
  const approval = await confirmation(f.repo, dirname(f.candidate), { ...f.approval, candidate_sha256: hash(await readFile(f.candidate)) });
  await assert.rejects(publishDesign({ ...options(f), approval, apply: true }), /unsafe design evidence locator/);
}));


test('direct Work publishes without workspace, status or config and preserves all preview gates', async()=>{
  const f=await fixture(true);try{
    const {publishDesign}=await load();
    const before=await readFile(join(f.change,'README.md'));
    const dry=await publishDesign(options(f));assert.deepEqual(dry.checkpoints,['validated']);
    const browser=join(f.change,'prototypes/UI-001/evidence/browser.json'),bytes=await readFile(browser);
    await writeFile(browser,JSON.stringify({...JSON.parse(bytes.toString()),prototype_digest:'0'.repeat(64)}));
    await assert.rejects(publishDesign({...options(f),apply:true}),/browser evidence digest is stale/);
    await assert.rejects(readFile(join(f.store,'DESIGN.md')),/ENOENT/);
    await writeFile(browser,bytes);
    const result=await publishDesign({...options(f),apply:true});assert.equal(result.applied,true);
    assert.deepEqual(await readFile(join(f.change,'README.md')),before);
    await assert.rejects(readFile(join(f.change,'.status.json')),/ENOENT/);
    await assert.rejects(readFile(join(f.repo,'.agents/speculo/.speculo/workspace.json')),/ENOENT/);
    await writeFile(join(f.change,'README.md'),(await readFile(join(f.change,'README.md'),'utf8')).replace('Outcome: active','Outcome: cancelled'));
    const candidate=await readFile(f.candidate,'utf8');await writeFile(f.candidate,candidate.replace('DESIGN-0001','DESIGN-0002'));
    const approval=await confirmation(f.repo,dirname(f.candidate),{...f.approval,candidate_sha256:hash(await readFile(f.candidate)),current_sha256:hash(await readFile(join(f.store,'DESIGN.md'))),preview:undefined});
    await assert.rejects(publishDesign({...options(f),mode:'promotion',expectedCurrent:approval.current_sha256,approval,apply:true}),/completed change|supersede/);
  }finally{await rm(f.repo,{recursive:true,force:true});}
});
