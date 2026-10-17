export interface ProcessInvocation {
  file: string;
  args: readonly string[];
  env?: NodeJS.ProcessEnv;
  cwd?: string;
}

export interface ProcessResult {
  code: number;
  signal?: NodeJS.Signals | null;
  error?: string;
  cleanupError?: string;
}

export interface ProbeResult extends ProcessResult {
  stdout: string;
  stderr: string;
  timedOut: boolean;
}

