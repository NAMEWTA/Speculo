#!/usr/bin/env node

import { lstat, mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";

const REQUIRED_TARGETS = new Set([
  "final/index.html",
  "final/styles.css",
  "final/app.js",
]);

const TARGET_LANGUAGE = new Map([
  ["final/index.html", new Set(["html"])],
  ["final/styles.css", new Set(["css"])],
  ["final/app.js", new Set(["javascript", "js"])],
]);

export function extractPrototypeSources(markdown) {
  const pattern = /<!-- PROTOTYPE-FILE: ([^\r\n]+) -->\r?\n```(html|css|javascript|js)\r?\n([\s\S]*?)\r?\n```\r?\n<!-- \/PROTOTYPE-FILE -->/g;
  const sources = new Map();

  for (const match of markdown.matchAll(pattern)) {
    const target = match[1].trim().replaceAll("\\", "/");
    if (isAbsolute(target) || !TARGET_LANGUAGE.has(target)) {
      throw new Error(`unsupported prototype target: ${target}`);
    }
    if (!TARGET_LANGUAGE.get(target).has(match[2])) throw new Error(`invalid code fence language for ${target}: ${match[2]}`);
    if (sources.has(target)) throw new Error(`duplicate prototype target: ${target}`);
    sources.set(target, `${match[3].replaceAll("\r\n", "\n")}\n`);
  }

  const openingCount = markdown.match(/<!-- PROTOTYPE-FILE:/g)?.length ?? 0;
  const closingCount = markdown.match(/<!-- \/PROTOTYPE-FILE -->/g)?.length ?? 0;
  if (openingCount !== 3 || closingCount !== 3 || sources.size !== 3) {
    throw new Error(`expected exactly three paired PROTOTYPE-FILE blocks; found ${openingCount} openings, ${closingCount} closings, ${sources.size} valid blocks`);
  }

  for (const target of REQUIRED_TARGETS) {
    if (!sources.has(target)) throw new Error(`missing prototype source block: ${target}`);
  }

  return sources;
}

function resolveInside(root, target) {
  const destination = resolve(root, ...target.split("/"));
  const local = relative(root, destination);
  if (!local || local.startsWith(`..${sep}`) || local === ".." || isAbsolute(local)) {
    throw new Error(`prototype target escapes design package: ${target}`);
  }
  return destination;
}

async function assertNoSymlink(root, target) {
  let current = root;
  const local = relative(root, target);
  for (const segment of ["", ...local.split(sep).filter(Boolean)]) {
    if (segment) current = join(current, segment);
    try {
      const info = await lstat(current);
      if (info.isSymbolicLink()) throw new Error(`prototype path must not contain symlinks: ${current}`);
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }
}

async function atomicWrite(destination, content) {
  await mkdir(dirname(destination), { recursive: true });
  const temporary = `${destination}.tmp-${process.pid}-${Date.now()}`;
  await writeFile(temporary, content, "utf8");
  try {
    await rename(temporary, destination);
  } catch (error) {
    await rm(temporary, { force: true });
    throw error;
  }
}

export async function materialize(markdownPath, { check = false } = {}) {
  const absoluteMarkdown = resolve(markdownPath);
  const root = dirname(absoluteMarkdown);
  const markdown = await readFile(absoluteMarkdown, "utf8");
  const sources = extractPrototypeSources(markdown);
  const mismatches = [];

  for (const [target, expected] of sources) {
    const destination = resolveInside(root, target);
    await assertNoSymlink(root, destination);
    if (check) {
      let actual;
      try {
        actual = await readFile(destination, "utf8");
      } catch (error) {
        if (error.code === "ENOENT") {
          mismatches.push(`${target}: missing`);
          continue;
        }
        throw error;
      }
      if (actual !== expected) mismatches.push(`${target}: differs from design-system.md`);
    } else {
      await atomicWrite(destination, expected);
    }
  }

  if (mismatches.length > 0) throw new Error(mismatches.join("\n"));
  return [...sources.keys()];
}

async function main() {
  const args = process.argv.slice(2);
  const check = args.includes("--check");
  const paths = args.filter((arg) => arg !== "--check");
  if (paths.length !== 1) throw new Error("usage: materialize-prototype.mjs [--check] <design-system.md>");
  const targets = await materialize(paths[0], { check });
  console.log(`${check ? "verified" : "materialized"} ${targets.length} prototype files`);
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
