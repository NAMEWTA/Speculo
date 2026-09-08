/** Strict, additive Plan contracts. Read-only; no authorization or state writes. */
import { createHash } from 'node:crypto';
import { existsSync, lstatSync, readFileSync, realpathSync } from 'node:fs';
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';

export const CHANGE_ID = /^\d{4}-\d{2}-\d{2}-[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DIGEST = /^[a-f0-9]{64}$/;
const plainObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const nonempty = value => typeof value === 'string' && value.trim().length > 0;
const strings = value => Array.isArray(value) && value.every(nonempty);
const placeholder = value => !nonempty(value) || /^(?:unreviewed|unassigned|\.\.\.|TBD)$/i.test(value.trim()) || /\{\{|<[^>]*(?:真实|标题|填写|说明|目标|摘要)[^>]*>/.test(value);
export const digest = value => createHash('sha256').update(value).digest('hex');
export const pathText = value => typeof value === 'string' ? /^<Path>([^<>]+)<\/Path>$/.exec(value)?.[1] ?? null : null;

function within(root, target) {
  const rel = relative(root, target);
  return rel !== '' && rel !== '..' && !rel.startsWith(`..${sep}`) && !isAbsolute(rel);
}

function projectPathSyntax(taggedPath) {
  const logical = pathText(taggedPath);
  if (!logical || isAbsolute(logical) || /^[A-Za-z]:/.test(logical) || logical.includes('\\') || logical.split('/').some(part => part === '..' || part === '.' || part === '') || /[{}*?]/.test(logical)) throw new Error(`invalid project source Path: ${String(taggedPath)}`);
  if (/(^|\/)(?:node_modules|\.git|\.cache)(\/|$)|(^|\/)plugins\/cache(\/|$)/.test(logical)) throw new Error(`project source is a cache or protected metadata: ${logical}`);
  return logical;
}
/** Resolve user-maintained project sources without following links outside the source domain. */
export function resolveProjectSource(repoRoot, taggedPath) {
  const logical = projectPathSyntax(taggedPath);
  if (!repoRoot) throw new Error('project Skill validation requires --repo');
  const root = realpathSync(resolve(repoRoot));
  const lexical = resolve(root, logical);
  if (!within(root, lexical)) throw new Error(`project source escapes --repo: ${logical}`);
  const real = realpathSync(lexical);
  if (!within(root, real)) throw new Error(`project source symlink escapes --repo: ${logical}`);
  for (const candidate of [logical, relative(root, real).split(sep).join('/')]) {
    if (/(^|\/)(?:node_modules|\.git|\.cache)(\/|$)|(^|\/)plugins\/cache(\/|$)/.test(candidate)) {
      throw new Error(`project source is a cache or protected metadata, not a user-maintained Skill: ${logical}`);
    }
  }
  if (!lstatSync(real).isFile()) throw new Error(`project source is not a file: ${logical}`);
  return real;
}

export function validateBindings(meta, repoRoot) {
  const errors = [];
  if (!Array.isArray(meta.skill_bindings)) return ['skill_bindings must be a JSON array'];
  const active = meta.ready === true || ['in_progress', 'review', 'done'].includes(meta.status);
  if (!nonempty(meta.skill_scan) || (active && placeholder(meta.skill_scan))) errors.push('skill_scan must record actual source discovery and applicability, not unreviewed');
  const seen = new Set();
  const allowed = new Set(['id','path','sha256','phase','operation','inputs','outputs','required','on_failure','condition','references']);
  for (const [index, binding] of meta.skill_bindings.entries()) {
    const label = `skill_bindings[${index}]`;
    if (!plainObject(binding)) { errors.push(`${label} must be an object`); continue; }
    for (const key of Object.keys(binding)) if (!allowed.has(key)) errors.push(`${label}: unknown field ${key}`);
    for (const key of ['id','path','operation']) if (placeholder(binding[key])) errors.push(`${label}.${key} must be explicit`);
    if (!DIGEST.test(binding.sha256 ?? '')) errors.push(`${label}.sha256 must be a SHA-256 digest`);
    if (!['plan','implement','verify'].includes(binding.phase)) errors.push(`${label}.phase is invalid`);
    for (const key of ['inputs','outputs']) if (!strings(binding[key]) || !binding[key].length || binding[key].some(placeholder)) errors.push(`${label}.${key} must be a nonempty explicit string array`);
    if (typeof binding.required !== 'boolean') errors.push(`${label}.required must be boolean`);
    if (!['block-ticket','report-and-continue'].includes(binding.on_failure)) errors.push(`${label}.on_failure is invalid`);
    if (binding.required === true && binding.on_failure !== 'block-ticket') errors.push(`${label}: required Skill failure must block-ticket`);
    if (binding.required === false && placeholder(binding.condition)) errors.push(`${label}: optional Skill requires an explicit condition`);
    const key = `${binding.id}\0${binding.path}\0${binding.phase}\0${binding.operation}`;
    if (seen.has(key)) errors.push(`${label}: duplicate Skill invocation`);
    seen.add(key);
    try { projectPathSyntax(binding.path); } catch (error) { errors.push(`${label}: ${error.message}`); }
    if (!pathText(binding.path)?.endsWith('/SKILL.md')) errors.push(`${label}: entry must end with /SKILL.md`);
    if (meta.status !== "done") try {
      const source = resolveProjectSource(repoRoot, binding.path);
      const bytes = readFileSync(source);
      const text = bytes.toString('utf8');
      const header = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(text)?.[1];
      const name = header ? /^name:\s*["']?([^\r\n"']+)["']?\s*$/m.exec(header)?.[1]?.trim() : null;
      if (name !== binding.id) errors.push(`${label}: Skill id does not match entry name (${name ?? 'missing'})`);
      if (digest(bytes) !== binding.sha256) errors.push(`${label}: Skill source digest drift: ${binding.path}`);
    } catch (error) { errors.push(`${label}: ${error.message}`); }
    if (binding.references !== undefined && !Array.isArray(binding.references)) errors.push(`${label}.references must be an array`);
    const references = Array.isArray(binding.references) ? binding.references : [];
    const refsSeen = new Set();
    for (const [refIndex, ref] of references.entries()) {
      const refLabel = `${label}.references[${refIndex}]`;
      if (!plainObject(ref)) { errors.push(`${refLabel} must be an object`); continue; }
      if (Object.keys(ref).some(key => !['path','sha256','when'].includes(key))) errors.push(`${refLabel}: unknown reference field`);
      try { projectPathSyntax(ref.path); } catch (error) { errors.push(`${refLabel}: ${error.message}`); }
      if (placeholder(ref.when) || !DIGEST.test(ref.sha256 ?? '')) errors.push(`${refLabel}: explicit when and sha256 required`);
      if (refsSeen.has(ref.path)) errors.push(`${refLabel}: duplicate reference`);
      refsSeen.add(ref.path);
      if (meta.status !== "done") try {
        if (digest(readFileSync(resolveProjectSource(repoRoot, ref.path))) !== ref.sha256) errors.push(`${refLabel}: reference digest drift`);
      } catch (error) { errors.push(`${refLabel}: ${error.message}`); }
    }
  }
  return errors;
}

export function readEvidenceRecords(text, heading) {
  const start = text.indexOf(`${heading}\n`);
  if (start < 0) throw new Error(`missing '${heading}'`);
  const tail = text.slice(start + heading.length + 1).split(/^## /m)[0];
  const match = /```json\s*\n([\s\S]*?)\n```/.exec(tail);
  if (!match) throw new Error(`${heading} requires a JSON array code block`);
  const value = JSON.parse(match[1]);
  if (!Array.isArray(value)) throw new Error(`${heading} must contain an array`);
  return value;
}

export function validateTicketPlan(artifact, { repoRoot = null, requirePlan = false, checkEvidence = true } = {}) {
  const { meta, body, path } = artifact;
  const errors = [];
  if (meta.plan_contract_version === undefined) {
    if (requirePlan && !['done','cancelled'].includes(meta.status)) errors.push('legacy Ticket must be upgraded to plan_contract_version: 1 before implementation');
    return errors;
  }
  if (meta.plan_contract_version !== 1) errors.push('unsupported plan_contract_version');
  errors.push(...validateBindings(meta, repoRoot));
  if (!strings(meta.resource_claims) || new Set(meta.resource_claims).size !== meta.resource_claims.length) errors.push('resource_claims must be a unique string array');
  if (meta.ready === true || ['in_progress','review','done'].includes(meta.status)) {
    for (const heading of ['## 11. SKILL 调用计划', '## 12. 停止、检查点与交付']) if (!body.includes(heading)) errors.push(`ready Plan Ticket missing '${heading}'`);
  }
  if (checkEvidence && meta.status === 'done' && meta.skill_bindings?.some(binding => binding?.required === true)) {
    try {
      const evidencePath = join(dirname(dirname(path)), 'evidence', `${meta.id}.md`);
      if (lstatSync(evidencePath).isSymbolicLink()) throw new Error('Skill evidence must not be a symlink');
      const records = readEvidenceRecords(readFileSync(evidencePath,'utf8').replace(/\r\n/g,'\n'), '## Skill Execution Records');
      for (const binding of meta.skill_bindings.filter(value => value?.required === true)) {
        const matches = records.filter(record => plainObject(record) && record.id === binding.id && record.phase === binding.phase && record.operation === binding.operation);
        if (matches.length !== 1 || matches[0].sha256 !== binding.sha256 || matches[0].status !== 'passed' || !strings(matches[0].evidence) || !matches[0].evidence.length || matches[0].evidence.some(placeholder)) {
          errors.push(`required Skill has no unique passed execution evidence: ${binding.id}/${binding.phase}/${binding.operation}`);
        }
      }
    } catch (error) { errors.push(`Skill execution evidence: ${error.message}`); }
  }
  return errors;
}

export function validatePlanMap(artifact, changeDirectory = null) {
  const { meta, body } = artifact;
  if (meta.plan_contract_version === undefined) return [];
  const errors = [];
  if (meta.plan_contract_version !== 1) errors.push('unsupported plan_contract_version');
  if (!Number.isInteger(meta.plan_revision) || meta.plan_revision < 1) errors.push('plan_revision must be a positive integer');
  if (!nonempty(meta.deliverable_policy) || (meta.status !== 'draft' && placeholder(meta.deliverable_policy))) errors.push('deliverable_policy must record user quantity requirements or their absence');
  if (!body.includes('## 9. 总控与恢复')) errors.push("missing '## 9. 总控与恢复'");
  const deliveries = meta.requested_deliverables;
  if (!Array.isArray(deliveries)) { errors.push('requested_deliverables must be a JSON array'); return errors; }
  const names = new Set();
  for (const item of deliveries) {
    if (!plainObject(item) || placeholder(item.name) || !Number.isInteger(item.count) || item.count < 1 || Object.keys(item).some(key => !['name','count'].includes(key))) {
      errors.push('requested_deliverables entries require an explicit name and positive integer count'); continue;
    }
    if (names.has(item.name)) errors.push(`duplicate requested deliverable: ${item.name}`);
    names.add(item.name);
  }
  if (meta.status === 'completed' && deliveries.length && changeDirectory) {
    try {
      const evidencePath = join(changeDirectory,'evidence','goal-delivery.md');
      if (lstatSync(evidencePath).isSymbolicLink()) throw new Error('delivery evidence must not be a symlink');
      const records = readEvidenceRecords(readFileSync(evidencePath,'utf8').replace(/\r\n/g,'\n'),'## Delivery Records');
      for (const item of deliveries) {
        const matched = records.filter(record => record?.name === item.name);
        const outputs = matched[0]?.outputs;
        if (matched.length !== 1 || !strings(outputs) || new Set(outputs).size !== outputs.length || outputs.length !== item.count) errors.push(`actual delivery quantity must equal requested ${item.name}: ${item.count}`);
      }
    } catch (error) { errors.push(`Goal delivery evidence: ${error.message}`); }
  }
  return errors;
}

export function validateInvocationCoverage(tickets, matrix) {
  const errors = [];
  for (const [id, ticket] of tickets) {
    if (ticket.meta.plan_contract_version !== 1 || ticket.meta.ready !== true) continue;
    const paths = new Set((ticket.meta.skill_bindings ?? []).map(binding => pathText(binding?.path)).filter(Boolean));
    const listed = new Set((matrix ?? []).filter(entry => entry.appliesTo.has('ALL') || entry.appliesTo.has(id)).map(entry => entry.path).filter(Boolean));
    for (const skill of listed) if (!paths.has(skill)) errors.push(`${id}: project Skill in Map has no invocation binding: ${skill}`);
    for (const skill of paths) if (!listed.has(skill)) errors.push(`${id}: invocation binding is absent from Map project Skill routing: ${skill}`);
  }
  return errors;
}

export function validateGoalMap(artifact, directory) {
  const errors = [];
  const allowed = new Set(['schema_version','artifact','change','implementation_map','implementation_plan']);
  if (artifact.meta.schema_version !== 1 || artifact.meta.artifact !== 'goal-tickets-map') errors.push('invalid goal-tickets-map schema');
  if (artifact.meta.change !== basename(directory)) errors.push('goal-tickets-map change does not match directory');
  for (const key of Object.keys(artifact.meta)) if (!allowed.has(key)) errors.push(`goal-tickets-map may not cache state or unknown field: ${key}`);
  for (const [key,file] of [['implementation_map','implementation-map.md'],['implementation_plan','implementation-plan.md']]) {
    const value = pathText(artifact.meta[key]);
    if (value !== `{roots.state}/specdev/changes/${basename(directory)}/${file}`) errors.push(`goal-tickets-map ${key} must target its own parent artifact`);
    if (!existsSync(join(directory,file)) || lstatSync(join(directory,file)).isSymbolicLink() || !lstatSync(join(directory,file)).isFile()) errors.push(`goal-tickets-map missing real ${file}`);
  }
  return errors;
}

export function findGraphCycle(graph) {
  const visiting = new Set(), visited = new Set(), stack = [];
  function visit(id) {
    if (visiting.has(id)) return [...stack.slice(stack.indexOf(id)), id];
    if (visited.has(id)) return null;
    visiting.add(id);stack.push(id);
    for (const parent of graph.get(id) ?? []) { const result = visit(parent); if (result) return result; }
    stack.pop();visiting.delete(id);visited.add(id);return null;
  }
  for (const id of graph.keys()) { const result = visit(id); if (result) return result; }
  return null;
}

export function validateInitiative(directory) {
  const file = join(directory,'initiative.json');
  if (!existsSync(file)) return [];
  const errors = [];
  let data;
  try {
    if (lstatSync(file).isSymbolicLink()) throw new Error('initiative must be a real file');
    data = JSON.parse(readFileSync(file,'utf8'));
  } catch (error) { return [`initiative.json: ${error.message}`]; }
  if (!plainObject(data)) return ['initiative.json must contain an object'];
  const keys = ['schema_version','artifact','change','revision','destination','changes'];
  if (keys.some(key => !(key in data)) || Object.keys(data).some(key => !keys.includes(key))) errors.push('initiative.json: missing or unknown fields');
  if (data.schema_version !== 1 || data.artifact !== 'initiative' || data.change !== basename(directory)) errors.push('initiative.json: schema/artifact/change mismatch');
  if (!Number.isInteger(data.revision) || data.revision < 1 || placeholder(data.destination)) errors.push('initiative.json: positive revision and explicit destination required');
  if (!Array.isArray(data.changes)) return [...errors,'initiative.json: changes must be an array'];
  const graph = new Map(), targets = new Set();
  const fields = ['id','name','background','scope','non_goals','unknowns','depends_on','target'];
  for (const [i,item] of data.changes.entries()) {
    const label = `initiative.json changes[${i}]`;
    if (!plainObject(item)) { errors.push(`${label} must be an object`); continue; }
    if (fields.some(key => !(key in item)) || Object.keys(item).some(key => !fields.includes(key))) errors.push(`${label}: missing or unknown fields`);
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item.id ?? '')) errors.push(`${label}: invalid candidate id`);
    if (graph.has(item.id)) errors.push(`${label}: duplicate candidate id`);
    for (const key of ['name','background','scope']) if (placeholder(item[key])) errors.push(`${label}.${key} must be explicit`);
    for (const key of ['non_goals','unknowns','depends_on']) if (!strings(item[key])) errors.push(`${label}.${key} must be a string array`);
    if (Array.isArray(item.depends_on) && new Set(item.depends_on).size !== item.depends_on.length) errors.push(`${label}: duplicate dependencies`);
    graph.set(item.id, Array.isArray(item.depends_on) ? item.depends_on : []);
    if (item.target !== null) {
      if (!CHANGE_ID.test(item.target ?? '') || item.target === basename(directory)) { errors.push(`${label}: invalid/self target change`); continue; }
      if (targets.has(item.target)) errors.push(`${label}: duplicate target change`);
      targets.add(item.target);
      const target = join(dirname(directory),item.target);
      if (!existsSync(target) || lstatSync(target).isSymbolicLink() || !lstatSync(target).isDirectory()) errors.push(`${label}: target is missing or not a real change directory`);
      else if (existsSync(join(target,'implementation-map.md'))) errors.push(`${label}: target must not be a parent implementation change`);
      else {
        try {
          const statusFile = join(target,'.status.json');
          if (lstatSync(statusFile).isSymbolicLink() || !lstatSync(statusFile).isFile()) throw new Error('status must be a real file');
          const status = JSON.parse(readFileSync(statusFile,'utf8'));
          if (status.schema_version !== 6 || status.artifact !== 'change-status' || status.change !== item.target) throw new Error('status identity does not match target change');
        } catch (error) { errors.push(`${label}: target has no valid owned change status: ${error.message}`); }
      }
    }
  }
  for (const [id,dependencies] of graph) for (const dependency of dependencies) if (!graph.has(dependency)) errors.push(`initiative.json: ${id} references missing ${dependency}`);
  const cycle = findGraphCycle(graph);
  if (cycle) errors.push(`initiative.json: candidate dependency cycle: ${cycle.join(' -> ')}`);
  return errors;
}
