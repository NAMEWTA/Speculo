import { get } from 'node:https';
import { gt, prerelease, valid } from 'semver';

export interface Release { version: string; node?: string }
export function isNewerRelease(local: string, latest: string): boolean {
  return Boolean(valid(local) && valid(latest) && prerelease(latest) === null && gt(latest, local));
}

/** The deadline covers DNS, TLS and the entire response body, not just socket inactivity. */
export function fetchRelease(packageName: string, options: { timeoutMs?: number; request?: typeof get } = {}): Promise<Release | null> {
  return new Promise(resolve => {
    let done = false;
    let request: ReturnType<typeof get> | undefined;
    const finish = (release: Release | null) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      request?.destroy();
      resolve(release);
    };
    const timer = setTimeout(() => finish(null), options.timeoutMs ?? 2000);
    try {
      request = (options.request ?? get)(`https://registry.npmjs.org/${encodeURIComponent(packageName)}/latest`, response => {
        response.on('error', () => finish(null));
        response.on('aborted', () => finish(null));
        if (response.statusCode !== 200) { response.resume(); finish(null); return; }
        const chunks: Buffer[] = [];
        let bytes = 0;
        response.on('data', (chunk: Buffer) => {
          if (done) return;
          bytes += chunk.length;
          if (bytes > 65536) { finish(null); return; }
          chunks.push(chunk);
        });
        response.on('end', () => {
          try {
            const value = JSON.parse(Buffer.concat(chunks).toString('utf8'));
            if (typeof value?.version !== 'string' || !valid(value.version) || prerelease(value.version) !== null
              || (value.engines?.node !== undefined && typeof value.engines.node !== 'string')) { finish(null); return; }
            finish({ version: valid(value.version)!, node: value.engines?.node });
          } catch { finish(null); }
        });
      });
      request.on('error', () => finish(null));
      if (done) request.destroy();
    } catch { finish(null); }
  });
}
