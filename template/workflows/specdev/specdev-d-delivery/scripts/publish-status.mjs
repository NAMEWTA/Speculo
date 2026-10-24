#!/usr/bin/env node
/**
 * Aggregate published-issue counts from active + archive publish.md ledgers.
 * Local files are authoritative; this tool does not query GitHub.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { discoverChangesSync, readChangeFactsSync, safeWorkPathSync } from "../../../../lib/speculo-runtime.mjs";

const COUNTED = new Set(["closed", "created", "commented"]);
const SKIPPED = new Set(["skipped:cancelled", "skipped:excluded"]);

function parseFrontmatter(text) {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return {};
  const meta = {};
  for (const line of match[1].split(/\r?\n/)) {
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    meta[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
  }
  return meta;
}

function parseLedgerStates(body) {
  const states = [];
  for (const line of body.split(/\r?\n/)) {
    if (!/^\|/.test(line) || /^\|\s*-+/.test(line) || /^\|\s*ticket\s*\|/i.test(line)) continue;
    const cells = line.split("|").map((c) => c.trim()).filter((_, i, arr) => i > 0 && i < arr.length - 1);
    if (cells.length < 8) continue;
    states.push(cells[7]);
  }
  return { states };
}

function collectLedgers(stateRoot) {
  const files = [];
  for (const location of discoverChangesSync(stateRoot, { includeArchived: true })) {
    readChangeFactsSync(stateRoot, location);
    const file = safeWorkPathSync(location.root, 'publish.md', { type: 'file' });
    if (existsSync(file)) files.push({ file, change: location.name });
  }
  return files;
}

function summarize(stateRoot) {
  const files = collectLedgers(stateRoot);
  let published = 0;
  let skipped = 0;
  let failed = 0;
  let originLocal = 0;
  let originIntake = 0;
  const byChange = [];

  for (const {file, change} of files) {
    const text = readFileSync(file, "utf8");
    const meta = parseFrontmatter(text);
    if (meta.schema_version !== '2' || meta.artifact !== 'publish' || meta.mode !== 'publish') throw new Error(`unsupported publish protocol: ${file}; preserve the original ledger`);
    if (!['local', 'intake'].includes(meta.origin) || !['pending', 'published', 'publish-failed', 'waived'].includes(meta.publish_action)) throw new Error(`invalid publish metadata: ${file}`);
    if (meta.change !== change) throw new Error(`identity-conflict: ${file}: ledger change differs from its owning directory`);
    const body = text.replace(/^---[\s\S]*?---/, "");
    const { states } = parseLedgerStates(body);
    const origin = meta.origin === "intake" ? "intake" : "local";
    let changePublished = 0;
    let changeSkipped = 0;
    let changeFailed = 0;
    for (const state of states) {
      if (COUNTED.has(state)) {
        changePublished += 1;
        if (origin === "intake") originIntake += 1;
        else originLocal += 1;
      } else if (SKIPPED.has(state)) {
        changeSkipped += 1;
      } else if (state === "failed") {
        changeFailed += 1;
      }
    }
    published += changePublished;
    skipped += changeSkipped;
    failed += changeFailed;
    byChange.push({
      change,
      origin,
      publish_action: meta.publish_action || "unknown",
      published: changePublished,
      skipped: changeSkipped,
      failed: changeFailed,
    });
  }

  return {
    published_issues: published,
    origin: { local: originLocal, intake: originIntake },
    publish_skipped: skipped,
    publish_failed: failed,
    ledgers: files.length,
    changes: byChange,
  };
}

function usage() {
  console.error("Usage: node publish-status.mjs --state-root <specdev-state-root> [--json]");
  process.exit(2);
}

function main(argv) {
  let stateRoot = null;
  let json = false;
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--state-root") {
      stateRoot = argv[i + 1];
      i += 1;
    } else if (argv[i] === "--json") {
      json = true;
    } else {
      usage();
    }
  }
  if (!stateRoot) usage();
  const summary = summarize(stateRoot);
  if (json) {
    console.log(JSON.stringify(summary, null, 2));
    return 0;
  }
  console.log(
    `published_issues: ${summary.published_issues}   (origin:local ${summary.origin.local}, origin:intake ${summary.origin.intake})`,
  );
  console.log(`publish_skipped:  ${summary.publish_skipped}`);
  console.log(`publish_failed:   ${summary.publish_failed}`);
  return 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exit(main(process.argv.slice(2)));
}

export { summarize };
