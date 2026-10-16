/** Read-only checks of review records. Tool receipts still require Lead verification. */
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import { markdownBodyLines, readArtifactSectionSync, readUtf8ArtifactSync, safeWorkPathSync } from '../../../../lib/speculo-runtime.mjs';
import { resolveReviewScope } from './review-scope.mjs';

const hash = value => createHash('sha256').update(value).digest('hex');
const real = value => typeof value === 'string' && value.trim() && !/^(?:<[^>]*>|unknown|unassigned|pending|todo|tbd|\.\.\.)$/i.test(value.trim());
const identity = value => real(value) && /^[a-z][a-z0-9-]*:\S+$/i.test(value) && real(value.slice(value.indexOf(':')+1));
function fields(text) {
  const result = {};
  for (const {text:line} of markdownBodyLines(text)) {
    const match = /^([A-Za-z][A-Za-z0-9-]*):\s*(.*)$/.exec(line);
    if (!match) continue;
    if (Object.hasOwn(result, match[1])) throw new Error(`duplicate ${match[1]}`);
    result[match[1]] = match[2].trim();
  }
  return result;
}
function section(text, heading) {
  const lines = markdownBodyLines(text), matches = lines.filter(line => line.text === `## ${heading}`);
  if (matches.length !== 1) throw new Error(`expected one ${heading} section`);
  const start = matches[0].line, end = lines.find(line => line.line > start && /^#{1,2} /.test(line.text))?.line;
  return text.split(/\r?\n/).slice(start, end ? end-1 : undefined).join('\n');
}
function readLocator(root, locator) {
  if (!real(locator)) throw new Error('missing original evidence locator');
  const parts = locator.split('#');
  if (parts.length > 2 || parts.length === 2 && !parts[1]) throw new Error('invalid evidence locator');
  const path = safeWorkPathSync(root, parts[0] || 'README.md', {mustExist:true, type:'file'});
  return {path, text:parts.length === 2 ? readArtifactSectionSync(path, parts[1]).text : readUtf8ArtifactSync(path)};
}
export function reviewInputDigest(input) { return hash(JSON.stringify(input)); }

/** Sources use project-relative locators; an anchor avoids a README hashing itself. */
export function validateIndependentReview(root, artifact, {repoRoot=null, sourceRoot=repoRoot, requirePassed=true, expectedHead=null, expectedBase=null, expectedResults=null, requiredImplementers=[], requiredSpecifications=[], checkCurrent=false, requireDelivery=false, allowSourceFiles=false} = {}) {
  const errors = [], label = `independent-review: ${artifact}`;
  try {
    const path = safeWorkPathSync(root, artifact, {mustExist:true, type:'file'});
    const text = readUtf8ArtifactSync(path), body = section(text,'Independent Review'), data = fields(body);
    const implementers = (data.Implementers ?? '').split(',').map(x=>x.trim()).filter(Boolean);
    if (!implementers.length || implementers.some(id=>!identity(id)) || new Set(implementers).size !== implementers.length) throw new Error('Implementers must contain actual namespaced agent/session IDs');
    if (requiredImplementers.some(id=>!implementers.includes(id))) throw new Error('implementation owner missing from Implementers');
    if (!identity(data['Verified-By'])) throw new Error('missing actual Verified-By Lead identity');
    if (!['native','herdr','orca','cli'].includes(data.Mode)) throw new Error('invalid review Mode');
    const inputSource = readLocator(root,data.Input);
    const blocks = [...inputSource.text.matchAll(/```json\s*\n([\s\S]*?)\n```/g)];
    if (blocks.length !== 1) throw new Error('Input must reference one frozen review JSON object');
    const input = JSON.parse(blocks[0][1]), scope = input.scope;
    if (!scope || !Array.isArray(input.sources) || !input.sources.length) throw new Error('Input needs scope and actual standards/specification/instruction sources');
    if (!repoRoot && checkCurrent) throw new Error('current input checks require explicit project root');
    const sourceKinds = new Set();
    for (const source of input.sources) {
      if (!['standards','specification','instructions'].includes(source.kind) || !real(source.locator) || !/^[a-f0-9]{64}$/.test(source.sha256 ?? '')) throw new Error('invalid review source');
      sourceKinds.add(source.kind);
      if (repoRoot && checkCurrent && hash(readLocator(sourceRoot,source.locator).text) !== source.sha256) throw new Error(`source drift: ${source.locator}`);
    }
    if (!sourceKinds.has('standards') || requirePassed && !sourceKinds.has('specification')) throw new Error('missing required review sources');
    if (requiredSpecifications.some(locator=>!input.sources.some(source=>source.kind === 'specification' && source.locator === locator))) throw new Error('review omits the authoritative specification/acceptance source');
    const digest = reviewInputDigest(input);
    const rows = markdownBodyLines(body).filter(({text:line})=>/^\|\s*(standards|specification)\s*\|/.test(line)).map(({text:line})=>line.split('|').slice(1,-1).map(x=>x.trim()));
    if (rows.length !== 2 || new Set(rows.map(row=>row[0])).size !== 2) throw new Error('expected exactly one result per axis');
    for (const [axis,reviewer,result,locator,...extra] of rows) {
      if (extra.length || !identity(reviewer)) throw new Error('invalid reviewer row');
      if (implementers.includes(reviewer)) throw new Error('reviewer participated in implementation');
      if (!['pass','request-changes','skipped'].includes(result) || requirePassed && result !== 'pass' || axis === 'standards' && result === 'skipped') throw new Error(`${axis} has not passed`);
      if (expectedResults && expectedResults[axis] !== result) throw new Error(`${axis} result differs from the owning report`);
      const report = readLocator(root,locator), reportFields = fields(report.text);
      if (report.path === path && !locator.includes('#')) throw new Error('report must reference original output, not its summary');
      if (reportFields.Reviewer !== reviewer || reportFields.Axis !== axis || reportFields.Result !== result || reportFields['Input-SHA256'] !== digest || !real(reportFields.Observed)) throw new Error(`${axis} original report does not match the review record`);
    }
    const receipt = fields(readLocator(root,data.Verification).text);
    const reviewers = (receipt.Reviewers ?? '').split(',').map(x=>x.trim());
    if (receipt['Verified-By'] !== data['Verified-By'] || receipt.Mode !== data.Mode || receipt.Result !== 'verified' || receipt['Input-SHA256'] !== digest || !real(receipt.Observed) || rows.some(row=>!reviewers.includes(row[1]))) throw new Error('missing matching Lead verification of actual dispatch/return receipts');
    if (scope.mode === 'source-files' && !allowSourceFiles) throw new Error('source-files cannot substitute implementation change review');
    if (!['baseline','range','commit','pr','source-files','working-tree'].includes(scope.mode)) throw new Error('invalid frozen review scope');
    if (scope.outcome === 'no-diff') throw new Error('no-diff is not an independent approval');
    if (expectedHead && (scope.mode === 'working-tree' ? scope.observed_head : scope.head_sha) !== expectedHead) throw new Error('review does not cover the expected checkpoint');
    if (expectedBase && scope.base_sha !== expectedBase) throw new Error('review does not cover the implementation baseline');
    if (scope.mode === 'working-tree' && scope.excluded_paths?.length && !real(input.exclusions)) throw new Error('excluded changes require an explicit scope/ownership rationale');
    if (checkCurrent) {
      const options = {repo:repoRoot,mode:scope.mode};
      if (scope.mode === 'working-tree') { options.base=scope.base_sha; if(scope.selection === 'explicit-files') options.files=scope.scope_paths; }
      else if (scope.mode === 'source-files') options.files=scope.source_snapshot?.map(file=>file.path);
      else if (scope.mode === 'commit') { options.commit=scope.head_sha; if(scope.parent) options.parent=scope.parent; }
      else { options.base=scope.base_sha; options.head=scope.head_sha; }
      const current = resolveReviewScope(options);
      // Re-read all scope metadata, not just the HEAD; dirty files are not commits.
      const comparable = value => {
        if (value.mode !== 'working-tree' || value.selection !== 'explicit-files') return value;
        // New report files outside an explicit review scope are expected. Their
        // existence must not create a self-referential evidence digest.
        const {excluded_paths, inventory_sha256, input_sha256, ...selected} = value;
        return selected;
      };
      if (JSON.stringify(comparable(current)) !== JSON.stringify(comparable(scope))) throw new Error('frozen review input drifted; run independent review again');
      if (requireDelivery && scope.mode !== 'working-tree' && scope.mode !== 'source-files') {
        // A commit report certifies that tree, not later local edits. Markdown
        // bookkeeping in the owning change may advance after the code review;
        // authoritative specification sources are still hashed above.
        const live = resolveReviewScope({repo:repoRoot,mode:'working-tree',base:scope.head_sha});
        const recordPath = file => {
          const local = relative(resolve(root),resolve(repoRoot,file)).split('\\').join('/');
          return /^(?:README\.md|goal-plan\.md|tickets-map\.md|implementation-(?:plan|map)\.md|(?:evidence|reviews|ticket)\/[^/]+\.md)$/.test(local);
        };
        const dirty = live.changed_paths.filter(file=>!recordPath(file));
        if (dirty.length) throw new Error(`unreviewed working-tree delivery changes: ${dirty.join(', ')}; freeze and review the actual working-tree scope`);
      }
    }
  } catch(error) { errors.push(`${label}: ${error.message}`); }
  return errors;
}

export function hasIndependentReview(path) {
  return existsSync(path) && markdownBodyLines(readUtf8ArtifactSync(path)).some(line=>line.text === '## Independent Review');
}
