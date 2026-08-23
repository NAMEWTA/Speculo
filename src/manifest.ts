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

export async function fingerprintTree(root: string): Promise<string> {
  if (!(await pathExists(root))) return "absent";
  const files = await collectFiles(root, { rejectSymlinks: false });
  const hash = createHash("sha256");
  for (const file of files) hash.update(`${file.path}\0${file.bytes}\0${file.sha256}\n`);
  return hash.digest("hex");
}
