import { createHash, randomUUID } from "node:crypto";
import { constants } from "node:fs";
import { lstat, open, rename, rm } from "node:fs/promises";
import { dirname, join } from "node:path";

export const EXTERNAL_NAMES = [".gitignore", "AGENTS.md", "CLAUDE.md"] as const;
export type ExternalName = typeof EXTERNAL_NAMES[number];
export type FileImage = { content: string; mode: number } | null;
export type ExternalEdit = { name: ExternalName; before: FileImage; after: FileImage };

export function bytes(image: FileImage): Buffer {
  return image ? Buffer.from(image.content, "base64") : Buffer.alloc(0);
}
export function image(content: string | Buffer, mode = 0o644): FileImage {
  return { content: Buffer.from(content).toString("base64"), mode: process.platform === "win32" ? (mode & 0o200 ? 0o666 : 0o444) : mode };
}
export function imageDigest(value: FileImage): string {
  return value ? createHash("sha256").update(bytes(value)).update(`\0${value.mode}`).digest("hex") : "absent";
}

/** Do not treat EACCES, a dangling link, a directory or a shared inode as absence. */
export async function readImage(path: string): Promise<FileImage> {
  let stat;
  try { stat = await lstat(path); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return null; throw error; }
  if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1) {
    throw new Error(`unsafe-external-file: ${path}; preserve the link and resolve source ownership before init`);
  }
  const handle = await open(path, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
  try {
    const actual = await handle.stat();
    if (!actual.isFile() || actual.dev !== stat.dev || actual.ino !== stat.ino || actual.nlink !== 1) throw new Error(`external-drift: ${path}`);
    return image(await handle.readFile(), stat.mode & 0o777);
  } finally { await handle.close(); }
}

export async function syncDirectory(path: string): Promise<void> {
  // Windows does not support opening/fsyncing directories through this API.
  if (process.platform === "win32") return;
  const handle = await open(path, "r");
  try { await handle.sync(); } finally { await handle.close(); }
}

export async function writeDurableJson(path: string, value: unknown): Promise<void> {
  const temporary = `${path}.${randomUUID()}.tmp`;
  const handle = await open(temporary, "wx", 0o600);
  try { await handle.writeFile(JSON.stringify(value, null, 2) + "\n"); await handle.sync(); }
  finally { await handle.close(); }
  try { await rename(temporary, path); await syncDirectory(dirname(path)); }
  finally { await rm(temporary, { force: true }); }
}

export async function assertImage(path: string, expected: FileImage): Promise<void> {
  if (imageDigest(await readImage(path)) !== imageDigest(expected)) throw new Error(`external-drift: ${path}; no concurrent content was overwritten`);
}

/** Atomic file replacement. The project directory must be trusted, not an adversarial sandbox. */
export async function replaceImage(path: string, expected: FileImage, next: FileImage): Promise<void> {
  await assertImage(path, expected);
  if (imageDigest(expected) === imageDigest(next)) return;
  if (next === null) {
    await rm(path);
    await syncDirectory(dirname(path));
    return;
  }
  const temporary = join(dirname(path), `.speculo-file-${randomUUID()}.tmp`);
  const handle = await open(temporary, "wx", next.mode);
  try {
    await handle.writeFile(bytes(next));
    if (process.platform !== "win32") await handle.chmod(next.mode);
    await handle.sync();
  } finally { await handle.close(); }
  try {
    await assertImage(path, expected);
    await rename(temporary, path);
    await syncDirectory(dirname(path));
  } finally { await rm(temporary, { force: true }); }
}

export async function snapshotExternalFiles(target: string): Promise<Map<ExternalName, FileImage>> {
  const result = new Map<ExternalName, FileImage>();
  for (const name of EXTERNAL_NAMES) result.set(name, await readImage(join(target, name)));
  return result;
}
