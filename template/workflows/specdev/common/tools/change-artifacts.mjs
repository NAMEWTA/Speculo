/** Read-only completion preflight. Artifact text never authenticates user authority. */
import { existsSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { basename, join } from 'node:path';
import { readChangeExecution } from './plan-contract.mjs';
import {
  readChangeFactsSync, readArtifactSectionSync, readUtf8ArtifactSync,
  safeWorkPathSync, markdownBodyLines, parseFrontmatter,
} from '../../../../lib/speculo-runtime.mjs';

const meaningful = value => typeof value === 'string' && value.trim() && !/^(?:unknown|unassigned|pending|tbd|todo|\.\.\.|<.*>)$/i.test(value.trim());
function error(code, path, message) { throw new Error(`${code}: ${path}: ${message}`); }
function section(path, heading) {
  const text = readUtf8ArtifactSync(path), lines = markdownBodyLines(text, path);
  const matches = lines.filter(line => line.text === `## ${heading}`);
  if (matches.length !== 1) error('closure-evidence-missing', path, `expected one ${heading} section`);
  const start = matches[0].line, end = lines.find(line => line.line > start && /^#{1,2} /.test(line.text))?.line;
  return text.split(/\r?\n/).slice(start, end ? end - 1 : undefined).join('\n');
}
function fields(text, path) {
  const result = {};
  for (const {text: line} of markdownBodyLines(text, path)) {
    const m = /^([A-Za-z][A-Za-z-]*): (.+)$/.exec(line);
    if (!m) continue;
    if (m[1] in result) error('closure-evidence-missing', path, `duplicate ${m[1]}`);
    result[m[1]] = m[2].trim();
  }
  return result;
}
function evidence(root, locator) {
  if (!meaningful(locator)) error('closure-evidence-missing', root, 'missing evidence locator');
  const pieces = locator.split('#');
  if (pieces.length > 2) error('closure-evidence-missing', root, 'ambiguous evidence locator');
  const path = safeWorkPathSync(root, pieces[0] || 'README.md', { mustExist: true, type: 'file' });
  const text = pieces.length === 2 ? readArtifactSectionSync(path, pieces[1]).text : readUtf8ArtifactSync(path);
  if (!meaningful(text)) error('closure-evidence-missing', path, 'empty evidence');
  return { path, text };
}
export function readChangeOwner(context, change) {
  const facts = readChangeFactsSync(context, change), root = facts.location.root;
  for (const name of ['implementation-plan.md', 'goal-plan.md']) {
    const path = safeWorkPathSync(root, name, { type: 'file' });
    if (!existsSync(path)) continue;
    const {fields: meta} = parseFrontmatter(readUtf8ArtifactSync(path));
    if (meta.change !== facts.location.name || !meaningful(meta.lead)) error('owner-unresolved', path, 'plan must identify this change and its actual Lead');
    return { owner: meta.lead, path, evidencePath: path, kind: name === 'implementation-plan.md' ? 'parent-lead' : 'goal-lead' };
  }
  const data = fields(section(facts.readmePath, 'Ownership'), facts.readmePath);
  if (!meaningful(data.Owner)) error('owner-unresolved', facts.readmePath, 'no actual owner/session locator');
  const source = evidence(root, data.Evidence);
  if (source.path === facts.readmePath && !data.Evidence.includes('#')) error('owner-unresolved', source.path, 'Ownership must point to a separate session/handoff section');
  const sourceFields = fields(source.text, source.path);
  if (![sourceFields.Owner, sourceFields.Session].includes(data.Owner)) error('owner-unresolved', source.path, 'owner differs from original session/handoff evidence');
  if (data.Work && sourceFields.Work !== data.Work) error('owner-unresolved', source.path, 'Work differs from original ownership evidence');
  return { owner: data.Owner, path: facts.readmePath, evidencePath: source.path, work: data.Work, kind: 'direct-owner' };
}
export function readLightweightSpec(changeRoot) {
  const readme = safeWorkPathSync(changeRoot, 'README.md', { mustExist: true, type: 'file' });
  const hasSpec = existsSync(join(changeRoot, 'spec.md'));
  const visible = markdownBodyLines(readUtf8ArtifactSync(readme), readme);
  const readmeOwns = visible.some(line => line.text === '<a id="scope"></a>');
  if (hasSpec && readmeOwns) error('identity-conflict', readme, 'README and spec.md both claim specification ownership; replace the migrated README scope with navigation');
  if (hasSpec) return { path: join(changeRoot, 'spec.md'), kind: 'independent' };
  const scope = readArtifactSectionSync(readme, 'scope');
  const acceptance = readArtifactSectionSync(readme, 'acceptance');
  const verification = readArtifactSectionSync(readme, 'verification');
  const ids = [...new Set(acceptance.text.match(/\bAC-\d+\b/g) ?? [])];
  if (!ids.length) error('closure-evidence-missing', readme, 'lightweight acceptance must identify observable AC-n contracts');
  return { path: readme, kind: 'lightweight', scope, acceptance, verification, ids };
}
function validateLightweightCompletion(root, errors) {
  const spec = readLightweightSpec(root);
  if (spec.kind !== 'lightweight') return;
  const rows = spec.verification.text.split(/\r?\n/).filter(line => /^\|\s*AC-\d+\s*\|/.test(line)).map(line => line.split('|').slice(1,-1).map(cell => cell.trim()));
  for (const id of spec.ids) {
    const matches = rows.filter(row => row[0] === id);
    if (matches.length !== 1) { errors.push(`closure-evidence-missing: ${spec.path}: ${id} needs one verification row (AC | Result | Evidence [| SHA256])`); continue; }
    const row = matches[0];
    if (![3,4].includes(row.length) || row[1] !== 'passed' || (row[3] && !/^[a-f0-9]{64}$/.test(row[3]))) { errors.push(`closure-evidence-missing: ${spec.path}: ${id} needs a passed result and valid optional evidence digest`); continue; }
    try {
      const record = evidence(root, row[2]);
      if (record.path === spec.path && (!row[2].includes('#') || row[2].split('#')[1] === 'verification')) error('closure-evidence-missing', record.path, 'verification must cite a separate actual evidence section');
      const actual = createHash('sha256').update(readUtf8ArtifactSync(record.path)).digest('hex');
      if (row[3] && row[3] !== actual) error('source-drift', record.path, `${id} evidence digest changed`);
      const data = fields(record.text, record.path);
      if (data.Result !== 'passed' || !meaningful(data.Method) || !meaningful(data.Observed) || !meaningful(data.Source)) error('closure-evidence-missing', record.path, 'verification record needs Method, Source, Observed and Result: passed');
      if (data.Command && data.Exit !== '0') error('closure-evidence-missing', record.path, 'command verification requires Exit: 0');
    } catch (e) { errors.push(String(e)); }
  }
  for (const row of rows) if (!spec.ids.includes(row[0])) errors.push(`closure-evidence-missing: ${spec.path}: verification references undeclared ${row[0]}`);
  if (/^\s*[-*] \[ \]/m.test(spec.acceptance.text)) errors.push(`closure-evidence-missing: ${spec.path}: acceptance remains unchecked`);
}
function validateCancellation(facts, owner, errors) {
  const root = facts.location.root, content = readArtifactSectionSync(facts.readmePath, 'cancellation');
  const data = fields(content.text, facts.readmePath);
  for (const key of ['Source','Scope','Time','Confirmed-By','Undelivered','Landed','Writers','Dependencies','Checkpoints','External','Next']) if (!meaningful(data[key])) errors.push(`closure-evidence-missing: ${facts.readmePath}: cancellation needs ${key}`);
  if (data['Confirmed-By'] !== owner?.owner) errors.push(`owner-unresolved: ${facts.readmePath}: cancellation was not confirmed by original completion owner`);
  if (!/^\d{4}-\d\d-\d\dT/.test(data.Time ?? '') || !Number.isFinite(Date.parse(data.Time))) errors.push(`closure-evidence-missing: ${facts.readmePath}: cancellation needs actual decision time`);
  const source = evidence(root, data.Source);
  if (source.path === facts.readmePath && (!data.Source.includes('#') || data.Source.split('#')[1] === 'cancellation')) error('closure-evidence-missing', source.path, 'cancellation must point to a separate actual request section');
  if (!/^none: \S/.test(data.Writers ?? '')) {
    if (!/^stopped: \S/.test(data.Writers ?? '')) errors.push(`writer-active: ${facts.readmePath}: need none with rationale or stopped with termination/handoff evidence; timeout is not termination`);
    else {
      const stopped = evidence(root, data.Writers.slice(9)), stoppedFields = fields(stopped.text, stopped.path);
      if (stoppedFields.Writers !== 'stopped' || !meaningful(stoppedFields.Observed)) errors.push(`writer-active: ${stopped.path}: missing observed termination/handoff`);
    }
  }
  for (const key of ['Dependencies','Checkpoints','External']) if (!/^(?:none|resolved|transferred|waived): \S/.test(data[key] ?? '')) errors.push(`closure-evidence-missing: ${facts.readmePath}: unresolved ${key}`);
  for (const record of readChangeExecution(root)) {
    if (record.purpose === "direct-spec" && record.status === "cancelled" && !/^stopped: \S/.test(data.Writers ?? "")) errors.push(`writer-active: ${root}: cancelled Direct Spec execution requires observed stopped writer evidence`);
    if (['active','review','integrating','blocked'].includes(record.status)) errors.push(`writer-active: ${root}: ${record.ticket_id ?? 'direct-spec'} cancellation does not end an execution owner or candidate`);
  }
}
export function validateArchiveDelivery(changeRoot) {
  const errors = [];
  for (const name of ['triage.md','publish.md']) {
    const path = safeWorkPathSync(changeRoot, name, { type: 'file' }); if (!existsSync(path)) continue;
    try {
      const {fields: meta} = parseFrontmatter(readUtf8ArtifactSync(path));
      if (meta.change !== basename(changeRoot)) errors.push(`${path}: change identity mismatch`);
      if (name === 'triage.md' && !['closed','waived','not-applicable'].includes(meta.external_action)) errors.push(`${path}: external delivery is not closed`);
      if (meta.publish_action !== undefined && !['not-requested','published','waived'].includes(meta.publish_action)) errors.push(`${path}: publish delivery is not closed`);
    } catch (e) { errors.push(String(e)); }
  }
  const prs = safeWorkPathSync(changeRoot, 'pull-requests', { type: 'directory' });
  if (existsSync(prs)) for (const name of readdirSync(prs)) {
    try {
      const path = safeWorkPathSync(prs, name, { type: 'file', mustExist: true });
      const {fields: meta} = parseFrontmatter(readUtf8ArtifactSync(path));
      if (meta.change !== basename(changeRoot)) errors.push(`${path}: change identity mismatch`);
      if (meta.requested === true && !(meta.status === 'waived' || meta.status === 'ready' || (meta.delivery_target === 'draft' && meta.status === 'draft'))) errors.push(`${path}: requested PR delivery is unresolved`);
    } catch (e) { errors.push(String(e)); }
  }
  return errors;
}
/** complex-preflight is deliberately not a completion certificate; the full validator must follow. */
export function validateChangeClosure({context, change, forArchive = false}) {
  const errors = []; let facts, owner, scope;
  try {
    facts = readChangeFactsSync(context, change);
    owner = readChangeOwner(context, change);
    if (facts.outcome === 'active') errors.push(`closure-evidence-missing: ${facts.readmePath}: change is still active`);
    const root = facts.location.root;
    if (facts.outcome === 'cancelled') { scope = 'cancellation'; validateCancellation(facts, owner, errors); }
    else {
      const goalPath = safeWorkPathSync(root, 'goal-plan.md', {type:'file'});
      const lightweightGoal = existsSync(goalPath) && parseFrontmatter(readUtf8ArtifactSync(goalPath)).fields.artifact === 'lightweight-goal-plan';
      const independent = ['spec.md','ticket','tickets-map.md','implementation-plan.md','implementation-map.md','retro',...(!lightweightGoal ? ['goal-plan.md'] : [])].some(name => existsSync(join(root, name)));
      const complex = independent || readChangeExecution(root).length > 0 || ['DESIGN.md','prototypes'].some(name => existsSync(join(root,name)));
      scope = complex ? 'complex-preflight' : 'lightweight';
      // AC checks are preflight only. The full validator distinguishes actual
      // implementation from learning/triage using original Work ownership.
      scope = 'complex-preflight';
      if (!independent && facts.outcome === 'completed') {
        validateLightweightCompletion(root, errors);
        if (lightweightGoal) {
          const tasks = section(goalPath, 'Tasks');
          if (!/^\s*[-*] \[x\]/m.test(tasks) || /^\s*[-*] \[ \]/m.test(tasks)) errors.push(`closure-evidence-missing: ${goalPath}: Goal tasks must be actually delivered`);
          for (const heading of ['Integration and Verification','Next Steps']) if (!meaningful(section(goalPath,heading))) errors.push(`closure-evidence-missing: ${goalPath}: ${heading} is empty`);
          if (/^\s*[-*] \[[ x]\]/m.test(readUtf8ArtifactSync(facts.readmePath))) errors.push(`identity-conflict: ${facts.readmePath}: Goal owns task progress; README must not mirror it`);
        }
      }
    }
    if (forArchive) errors.push(...validateArchiveDelivery(root));
  } catch (e) { errors.push(String(e)); }
  return { valid: errors.length === 0, complete: errors.length === 0 && scope !== 'complex-preflight', scope, errors, facts, owner };
}
