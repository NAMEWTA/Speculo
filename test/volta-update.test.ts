import assert from 'node:assert/strict';
import { it } from 'node:test';
import { chmod, mkdir, mkdtemp, readFile, realpath, rename, rm, symlink, writeFile } from 'node:fs/promises';
import { delimiter, dirname, join, relative } from 'node:path';
import { tmpdir } from 'node:os';
import { inspectSelfInstall } from '../src/self-update.js';

async function fakeTool(directory: string, name: string, body: string): Promise<string> {
  await mkdir(directory, { recursive: true });
  const script = join(directory, `${name}.cjs`);
  const launcher = join(directory, process.platform === 'win32' ? `${name}.cmd` : name);
  await writeFile(script, body);
  await writeFile(launcher, process.platform === 'win32'
    ? `@echo off\r\n"${process.execPath}" "${script}" %*\r\n`
    : `#!/bin/sh\nexec '${process.execPath.replaceAll("'", "'\\''")}' '${script.replaceAll("'", "'\\''")}' "$@"\n`);
  await chmod(launcher, 0o755);
  return launcher;
}

async function voltaFixture() {
  const dir = await mkdtemp(join(tmpdir(), 'volta self update '));
  const home = join(dir, process.platform === 'win32' ? 'Volta' : '.volta');
  const prefix = join(home, 'tools', 'image', 'packages', '@example/tool');
  const root = process.platform === 'win32' ? join(prefix, 'node_modules') : join(prefix, 'lib', 'node_modules');
  const packageRoot = join(root, '@example/tool');
  const bin = process.platform === 'win32' ? prefix : join(prefix, 'bin');
  const launcher = join(bin, process.platform === 'win32' ? 'example.cmd' : 'example');
  const record = join(dir, 'resume.json');
  const log = join(dir, 'volta.jsonl');
  const foreign = join(dir, 'foreign-selection');
  const entry = join(packageRoot, 'cli.cjs');
  const manifest = join(packageRoot, 'package.json');
  await mkdir(packageRoot, { recursive: true });
  await mkdir(bin, { recursive: true });
  const writeLauncher = async (target: string) => {
    await rm(launcher, { force: true });
    if (process.platform === 'win32') await writeFile(launcher, `@ECHO off\r\nSET "dp0=%~dp0"\r\n"${process.execPath}" "%dp0%\\${relative(bin, target)}" %*\r\n`);
    else await symlink(target, launcher);
  };
  await writeFile(manifest, JSON.stringify({ name: '@example/tool', version: '1.0.0', bin: { example: 'cli.cjs' } }));
  await writeFile(entry, `#!${process.execPath}\nrequire('fs').writeFileSync(${JSON.stringify(record)}, JSON.stringify({entry:require('node:fs').realpathSync(__filename),args:process.argv.slice(2),cwd:process.cwd(),keep:process.env.KEEP,marker:process.env.FASTCLI_UPDATE_RESUME}));process.exitCode=19;\n`);
  await chmod(entry, 0o755);
  await writeLauncher(entry);
  const volta = await fakeTool(join(home, 'bin'), 'volta', `
const fs=require('node:fs'), args=process.argv.slice(2);
fs.appendFileSync(${JSON.stringify(log)}, JSON.stringify({args,cwd:process.cwd(),home:process.env.VOLTA_HOME,prefix:process.env.npm_config_prefix})+'\\n');
if(args[0]==='which' && args[1]==='example' && args.length===2) console.log(fs.existsSync(${JSON.stringify(foreign)}) ? ${JSON.stringify(entry + '.foreign')} : ${JSON.stringify(launcher)});
else if(JSON.stringify(args)===JSON.stringify(['run','--node',${JSON.stringify(process.versions.node)},'--bundled-npm','npm','install','--global','@example/tool@2.0.0'])) {
  if(process.env.VOLTA_HOME!==${JSON.stringify(home)} || process.env.npm_config_prefix!==undefined || process.env.NPM_CONFIG_PREFIX!==undefined) process.exit(98);
  const path=${JSON.stringify(manifest)}, value=JSON.parse(fs.readFileSync(path)); value.version='2.0.0'; fs.writeFileSync(path,JSON.stringify(value));
} else process.exit(99);
`);
  const fakeBin = join(dir, 'bin');
  await fakeTool(fakeBin, 'npm', 'process.exit(99);');
  const env: NodeJS.ProcessEnv = { ...process.env, VOLTA_HOME: home, HOME: dir, USERPROFILE: dir, LOCALAPPDATA: dir,
    PATH: `${fakeBin}${delimiter}${dirname(process.execPath)}`, KEEP: 'kept', npm_config_prefix: join(dir, 'unrelated npm prefix'), NPM_CONFIG_PREFIX: join(dir, 'another npm prefix') };
  delete env.VOLTA_BYPASS;
  const options = { packageRoot, name: '@example/tool', executable: 'example', argv: ['中文 space', '$(literal)', '"quoted"', '--version'], env };
  return { dir, home, prefix, root, fakeBin, packageRoot, launcher, entry, manifest, record, log, foreign, volta, options, writeLauncher,
    cleanup: () => rm(dir, { recursive: true, force: true }) };
}

