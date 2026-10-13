/** Optional, versioned observations in existing artifacts; not a second task state. */
import { existsSync, lstatSync, readFileSync, readdirSync, realpathSync } from 'node:fs';
import { join, relative, isAbsolute } from 'node:path';

export const ENGINEERING_KINDS = new Set(['performance', 'documentation', 'incident']);
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const text = value => typeof value === 'string' && value.trim().length > 0;
const strings = value => Array.isArray(value) && value.length > 0 && value.every(text);
const digest = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const samples = value => Array.isArray(value) && value.length > 0 && value.every(x => typeof x === 'number' && Number.isFinite(x) && x >= 0);
const mean = values => values.reduce((average, value, i) => average * (i / (i + 1)) + value / (i + 1), 0);

/** Parse only explicitly labelled fences outside other fenced examples. */
export function engineeringRecords(body) {
  const records = [], errors = [];
  let fence = null, lines = [], selected = false;
  for (const line of body.split(/\r?\n/)) {
    if (!fence) {
      const opening = /^ {0,3}(`{3,}|~{3,})(.*)$/.exec(line);
      if (!opening) continue;
      fence = opening[1];
      selected = opening[2].trim() === 'json specdev-engineering-evidence';
      lines = [];
    } else if (new RegExp(`^ {0,3}${fence[0]}{${fence.length},}\\s*$`).test(line)) {
      if (selected) {
        try { records.push(JSON.parse(lines.join('\n'))); }
        catch { errors.push('engineering/fence: expected one valid JSON object'); }
      }
      fence = null;
    } else lines.push(line);
  }
  if (fence && selected) errors.push('engineering/fence: unclosed evidence fence');
  return { records, errors };
}

/** Reject internally inconsistent claims; cannot authenticate measurements or logs. */
export function validateEngineeringRecord(record) {
  const errors = [];
  const require = (condition, message) => { if (!condition) errors.push(`engineering/${record?.kind ?? 'record'}: ${message}`); };
  if (!object(record)) return ['engineering/record: expected object'];
  require(record.version === 1, 'version must be 1');
  require(ENGINEERING_KINDS.has(record.kind), 'unknown kind');
  require(text(record.checkpoint), 'checkpoint is required');
  require(strings(record.evidence), 'nonempty evidence locators are required');
  if (record.kind === 'performance') {
    require(['baseline', 'improved', 'no-gain', 'inconclusive'].includes(record.outcome), 'invalid outcome');
    require(text(record.operation), 'user operation is required');
    require(text(record.uncertainty), 'measurement uncertainty and exclusions must be explained');
    if (record.outcome === 'inconclusive' && record.baseline == null && record.candidate == null) return errors;
    const checkMeasurement = (m, label) => {
      if (!object(m)) { require(false, `${label} measurement is required`); return false; }
      for (const field of ['checkpoint', 'entrypoint', 'environment', 'clock', 'workload']) require(text(m[field]), `${label}.${field} is required`);
      require(digest(m.workload_digest), `${label}.workload_digest must be SHA-256`);
      require(['ms', 'bytes', 'ops/s'].includes(m.unit), `${label}.unit must be ms, bytes or ops/s`);
      require(['lower', 'higher'].includes(m.direction), `${label}.direction is required`);
      require(['cold', 'warm', 'not-applicable'].includes(m.cache), `${label}.cache is required`);
      require(Array.isArray(m.excluded_costs) && m.excluded_costs.every(text), `${label}.excluded_costs must be a string array`);
      require(samples(m.samples), `${label}.samples must contain finite nonnegative observed values`);
      return true;
    };
    checkMeasurement(record.baseline, 'baseline');
    if (record.candidate != null || record.outcome === 'improved' || record.outcome === 'no-gain') {
      checkMeasurement(record.candidate, 'candidate');
      if (object(record.baseline) && object(record.candidate)) {
        for (const field of ['entrypoint', 'environment', 'clock', 'workload_digest', 'unit', 'direction', 'cache', 'excluded_costs']) {
          require(JSON.stringify(record.baseline[field]) === JSON.stringify(record.candidate[field]), `comparison changes ${field}`);
        }
        if (record.outcome === 'improved') {
          require(record.behavior_verification === 'passed', 'improvement requires behavior verification');
          if (samples(record.baseline.samples) && samples(record.candidate.samples)) {
            const a = mean(record.baseline.samples), b = mean(record.candidate.samples);
            require(record.baseline.direction === 'lower' ? b < a : b > a, 'improvement contradicts observed arithmetic means');
          }
        }
      }
    }
  } else if (record.kind === 'documentation') {
    require(['verified', 'partial', 'blocked'].includes(record.outcome), 'invalid outcome');
    require(strings(record.owner_paths), 'owning sources are required');
    require(typeof record.visible_behavior_changed === 'boolean', 'visible_behavior_changed must be boolean');
    require(['passed', 'failed', 'not-run', 'not-applicable'].includes(record.behavior_verification), 'invalid behavior verification');
    require(Array.isArray(record.claims) && record.claims.length > 0, 'claims are required');
    if (Array.isArray(record.claims)) for (const claim of record.claims) {
      if (!object(claim)) { require(false, 'claim must be an object'); continue; }
      require(text(claim.subject) && strings(claim.evidence), 'claim needs subject and evidence');
      require(['command', 'source', 'manual'].includes(claim.method), 'invalid claim method');
      require(['verified', 'unverified'].includes(claim.state), 'invalid claim state');
      if (claim.method === 'command' && claim.state === 'verified') {
        require(text(claim.command) && claim.executed === true && claim.exit_code === 0 && strings(claim.output), 'verified command needs execution, zero exit and observed output');
      }
      if (claim.state === 'unverified') require(text(claim.reason), 'unverified claim needs reason');
      if (record.outcome === 'verified') require(claim.state === 'verified', 'overall verified has an unverified claim');
    }
    if (record.visible_behavior_changed && record.outcome === 'verified') require(record.behavior_verification === 'passed', 'visible change requires behavior evidence');
  } else if (record.kind === 'incident') {
    require(record.feedback_loop_ready === false && record.root_cause_confirmed === false, 'event triage must not assert feedback readiness or confirmed cause');
    require(strings(record.facts) && strings(record.next_checks), 'observed facts and next safe checks are required');
    require(Array.isArray(record.unknowns) && record.unknowns.length > 0 && record.unknowns.every(text), 'missing evidence must stay visible');
  }
  return errors;
}

/** Read existing owners only. Explicit --engineering requires a matching record. */
export function validateEngineeringArtifacts(change, requiredKind = null) {
  const errors = [], found = new Set();
  const root = realpathSync(change);
  const safe = (file, directory = false) => {
    if (!existsSync(file)) return false;
    const stat = lstatSync(file);
    if (stat.isSymbolicLink()) { errors.push('engineering/path: symlinked evidence owners are not read'); return false; }
    const rel = relative(root, realpathSync(file));
    if (isAbsolute(rel) || rel === '..' || rel.startsWith('../') || rel.startsWith('..\\')) { errors.push('engineering/path: evidence escapes change'); return false; }
    return directory ? stat.isDirectory() : stat.isFile();
  };
  const files = [[join(change, 'architecture-review.md'), 'performance'], [join(change, 'diagnosis.md'), 'incident']];
  const evidenceRoot = join(change, 'evidence');
  if (safe(evidenceRoot, true)) for (const name of readdirSync(evidenceRoot).filter(n => n.endsWith('.md')).sort()) {
    files.push([join(evidenceRoot, name), 'documentation']);
  }
  for (const [file, ownerKind] of files) {
    if (!safe(file)) continue;
    const parsed = engineeringRecords(readFileSync(file, 'utf8'));
    errors.push(...parsed.errors.map(e => `${relative(change, file)}: ${e}`));
    for (const record of parsed.records) {
      if (record?.kind !== ownerKind) errors.push(`${relative(change, file)}: engineering/owner: expected ${ownerKind}`);
      else found.add(record.kind);
      errors.push(...validateEngineeringRecord(record).map(e => `${relative(change, file)}: ${e}`));
    }
  }
  if (requiredKind && !found.has(requiredKind)) errors.push(`engineering/${requiredKind}: missing evidence in existing owner artifact`);
  return errors;
}

/** Keep optional branches reachable from their owning entry without a new registry. */
export function validateEngineeringPackage(root) {
  const errors = [];
  for (const [entry, target] of [
    ['specdev-r-review-architecture/SKILL.md', 'specdev-r-review-architecture/references/performance-review.md'],
    ['specdev-i-implement/SKILL.md', 'specdev-i-implement/references/documentation-procedure.md'],
    ['specdev-d-diagnose-bugs/SKILL.md', 'specdev-d-diagnose-bugs/references/incident-evidence.md'],
  ]) {
    if (!existsSync(join(root, target))) errors.push(`engineering/route: missing ${target}`);
    const source = join(root, entry);
    if (!existsSync(source) || !readFileSync(source, 'utf8').includes(`<Path>{roots.workflows}/specdev/${target}</Path>`)) errors.push(`engineering/route: ${entry} does not expose ${target}`);
  }
  for (const rule of ['error-handling', 'test-reliability', 'agent-experience', 'documentation-standard', 'engineering-evidence']) {
    if (!existsSync(join(root, 'common', 'rules', `${rule}.md`))) errors.push(`engineering/rule: missing ${rule}`);
  }
  return errors;
}
