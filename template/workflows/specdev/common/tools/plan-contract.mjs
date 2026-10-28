/** Required-method Plan contracts with progressive optional Skills. Read-only; no authorization or state writes. */
import { createHash } from 'node:crypto';
import { existsSync, lstatSync, readFileSync, realpathSync, readdirSync } from 'node:fs';
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import * as runtime from '../../../../lib/speculo-runtime.mjs';

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
  // No mandatory catalogue scan or empty binding ceremony for ordinary knowledge.
  if (meta.skill_bindings === undefined) return errors;
  if (!Array.isArray(meta.skill_bindings)) return ['skill_bindings must be a JSON array'];
  const seen = new Set();
  const allowed = new Set(['id','path','sha256','phase','operation','inputs','outputs','required','on_failure','condition','references']);
  for (const [index, binding] of meta.skill_bindings.entries()) {
    const label = `skill_bindings[${index}]`;
    if (!plainObject(binding)) { errors.push(`${label} must be an object`); continue; }
    for (const key of Object.keys(binding)) if (!allowed.has(key)) errors.push(`${label}: unknown field ${key}`);
    for (const key of ['id','path']) if (placeholder(binding[key])) errors.push(`${label}.${key} must be explicit`);
    if (typeof binding.required !== 'boolean') errors.push(`${label}.required must be boolean`);
    const required = binding.required === true;
    if (required || binding.operation !== undefined) if (placeholder(binding.operation)) errors.push(`${label}.operation must be explicit`);
    if (required || binding.sha256 !== undefined) if (!DIGEST.test(binding.sha256 ?? '')) errors.push(`${label}.sha256 must be a SHA-256 digest`);
    if (required || binding.phase !== undefined) if (!['plan','implement','verify'].includes(binding.phase)) errors.push(`${label}.phase is invalid`);
    for (const key of ['inputs','outputs']) if (required || binding[key] !== undefined) {
      if (!strings(binding[key]) || !binding[key].length || binding[key].some(placeholder)) errors.push(`${label}.${key} must be a nonempty explicit string array`);
    }
    if (required && binding.on_failure !== 'block-ticket') errors.push(`${label}: required Skill failure must block-ticket`);
    if (!required && binding.on_failure !== undefined && binding.on_failure !== 'report-and-continue') errors.push(`${label}: optional knowledge cannot introduce a completion gate`);
    if (binding.condition !== undefined && placeholder(binding.condition)) errors.push(`${label}.condition must be explicit when supplied`);
    const key = `${binding.id}\0${binding.path}\0${binding.phase ?? ''}\0${binding.operation ?? ''}`;
    if (seen.has(key)) errors.push(`${label}: duplicate Skill invocation`);
    seen.add(key);
    let safe = true;
    try { projectPathSyntax(binding.path); } catch (error) { safe = false; errors.push(`${label}: ${error.message}`); }
    if (!pathText(binding.path)?.endsWith('/SKILL.md')) errors.push(`${label}: entry must end with /SKILL.md`);
    // Resolve/read only actual required methods. Optional descriptions are not an
    // allowlist and their missing/stale source does not block unrelated execution.
    if (required && safe && meta.status !== 'done') try {
      const source = resolveProjectSource(repoRoot, binding.path);
      const bytes = readFileSync(source);
      const header = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(bytes.toString('utf8'))?.[1];
      const name = header ? /^name:\s*["']?([^\r\n"']+)["']?\s*$/m.exec(header)?.[1]?.trim() : null;
      if (name !== binding.id) errors.push(`${label}: Skill id does not match entry name (${name ?? 'missing'})`);
      if (digest(bytes) !== binding.sha256) errors.push(`${label}: Skill source digest drift: ${binding.path}`);
    } catch (error) { errors.push(`${label}: ${error.message}`); }
    if (binding.references !== undefined && !Array.isArray(binding.references)) errors.push(`${label}.references must be an array`);
    const refsSeen = new Set();
    for (const [refIndex, ref] of (Array.isArray(binding.references) ? binding.references : []).entries()) {
      const refLabel = `${label}.references[${refIndex}]`;
      if (!plainObject(ref)) { errors.push(`${refLabel} must be an object`); continue; }
      if (Object.keys(ref).some(key => !['path','sha256','when'].includes(key))) errors.push(`${refLabel}: unknown reference field`);
      try { projectPathSyntax(ref.path); } catch (error) { errors.push(`${refLabel}: ${error.message}`); }
      if (required || ref.when !== undefined) if (placeholder(ref.when)) errors.push(`${refLabel}: explicit when required`);
      if (required || ref.sha256 !== undefined) if (!DIGEST.test(ref.sha256 ?? '')) errors.push(`${refLabel}: sha256 required`);
      if (refsSeen.has(ref.path)) errors.push(`${refLabel}: duplicate reference`);
      refsSeen.add(ref.path);
      if (required && meta.status !== 'done') try {
        if (digest(readFileSync(resolveProjectSource(repoRoot, ref.path))) !== ref.sha256) errors.push(`${refLabel}: reference digest drift`);
      } catch (error) { errors.push(`${refLabel}: ${error.message}`); }
    }
  }
  return errors;
}

