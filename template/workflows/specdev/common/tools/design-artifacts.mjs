import { createHash } from 'node:crypto';
import { lstat, readFile, readdir, readlink } from 'node:fs/promises';
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseFrontmatter } from '../../../../lib/speculo-runtime.mjs';
import * as runtime from '../../../../lib/speculo-runtime.mjs';
import { resolveToolContext, canonicalToolPath } from './plan-contract.mjs';
import * as schemas from '../../../../lib/design-validators.mjs';

export const sha256 = value => createHash('sha256').update(value).digest('hex');
const stable = value => Array.isArray(value) ? value.map(stable) : value && typeof value === 'object'
  ? Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])])) : value;

/** Hash normative content, never its own receipt or mutable workflow timestamps. */
export function designDigest(markdown) {
  const { fields, body } = parseFrontmatter(markdown);
  const { confirmation, status, updated_at, ...normative } = fields;
  return sha256(JSON.stringify(stable(normative)) + '\n' + body.replaceAll('\r\n', '\n').trim());
}

export function assertSchema(name, value) {
  const validate = schemas[name];
  if (!validate || !validate(value)) throw new Error(`${name}: ${JSON.stringify(validate?.errors ?? 'unknown schema')}`);
}

export async function safePath(root, locator) {
  if (typeof locator !== 'string' || !locator || isAbsolute(locator) || locator.includes('\\') || locator.split('/').some(x => !x || x === '.' || x === '..')) throw new Error(`unsafe design locator: ${locator}`);
  return runtime.safeWorkPathSync(root, locator, { mustExist:true });
}

export async function readDesign(path) {
  if ((await lstat(path)).isSymbolicLink()) throw new Error('design document must not be a symlink');
  const text = await readFile(path, 'utf8');
  const { fields: meta, body } = parseFrontmatter(text);
  return { meta, body, text, digest: designDigest(text) };
}

function unique(items, label) {
  if (new Set(items).size !== items.length) throw new Error(`duplicate ${label}`);
}

function assertBody(body) {
  if (!body.trim() || /\bTODO\b|<YYYY-MM-DD|<ISO-8601>|\[待补充\]/.test(body)) throw new Error('design normative body is incomplete');
  if (/(?:[A-Za-z]:[\\/]|\/(?:Users|home|tmp)\/)/.test(body)) throw new Error('design contains machine-specific absolute path');
}

export async function validateProjectDesign(path) {
  const record = await readDesign(path);
  assertSchema('projectDesign', record.meta);
  assertBody(record.body);
  unique(record.meta.rules.map(rule => rule.id), 'design rule id');
  unique(record.meta.sources.map(source => source.id), 'design source id');
  for (const rule of record.meta.rules) {
    if (rule.verification === 'implemented' && !rule.sources.length) throw new Error(`implemented rule ${rule.id} requires implementation evidence`);
  }
  validateTokens(record.meta.tokens);
  return record;
}

/** Tokens remain project-named; references must resolve and cannot form cycles. */
export function validateTokens(tokens) {
  const visit = (value, trail = []) => {
    if (typeof value === 'string') for (const match of value.matchAll(/\{([\w.-]+)\}/g)) {
      const key = match[1].replace(/^tokens\./, '');
      if (trail.includes(key)) throw new Error(`cyclic design token: ${key}`);
      let target = tokens;
      for (const part of key.split('.')) target = target?.[part];
      if (target === undefined) throw new Error(`unresolved design token: ${key}`);
      visit(target, [...trail, key]);
    }
    else if (value && typeof value === 'object') for (const child of Object.values(value)) visit(child, trail);
  };
  visit(tokens);
}

export function designContext(path, options = {}) {
  if (options.context) return resolveToolContext(path, {context:options.context});
  const stateParameter = options.stateRoot ? (isAbsolute(options.stateRoot) && options.repoRoot ? relative(resolve(options.repoRoot),options.stateRoot) : options.stateRoot) : undefined;
  const context = resolveToolContext(path, {repoRoot:options.repoRoot, methodRoot:options.methodRoot, stateRoot:stateParameter ? dirname(stateParameter) : undefined});
  if (stateParameter && resolve(context.projectRoot, stateParameter) !== context.specdevRoot) throw new Error('state-root must identify the declared SpecDev root');
  return context;
}
export function designStateRoot(path, options = {}) { return designContext(path, options).specdevRoot; }

