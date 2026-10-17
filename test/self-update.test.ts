import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { it } from 'node:test';
import { createServer, get as httpGet } from 'node:http';
import type { get as httpsGet } from 'node:https';
import { mkdtemp, mkdir, readFile, writeFile, rm, chmod, symlink, rename, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, delimiter } from 'node:path';
import { fetchRelease, isNewerRelease } from '../src/update-check.js';
import { offerUpdate, consumeResumeMarker, shouldCheckUpdate, type UpdateChoice, type UpdateOptions } from '../src/update-flow.js';
import { inspectSelfInstall } from '../src/self-update.js';
import { atomicWriteJson } from '../src/update-state.js';
import { runProcess } from '../src/update-process.js';
import { setTimeout as delay } from 'node:timers/promises';

it('compares stable SemVer releases without downgrading or accepting malformed versions', () => {
  for (const [local, latest, expected] of [
    ['1.9.0', '1.10.0', true], ['2.0.0-rc.1', '2.0.0', true],
    ['2.0.0', '2.0.0', false], ['3.0.0', '2.0.0', false],
    ['1.0.0', '2.0.0-beta.1', false], ['broken', '2.0.0', false],
    ['1.0.0', '2.0.0garbage', false], ['1.0.0+build.1', '1.0.0+build.2', false],
  ] as const) assert.equal(isNewerRelease(local, latest), expected);
});