function readEvidenceValue(text, heading) {
  const bodyLines = runtime.markdownBodyLines(text), starts = bodyLines.filter(line=>line.text === heading);
  if (starts.length !== 1) throw new Error(`expected one '${heading}'`);
  const start = starts[0].line, end=bodyLines.find(line=>line.line > start && /^#{1,2} /.test(line.text))?.line;
  const tail = text.replaceAll('\r\n','\n').split('\n').slice(start,end ? end-1 : undefined).join('\n');
  const blocks=[];let fence=null,buffer=[];
  for(const line of tail.split('\n')) {
    const marker=/^ {0,3}(`{3,}|~{3,})([^\r\n]*)$/.exec(line);
    if(!fence && marker){fence={char:marker[1][0],length:marker[1].length,json:marker[2].trim() === 'json'};buffer=[];continue;}
    if(fence && marker && marker[1][0] === fence.char && marker[1].length >= fence.length && !marker[2].trim()){if(fence.json)blocks.push(buffer.join('\n'));fence=null;continue;}
    if(fence)buffer.push(line);
  }
  if(fence || blocks.length !== 1) throw new Error(`${heading} requires one complete JSON code block`);
  return JSON.parse(blocks[0]);
}

export function readEvidenceRecords(text, heading) {
  const value=readEvidenceValue(text,heading);
  if (!Array.isArray(value)) throw new Error(`${heading} must contain an array`);
  return value;
}

export function validateTicketPlan(artifact, { repoRoot = null, requirePlan = false, checkEvidence = true } = {}) {
  const { meta, body, path } = artifact;
  const errors = [];
  if (meta.plan_contract_version === undefined) return ['Ticket requires plan_contract_version: 1'];
  if (meta.plan_contract_version !== 1) errors.push('unsupported plan_contract_version');
  errors.push(...validateBindings(meta, repoRoot));
  if (!strings(meta.resource_claims) || new Set(meta.resource_claims).size !== meta.resource_claims.length) errors.push('resource_claims must be a unique string array');
  // Skill invocation is enforced by the structured bindings and real completion
  // records below, not by repeating generic instructions in every Ticket body.
  if (checkEvidence && meta.status === 'done' && Array.isArray(meta.skill_bindings) && meta.skill_bindings.some(binding => binding?.required === true)) {
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
  if (meta.plan_contract_version === undefined) return ['Tickets Map requires plan_contract_version: 1'];
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
    if (ticket.meta.skill_bindings !== undefined && !Array.isArray(ticket.meta.skill_bindings)) {
      errors.push(`${id}: skill_bindings must be a JSON array`);
      continue;
    }
    const requiredPaths = new Set((ticket.meta.skill_bindings ?? []).filter(binding => binding?.required === true).map(binding => pathText(binding.path)));
    // The Map is discovery/navigation, not a closed list of usable Skills.
    // Only an explicitly required method in that upstream contract must be pinned.
    for (const entry of matrix ?? []) {
      if (entry.required === true && entry.path && (entry.appliesTo.has('ALL') || entry.appliesTo.has(id)) && !requiredPaths.has(entry.path)) {
        errors.push(`${id}: required project Skill in Map has no required invocation binding: ${entry.path}`);
      }
    }
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
          if (existsSync(join(target, '.status.json'))) throw new Error('unsupported status protocol: use current Markdown change artifacts');
          runtime.parseOutcome(readFileSync(join(target, 'README.md'), 'utf8'), join(target, 'README.md'));
        } catch (error) { errors.push(`${label}: target has no valid Markdown change facts: ${error.message}`); }
      }
    }
  }
  for (const [id,dependencies] of graph) for (const dependency of dependencies) if (!graph.has(dependency)) errors.push(`initiative.json: ${id} references missing ${dependency}`);
  const cycle = findGraphCycle(graph);
  if (cycle) errors.push(`initiative.json: candidate dependency cycle: ${cycle.join(' -> ')}`);
  return errors;
}

/** Read actual Ticket or Direct Spec records; never creates empty execution slots. */
export function readChangeExecution(changeRoot) {
  const root = join(changeRoot, 'evidence');
  if (!existsSync(root)) return [];
  if (lstatSync(root).isSymbolicLink() || !lstatSync(root).isDirectory()) throw new Error('Evidence must be a real directory');
  const records = [];
  for (const file of readdirSync(root).filter(name => /^T-\d{2,}\.md$/.test(name) || name === 'direct-spec.md').sort()) {
    const path = join(root, file);
    if (lstatSync(path).isSymbolicLink() || !lstatSync(path).isFile()) throw new Error(`${path}: Evidence must be a regular file`);
    const text = readFileSync(path, 'utf8').replaceAll('\r\n', '\n');
    const sections = runtime.markdownBodyLines(text,path).filter(line=>line.text === '## Workspace Execution Record');
    if (!sections.length) continue;
    if (sections.length !== 1) throw new Error(`${path}: duplicate Workspace Execution Record`);
    const record = readEvidenceValue(text,'## Workspace Execution Record');
    const direct = file === 'direct-spec.md';
    if (!plainObject(record) || (direct
      ? record.purpose !== 'direct-spec' || record.change !== basename(changeRoot) || 'ticket_id' in record
      : record.ticket_id !== file.slice(0, -3) || 'purpose' in record || 'change' in record)) {
      throw new Error(`${path}: execution record identity differs from Evidence ${direct ? 'Direct Spec/change' : 'Ticket'}`);
    }
    records.push(record);
  }
  if (records.some(record => record.purpose === 'direct-spec') && records.some(record => record.ticket_id)) {
    throw new Error('Direct Spec and Ticket execution records cannot coexist; reconcile the original execution before changing modes');
  }
  return records;
}

/** A single Spec authority, with explicit lightweight fallback and stable sections. */
export function readSpecification(changeRoot, { allowLightweight = false, requiredArtifact = null, depth = null } = {}) {
  const spec = join(changeRoot, 'spec.md'), readme = join(changeRoot, 'README.md');
  const sections = {};
  let anchors = false;
  if (existsSync(readme)) {
    const text = readFileSync(readme, 'utf8');
    anchors = runtime.markdownBodyLines(text, readme).some(line => /^<a id="(?:scope|acceptance|verification)"><\/a>$/.test(line.text));
  }
  if (existsSync(spec)) {
    if (lstatSync(spec).isSymbolicLink() || !lstatSync(spec).isFile()) throw new Error('Spec must be a real file');
    if (anchors) throw new Error('two specification authorities: migrate README scope/acceptance/verification to navigation');
    return { path: spec, lightweight: false, text: readFileSync(spec, 'utf8') };
  }
  const goal = readLightweightGoal(changeRoot);
  if (!allowLightweight || requiredArtifact || /^deep$/i.test(depth ?? '') || ['ticket','tickets-map.md','implementation-map.md','implementation-plan.md'].some(name => existsSync(join(changeRoot, name))) || (!goal && existsSync(join(changeRoot,'goal-plan.md')))) throw new Error('independent Spec is required for explicit, Deep, Ticket, Goal or parallel work');
  for (const anchor of ['scope','acceptance','verification']) {
    sections[anchor] = runtime.readArtifactSectionSync(readme, anchor);
    if (placeholder(sections[anchor].text) || !sections[anchor].text.trim()) throw new Error(`README ${anchor} must contain substantive facts`);
  }
  const acceptance = [...sections.acceptance.text.matchAll(/\bAC-\d+\b/g)].map(match => match[0]);
  if (!acceptance.length || new Set(acceptance).size !== acceptance.length) throw new Error('README acceptance requires unique AC identifiers and observable criteria');
  const text = readFileSync(readme, 'utf8');
  if ((!goal && !/^[-*] \[[ xX]\] \S/m.test(text)) || !/^## (?:下一步|Next Steps?)\s*$/mi.test(text)) throw new Error('lightweight README requires a current checklist and next step');
  return { path: readme, lightweight: true, text, sections, acceptance };
}

export function validateExecutionPolicy(plan, config = null) {
  const errors = [];
  const meta = plan.meta;
  if (!['auto','serial','parallel'].includes(meta.ticket_execution)) errors.push('plan must declare ticket_execution: auto, serial or parallel');
  for (const key of ['concurrent_implementation_limit','max_parallel_tickets']) if (meta[key] !== undefined && (!Number.isInteger(meta[key]) || meta[key] < 1)) errors.push(`${key} must be a positive integer when specified`);
  if (!Number.isInteger(meta.integration_attempt_limit) || meta.integration_attempt_limit < 1) errors.push('plan must declare a positive integration_attempt_limit');
  if (config) {
    if (config.schema_version !== 7 || !Number.isInteger(config.execution?.max_concurrent_implementations) || !Number.isInteger(config.execution?.max_integration_attempts)) return ['existing tool config requires schema v7 and explicit execution limits'];
    if (meta.concurrent_implementation_limit > config.execution.max_concurrent_implementations) errors.push(`concurrent_implementation_limit ${meta.concurrent_implementation_limit} exceeds config max_concurrent_implementations ${config.execution.max_concurrent_implementations}`);
    if (meta.integration_attempt_limit > config.execution.max_integration_attempts) errors.push(`integration_attempt_limit ${meta.integration_attempt_limit} exceeds config max_integration_attempts ${config.execution.max_integration_attempts}`);
  } else {
    const section = plan.body.split(/^## Execution Policy Source\s*$/m)[1]?.split(/^## /m)[0]?.trim();
    if (placeholder(section)) errors.push('plan without tool config requires an explicit Execution Policy Source');
  }
  return errors;
}

/** Resolve the same explicit roots for every tool; installed discovery stays strict. */
export function resolveToolContext(changeRoot, options = {}) {
  const supplied = options.context ?? options;
  const projectRoot = supplied.projectRoot ?? supplied.repoRoot ?? runtime.workspaceForPathSync(existsSync(changeRoot) && lstatSync(changeRoot).isFile() ? dirname(changeRoot) : changeRoot).projectRoot;
  return runtime.resolveWorkContextSync({ projectRoot, methodRoot: supplied.methodRoot, stateRoot: supplied.stateRoot });
}

/** Canonicalize host ancestor aliases while retaining every project-local link check. */
export function canonicalToolPath(context, input) {
  const absolute = resolve(context.projectRoot, input);
  for (let ancestor = absolute; ; ancestor = dirname(ancestor)) {
    if (existsSync(ancestor) && realpathSync(ancestor) === context.projectRoot) {
      if (lstatSync(ancestor).isSymbolicLink()) throw new Error('path-unsafe: linked project boundary');
      return runtime.safeWorkPathSync(context.projectRoot, relative(ancestor, absolute).split(sep).join('/'), {allowRoot:true});
    }
    if (dirname(ancestor) === ancestor) throw new Error(`path-unsafe: artifact escapes confirmed project: ${input}`);
  }
}

export function readLightweightGoal(changeRoot) {
  const path = join(changeRoot, 'goal-plan.md');
  if (!existsSync(path)) return null;
  const {fields:meta,body} = runtime.parseFrontmatter(runtime.readUtf8ArtifactSync(path));
  if (meta.artifact !== 'lightweight-goal-plan') return null;
  if (Object.keys(meta).some(key => !['artifact','change','lead'].includes(key)) || meta.change !== basename(changeRoot) || placeholder(meta.lead)) throw new Error('lightweight Goal must identify its change and real Lead without duplicate progress fields');
  if (['ticket','tickets-map.md','implementation-map.md','implementation-plan.md'].some(name=>existsSync(join(changeRoot,name)))) throw new Error('lightweight Goal cannot own Tickets, Maps or multi-change execution');
  const visible=runtime.markdownBodyLines(body,path);
  for (const heading of ['Tasks','Integration and Verification','Next Steps']) {
    const starts=visible.filter(line=>line.text === `## ${heading}`);
    if (starts.length !== 1) throw new Error(`lightweight Goal requires one substantive ${heading} section`);
    const end=visible.find(line=>line.line > starts[0].line && /^#{1,2} /.test(line.text))?.line ?? Infinity;
    const content=visible.filter(line=>line.line > starts[0].line && line.line < end).map(line=>line.text).join('\n').trim();
    if (placeholder(content)) throw new Error(`lightweight Goal requires one substantive ${heading} section`);
  }
  if (!/^[-*] \[\s?[xX]?\] \S/m.test(body)) throw new Error('lightweight Goal requires its own task checklist');
  const readme = runtime.readUtf8ArtifactSync(join(changeRoot,'README.md'));
  if (/^[-*] \[[ xX]\] /m.test(readme)) throw new Error('README must navigate to Goal instead of mirroring its task progress');
  return {path,meta,body};
}

/** A file's presence is not acceptance. Bind each contract to its actual observation. */
export function validateAcceptanceEvidence(changeRoot, artifact, contractIds) {
  const errors = [];
  try {
    const path = runtime.safeWorkPathSync(changeRoot, artifact, {mustExist:true,type:'file'});
    const records = readEvidenceRecords(runtime.readUtf8ArtifactSync(path).replaceAll('\r\n','\n'), '## Acceptance Verification');
    const allowed = new Set(['id','result','method','source','observed','command','exit','evidence','sha256']);
    if (!contractIds.length) errors.push(`${artifact}: completion requires explicit AC identifiers`);
    for (const id of new Set(contractIds)) {
      const matching = records.filter(record => record?.id === id);
      if (matching.length !== 1) { errors.push(`${artifact}: ${id} requires exactly one actual acceptance result`); continue; }
      const record = matching[0];
      if (!plainObject(record) || Object.keys(record).some(key=>!allowed.has(key)) || record.result !== 'passed' || ['method','source','observed'].some(key=>placeholder(record[key]))) errors.push(`${artifact}: ${id} requires passed Method/Source/Observed evidence`);
      if (record.command !== undefined && (placeholder(record.command) || record.exit !== 0)) errors.push(`${artifact}: ${id} command must have actual Exit 0`);
      if (record.evidence !== undefined) {
        const evidence = runtime.safeWorkPathSync(changeRoot, record.evidence, {mustExist:true,type:'file'});
        if (evidence === path || !DIGEST.test(record.sha256 ?? '') || digest(readFileSync(evidence)) !== record.sha256) errors.push(`${artifact}: ${id} acceptance evidence digest drift or circular evidence`);
      } else if (record.sha256 !== undefined) errors.push(`${artifact}: digest without evidence locator`);
    }
    for (const record of records) if (!contractIds.includes(record?.id)) errors.push(`${artifact}: unknown acceptance contract ${record?.id}`);
  } catch(error) { errors.push(`${artifact}: ${error.message}`); }
  return errors;
}