export async function validateChangeDesign(path, options = {}) {
  const { requireApproved = true } = options;
  const record = await readDesign(path);
  assertSchema('changeDesign', record.meta);
  assertBody(record.body);
  validateTokens(record.meta.tokens);
  unique(record.meta.pages.map(page => page.id), 'design page id');
  if (basename(dirname(path)) !== record.meta.change) throw new Error('DESIGN change does not match owning directory');
  if (requireApproved && record.meta.status !== 'approved') throw new Error('change DESIGN requires approved status');
  if (record.meta.status === 'approved') {
    if (record.meta.confirmation.digest !== record.digest) throw new Error('change DESIGN confirmation digest is stale');
    const receipt = await safePath(dirname(path), record.meta.confirmation.record);
    const receiptBytes = await readFile(receipt);
    if (sha256(receiptBytes) !== record.meta.confirmation.record_digest) throw new Error('user confirmation record digest is stale');
    const receiptText = receiptBytes.toString('utf8');
    for (const digest of [record.digest, record.meta.prototype_ref.digest, record.meta.baseline.digest]) if (!receiptText.includes(digest)) throw new Error('user confirmation record does not bind the design, prototype and baseline scope');
    const state = designStateRoot(path, options);
    const snapshot = await validateProjectDesign(await safePath(state, `design/revisions/${record.meta.baseline.revision}.md`));
    if (snapshot.meta.revision !== record.meta.baseline.revision || snapshot.digest !== record.meta.baseline.digest) throw new Error('baseline revision/digest mismatch');
  }
  return record;
}