it('updates a verified Volta installation with the existing Node runtime and resumes the verified new entry', async () => {
  const f = await voltaFixture();
  try {
    const install = await inspectSelfInstall(f.options);
    assert.ok(install);
    assert.match(install.command('2.0.0'), /run --node .* --bundled-npm npm install --global @example\/tool@2\.0\.0/);
    assert.equal(await install.verify('2.0.0'), false);
    assert.equal(await install.install('2.0.0'), 0);
    const next = join(f.packageRoot, 'next.cjs');
    await rename(f.entry, next);
    await writeFile(f.manifest, JSON.stringify({ name: '@example/tool', version: '2.0.0', bin: { example: 'next.cjs' } }));
    await f.writeLauncher(next);
    assert.equal(await install.verify('2.0.0'), true);
    assert.equal(await install.resume({ ...f.options.env, FASTCLI_UPDATE_RESUME: '2.0.0' }), 19);
    assert.deepEqual(JSON.parse(await readFile(f.record, 'utf8')), { entry: await realpath(next), args: f.options.argv, cwd: process.cwd(), keep: 'kept', marker: '2.0.0' });
    const events = (await readFile(f.log, 'utf8')).trim().split('\n').map(line => JSON.parse(line));
    const mutations = events.filter(event => event.args[0] === 'run');
    assert.deepEqual(mutations, [{ args: ['run', '--node', process.versions.node, '--bundled-npm', 'npm', 'install', '--global', '@example/tool@2.0.0'], cwd: process.cwd(), home: f.home }]);
  } finally { await f.cleanup(); }
});

it('rejects foreign Volta selections, modified launchers and linked sources before updating', async () => {
  const f = await voltaFixture();
  try {
    const install = await inspectSelfInstall(f.options);
    assert.ok(install);
    assert.equal(await inspectSelfInstall({ ...f.options, packageRoot: f.dir }), undefined);
    await writeFile(f.foreign, 'foreign');
    assert.equal(await install.install('2.0.0'), 1);
    assert.equal(await install.verify('2.0.0'), false);
    assert.equal(await inspectSelfInstall(f.options), undefined);
    await rm(f.foreign);
    await rm(f.launcher);
    await writeFile(f.launcher, 'foreign');
    assert.equal(await install.install('2.0.0'), 1);
    assert.equal(await inspectSelfInstall(f.options), undefined);
    await f.writeLauncher(f.entry);
    const linked = join(f.dir, 'linked source');
    await rename(f.packageRoot, linked);
    await symlink(linked, f.packageRoot, process.platform === 'win32' ? 'junction' : 'dir');
    assert.equal(await inspectSelfInstall({ ...f.options, packageRoot: linked }), undefined);
    const events = (await readFile(f.log, 'utf8')).trim().split('\n').map(line => JSON.parse(line));
    assert.equal(events.filter(event => event.args[0] === 'run').length, 0);
  } finally { await f.cleanup(); }
});

it('recognizes the default Volta home and does not use a bypassed Volta installation', async () => {
  const f = await voltaFixture();
  try {
    const env = { ...f.options.env };
    delete env.VOLTA_HOME;
    assert.ok(await inspectSelfInstall({ ...f.options, env }));
    assert.equal(await inspectSelfInstall({ ...f.options, env: { ...env, VOLTA_BYPASS: '1' } }), undefined);
  } finally { await f.cleanup(); }
});

it('does not fall back to direct npm updates for an unverified Volta package even when npm reports the same prefix', async () => {
  const f = await voltaFixture();
  try {
    await fakeTool(f.fakeBin, 'npm', `
const args=process.argv.slice(2);
if(args[0]==='version') console.log(JSON.stringify({npm:'11.16.0',node:process.versions.node}));
else if(args[0]==='prefix') console.log(${JSON.stringify(f.prefix)});
else if(args[0]==='root') console.log(${JSON.stringify(f.root)});
else process.exit(99);
`);
    assert.equal(await inspectSelfInstall({ ...f.options, env: { ...f.options.env, VOLTA_BYPASS: '1' } }), undefined);
    await writeFile(f.foreign, 'foreign');
    assert.equal(await inspectSelfInstall(f.options), undefined);
  } finally { await f.cleanup(); }
});
