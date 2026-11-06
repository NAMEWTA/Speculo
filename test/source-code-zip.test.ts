import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";
import { test } from "node:test";
import { inflateRawSync } from "node:zlib";

const script = join(process.cwd(), "template/commands/source-code-zip/scripts/zip_source_code.cjs");
const hash = (value: Buffer) => createHash("sha256").update(value).digest("hex");
function bytes(root: string): Record<string, string> {
  const out: Record<string, string> = {};
  function walk(dir: string, prefix = "") {
    for (const item of readdirSync(dir, { withFileTypes: true })) {
      const name = prefix + item.name, path = join(dir, item.name);
      if (item.isDirectory()) { out[name + "/"] = "directory"; walk(path, name + "/"); }
      else out[name] = hash(readFileSync(path));
    }
  }
  walk(root); return out;
}

// Read the public ZIP file format independently of the bundled writer. This bounded fixture uses no ZIP64 entries.
function readZip(file: string): Record<string, string> {
  const data = readFileSync(file), result: Record<string, string> = {};
  const end = data.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  assert.ok(end >= 0, "ZIP end record exists"); let offset = data.readUInt32LE(end + 16);
  for (let i = 0; i < data.readUInt16LE(end + 10); i++) {
    assert.equal(data.readUInt32LE(offset), 0x02014b50);
    const method = data.readUInt16LE(offset + 10), size = data.readUInt32LE(offset + 20), nameLength = data.readUInt16LE(offset + 28);
    const name = data.toString("utf8", offset + 46, offset + 46 + nameLength), local = data.readUInt32LE(offset + 42);
    assert.equal(data.readUInt32LE(local), 0x04034b50);
    const start = local + 30 + data.readUInt16LE(local + 26) + data.readUInt16LE(local + 28), compressed = data.subarray(start, start + size);
    assert.ok(method === 0 || method === 8); const content = method === 8 ? inflateRawSync(compressed) : compressed;
    assert.equal(content.length, data.readUInt32LE(offset + 24)); result[name] = content.toString("utf8");
    offset += 46 + nameLength + data.readUInt16LE(offset + 30) + data.readUInt16LE(offset + 32);
  }
  return result;
}

test("source ZIP runs from arbitrary cwd in source and installed ESM projects with unchanged filtering", async t => {
  const root = mkdtempSync(join(realpathSync(tmpdir()), "speculo-zip-entry-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const source = join(root, "source with spaces"), elsewhere = join(root, "unrelated cwd"), output = join(root, "exports");
  for (const dir of [join(source, "src"), join(source, "node_modules"), elsewhere, output]) mkdirSync(dir, { recursive: true });
  const included = { "main.ts": "export const value = 7;\n", "src/view.js": "export const view = '源码';\n", "run": "#!/bin/sh\necho fixture\n" };
  const excluded = { ".env": "SECRET=fixture-only\n", "config.yaml": "private: fixture\n", "pnpm-lock.yaml": "lockfileVersion: 9\n", "README.md": "Fixture README\n", "package.json": '{"type":"module"}\n', "node_modules/dependency.js": "not source\n" };
  for (const [name, content] of Object.entries({ ...included, ...excluded })) writeFileSync(join(source, name), content);
  const installed = join(root, "esm application/.agents/speculo/commands/source-code-zip/scripts/zip_source_code.cjs");
  mkdirSync(dirname(installed), { recursive: true }); copyFileSync(script, installed);
  writeFileSync(join(root, "esm application/package.json"), '{"type":"module"}\n');
  const call = (target: string, args: string[]) => {
    const r = spawnSync(process.execPath, [target, ...args], { cwd: elsewhere, encoding: "utf8" });
    assert.equal(r.error, undefined); return r;
  };
  for (const [label, target] of [["source", script], ["installed-esm", installed]]) await t.test(label, () => {
    const before = bytes(root), preview = call(target, [source, "--dry-run", "--verbose"]);
    assert.equal(preview.status, 0, preview.stdout + preview.stderr); assert.deepEqual(bytes(root), before);
    assert.equal(existsSync(source + ".code.zip"), false);
    const archive = join(output, label + ".zip"), created = call(target, [source, "--output", archive, "--quiet"]);
    assert.equal(created.status, 0, created.stdout + created.stderr); assert.equal(created.stdout.trim(), archive);
    const expected = Object.fromEntries(Object.entries(included).map(([name, text]) => [basename(source) + "/" + name, text]));
    assert.deepEqual(readZip(archive), expected);
    const fingerprint = hash(readFileSync(archive)), again = call(target, [source, "--output", archive, "--quiet"]);
    assert.notEqual(again.status, 0); assert.equal(hash(readFileSync(archive)), fingerprint);
    const sourceBefore = Object.fromEntries(Object.entries(before).filter(([path]) => path.startsWith("source with spaces/")));
    assert.deepEqual(Object.fromEntries(Object.entries(bytes(root)).filter(([path]) => path.startsWith("source with spaces/"))), sourceBefore);
  });
  await t.test("explicit JSON include keeps YAML/env/lock/dependencies ignored", () => {
    const archive = join(output, "included-json.zip"), result = call(installed, [source, "--output", archive, "--include", "(^|/)package\\.json$", "--quiet"]);
    assert.equal(result.status, 0, result.stdout + result.stderr);
    assert.deepEqual(readZip(archive), Object.fromEntries(Object.entries({ ...included, "package.json": excluded["package.json"] }).map(([name, text]) => [basename(source) + "/" + name, text])));
  });
});
