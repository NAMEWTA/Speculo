/** Read-only checks of review records. Tool receipts still require Lead verification. */
import { createHash } from 'node:crypto';
import { existsSync, readdirSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import { markdownBodyLines, parseFrontmatter, readArtifactSectionSync, readUtf8ArtifactSync, safeWorkPathSync } from '../../../../lib/speculo-runtime.mjs';
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

/** Check a record's frozen input, declared strategy and original results.
 * Current completion or reuse must also apply the owning scope's requirements
 * through validateCompletionReview; historical integrity alone is not approval.
 * Sources use project-relative locators; an anchor avoids a README hashing itself.
 */
export function validateReviewRecord(root, artifact, {independentOnly=false, requireIndependent=false, requiredRisk=null, repoRoot=null, sourceRoot=repoRoot, requirePassed=true, expectedHead=null, expectedBase=null, expectedResults=null, requiredImplementers=[], requiredSpecifications=[], checkCurrent=false, requireDelivery=false, allowSourceFiles=false} = {}) {
  const errors = [], label = `independent-review: ${artifact}`;
  try {
    const path = safeWorkPathSync(root, artifact, {mustExist:true, type:'file'});
    const text = readUtf8ArtifactSync(path);
    const headings = markdownBodyLines(text).filter(line=>['## Review','## Independent Review'].includes(line.text));
    if (headings.length !== 1) throw new Error('expected one Review or Independent Review section');
    const body = section(text,headings[0].text.slice(3)), data = fields(body);
    const strategy = headings[0].text === '## Independent Review' ? 'independent' : data.Strategy;
    if (!['self','independent'].includes(strategy)) throw new Error('Review Strategy must be self or independent');
    if (headings[0].text === '## Review') {
      if (!['low','medium','high','critical'].includes(data.Risk) || !['required','not-required'].includes(data.Independence) || !real(data.Basis)) throw new Error('Review needs Risk, Independence and the actual decision Basis');
      const levels = ['low','medium','high','critical'];
      if (requiredRisk && levels.indexOf(data.Risk) < levels.indexOf(requiredRisk)) throw new Error('Review risk understates its authoritative scope');
      if (strategy === 'self' && (['high','critical'].includes(data.Risk) || data.Independence === 'required')) throw new Error('high-risk scopes or required independence cannot use self review');
    }
    if (strategy === 'self' && (independentOnly || requireIndependent)) throw new Error('authoritative scope requires independent review');
    const implementers = (data.Implementers ?? '').split(',').map(x=>x.trim()).filter(Boolean);
    if (!implementers.length || implementers.some(id=>!identity(id)) || new Set(implementers).size !== implementers.length) throw new Error('Implementers must contain actual namespaced agent/session IDs');
    if (requiredImplementers.some(id=>!implementers.includes(id))) throw new Error('implementation owner missing from Implementers');
    if (!identity(data['Verified-By'])) throw new Error('missing actual Verified-By Lead identity');
    if (!(strategy === 'self' ? data.Mode === 'self' : ['native','herdr','orca','cli'].includes(data.Mode))) throw new Error('invalid review Mode');
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
      if (strategy === 'independent' && implementers.includes(reviewer)) throw new Error('reviewer participated in implementation');
      if (strategy === 'self' && reviewer !== data['Verified-By']) throw new Error('self review must name the actual reviewing owner, not an invented reviewer');
      if (!['pass','request-changes','skipped','not-applicable'].includes(result) || requirePassed && !['pass','not-applicable'].includes(result) || axis === 'standards' && result === 'skipped') throw new Error(`${axis} has not passed`);
      if (expectedResults && expectedResults[axis] !== result) throw new Error(`${axis} result differs from the owning report`);
      const report = readLocator(root,locator), reportFields = fields(report.text);
      if (report.path === path && !locator.includes('#')) throw new Error('report must reference original output, not its summary');
      if (reportFields.Reviewer !== reviewer || reportFields.Axis !== axis || reportFields.Result !== result || reportFields['Input-SHA256'] !== digest || !real(reportFields.Observed)) throw new Error(`${axis} original report does not match the review record`);
      if (result === 'not-applicable' && !real(reportFields.Reason)) throw new Error(`${axis} not-applicable requires a concrete applicability reason`);
    }
    if (strategy === 'independent') {
    const receipt = fields(readLocator(root,data.Verification).text);
    const reviewers = (receipt.Reviewers ?? '').split(',').map(x=>x.trim());
    if (receipt['Verified-By'] !== data['Verified-By'] || receipt.Mode !== data.Mode || receipt.Result !== 'verified' || receipt['Input-SHA256'] !== digest || !real(receipt.Observed) || rows.some(row=>!reviewers.includes(row[1]))) throw new Error('missing matching Lead verification of actual dispatch/return receipts');
    }
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
      if (JSON.stringify(comparable(current)) !== JSON.stringify(comparable(scope))) throw new Error('frozen review input drifted; refresh the affected review evidence');
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


/** Explicit independent review remains a strict primitive (never accepts self review). */
export function validateIndependentReview(root, artifact, options = {}) {
  return validateReviewRecord(root,artifact,{...options,independentOnly:true});
}

/** Read the original scope, not a reviewer's claim about their own independence.
 * No new configuration or sidecar is required. Existing risk and optional explicit
 * requirements live with the original Spec/Ticket/Goal/README owner.
 */
export function readReviewRequirements(root, {ticketId=null, final=false, projectRoot=null} = {}) {
  const files = ['README.md','spec.md','goal-plan.md','implementation-plan.md'];
  const ticketDir = safeWorkPathSync(root,'ticket');
  if (existsSync(ticketDir)) {
    for (const file of readdirSync(ticketDir).filter(file=>file.endsWith('.md'))) {
      const path = safeWorkPathSync(root,`ticket/${file}`,{mustExist:true,type:'file'});
      const {fields:meta} = parseFrontmatter(readUtf8ArtifactSync(path));
      if (meta.status !== 'cancelled' && (final || meta.id === ticketId)) files.push(`ticket/${file}`);
    }
  }
  const levels = ['low','medium','high','critical'];
  let risk = null, requireIndependent = false;
  const entries = files.map(file=>({root,file}));
  if (projectRoot && resolve(projectRoot) !== resolve(root)) entries.push({root:projectRoot,file:'AGENTS.md'});
  for (const entry of entries) {
    const {file} = entry;
    const path = safeWorkPathSync(entry.root,file);
    if (!existsSync(path)) continue;
    const text = readUtf8ArtifactSync(path), meta = /^---\r?\n/.test(text) ? parseFrontmatter(text).fields : {};
    const lines = markdownBodyLines(text).map(line=>line.text);
    const risks = [meta.risk,meta.review_risk,...lines.flatMap(line=>/^Review-Risk:\s*(\S+)\s*$/.exec(line)?.slice(1) ?? [])].filter(value=>value != null);
    for (const value of risks) {
      if (!levels.includes(value)) throw new Error(`invalid review risk in ${file}`);
      if (risk === null || levels.indexOf(value) > levels.indexOf(risk)) risk=value;
    }
    const choices = [meta.review_independence,...lines.flatMap(line=>/^Review-Independence:\s*(\S+)\s*$/.exec(line)?.slice(1) ?? [])].filter(value=>value != null);
    if (choices.some(value=>!['required','not-required'].includes(value))) throw new Error(`invalid review independence in ${file}`);
    if (choices.includes('required')) requireIndependent=true;
  }
  return {requiredRisk:risk,requireIndependent:requireIndependent || ['high','critical'].includes(risk)};
}

/** Completion accepts truthful low-risk self checks, but never downgrades the owner scope. */
export function validateCompletionReview(root, artifact, options = {}) {
  try {
    const requirements = readReviewRequirements(root,{ticketId:options.ticketId,final:options.final === true,projectRoot:options.sourceRoot ?? options.repoRoot});
    const levels = ['low','medium','high','critical'];
    const requiredRisk = [requirements.requiredRisk,options.requiredRisk].filter(Boolean).sort((a,b)=>levels.indexOf(b)-levels.indexOf(a))[0] ?? null;
    return validateReviewRecord(root,artifact,{...options,
      requireIndependent:requirements.requireIndependent || options.requireIndependent === true,
      requiredRisk});
  } catch(error) { return [`review-policy: ${artifact}: ${error.message}`]; }
}

export function hasReview(path) {
  return existsSync(path) && markdownBodyLines(readUtf8ArtifactSync(path)).some(line=>['## Review','## Independent Review'].includes(line.text));
}
