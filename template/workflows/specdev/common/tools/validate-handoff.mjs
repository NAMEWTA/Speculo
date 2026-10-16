#!/usr/bin/env node
/** Read-only handoff checks. Never discovers, opens or authenticates external transcripts. */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { posix, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  markdownBodyLines, parseFrontmatter, readChangeFactsSync, readUtf8ArtifactSync,
  resolveWorkContextSync, safeWorkPathSync,
} from '../../../../lib/speculo-runtime.mjs';
import { checkSchema } from './delivery-artifacts.mjs';

const schema = JSON.parse(readFileSync(new URL('../schemas/session-locator.schema.json', import.meta.url), 'utf8'));
const requireThat = (condition, message) => { if (!condition) throw new Error(message); };
const real = value => typeof value === 'string' && value.trim() === value && value.length > 0 && !/^(?:unknown|unassigned|pending|todo|tbd|\.\.\.)$/i.test(value) && !/[<>\x00-\x1f]|\{[^}]*\}/.test(value);
const readFile = (root, path) => readUtf8ArtifactSync(safeWorkPathSync(root, path, {mustExist:true, type:'file'}));
const readJson = path => JSON.parse(readUtf8ArtifactSync(path));

function utc(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(value)) return false;
  const time = Date.parse(value);
  return Number.isFinite(time) && new Date(time).toISOString() === value.replace(/(?:\.(\d{1,3}))?Z$/, (_, fraction = '') => `.${fraction.padEnd(3, '0')}Z`);
}
function identity(session, task) {
  const match = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z(?:-(\d{2,}))?$/.exec(session ?? '');
  requireThat(match && utc(`${match[1]}-${match[2]}-${match[3]}T${match[4]}:${match[5]}:${match[6]}Z`) && (!match[7] || Number(match[7]) > 0 && String(Number(match[7])).padStart(2,'0') === match[7]), 'invalid orchestration session');
  const number = /^(\d{3,})-[a-z0-9]+(?:-[a-z0-9]+)*$/.exec(task ?? '')?.[1];
  requireThat(number && Number.isSafeInteger(Number(number)) && Number(number) > 0 && String(Number(number)).padStart(3,'0') === number, 'invalid task sequence/topic');
}
function headings(text, names) {
  const lines = markdownBodyLines(text);
  for (const name of names) {
    const matches = lines.filter(line => line.text === `## ${name}`);
    requireThat(matches.length === 1, `expected one ${name} section`);
    const end = lines.find(line => line.line > matches[0].line && /^#{1,2} /.test(line.text))?.line ?? Infinity;
    requireThat(lines.some(line => line.line > matches[0].line && line.line < end && line.text.trim() && !/^#+\s/.test(line.text)), `empty ${name} section`);
  }
}

/** Only a log path is stored; correspondence to this task is checked before writing. */
export function validateSessionLocator(value) {
  const errors = [];
  checkSchema(value, schema, 'session-locator', errors);
  if (errors.length) return errors;
  const path = value.path;
  if (!real(path) || /(?:^|[\\/])(?:\.\.\.|unknown|todo|tbd)(?:[\\/]|$)/i.test(path)) errors.push('path: placeholder or empty locator');
  // Accept source paths on either platform; do not access the external file here.
  if (!(posix.isAbsolute(path) || /^[A-Za-z]:[\\/]/.test(path) || /^\\\\[^\\/]+[\\/][^\\/]+[\\/]/.test(path))) errors.push('path must be an absolute file path');
  return errors;
}

export function validateHandoff(input) {
  const errors = [], warnings = [];
  try {
    requireThat(['dispatch','return'].includes(input.stage), 'expected dispatch or return stage');
    identity(input.session,input.task);
    const context = resolveWorkContextSync(input);
    const facts = readChangeFactsSync(context,input.change);
    requireThat(facts.location.kind === 'active', 'archived handoffs are frozen; use the original archive integrity checks');
    if (input.stage === 'dispatch') requireThat(facts.outcome === 'active', 'dispatch requires an active change');
    const round = safeWorkPathSync(facts.location.root,`sessions/${input.session}`,{mustExist:true,type:'directory'});
    const prefix = input.task.split('-')[0];
    requireThat(readdirSync(round).filter(name => name.split('-')[0] === prefix).length === 1, 'task sequence is missing or occupied more than once');
    const root = safeWorkPathSync(round,input.task,{mustExist:true,type:'directory'});
    const {fields:meta,body} = parseFrontmatter(readFile(root,'TASK.md'));
    requireThat(meta.schema_version === 1, 'TASK requires schema_version 1; retain legacy handoffs under their original contract');
    requireThat(Object.keys(meta).every(key => ['schema_version','session','task','kind','change','ticket'].includes(key)), 'TASK: unknown metadata field');
    requireThat(meta.session === input.session && meta.task === input.task, 'TASK identity mismatch');
    requireThat(['implementation','review','research','test-observation'].includes(meta.kind), 'TASK: invalid kind');
    if (meta.change !== undefined) requireThat(meta.change === input.change, 'TASK change mismatch');
    if (meta.ticket !== undefined) requireThat(real(meta.ticket), 'TASK: invalid ticket');
    headings(body,['Goal','Inputs','Workspace and Scope','Acceptance','Return']);
    const report = safeWorkPathSync(root,'REPORT.md',{type:'file'});
    if (input.stage === 'dispatch') requireThat(!existsSync(report), 'already delivered; create a new task instead of redispatch');
    else {
      const text = readFile(root,'REPORT.md'), lines = markdownBodyLines(text);
      const headerEnd = lines.find(line => /^## /.test(line.text))?.line ?? Infinity;
      const fields = {};
      for (const line of lines.filter(line => line.line < headerEnd)) {
        const match = /^(Session|Task|Status):\s*(.*?)\s*$/.exec(line.text);
        if (!match) continue;
        requireThat(!Object.hasOwn(fields,match[1]), `REPORT: duplicate ${match[1]}`); fields[match[1]]=match[2];
      }
      requireThat(fields.Session === input.session && fields.Task === input.task, 'REPORT identity mismatch');
      requireThat(['completed','blocked','failed','cancelled'].includes(fields.Status), 'REPORT: invalid terminal status');
      headings(text,['聚焦交接','产物与验证','问题与下一步']);
    }
    const path = safeWorkPathSync(root,'session-locator.json',{type:'file'});
    if (existsSync(path)) errors.push(...validateSessionLocator(readJson(path)));
  } catch (error) { errors.push(String(error.message ?? error)); }
  return {errors,warnings,caveat:'Read-only structure checks do not authenticate tool identity, transcript content, authorization or completion; external histories are never opened.'};
}

export function handoffCLI(argv) {
  const names = {'--repo':'projectRoot','--method-root':'methodRoot','--state-root':'stateRoot','--change':'change','--session':'session','--task':'task','--stage':'stage'}, input = {};
  if (argv.length === 1 && argv[0] === '--help') {
    console.log('Usage: node validate-handoff.mjs --repo <project> [--method-root <methods> --state-root <data-parent>] --change <id> --session <round> --task <id> --stage dispatch|return\nDirect use requires all three roots. Read-only; no log discovery or external transcript access.'); return 0;
  }
  try {
    for (let i=0;i<argv.length;i++) {
      const key = Object.hasOwn(names,argv[i]) ? names[argv[i]] : undefined, value = argv[++i];
      requireThat(key && !Object.hasOwn(input,key) && value && !value.startsWith('--'), 'unknown, duplicate or incomplete option'); input[key] = value;
    }
    requireThat(['projectRoot','change','session','task','stage'].every(key => input[key]), 'missing required arguments');
    requireThat(['dispatch','return'].includes(input.stage), 'invalid stage');
  } catch (error) { console.error(String(error.message ?? error)); return 2; }
  const result = validateHandoff(input); console.log(JSON.stringify(result,null,2)); return result.errors.length ? 1 : 0;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) process.exitCode = handoffCLI(process.argv.slice(2));