export async function prototypeDigest(path) {
  const { meta } = await readDesign(path), root = dirname(path), files = [];
  async function collect(folder) {
    const absolute = await safePath(root, folder);
    for (const entry of (await readdir(absolute, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
      const locator = `${folder}/${entry.name}`;
      if (entry.isSymbolicLink()) throw new Error(`prototype resource symlink: ${locator}`);
      if (entry.isDirectory()) await collect(locator);
      else if (entry.isFile()) files.push([locator, sha256(await readFile(await safePath(root, locator)))]);
      else throw new Error(`unsupported prototype resource: ${locator}`);
    }
  }
  await collect('final');
  await collect('comparison');
  files.sort((a, b) => a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0);
  return sha256(JSON.stringify(stable({ candidates: meta.candidates, selected_candidate: meta.selected_candidate, files })));
}

export const DESIGN_LIBRARY = fileURLToPath(new URL('../../specdev-p-prototype/design-library/', import.meta.url));

function archiveLocator(context, location, value) {
  const match = /^(change|project):([^#]+)(?:#([a-z][a-z0-9-]*))?$/.exec(value ?? '');
  if (!match) throw new Error('archive receipt locator must declare change: or project:');
  const root = match[1] === 'change' ? location.root : context.projectRoot;
  return {path:runtime.safeWorkPathSync(root,match[2],{mustExist:true,type:'file'}),anchor:match[3]};
}

/** Read the owning A receipt and its actual moved bytes, without writing a projection. */
async function validateArchiveReceipt(context, location, sealed) {
  const readme = runtime.readChangeFactsSync(context,location).readmePath;
  const lines = runtime.markdownBodyLines(runtime.readUtf8ArtifactSync(readme),readme);
  const headings = lines.filter(line=>line.text === '## Archive Receipt');
  if (headings.length > 1) throw new Error('duplicate Archive Receipt navigation');
  let locator = `change:archive-receipt.md#archive-${location.name}`;
  if (headings.length) {
    const start=headings[0].line,end=lines.find(line=>line.line > start && /^#{1,2} /.test(line.text))?.line ?? Infinity;
    const values=lines.filter(line=>line.line > start && line.line < end && /^Receipt: /.test(line.text));
    if(values.length !== 1) throw new Error('Archive Receipt navigation requires one Receipt locator');
    locator=values[0].text.slice('Receipt: '.length);
  }
  const receipt=archiveLocator(context,location,locator);
  const commandRoot=join(context.stateRoot,'commands/project-maintenance');
  const within=(root,path)=>{const rel=relative(root,path);return rel && rel !== '..' && !rel.startsWith(`..${sep}`) && !isAbsolute(rel);};
  if (!within(location.root,receipt.path) && !within(commandRoot,receipt.path)) throw new Error('archive receipt is outside the owning change/Command report');
  if (receipt.path !== join(location.root,'archive-receipt.md') && await lstat(join(location.root,'archive-receipt.md')).catch(()=>null)) throw new Error('archive has two receipt authorities');
  if (!receipt.anchor) throw new Error('archive receipt requires an explicit object anchor');
  const fields={};
  for(const line of runtime.markdownBodyLines(runtime.readArtifactSectionSync(receipt.path,receipt.anchor).text,receipt.path)) {
    const field=/^([A-Z][A-Za-z0-9-]*): (.+)$/.exec(line.text);
    if(!field) continue;
    if(field[1] in fields) throw new Error(`archive receipt duplicates ${field[1]}`);
    fields[field[1]]=field[2];
  }
  for(const key of ['Change','Owner','Operation','Approval','Approval-SHA256','Source','Target','Result','Integrity','Integrity-SHA256','Time']) {
    if(typeof fields[key] !== 'string' || /^(?:unknown|pending|tbd|todo|\.\.\.|<.*>)$/i.test(fields[key])) throw new Error(`archive receipt requires actual ${key}`);
  }
  const {readChangeOwner}=await import('./change-artifacts.mjs');
  if(fields.Change !== location.name || fields.Source !== `changes/${location.name}` || fields.Target !== `changes/archive/${location.name}`) throw new Error('archive receipt has a foreign change/source/target');
  if(fields.Owner !== readChangeOwner(context,location.name).owner) throw new Error('archive receipt owner differs from the current handoff evidence');
  if(!['moved','verified'].includes(fields.Result) || Number.isNaN(Date.parse(fields.Time))) throw new Error('archive receipt has an invalid result/time');
  if(sealed && fields.Result !== 'verified') throw new Error('archive receipt is moved but not sealed; finish the original A8 receipt');
  const approval=archiveLocator(context,location,fields.Approval);
  const approvalText=approval.anchor ? runtime.readArtifactSectionSync(approval.path,approval.anchor).text : runtime.readUtf8ArtifactSync(approval.path);
  if(approval.path === receipt.path || !/^[a-f0-9]{64}$/.test(fields['Approval-SHA256']) || sha256(await readFile(approval.path)) !== fields['Approval-SHA256']) throw new Error('archive approval snapshot is missing, mutable or has digest drift');
  if([location.name,fields.Operation,fields.Owner].some(value=>!approvalText.includes(value))) throw new Error('archive approval snapshot does not bind the original operation/change/owner');
  const manifest=archiveLocator(context,location,fields.Integrity);
  if(manifest.anchor || !within(location.root,manifest.path) || manifest.path === receipt.path || !/^[a-f0-9]{64}$/.test(fields['Integrity-SHA256']) || sha256(await readFile(manifest.path)) !== fields['Integrity-SHA256']) throw new Error('archive integrity manifest has an invalid locator or digest drift');
  const data=JSON.parse(await readFile(manifest.path,'utf8'));
  if(!data || Object.keys(data).join(',') !== 'entries' || !Array.isArray(data.entries) || !data.entries.length) throw new Error('archive integrity manifest requires nonempty entries');
  const excluded=new Set([receipt.path,manifest.path]),seen=new Set(),actual=new Set();
  const scan=async root=>{for(const name of await readdir(root)){const path=join(root,name);if(excluded.has(path))continue;actual.add(relative(location.root,path).split(sep).join('/'));if((await lstat(path)).isDirectory())await scan(path);}};
  await scan(location.root);
  for(const entry of data.entries) {
    if(!entry || typeof entry.path !== 'string' || isAbsolute(entry.path) || /[\\:\x00-\x1f]/.test(entry.path) || entry.path.split('/').some(part=>!part || part === '.' || part === '..') || !['file','directory','symlink'].includes(entry.type) || !Number.isInteger(entry.mode) || entry.mode < 0 || entry.mode > 0o7777) throw new Error('archive integrity entry has invalid path/type/mode');
    const allowed=new Set(['path','type','mode',...(entry.type === 'file' ? ['sha256'] : entry.type === 'symlink' ? ['target'] : [])]);
    if(Object.keys(entry).some(key=>!allowed.has(key)) || seen.has(entry.path.toLowerCase())) throw new Error('archive integrity entry is duplicate or has unknown fields');
    seen.add(entry.path.toLowerCase());
    const parentRelative=dirname(entry.path) === '.' ? '' : dirname(entry.path).split(sep).join('/');
    const parent=runtime.safeWorkPathSync(location.root,parentRelative,{mustExist:true,type:'directory',allowRoot:true});
    const path=join(parent,basename(entry.path));
    if(!actual.delete(entry.path) || excluded.has(path)) throw new Error(`archive integrity manifest has an extra or excluded entry: ${entry.path}`);
    const stat=await lstat(path);
    if((stat.mode & 0o7777) !== entry.mode || (entry.type === 'file' ? !stat.isFile() : entry.type === 'directory' ? !stat.isDirectory() : !stat.isSymbolicLink())) throw new Error(`archive integrity type/mode drift: ${entry.path}`);
    if(entry.type === 'file' && (!/^[a-f0-9]{64}$/.test(entry.sha256 ?? '') || sha256(await readFile(path)) !== entry.sha256)) throw new Error(`archive integrity byte drift: ${entry.path}`);
    if(entry.type === 'symlink' && (typeof entry.target !== 'string' || await readlink(path) !== entry.target)) throw new Error(`archive integrity link drift: ${entry.path}`);
  }
  if(actual.size) throw new Error(`archive integrity manifest omits paths: ${[...actual].join(', ')}`);
  return {archive_state:fields.Result,sealed:fields.Result === 'verified',receipt:receipt.path,operation:fields.Operation};
}

export async function validateArchived(path, options = {}) {
  const context = designContext(path, options), state = context.specdevRoot, name = basename(path);
  const location = runtime.resolveChangeSync(context, name, {includeArchived:true});
  if (location.root !== canonicalToolPath(context,path) || location.kind === 'active') throw new Error('archived change must resolve to its unique archive location');
  const receipt = await validateArchiveReceipt(context, location, options.sealed === true);
  const {validateChangeClosure} = await import('./change-artifacts.mjs');
  const closure = validateChangeClosure({context, change:name, forArchive:true});
  if (closure.errors.length) throw new Error(closure.errors.join('\n'));
  if (closure.scope === 'complex-preflight') {
    const {validateChange} = await import('./validate-specdev.mjs');
    const result = validateChange(path, 'archive-ready', context.projectRoot, null, null, {context});
    if (result.errors.length) throw new Error(result.errors.join('\n'));
  }
  const cancelled = runtime.readChangeFactsSync(context, location).outcome === 'cancelled';
  if (await lstat(join(path, 'DESIGN.md')).catch(() => null)) {
    const design = await validateChangeDesign(join(path, 'DESIGN.md'), {context,requireApproved:!cancelled});
    const packagePath = await safePath(path, `prototypes/${design.meta.prototype_ref.id}/design-system.md`);
    if (!cancelled && (await readDesign(packagePath)).meta.status !== 'ready') throw new Error('archived design references a prototype that is not ready');
    const { validate } = await import('../../specdev-p-prototype/scripts/validate-design-package.mjs');
    await validate(packagePath, { checkReady: !cancelled, allowDraft:cancelled, context });
  }
  const current = join(state, 'design/DESIGN.md');
  if (await lstat(current).catch(() => null)) {
    const record = await validateProjectDesign(current);
    const snapshot = await validateProjectDesign(await safePath(state, `design/revisions/${record.meta.revision}.md`));
    if (snapshot.text !== record.text) throw new Error('current project DESIGN differs from immutable revision');
    const designIndex = await readFile(await safePath(state, 'design/INDEX.md'), 'utf8');
    if (!designIndex.includes(record.meta.revision)) throw new Error('design index needs rebuilding from published revision');
  }
  return receipt;
}

export async function validateDesignHandoff(changeRoot, options = {}) {
  const ticketRoot = join(changeRoot, 'ticket');
  const files = await readdir(ticketRoot).catch(error => { if (error.code === 'ENOENT') return []; throw error; });
  let design;
  for (const file of files.filter(file => file.endsWith('.md'))) {
    const ticket = await readDesign(join(ticketRoot, file));
    const ui = ticket.meta.ui_change === true || (ticket.meta.expected_changes ?? []).some(path => /\.(?:tsx|jsx|vue|svelte|html|css)(?:<\/Path>)?$/.test(path));
    if (!ui || ['draft', 'cancelled'].includes(ticket.meta.status)) continue;
    design ??= await validateChangeDesign(join(changeRoot, 'DESIGN.md'), options);
    const ref = ticket.meta.design_ref;
    if (!ref || ref.revision !== design.meta.revision || ref.digest !== design.digest || !Array.isArray(ref.pages) || !ref.pages.length || !Array.isArray(ref.acceptance) || !ref.acceptance.length) throw new Error(`${file}: UI Ticket requires current DESIGN revision/digest/pages/acceptance`);
    for (const page of ref.pages) if (!design.meta.pages.some(p => p.id === page)) throw new Error(`${file}: unknown DESIGN page ${page}`);
    for (const ac of ref.acceptance) if (!design.meta.pages.filter(p => ref.pages.includes(p.id)).some(p => p.acceptance.includes(ac))) throw new Error(`${file}: unknown DESIGN acceptance ${ac}`);
    if (ticket.meta.status === 'done') {
      const evidence = await readFile(await safePath(changeRoot, `evidence/${ticket.meta.id}.md`), 'utf8');
      if (!evidence.includes('## Design Conformance') || !evidence.includes(ref.digest) || [...ref.pages, ...ref.acceptance].some(id => !evidence.includes(id))) throw new Error(`${file}: completed UI Ticket needs Design Conformance evidence bound to DESIGN and acceptance IDs`);
    }
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [operation, path, ...args] = process.argv.slice(2);
  const options = {};
  for (let i=0;i<args.length;i+=2) {
    if(args[i] === '--sealed' && operation === '--archived' && !options.sealed){options.sealed=true;i--;continue;}
    const field = {'--repo':'repoRoot','--method-root':'methodRoot','--state-root':'stateRoot'}[args[i]];
    if (!field || !args[i+1] || args[i+1].startsWith('--') || field in options) throw new Error('invalid explicit design context arguments');
    options[field] = args[i+1];
  }
  const actions = {
    '--digest': async () => (await readDesign(path)).digest,
    '--prototype-digest': () => prototypeDigest(path),
    '--project': () => validateProjectDesign(path),
    '--change': () => validateChangeDesign(path, options),
    '--handoff': () => validateDesignHandoff(path, options),
    '--archived': () => validateArchived(path, options),
  };
  if (!path || !actions[operation]) { console.error('usage: design-artifacts.mjs --digest|--prototype-digest|--project|--change|--handoff|--archived <path>'); process.exitCode = 2; }
  else actions[operation]().then(result => console.log(typeof result === 'string' ? result : result?.archive_state ? JSON.stringify(result) : 'design artifacts: valid')).catch(error => { console.error(error.message); process.exitCode = 1; });
}
