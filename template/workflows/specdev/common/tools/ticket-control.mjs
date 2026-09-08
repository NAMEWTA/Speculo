#!/usr/bin/env node
/** Read-only Goal dispatcher analysis. Never executes tools, mutates state, or grants permission. */
import { existsSync, lstatSync, readFileSync, readdirSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseFrontmatter, validateChange, pathsOverlap } from './validate-specdev.mjs';
import { CHANGE_ID, digest, findGraphCycle, resolveProjectSource, validateGoalMap } from './plan-contract.mjs';

const terminal = new Set(['done','cancelled']);
const inFlight = new Set(['in_progress','review']);
function readArtifact(file) {
  if (!existsSync(file) || lstatSync(file).isSymbolicLink() || !lstatSync(file).isFile()) throw new Error(`missing or noncanonical artifact: ${file}`);
  return { path: file, ...parseFrontmatter(file) };
}
function readStatus(root) {
  const file = join(root,'.status.json');
  if (!existsSync(file) || lstatSync(file).isSymbolicLink()) throw new Error(`missing real change status: ${file}`);
  return JSON.parse(readFileSync(file,'utf8'));
}
function findConfig(root) {
  let here = resolve(root);
  while (true) {
    const candidate = join(here,'.speculo','specdev','config.json');
    if (existsSync(candidate)) return JSON.parse(readFileSync(candidate,'utf8'));
    const parent = dirname(here);if (parent === here) return null;here = parent;
  }
}
function resourceOverlap(left, right) {
  if (left === right) return true;
  const prefix = value => value.endsWith('*') ? value.slice(0,-1) : null;
  return (prefix(left) !== null && right.startsWith(prefix(left))) || (prefix(right) !== null && left.startsWith(prefix(right)));
}
function conflicts(a, b, serializations) {
  if (serializations.has([a.id,b.id].sort().join('\0'))) return 'explicit serialization';
  for (const left of a.artifact.meta.writable_paths ?? []) for (const right of b.artifact.meta.writable_paths ?? []) if (pathsOverlap(left,right)) return `writable overlap: ${left} / ${right}`;
  for (const left of a.artifact.meta.resource_claims ?? []) for (const right of b.artifact.meta.resource_claims ?? []) if (resourceOverlap(left,right)) return `semantic resource: ${left} / ${right}`;
  return null;
}
function stableGoalContract(plan, map) {
  const meta = { ...(plan?.meta ?? {}) };
  for (const key of ['status','ready_for_execution','source_map_revision']) delete meta[key];
  const body = (plan?.body ?? '').split(/(?=^## )/m)
    .filter(section => !/^## (?:\d+\. )?(?:Progress and Decisions|Ready Frontier and Waves|进度与决定)/.test(section)).join('');
  return digest(JSON.stringify({meta,body,deliverables:map.meta.requested_deliverables ?? [],policy:map.meta.deliverable_policy ?? null}));
}
function contractHash(node) {
  const meta = { ...node.artifact.meta };
  for (const key of ['status','ready','owner']) delete meta[key];
  const sources = [];
  {
    for (const binding of node.artifact.meta.skill_bindings ?? []) {
      for (const item of [binding, ...(binding.references ?? [])]) {
        try { sources.push([item.path,terminal.has(node.artifact.meta.status) ? item.sha256 : digest(readFileSync(resolveProjectSource(node.repoRoot,item.path)))]); }
        catch { sources.push([item?.path ?? null,'unavailable']); }
      }
    }
  }
  return digest(JSON.stringify({ meta, body: node.artifact.body, spec: node.specDigest, goal: node.goalDigest, dependencies: node.dependencies, serializations: node.serializations, sources }));
}

export function analyzeMap({ mapPath, repoRoot, previous = null }) {
  if (!mapPath || !repoRoot) throw new Error('--map and --repo are required');
  mapPath = resolve(mapPath);repoRoot = resolve(repoRoot);
  const root = dirname(mapPath);
  let entry = readArtifact(mapPath);
  const errors = [], warnings = [], nodes = new Map(), memberRoots = new Map(), serializations = new Set();
  let parent = false;
  if (entry.meta.artifact === 'goal-tickets-map') {
    errors.push(...validateGoalMap(entry,root));
    if (errors.length) return failure(errors);
    entry = readArtifact(join(root,'implementation-map.md'));
  }
  if (entry.meta.artifact === 'implementation-map') parent = true;
  else if (entry.meta.artifact !== 'tickets-map') throw new Error('entry must be tickets-map, goal-tickets-map, or implementation-map');
  const members = parent ? entry.meta.members : [basename(root)];
  if (!Array.isArray(members) || !members.length || (parent && members.length < 2) || new Set(members).size !== members.length || members.some(id => !CHANGE_ID.test(id))) return failure(['invalid/duplicate member change IDs']);
  const planFile = join(root,parent ? 'implementation-plan.md' : 'goal-plan.md');
  const plan = existsSync(planFile) ? readArtifact(planFile) : null;
  const strategy = plan?.meta.ticket_workspace_policy ?? 'current';
  let limit = strategy === 'current' ? 1 : plan?.meta.implementation_agent_limit;
  if (!['current','required'].includes(strategy) || !Number.isInteger(limit) || limit < 1) errors.push('invalid workspace strategy or implementation limit');
  const config = findConfig(root);
  if (plan && (!config || !Number.isInteger(config.execution?.max_implementation_agents) || plan.meta.implementation_agent_limit > config.execution.max_implementation_agents)) errors.push('plan implementation limit is not backed by existing config');

  for (const member of members) {
    const memberRoot = parent ? join(dirname(root),member) : root;
    if (memberRoot === root && parent) { errors.push('parent cannot include itself'); continue; }
    if (!existsSync(memberRoot) || lstatSync(memberRoot).isSymbolicLink() || !lstatSync(memberRoot).isDirectory()) { errors.push(`member must be a real change directory: ${member}`); continue; }
    memberRoots.set(member,memberRoot);
    const status = readStatus(memberRoot);
    const specFile = join(memberRoot,'spec.md');
    const spec = readArtifact(specFile);
    const specDigest = digest(readFileSync(specFile));
    const ticketRoot = join(memberRoot,'ticket');
    if (!existsSync(ticketRoot) || lstatSync(ticketRoot).isSymbolicLink() || !lstatSync(ticketRoot).isDirectory()) { errors.push(`missing real Ticket directory: ${member}`); continue; }
    for (const file of readdirSync(ticketRoot).filter(name => name.endsWith('.md')).sort()) {
      const artifact = readArtifact(join(ticketRoot,file));
      if (!/^T-\d{2,}$/.test(artifact.meta.id ?? '') || artifact.meta.change !== member) { errors.push(`invalid Ticket identity: ${member}/${file}`); continue; }
      const id = parent ? `${member}::${artifact.meta.id}` : artifact.meta.id;
      if (nodes.has(id)) { errors.push(`duplicate Ticket ${id}`); continue; }
      if (!Array.isArray(artifact.meta.blocked_by) || artifact.meta.blocked_by.some(value => !/^T-\d{2,}$/.test(value))) { errors.push(`invalid dependencies: ${id}`); continue; }
      nodes.set(id, { id, member, repoRoot, artifact, specDigest, status, dependencies: artifact.meta.blocked_by.map(value => parent ? `${member}::${value}` : value), reasons: [], validationErrors: [] });
      if (spec.meta.ready_for_tickets !== true) nodes.get(id).reasons.push('source Spec is not Ready');
    }
  }
  if (!nodes.size) errors.push('map has no Tickets');
  if (parent) {
    if (!Array.isArray(entry.meta.tasks) || entry.meta.tasks.length !== nodes.size || new Set(entry.meta.tasks).size !== nodes.size || entry.meta.tasks.some(id => !nodes.has(id))) errors.push('parent inventory must exactly match child Tickets');
    if (!Array.isArray(entry.meta.dependencies) || !Array.isArray(entry.meta.serializations)) errors.push('parent dependencies and serializations must be arrays');
    for (const edge of entry.meta.dependencies ?? []) {
      const parts = /^([^ ]+) <- ([^ ]+)$/.exec(String(edge));
      if (!parts || !nodes.has(parts[1]) || !nodes.has(parts[2])) { errors.push(`invalid composite dependency: ${edge}`); continue; }
      if (!nodes.get(parts[1]).dependencies.includes(parts[2])) nodes.get(parts[1]).dependencies.push(parts[2]);
    }
    for (const edge of entry.meta.serializations ?? []) {
      const parts = /^([^ ]+) <> ([^ ]+)$/.exec(String(edge));
      if (!parts || !nodes.has(parts[1]) || !nodes.has(parts[2]) || parts[1] === parts[2]) { errors.push(`invalid serialization: ${edge}`); continue; }
      serializations.add([parts[1],parts[2]].sort().join('\0'));
    }
  }
  const graph = new Map([...nodes].map(([id,node]) => [id,node.dependencies]));
  for (const [id,dependencies] of graph) for (const dependency of dependencies) if (!nodes.has(dependency)) errors.push(`${id}: missing dependency ${dependency}`);
  const cycle = findGraphCycle(graph);if (cycle) errors.push(`dependency cycle: ${cycle.join(' -> ')}`);

  // Reuse existing stage gates. Local diagnostics block their owner, structural ones block dispatch.
  const validation = validateChange(root,parent ? 'goal-plan' : 'tickets',repoRoot);
  warnings.push(...validation.warnings);
  for (const error of validation.errors) {
    let assigned = false;
    for (const node of nodes.values()) {
      const prefix = parent ? `${node.member}: ` : '';
      const detail = prefix && error.startsWith(prefix) ? error.slice(prefix.length) : !parent ? error : null;
      if (detail !== null && (detail.startsWith(`${basename(node.artifact.path)}:`) || detail.startsWith(`${node.artifact.meta.id}:`))) {
        node.validationErrors.push(error);assigned = true;
      }
    }
    if (!assigned && parent) {
      for (const member of members) if (error.startsWith(`${member}: `)) {
        for (const node of nodes.values()) if (node.member === member) node.validationErrors.push(error);
        assigned = true;
      }
      if (error.startsWith('member changes already belong to unfinished parent implementation')) {
        const bracket = error.indexOf('[');
        try {
          const overlapping = JSON.parse(error.slice(bracket));
          for (const node of nodes.values()) if (overlapping.includes(node.member)) node.validationErrors.push(error);
          assigned = true;
        } catch { /* keep an unparseable ownership problem global */ }
      }
    }
    if (!assigned) errors.push(error);
  }
  for (const node of nodes.values()) {
    node.reasons.push(...node.validationErrors);
    if (!terminal.has(node.artifact.meta.status) && (!plan || plan.meta.ready_for_execution !== true)) node.reasons.push('Goal planning gate is not ready for execution');
    if (!terminal.has(node.artifact.meta.status) && node.artifact.meta.plan_contract_version !== 1) node.reasons.push('legacy Ticket needs explicit Plan-contract upgrade before dispatch');
  }
  const goalDigest = stableGoalContract(plan,entry);
  for (const node of nodes.values()) {
    node.goalDigest = goalDigest;
    node.serializations = [...serializations].filter(pair => pair.split('\0').includes(node.id)).sort();
  }
  const contractDigests = Object.fromEntries([...nodes].map(([id,node]) => [id,contractHash(node)]));
  const invalidated = new Set();
  if (previous !== null) {
    if (previous.schema_version !== 1 || !previous.contract_digests || typeof previous.contract_digests !== 'object' || Array.isArray(previous.contract_digests) || previous.scope !== basename(root)) errors.push('previous checkpoint schema/scope does not match this Goal');
    else {
      for (const [id,value] of Object.entries(contractDigests)) if (previous.contract_digests[id] !== value) invalidated.add(id);
      for (const id of Object.keys(previous.contract_digests)) if (!nodes.has(id)) warnings.push(`previous node removed; check coverage before accepting replan: ${id}`);
    }
    let changed = true;
    while (changed) {
      changed = false;
      for (const [id,node] of nodes) if (!invalidated.has(id) && node.dependencies.some(dependency => invalidated.has(dependency))) { invalidated.add(id);changed = true; }
    }
    for (const id of invalidated) nodes.get(id).reasons.push('contract drift: replan this node and affected downstream before dispatch');
  }
  const active = [...nodes.values()].filter(node => inFlight.has(node.artifact.meta.status));
  const done = [], cancelled = [], candidates = [], deferred = [];
  for (const node of nodes.values()) {
    const meta = node.artifact.meta;
    if (meta.status === 'done') { done.push(node.id);continue; }
    if (meta.status === 'cancelled') { cancelled.push(node.id);continue; }
    if (inFlight.has(meta.status)) continue;
    if (meta.status !== 'ready' || meta.ready !== true) node.reasons.push(`not Ready: ${meta.status}`);
    if (meta.owner === 'unassigned' || !meta.owner) node.reasons.push('implementation owner not assigned');
    for (const dependency of node.dependencies) {
      const prerequisite = nodes.get(dependency);
      if (!prerequisite || prerequisite.artifact.meta.status !== 'done' || prerequisite.reasons.length) node.reasons.push(`dependency not successfully satisfied: ${dependency}`);
    }
    for (const other of active) {
      const issue = strategy === 'current' ? 'current workspace already has an implementation writer' : conflicts(node,other,serializations);
      if (issue) node.reasons.push(`in-flight owner ${other.artifact.meta.owner ?? 'unknown'} (${other.id}): ${issue}`);
    }
    if (!node.reasons.length) candidates.push(node);
  }
  // Propagate blockers even when a downstream node sorts before its prerequisite.
  let propagated = true;
  while (propagated) {
    propagated = false;
    for (const node of nodes.values()) {
      if (terminal.has(node.artifact.meta.status)) continue;
      for (const dependency of node.dependencies) {
        if (nodes.get(dependency)?.reasons.length) {
          const reason = `blocked dependency closure: ${dependency}`;
          if (!node.reasons.includes(reason)) { node.reasons.push(reason);propagated = true; }
        }
      }
    }
  }
  const frontier = [];
  for (const node of candidates.sort((a,b) => a.id.localeCompare(b.id))) {
    if (node.reasons.length) continue;
    const conflict = frontier.map(id => conflicts(node,nodes.get(id),serializations)).find(Boolean);
    if (conflict || frontier.length >= Math.max(0,limit-active.length)) { deferred.push({id:node.id, reason:conflict ?? 'workspace/config concurrency limit'});continue; }
    frontier.push(node.id);
  }
  const blocked = [...nodes.values()].filter(node => node.reasons.length).map(node => ({id:node.id,reasons:[...new Set(node.reasons)]}));
  const nodeErrors = [...nodes.values()].flatMap(node => node.validationErrors.map(message => ({id:node.id,message})));
  const result = {
    schema_version:1, scope:basename(root), mode:'read-only-analysis',
    authorization_checked:false, transaction_gateway_checked:false,
    workspace_policy:strategy, implementation_limit:limit,
    input_digest:digest(JSON.stringify({entry:entry.meta,contracts:contractDigests})),
    goal_contract_digest:goalDigest, contract_digests:contractDigests, frontier:errors.length ? [] : frontier,
    deferred, in_flight:active.map(node => ({id:node.id,owner:node.artifact.meta.owner})),
    done, cancelled, blocked, invalidated:[...invalidated].sort(),
    eligible_for_final_verification:errors.length === 0 && blocked.length === 0 && active.length === 0 && done.length + cancelled.length === nodes.size,
    validation_errors:nodeErrors, errors:[...new Set(errors)], warnings,
    next: 'Lead must verify real authorization, existing transaction/ownership gateways, Skill execution and Goal acceptance; this output does not execute anything.'
  };
  return result;
}
function failure(errors) {
  return {schema_version:1,mode:'read-only-analysis',frontier:[],errors,validation_errors:[],eligible_for_final_verification:false};
}
function main(args) {
  const options = {};
  for (let i=0;i<args.length;i++) {
    const key = args[i];
    if (!['--map','--repo','--previous'].includes(key) || !args[i+1] || args[i+1].startsWith('--') || key in options) throw new Error('Usage: ticket-control.mjs --map <map-file> --repo <project-root> [--previous <checkpoint-json>]');
    options[key]=args[++i];
  }
  const result = analyzeMap({mapPath:options['--map'],repoRoot:options['--repo'],previous:options['--previous'] ? JSON.parse(readFileSync(options['--previous'],'utf8')) : null});
  console.log(JSON.stringify(result,null,2));
  return result.errors.length || result.validation_errors.length ? 1 : 0;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { process.exitCode=main(process.argv.slice(2)); }
  catch (error) { console.error(JSON.stringify({error:error.message,mode:'read-only-analysis'}));process.exitCode=1; }
}
