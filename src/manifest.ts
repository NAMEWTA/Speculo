import { createHash } from "node:crypto";
import { lstat, readFile, readdir, readlink } from "node:fs/promises";
import { join, relative, sep } from "node:path";
import { pathExists } from "./utils.js";

export type FileRecord = {
  path: string;
  bytes: number;
  sha256: string;
};

export type ManagedFileRecord = FileRecord & {
  owner: string;
  kind: "static" | "baseline" | "contract";
  package_version: string;
};

export function toPosix(path: string): string {
  return path.split(sep).join("/");
}

export async function sha256File(path: string): Promise<{ bytes: number; sha256: string }> {
  const content = await readFile(path);
  return {
    bytes: content.byteLength,
    sha256: createHash("sha256").update(content).digest("hex"),
  };
}

export async function collectFiles(
  root: string,
  options: { include?: (relativePath: string) => boolean; rejectSymlinks?: boolean } = {},
): Promise<FileRecord[]> {
  if (!(await pathExists(root))) return [];
  const files: FileRecord[] = [];

  async function visit(current: string): Promise<void> {
    for (const entry of await readdir(current, { withFileTypes: true })) {
      const path = join(current, entry.name);
      const relativePath = toPosix(relative(root, path));
      const stats = await lstat(path);
      if (stats.isSymbolicLink()) {
        if (options.rejectSymlinks !== false) throw new Error("symbolic link is not allowed in refresh input: " + relativePath);
        const target = await readlink(path);
        const content = Buffer.from("symlink\0" + target);
        if (options.include?.(relativePath) ?? true) {
          files.push({
            path: relativePath,
            bytes: content.byteLength,
            sha256: createHash("sha256").update(content).digest("hex"),
          });
        }
      }
      if (stats.isDirectory()) {
        await visit(path);
      } else if (stats.isFile() && (options.include?.(relativePath) ?? true)) {
        files.push({ path: relativePath, ...await sha256File(path) });
      }
    }
  }

  await visit(root);
  return files.sort((left, right) => left.path.localeCompare(right.path));
}

/** Versioned transaction snapshot. Managed-file manifests retain their old format. */
export const TREE_FINGERPRINT_PREFIX = `tree-v2-${process.platform === "win32" ? "windows" : "posix"}:`;
export function isTreeFingerprint(value: unknown, allowAbsent = true): value is string {
  return typeof value === "string" && ((allowAbsent && value === "absent") ||
    /^tree-v2-(posix|windows):[a-f0-9]{64}$/.test(value));
}

/**
 * Includes the root, empty directories, node types, link targets, file bytes,
 * and POSIX permission/special bits. Windows mode/ACL semantics are deliberately
 * not represented as POSIX permissions. No links are followed. This is a drift
 * guard in a trusted project directory, not an atomic filesystem snapshot.
 */
export async function fingerprintTree(root: string): Promise<string> {
  try { await lstat(root); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return "absent"; throw error; }
  const hash = createHash("sha256").update(TREE_FINGERPRINT_PREFIX);
  async function visit(path: string, name: string): Promise<void> {
    const stat = await lstat(path);
    const mode = process.platform === "win32" ? null : stat.mode & 0o7777;
    // Length-delimited JSON records prevent ambiguous paths or link contents.
    const record = (fields: unknown[]) => { hash.update(JSON.stringify([name, ...fields]) + "\n"); };
    if (stat.isSymbolicLink()) {
      record(["symlink", mode, await readlink(path)]);
    } else if (stat.isDirectory()) {
      record(["directory", mode]);
      for (const child of (await readdir(path)).sort()) {
        await visit(join(path, child), name ? `${name}/${child}` : child);
      }
    } else if (stat.isFile()) {
      const data = await sha256File(path);
      record(["file", mode, data.bytes, data.sha256]);
    } else {
      throw new Error(`unsupported-snapshot-node: ${name || "."}; preserve installation`);
    }
  }
  await visit(root, "");
  return TREE_FINGERPRINT_PREFIX + hash.digest("hex");
}
