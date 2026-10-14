import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { resolveReviewScope } from '../review-scope.mjs';

const tool = fileURLToPath(new URL('../review-scope.mjs', import.meta.url));
function fixture(t) {
  const parent = mkdtempSync(join(tmpdir(), 'specdev-source-review-'));
  t.after(() => rmSync(parent, { recursive: true, force: true }));
  const root = join(parent, 'project'); mkdirSync(root);
  mkdirSync(join(root, 'src')); writeFileSync(join(root, 'src/shipping.mjs'), 'export const fee = 500;\n');
  return { root, parent };
}
function manifest(root, relative = '') {
  return readdirSync(join(root, relative), { withFileTypes: true }).flatMap(entry => {
    const path = relative ? `${relative}/${entry.name}` : entry.name;
    return entry.isDirectory() ? manifest(root, path) : [[path, createHash('sha256').update(readFileSync(join(root, path))).digest('hex')]];
  });
}
function cli(root, args) {
  return spawnSync(process.execPath, ['--input-type=module', '-e', `import { reviewScopeCLI } from ${JSON.stringify(new URL('../review-scope.mjs', import.meta.url).href)}; reviewScopeCLI(process.argv.slice(1));`, '--', '--repo', root, ...args], {
    encoding: 'utf8', env: { ...process.env, PATH: '' }, cwd: dirname(tool), timeout: 10000,
  });
}
test('file snapshot works without Git or workspace and leaves the full project unchanged', t => {
  const {root, parent} = fixture(t);
  // An outer repository marker must not be consulted or inherited.
  mkdirSync(join(parent, '.git')); writeFileSync(join(parent, '.git/HEAD'), 'synthetic outer marker\n');
  const before = manifest(parent);
  const result = cli(root, ['--mode', 'source-files', '--file', 'src/shipping.mjs']);
  assert.equal(result.status, 0, result.stderr);
  const scope = JSON.parse(result.stdout);
  assert.deepEqual(scope.source_snapshot, [{path:'src/shipping.mjs', sha256:createHash('sha256').update(readFileSync(join(root, 'src/shipping.mjs'))).digest('hex'), bytes:24}]);
  assert.equal(scope.outcome, 'source-snapshot');
  for (const key of ['fixed_point','head_sha','base_sha','commit_log','approved']) assert.equal(Object.hasOwn(scope, key), false);
  assert.deepEqual(manifest(parent), before);
});
test('source-file paths are literal and changed bytes invalidate their digest', t => {
  const {root} = fixture(t), path = 'src/[literal] $(touch injected).mjs';
  writeFileSync(join(root, path), 'first\n');
  const first = cli(root, ['--mode','source-files','--file',path,'--file','src/shipping.mjs']);
  assert.equal(first.status, 0, first.stderr); assert.equal(JSON.parse(first.stdout).source_snapshot.length, 2);
  writeFileSync(join(root, path), 'second\n');
  const next = resolveReviewScope({repo:root, mode:'source-files', files:[path]});
  assert.notEqual(JSON.parse(first.stdout).source_snapshot[0].sha256, next.source_snapshot[0].sha256);
  assert.deepEqual(readdirSync(root), ['src']);
});
test('empty, ambiguous, duplicate, directory and escaping source scopes fail without writes', t => {
  const {root, parent} = fixture(t); writeFileSync(join(parent,'outside'), 'outside\n');
  symlinkSync(join(parent,'outside'), join(root,'escape'));
  symlinkSync('src/shipping.mjs', join(root,'alias'));
  const before = manifest(parent);
  for (const files of [[], [''], ['../outside'], ['/outside'], ['src/../src/shipping.mjs'], ['src\\shipping.mjs'], ['src'], ['missing'], ['escape'], ['src/shipping.mjs','src/shipping.mjs'], ['alias','src/shipping.mjs']]) {
    assert.throws(() => resolveReviewScope({repo:root, mode:'source-files', files}), `accepted ${JSON.stringify(files)}`);
  }
  const alias = resolveReviewScope({repo:root, mode:'source-files', files:['alias']});
  assert.equal(alias.source_snapshot[0].resolved_path, 'src/shipping.mjs');
  assert.deepEqual(manifest(parent), before);
});
test('source-files does not weaken Git-mode input admission or silently change modes', t => {
  const {root} = fixture(t);
  for (const extra of [{base:'HEAD'}, {head:'HEAD'}, {commit:'HEAD'}, {parent:1}]) assert.throws(() => resolveReviewScope({repo:root,mode:'source-files',files:['src/shipping.mjs'],...extra}), /does not accept Git/);
  assert.throws(() => resolveReviewScope({repo:root,mode:'range',files:['src/shipping.mjs'],base:'HEAD',head:'HEAD'}), /requires source-files/);
  for (const args of [
    ['--mode','source-files'], ['--mode','source-files','--file','src/shipping.mjs','--repo',root],
    ['--mode','source-files','--file','src/shipping.mjs','--file','src/shipping.mjs'],
    ['--mode','source-files','--unknown','x'], ['--mode','range','--base','HEAD','--head','HEAD'],
  ]) assert.notEqual(cli(root,args).status,0,JSON.stringify(args));
});
