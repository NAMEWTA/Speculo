#!/usr/bin/env node
/** Fixed, read-only documentation example. Not a general runner or a workflow state authority. */
import { spawnSync } from 'node:child_process';
import { dirname, isAbsolute, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync, readFileSync } from 'node:fs';
import { workspaceForPathSync, resolvePathReference, readUtf8ArtifactSync, safeWorkPathSync } from '../../../lib/speculo-runtime.mjs';
import { validateDispatch } from '../../../references/coordination/scripts/validate-dispatch.mjs';

const requireThat = (ok, message) => { if (!ok) throw new Error(message); };
function field(body, name) {
  const values = body.split(/\r?\n/).filter(line => line.startsWith(name + ': ')).map(line => line.slice(name.length + 2));
  requireThat(values.length === 1 && values[0].trim(), 'example requires one ' + name + ' locator'); return values[0];
}
function execute(root, command, args) {
  const result = spawnSync(command, args, { cwd: root, encoding: 'utf8', timeout: 15000, maxBuffer: 1024 * 1024,
    env: { ...process.env, GIT_OPTIONAL_LOCKS: '0' } });
  requireThat(!result.error && result.status === 0, 'read-only check failed: ' + command + ': ' + (result.error?.code || result.stderr));
  return result.stdout.trim();
}

export async function consumeExample(handoffPath) {
  requireThat(isAbsolute(handoffPath), 'explicit absolute handoff path required');
  const { projectRoot, workspace } = workspaceForPathSync(dirname(handoffPath));
  const body = readUtf8ArtifactSync(handoffPath);
  requireThat(field(body, 'Installation') === workspace.installation_id, 'handoff belongs to another installation');
  const config = await resolvePathReference(projectRoot, '{roots.config}');
  const configStatus = existsSync(config) ? (JSON.parse(readUtf8ArtifactSync(config)), 'read') : 'missing; read-only example only';
  const taskPath = field(body, 'TASK'), reportPath = field(body, 'REPORT'), unresolvedPath = field(body, 'Unresolved TASK');
  const task = /^(.*)\/sessions\/([^/]+)\/([^/]+)\/TASK\.md$/.exec(taskPath);
  requireThat(task && reportPath === taskPath.replace(/TASK\.md$/, 'REPORT.md'), 'TASK/REPORT locators disagree');
  const read = path => readUtf8ArtifactSync(safeWorkPathSync(projectRoot, path, { mustExist: true, type: 'file' }));
  read(taskPath); const reportBody = read(reportPath); read(unresolvedPath);
  const validation = validateDispatch({ projectRoot, scopeRoot: task[1], session: task[2], task: task[3], stage: 'return' });
  requireThat(validation.errors.length === 0, validation.errors.join('\n'));
  const head = field(body, 'HEAD');
  requireThat(/^[a-f0-9]{40,64}$/.test(head), 'handoff requires an actual full HEAD');
  requireThat(execute(projectRoot, 'git', ['-c', 'core.fsmonitor=false', 'rev-parse', '--verify', 'HEAD']) === head, 'HEAD drift; reread original owner and baseline');
  const sourcePath = field(body, 'Source'), expected = field(body, 'Source text');
  requireThat(field(reportBody, 'Candidate source') === sourcePath && field(reportBody, 'Candidate text') === expected, 'candidate report differs from handoff source identity');
  // The operation is fixed here. Free-form commands in handoff/TASK/REPORT are never evaluated.
  const sourceFile = safeWorkPathSync(projectRoot, sourcePath, { mustExist: true, type: 'file' });
  const sourceText = readFileSync(sourceFile, 'utf8');
  requireThat(sourceText === expected || sourceText === `${expected}\n`, 'source drift; preserve the current file');
  execute(projectRoot, process.execPath, ['--check', sourceFile]);
  requireThat(readUtf8ArtifactSync(handoffPath) === body && read(reportPath) === reportBody && readFileSync(sourceFile, 'utf8') === sourceText, 'input changed during read-only validation');
  return { example: 'read-only handoff consumption', project_root: projectRoot, installation_id: workspace.installation_id, config: configStatus,
    task: taskPath, report: reportPath, source: { path: sourcePath, text: expected }, baseline_head: head,
    check: { command: 'node --check', path: sourcePath, exit_code: 0 },
    unresolved_writer: { task: unresolvedPath, disposition: 'preserve original owner; do not redispatch' },
    lead_acceptance: 'pending; structure and syntax checks do not accept the business task', writes: [], caveat: validation.caveat };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    requireThat(process.argv.length === 4 && process.argv[2] === '--handoff', 'Usage: node consume-handoff.mjs --handoff ABSOLUTE_HANDOFF');
    console.log(JSON.stringify(await consumeExample(process.argv[3]), null, 2));
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
