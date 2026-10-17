import { mkdir, open, rename, unlink } from 'node:fs/promises';
import { dirname } from 'node:path';
import { randomUUID } from 'node:crypto';

/** Writes next to the destination, then renames atomically. Failed writes leave the original intact. */
export async function atomicWriteJson(targetPath: string, value: unknown): Promise<void> {
  await mkdir(dirname(targetPath), { recursive: true, mode: 0o700 });
  const temporary = `${targetPath}.tmp-${randomUUID()}`;
  try {
    const file = await open(temporary, 'wx', 0o600);
    try {
      await file.writeFile(`${JSON.stringify(value, null, 2)}\n`, 'utf8');
      await file.sync();
    } finally { await file.close(); }
    await rename(temporary, targetPath);
  } catch (error) {
    await unlink(temporary).catch(() => {});
    throw error;
  }
}
