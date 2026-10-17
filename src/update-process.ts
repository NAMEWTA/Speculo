import spawn from 'cross-spawn';
import { spawn as nativeSpawn, type ChildProcess } from 'node:child_process';
import { join } from 'node:path';
import type { ProbeResult, ProcessInvocation, ProcessResult } from './update-types.js';

export function formatInvocation(invocation: ProcessInvocation): string {
  return [invocation.file, ...invocation.args].map(value => /^[\w@./:=+,-]+$/.test(value) ? value : JSON.stringify(value)).join(' ');
}

function signalCode(signal: NodeJS.Signals | null | undefined): number {
  return signal === 'SIGINT' ? 130 : signal === 'SIGTERM' ? 143 : 128;
}

export class ProcessCancelledError extends Error {
  readonly code: number;
  constructor(readonly signal: NodeJS.Signals, readonly cleanupError?: string) {
    super(`Cancelled by ${signal}${cleanupError ? `; ${cleanupError}` : ''}`);
    this.code = cleanupError ? 1 : signalCode(signal);
  }
}

/** Executes literal argv with inherited terminal streams. Returns failures instead of throwing. */
export async function runProcess(invocation: ProcessInvocation, options: { terminateTree?: boolean } = {}): Promise<ProcessResult> {
  console.error(`$ ${formatInvocation(invocation)}`);
  return new Promise(resolve => {
    let child: ChildProcess;
    try {
      child = spawn(invocation.file, [...invocation.args], { cwd: invocation.cwd, env: invocation.env, stdio: 'inherit', detached: options.terminateTree && process.platform !== 'win32' });
    } catch (error) {
      resolve({ code: 1, error: String(error) });
      return;
    }
    let failure: NodeJS.ErrnoException | undefined;
    let requested: NodeJS.Signals | undefined;
    let cleanup: Promise<string | undefined> | undefined;
    const cancel = (signal: NodeJS.Signals) => {
      requested = signal;
      if (options.terminateTree) cleanup ??= stopProbe(child);
      else if (process.platform === 'win32') cleanup ??= stopWindowsTree(child);
      else child.kill(signal);
    };
    const onInt = () => cancel('SIGINT');
    const onTerm = () => cancel('SIGTERM');
    process.on('SIGINT', onInt);
    process.on('SIGTERM', onTerm);
    child.on('error', error => { failure = error; });
    child.on('close', async (code, signal) => {
      const cleanupError = await cleanup;
      process.off('SIGINT', onInt);
      process.off('SIGTERM', onTerm);
      resolve({ code: cleanupError ? 1 : requested ? signalCode(requested) : failure ? failure.code === 'ENOENT' ? 127 : 1 : code ?? signalCode(signal),
        signal: requested ?? signal, ...(failure ? { error: failure.message } : {}), ...(cleanupError ? { cleanupError } : {}) });
    });
  });
}

async function stopWindowsTree(child: ChildProcess): Promise<string | undefined> {
  if (!child.pid) return;
  return new Promise(resolve => {
    const killer = nativeSpawn(join(process.env.SystemRoot ?? 'C:\\Windows', 'System32', 'taskkill.exe'), ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true });
    let failure: string | undefined;
    killer.on('error', error => { failure = error.message; child.kill(); });
    killer.on('close', code => {
      if (code !== 0 || failure) {
        if (child.exitCode === null) child.kill();
        resolve(`Process tree termination could not be confirmed: ${failure ?? `taskkill exited with code ${code}`}`);
      } else resolve(undefined);
    });
  });
}

async function stopProbe(child: ChildProcess): Promise<string | undefined> {
  if (!child.pid) return;
  let failure: string | undefined;
  if (process.platform === 'win32') failure = await stopWindowsTree(child);
  else {
    try { process.kill(-child.pid, 'SIGKILL'); }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ESRCH') failure = String(error); }
  }
  if (failure) {
    // Release our captured pipes even if an external descendant could not be terminated.
    child.kill('SIGKILL'); child.stdout?.destroy(); child.stderr?.destroy();
  }
  return failure;
}

/** Captures a bounded probe; cancellation rejects only after its process tree is stopped. */
export async function probeProcess(invocation: ProcessInvocation, options: { timeoutMs?: number; maxOutput?: number } = {}): Promise<ProbeResult> {
  return new Promise((resolve, reject) => {
    let child: ChildProcess;
    try {
      child = spawn(invocation.file, [...invocation.args], { cwd: invocation.cwd, env: invocation.env,
        stdio: ['ignore', 'pipe', 'pipe'], detached: process.platform !== 'win32', windowsHide: true });
    } catch (error) {
      resolve({ code: 1, stdout: '', stderr: '', timedOut: false, error: String(error) });
      return;
    }
    const stdout: Buffer[] = []; const stderr: Buffer[] = [];
    const limit = options.maxOutput ?? 65536;
    let size = 0; let timedOut = false; let failure: string | undefined;
    let cancelled: NodeJS.Signals | undefined;
    let cleanup: Promise<string | undefined> | undefined;
    const stop = () => { cleanup ??= stopProbe(child); };
    const onInt = () => { cancelled = 'SIGINT'; stop(); };
    const onTerm = () => { cancelled = 'SIGTERM'; stop(); };
    process.on('SIGINT', onInt);
    process.on('SIGTERM', onTerm);
    const timer = setTimeout(() => { timedOut = true; failure = 'Version probe timed out'; stop(); }, options.timeoutMs ?? 3000);
    const collect = (target: Buffer[]) => (data: Buffer) => {
      const available = Math.max(0, limit - size);
      target.push(data.subarray(0, available)); size += data.length;
      if (size > limit) { failure = 'Probe output exceeded limit'; stop(); }
    };
    child.stdout?.on('data', collect(stdout)); child.stderr?.on('data', collect(stderr));
    child.on('error', error => { failure = error.message; });
    child.on('close', async (code, signal) => {
      clearTimeout(timer);
      const cleanupError = await cleanup;
      process.off('SIGINT', onInt);
      process.off('SIGTERM', onTerm);
      if (cancelled) { reject(new ProcessCancelledError(cancelled, cleanupError)); return; }
      resolve({ code: failure || cleanupError ? 1 : code ?? signalCode(signal), signal, stdout: Buffer.concat(stdout).toString('utf8'),
        stderr: Buffer.concat(stderr).toString('utf8'), timedOut, ...(failure || cleanupError ? { error: [failure, cleanupError].filter(Boolean).join('; ') } : {}) });
    });
  });
}
