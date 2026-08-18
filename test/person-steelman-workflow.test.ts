import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cp, mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

const root = process.cwd();
const workRoot = path.join(root, 'template/workflows/person/S-steelman-deliberation');
const generator = path.join(root, '.agents/skills/speculo-write-workflows/scripts/generate-index.mjs');
const validator = path.join(workRoot, 'tools/validate-steelman-change.mjs');

function runNode(script: string, args: string[], cwd = root) {
  return spawnSync(process.execPath, [script, ...args], {
    cwd,
    encoding: 'utf8',
  });
}

function mapStaticPath(reference: string): string | null {
  const mappings: Array<[string, string]> = [
    ['{roots.config}', 'template/config.json'],
    ['{roots.speculo}', 'template'],
    ['{roots.state}', 'template/.speculo'],
    ['{roots.commands}', 'template/commands'],
    ['{roots.skills}', 'template/skills'],
    ['{roots.workflows}', 'template/workflows'],
  ];
  for (const [alias, target] of mappings) {
    if (!reference.startsWith(alias)) continue;
    if (alias === '{roots.state}') return null;
    const suffix = reference.slice(alias.length).replace(/^\//, '');
    return path.join(root, target, suffix);
  }
  return null;
}

async function missingStaticReferences(markdown: string): Promise<string[]> {
  const references = [...markdown.matchAll(/<Path>([^<]+)<\/Path>/g)].map((match) => match[1]);
  const missing: string[] = [];
  for (const reference of references) {
    const resolved = mapStaticPath(reference);
    if (!resolved) continue;
    try {
      await stat(resolved);
    } catch {
      missing.push(reference);
    }
  }
  return missing;
}

async function writeWorkEntry(
  workflowRoot: string,
  directory: string,
  name: string,
  description: string,
): Promise<void> {
  const directoryPath = path.join(workflowRoot, directory);
  await mkdir(directoryPath, { recursive: true });
  await writeFile(
    path.join(directoryPath, `${directory}.md`),
    `---\nid: demo/${directory.slice(2)}\ntype: workflow-entry\nworkflow: demo\nname: ${name}\ndescription: ${description}\nkeywords: [demo]\n---\n`,
  );
}

test('steelman work has a complete independent package and valid static references', async () => {
  const requiredFiles = [
    'S-steelman-deliberation.md',
    'deliberate.md',
    'judge.md',
    'evidence-gate.md',
    '_templates/steelman-dossier-template.md',
    '_templates/decision-template.md',
    'tools/validate-steelman-change.mjs',
  ];
  for (const relative of requiredFiles) {
    await readFile(path.join(workRoot, relative), 'utf8');
  }

  const entry = await readFile(path.join(workRoot, 'S-steelman-deliberation.md'), 'utf8');
  assert.match(entry, /^id: person\/steelman-deliberation$/m);
  assert.match(entry, /^type: workflow-entry$/m);
  assert.match(entry, /^workflow: person$/m);
  assert.match(entry, /result.*awaiting-user-answer.*completed/s);
  assert.match(entry, /最多向用户提出一个问题/);
  assert.match(entry, /保留未知顶层字段.*其他 work/m);
  assert.deepEqual(await missingStaticReferences(entry), []);

  const seed = JSON.parse(
    await readFile(path.join(root, 'template/workflows/person/_state/status.json'), 'utf8'),
  ) as { schema_version: number; workflow: string; active: unknown[] };
  assert.deepEqual(seed, { schema_version: 1, workflow: 'person', active: [] });

  const index = await readFile(path.join(root, 'template/workflows/person/INDEX.md'), 'utf8');
  assert.match(index, /\*\*M-mao-zedong-cognitive-os\*\*/);
  assert.match(index, /\*\*S-steelman-deliberation\*\*/);
  assert.doesNotMatch(index, /AUTO-INDEX-(?:START|END)/);
});

test('static-reference audit detects an injected missing work file', async () => {
  const entry = await readFile(path.join(workRoot, 'S-steelman-deliberation.md'), 'utf8');
  const broken = entry.replace(
    'person/S-steelman-deliberation/deliberate.md',
    'person/S-steelman-deliberation/missing-deliberate.md',
  );
  assert.deepEqual(await missingStaticReferences(broken), [
    '{roots.workflows}/person/S-steelman-deliberation/missing-deliberate.md',
  ]);
});

test('steelman validator self-check covers waiting, completion, and failure modes', () => {
  const result = runNode(validator, ['--self-check']);
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  assert.match(result.stdout, /PASS staged awaiting-answer fixture/);
  assert.match(result.stdout, /PASS awaiting-answer fixture/);
  assert.match(result.stdout, /PASS staged completed fixture/);
  assert.match(result.stdout, /PASS completed fixture/);
  assert.match(result.stdout, /PASS completed fixture with already-answered question/);
  assert.match(result.stdout, /PASS multi-option steelman fixture/);
  assert.match(result.stdout, /PASS rejects incomplete multi-option steelman/);
  assert.match(result.stdout, /PASS rejects multiple questions/);
  assert.match(result.stdout, /PASS rejects evasive judgment/);
});

test('whole-file workflow index generation is deterministic and detects staleness', async (t) => {
  const temp = await mkdtemp(path.join(os.tmpdir(), 'speculo-person-index-'));
  t.after(async () => rm(temp, { recursive: true, force: true }));
  const workflowRoot = path.join(temp, 'person');
  await cp(path.join(root, 'template/workflows/person'), workflowRoot, { recursive: true });

  const staleIndex = `---\nid: person/index\ntype: workflow-index\nworkflow: person\nauto_generated: true\n---\n\n# person — Work Index\n\n> stale\n`;
  await writeFile(path.join(workflowRoot, 'INDEX.md'), staleIndex);

  const stale = runNode(generator, [workflowRoot, '--check']);
  assert.equal(stale.status, 1);
  assert.match(stale.stderr, /STALE INDEX/);

  const generated = runNode(generator, [workflowRoot]);
  assert.equal(generated.status, 0, `${generated.stdout}\n${generated.stderr}`);
  const first = await readFile(path.join(workflowRoot, 'INDEX.md'), 'utf8');
  assert.match(first, /M-mao-zedong-cognitive-os[\s\S]*S-steelman-deliberation/);
  assert.doesNotMatch(first, /AUTO-INDEX-(?:START|END)/);

  const check = runNode(generator, [workflowRoot, '--check']);
  assert.equal(check.status, 0, `${check.stdout}\n${check.stderr}`);
  const second = await readFile(path.join(workflowRoot, 'INDEX.md'), 'utf8');
  assert.equal(second, first);
});

test('marker-mode generation preserves handwritten INDEX content and sorts works', async (t) => {
  const temp = await mkdtemp(path.join(os.tmpdir(), 'speculo-marker-index-'));
  t.after(async () => rm(temp, { recursive: true, force: true }));
  const workflowRoot = path.join(temp, 'demo');
  await mkdir(workflowRoot, { recursive: true });
  await writeFile(
    path.join(workflowRoot, 'INDEX.md'),
    `---\nid: demo\ntype: workflow\nworkflow: demo\nname: Demo\ndescription: Demo workflow\nkeywords: [demo]\n---\n\n# Demo\n\nHandwritten before.\n\n<!-- AUTO-INDEX-START -->\n\nstale\n\n<!-- AUTO-INDEX-END -->\n\nHandwritten after.\n`,
  );
  await writeWorkEntry(workflowRoot, 'B-beta', 'Beta', 'Second');
  await writeWorkEntry(workflowRoot, 'A-alpha', 'Alpha', 'First');

  const generated = runNode(generator, [workflowRoot]);
  assert.equal(generated.status, 0, `${generated.stdout}\n${generated.stderr}`);
  const index = await readFile(path.join(workflowRoot, 'INDEX.md'), 'utf8');
  assert.match(index, /Handwritten before\./);
  assert.match(index, /Handwritten after\./);
  assert.match(index, /A-alpha[\s\S]*B-beta/);
  assert.equal((index.match(/AUTO-INDEX-START/g) ?? []).length, 1);
  assert.equal((index.match(/AUTO-INDEX-END/g) ?? []).length, 1);

  const check = runNode(generator, [workflowRoot, '--check']);
  assert.equal(check.status, 0, `${check.stdout}\n${check.stderr}`);
});
