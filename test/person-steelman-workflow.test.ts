import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cp, mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

const root = process.cwd();
const workRoot = path.join(root, 'template/workflows/person/person-s-steelman-deliberation');
const generator = path.join(root, '.agents/skills/speculo-write-workflows/scripts/generate-index.mjs');
const validator = path.join(workRoot, 'scripts/validate-steelman-change.mjs');

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

test('steelman work has a complete independent package and valid static references', async () => {
  const requiredFiles = [
    'SKILL.md',
    'references/deliberate.md',
    'references/judge.md',
    'references/evidence-gate.md',
    'references/state-and-publication.md',
    'assets/templates/steelman-dossier-template.md',
    'assets/templates/decision-template.md',
    'scripts/validate-steelman-change.mjs',
  ];
  for (const relative of requiredFiles) {
    await readFile(path.join(workRoot, relative), 'utf8');
  }

  const entry = await readFile(path.join(workRoot, 'SKILL.md'), 'utf8');
  assert.match(entry, /^  speculo-id: person\/steelman-deliberation$/m);
  assert.match(entry, /^  speculo-kind: work-skill$/m);
  assert.match(entry, /^  speculo-domain: person$/m);
  assert.match(entry, /result.*awaiting-user-answer.*completed/s);
  assert.match(entry, /最多向用户提出一个问题/);
  assert.match(entry, /新建、恢复或状态写入前读取.*references\/state-and-publication\.md/);
  const publication = await readFile(path.join(workRoot, 'references/state-and-publication.md'), 'utf8');
  assert.match(publication, /保留未知顶层字段.*其他 work/m);
  assert.match(publication, /先原子替换正式 dossier，再原子替换 change/);
  assert.match(publication, /校验失败.*保留可恢复的 `judging`/);
  assert.deepEqual(await missingStaticReferences(publication), []);
  assert.deepEqual(await missingStaticReferences(entry), []);

  const seed = JSON.parse(
    await readFile(path.join(root, 'template/workflows/person/_state/status.json'), 'utf8'),
  ) as { schema_version: number; workflow: string; active: unknown[] };
  assert.deepEqual(seed, { schema_version: 1, workflow: 'person', active: [] });

  const index = await readFile(path.join(root, 'template/workflows/person/SKILL.md'), 'utf8');
  assert.match(index, /person\/mao-zedong-cognitive-os/);
  assert.match(index, /person\/steelman-deliberation/);
  assert.match(index, /AUTO-INDEX-(?:START|END)/);
});

test('static-reference audit detects an injected missing work file', async () => {
  const entry = await readFile(path.join(workRoot, 'SKILL.md'), 'utf8');
  const broken = entry.replace(
    'person/person-s-steelman-deliberation/references/deliberate.md',
    'person/person-s-steelman-deliberation/missing-deliberate.md',
  );
  assert.deepEqual(await missingStaticReferences(broken), [
    '{roots.workflows}/person/person-s-steelman-deliberation/missing-deliberate.md',
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

test('domain routing regeneration preserves source YAML and handwritten content', async (t) => {
 const temp=await mkdtemp(path.join(os.tmpdir(),'speculo-domain-index-'));t.after(()=>rm(temp,{recursive:true,force:true}));
 const workflowRoot=path.join(temp,'person');await cp(path.join(root,'template/workflows/person'),workflowRoot,{recursive:true});
 const file=path.join(workflowRoot,'SKILL.md'),original=await readFile(file,'utf8');
 const stale=original.replace(/<!-- AUTO-INDEX-START -->[\s\S]*?<!-- AUTO-INDEX-END -->/,'<!-- AUTO-INDEX-START -->\nstale\n<!-- AUTO-INDEX-END -->');
 await writeFile(file,stale);const check=runNode(generator,[workflowRoot,'--check']);assert.equal(check.status,1);assert.match(check.stderr,/STALE domain routing/);assert.equal(await readFile(file,'utf8'),stale);
 const generated=runNode(generator,[workflowRoot]);assert.equal(generated.status,0,generated.stderr);const next=await readFile(file,'utf8');assert.equal(next,original.replaceAll('\r\n','\n'));
 assert.equal(runNode(generator,[workflowRoot,'--check']).status,0);assert.equal(await readFile(file,'utf8'),next);
});
test('domain generation rejects invalid identity and unsafe registry entries without writing',async(t)=>{
 const temp=await mkdtemp(path.join(os.tmpdir(),'speculo-domain-invalid-'));t.after(()=>rm(temp,{recursive:true,force:true}));
 const workflowRoot=path.join(temp,'person');await cp(path.join(root,'template/workflows/person'),workflowRoot,{recursive:true});
 const file=path.join(workflowRoot,'SKILL.md'),original=await readFile(file,'utf8'),manifestPath=path.join(workflowRoot,'manifest.json');
 const manifest=JSON.parse(await readFile(manifestPath,'utf8'));manifest.works=['../outside/SKILL.md'];await writeFile(manifestPath,JSON.stringify(manifest));
 assert.equal(runNode(generator,[workflowRoot]).status,1);assert.equal(await readFile(file,'utf8'),original);
});