it('bounds the complete HTTP response, including a trickling body, and ignores failed metadata', async () => {
  let mode = 'valid';
  const server = createServer((_req, res) => {
    if (mode === 'status') { res.writeHead(503); res.end(); }
    else if (mode === 'large') res.end(' '.repeat(65537));
    else if (mode === 'bad') res.end('{');
    else if (mode === 'prerelease') res.end('{"version":"2.0.0-beta.1"}');
    else if (mode === 'trickle') {
      const timer = setInterval(() => res.write(' '), 5);
      res.on('close', () => clearInterval(timer));
    } else res.end('{"version":"2.0.0","engines":{"node":">=22"}}');
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address() as { port: number };
  const request = ((_url: unknown, callback: Parameters<typeof httpGet>[1]) => httpGet(`http://127.0.0.1:${address.port}`, callback)) as typeof httpsGet;
  try {
    assert.deepEqual(await fetchRelease('@example/tool', { request }), { version: '2.0.0', node: '>=22' });
    for (mode of ['status', 'large', 'bad', 'prerelease', 'trickle']) {
      const started = Date.now();
      assert.equal(await fetchRelease('@example/tool', { request, timeoutMs: 80 }), null, mode);
      assert.ok(Date.now() - started < 1500, 'deadline must include body reads');
    }
  } finally {
    server.closeAllConnections();
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
});

async function flowFixture(work: (options: UpdateOptions, messages: string[], counts: { prompts: number; installs: number; resumes: number }, setChoice: (choice: UpdateChoice) => void) => Promise<void>) {
  const dir = await mkdtemp(join(tmpdir(), 'update-state-'));
  let choice: UpdateChoice = 'skip';
  const messages: string[] = [];
  const counts = { prompts: 0, installs: 0, resumes: 0 };
  const options: UpdateOptions = {
    name: '@example/tool', local: '1.0.0', prefix: 'FASTCLI', language: 'en', env: { EXAMPLE: 'retained' },
    statePath: join(dir, 'state.json'), writeState: atomicWriteJson,
    fetch: async () => ({ version: '2.0.0', node: '>=22' }),
    ui: {
      choose: async (_message, choices) => { counts.prompts++; assert.deepEqual(choices.map(c => c.value), ['update', 'skip', 'ignore']); return choice; },
      message: (_kind, message) => messages.push(message),
    },
    inspect: async () => ({
      nodeVersion: process.versions.node,
      install: async version => { assert.equal(version, '2.0.0'); counts.installs++; return 0; },
      verify: async () => true,
      resume: async env => { assert.equal(env.EXAMPLE, 'retained'); assert.equal(env.FASTCLI_UPDATE_RESUME, '2.0.0'); counts.resumes++; return 17; },
    }),
  };
  try { await work(options, messages, counts, value => { choice = value; }); }
  finally { await rm(dir, { recursive: true, force: true }); }
}

it('skip is temporary; ignore persists across runs and only a greater release prompts again', async () => {
  await flowFixture(async (o, _messages, counts, choose) => {
    assert.equal(await offerUpdate(o), undefined);
    assert.equal(await offerUpdate(o), undefined);
    assert.equal(counts.prompts, 2);
    choose('ignore');
    await offerUpdate(o);
    assert.equal(JSON.parse(await readFile(o.statePath, 'utf8')).ignoredVersion, '2.0.0');
    if (process.platform !== 'win32') assert.equal((await stat(o.statePath)).mode & 0o777, 0o600);
    await offerUpdate({ ...o });
    await offerUpdate({ ...o, fetch: async () => ({ version: '1.9.0' }) });
    assert.equal(counts.prompts, 3);
    await offerUpdate({ ...o, fetch: async () => ({ version: '2.0.1' }) });
    assert.equal(counts.prompts, 4);
    assert.equal(counts.installs, 0);
  });
});

it('missing metadata and current versions are silent; damaged state and write failures do not block use', async () => {
  await flowFixture(async (o, messages, counts, choose) => {
    for (const fetch of [async () => null, async () => ({ version: '1.0.0' }), async () => { throw Error('offline'); }]) {
      assert.equal(await offerUpdate({ ...o, fetch }), undefined);
    }
    assert.equal(counts.prompts, 0);
    await writeFile(o.statePath, '{');
    choose('ignore');
    assert.equal(await offerUpdate({ ...o, writeState: async () => { throw Error('readonly'); } }), undefined);
    assert.match(messages.join('\n'), /this time only/);
    assert.equal(await readFile(o.statePath, 'utf8'), '{');
  });
});

it('only the chosen update installs, verifies and resumes; failures and incompatible engines stop execution', async () => {
  await flowFixture(async (o, _messages, counts, choose) => {
    choose('update');
    assert.equal(await offerUpdate(o), 17);
    assert.deepEqual(counts, { prompts: 1, installs: 1, resumes: 1 });
    assert.equal(await offerUpdate({ ...o, fetch: async () => ({ version: '2.0.0', node: '>=999' }) }), 1);
    const base = (await o.inspect())!;
    for (const code of [1, 130, 143]) {
      assert.equal(await offerUpdate({ ...o, inspect: async () => ({ ...base, install: async () => code }) }), code);
    }
    assert.equal(await offerUpdate({ ...o, inspect: async () => ({ ...base, verify: async () => false }) }), 1);
    assert.equal(counts.resumes, 1);
  });
});

it('unmanaged installations only get guidance; cancelling the prompt never installs', async () => {
  await flowFixture(async (o, messages, counts) => {
    assert.equal(await offerUpdate({ ...o, inspect: async () => undefined }), undefined);
    assert.match(messages.join('\n'), /original installation method/);
    assert.equal(counts.prompts, 0);
    await assert.rejects(offerUpdate({ ...o, ui: { ...o.ui, choose: async () => { throw Error('cancel'); } } }), /cancel/);
    assert.equal(counts.installs, 0);
  });
});

it('gates CI and non-interactive checks and consumes the resume marker without altering other environment values', () => {
  assert.equal(shouldCheckUpdate({}, 'FASTCLI', true), true);
  for (const env of [{ CI: '1' }, { CI: 'true' }, { FASTCLI_NO_UPDATE_CHECK: '1' }]) assert.equal(shouldCheckUpdate(env, 'FASTCLI', true), false);
  assert.equal(shouldCheckUpdate({}, 'FASTCLI', false), false);
  const env = { FASTCLI_UPDATE_RESUME: '2.0.0', KEEP: 'yes' };
  assert.equal(consumeResumeMarker(env, 'FASTCLI', '2.0.0'), true);
  assert.deepEqual(env, { KEEP: 'yes' });
  assert.equal(consumeResumeMarker({ FASTCLI_UPDATE_RESUME: 'old' }, 'FASTCLI', '2.0.0'), false);
});

it('cancelling an npm-style operation stops the whole child tree', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'update-cancel-'));
  const ready = join(dir, 'ready.json');
  const leaf = `require('fs').writeFileSync(${JSON.stringify(ready)},JSON.stringify([process.ppid,process.pid]));setInterval(()=>{},1000);`;
  const parent = `require('child_process').spawn(process.execPath,['-e',${JSON.stringify(leaf)}],{stdio:'inherit'});setInterval(()=>{},1000);`;
  const before = new Set(process.listeners('SIGTERM'));
  const result = runProcess({ file: process.execPath, args: ['-e', parent] }, { terminateTree: true });
  const cancel = process.listeners('SIGTERM').find(handler => !before.has(handler));
  let pids: number[] = [];
  try {
    const deadline = Date.now() + 5000;
    while (Date.now() < deadline) {
      try { pids = JSON.parse(await readFile(ready, 'utf8')); break; } catch { await delay(20); }
    }
    assert.equal(pids.length, 2);
    assert.ok(cancel);
    cancel('SIGTERM');
    assert.equal((await result).code, 143);
    for (const pid of pids) {
      // Descendants can outlive the parent's close event while the OS reaps them.
      // A zombie has already stopped and must not count as a running process.
      const exitedBy = Date.now() + 2000;
      let alive = true;
      while (alive && Date.now() < exitedBy) {
        try {
          process.kill(pid, 0);
          if (process.platform === 'linux') {
            alive = !(await readFile(`/proc/${pid}/stat`, 'utf8')).split(') ')[1]?.startsWith('Z');
          } else if (process.platform === 'darwin') {
            const status = execFileSync('/bin/ps', ['-o', 'stat=', '-p', String(pid)], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
            alive = status !== '' && !status.startsWith('Z');
          }
        } catch (error) {
          const failure = error as NodeJS.ErrnoException & { status?: number };
          if (failure.code !== 'ESRCH' && failure.code !== 'ENOENT' && failure.status !== 1) throw error;
          alive = false;
        }
        if (alive) await delay(20);
      }
      assert.equal(alive, false, `child ${pid} must stop after cancellation`);
    }
  } finally {
    cancel?.('SIGTERM');
    await result;
    await rm(dir, { recursive: true, force: true });
  }
});

it('verifies a real temporary npm installation and resumes exactly once with literal arguments and cwd', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'self update '));
  const prefix = join(dir, 'npm prefix');
  const root = process.platform === 'win32' ? join(prefix, 'node_modules') : join(prefix, 'lib/node_modules');
  const packageRoot = join(root, '@example/tool');
  const bin = process.platform === 'win32' ? prefix : join(prefix, 'bin');
  const npmBin = join(dir, 'npm-bin');
  const record = join(dir, 'resume.json');
  const log = join(dir, 'npm.jsonl');
  const entry = join(packageRoot, 'cli.cjs');
  const launcher = join(bin, process.platform === 'win32' ? 'example.cmd' : 'example');
  const argv = ['--message', '中文 space', '$(literal)', '"quoted"', '--version'];
  await mkdir(packageRoot, { recursive: true }); await mkdir(bin, { recursive: true }); await mkdir(npmBin);
  await writeFile(join(packageRoot, 'package.json'), JSON.stringify({ name: '@example/tool', version: '1.0.0', bin: { example: 'cli.cjs' } }));
  await writeFile(entry, `#!${process.execPath}\nrequire('fs').writeFileSync(${JSON.stringify(record)},JSON.stringify({args:process.argv.slice(2),cwd:process.cwd(),keep:process.env.KEEP,marker:process.env.FASTCLI_UPDATE_RESUME}));process.exitCode=19;\n`);
  await chmod(entry, 0o755);
  if (process.platform === 'win32') await writeFile(launcher, `@ECHO off\r\nSET "dp0=%~dp0"\r\n"${process.execPath}" "%dp0%\\node_modules\\@example\\tool\\cli.cjs" %*\r\n`);
  else await symlink(entry, launcher);
  const npmScript = join(npmBin, 'npm.cjs');
  await writeFile(npmScript, `
const fs=require('fs'), args=process.argv.slice(2);
fs.appendFileSync(${JSON.stringify(log)},JSON.stringify(args)+'\\n');
if(args[0]==='version') console.log(JSON.stringify({npm:'11.16.0',node:process.versions.node}));
else if(args[0]==='prefix') console.log(${JSON.stringify(prefix)});
else if(args[0]==='root') console.log(${JSON.stringify(root)});
else if(args[0]==='install') {
  if(process.env.npm_config_prefix!==${JSON.stringify(prefix)}||args.join('|')!=='install|-g|@example/tool@2.0.0') process.exit(98);
  const path=${JSON.stringify(join(packageRoot, 'package.json'))}, p=JSON.parse(fs.readFileSync(path));p.version='2.0.0';fs.writeFileSync(path,JSON.stringify(p));
} else process.exit(99);
`);
  const npmLauncher = join(npmBin, process.platform === 'win32' ? 'npm.cmd' : 'npm');
  await writeFile(npmLauncher, process.platform === 'win32' ? `@echo off\r\n"${process.execPath}" "${npmScript}" %*\r\n` : `#!/bin/sh\nexec '${process.execPath}' '${npmScript}' "$@"\n`);
  await chmod(npmLauncher, 0o755);
  const env = { ...process.env, PATH: `${npmBin}${delimiter}${dirname(process.execPath)}`, KEEP: 'kept' };
  try {
    const options = { packageRoot, name: '@example/tool', executable: 'example', argv, env };
    const install = await inspectSelfInstall(options);
    assert.ok(install);
    assert.equal(await install.verify('2.0.0'), false);
    assert.equal(await install.install('2.0.0'), 0);
    // A new release may legitimately move its bin; resume the freshly verified entry.
    const nextEntry = join(packageRoot, 'next.cjs');
    await rename(entry, nextEntry);
    await writeFile(join(packageRoot, 'package.json'), JSON.stringify({ name: '@example/tool', version: '2.0.0', bin: { example: 'next.cjs' } }));
    await rm(launcher);
    if (process.platform === 'win32') await writeFile(launcher, `@ECHO off\r\nSET "dp0=%~dp0"\r\n"${process.execPath}" "%dp0%\\node_modules\\@example\\tool\\next.cjs" %*\r\n`);
    else await symlink(nextEntry, launcher);
    assert.equal(await install.verify('2.0.0'), true);
    assert.equal(await install.resume({ ...env, FASTCLI_UPDATE_RESUME: '2.0.0' }), 19);
    assert.deepEqual(JSON.parse(await readFile(record, 'utf8')), { args: argv, cwd: process.cwd(), keep: 'kept', marker: '2.0.0' });
    const events = (await readFile(log, 'utf8')).trim().split('\n').map(line => JSON.parse(line));
    assert.equal(events.filter(args => args[0] === 'install').length, 1);
    assert.equal(await inspectSelfInstall({ ...options, packageRoot: dir }), undefined);
    await rm(launcher); await writeFile(launcher, 'foreign');
    assert.equal(await inspectSelfInstall(options), undefined);
    assert.equal(await install.install('2.0.0'), 1, 'ownership is checked again immediately before mutation');
    const linked = join(dir, 'linked-source');
    await rename(packageRoot, linked);
    await symlink(linked, packageRoot, process.platform === 'win32' ? 'junction' : 'dir');
    assert.equal(await inspectSelfInstall({ ...options, packageRoot: linked }), undefined, 'linked packages are not npm-owned installations');
  } finally { await rm(dir, { recursive: true, force: true }); }
});
