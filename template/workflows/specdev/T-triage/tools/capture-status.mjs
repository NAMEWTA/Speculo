#!/usr/bin/env node
/**
 * Aggregate inbox counts from the workspace-owned capture.md ledger.
 * Local file is authoritative; this tool does not query GitHub.
 * Missing capture.md is legal and counts as an empty inbox.
 */
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const OPEN = "open";
const INTAKEN = "intaken";
const WAIVED = "waived";
const SKIPPED = new Set(["skipped:duplicate"]);

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
  const rows = [];
  for (const line of body.split(/\r?\n/)) {
    if (!/^\|/.test(line) || /^\|\s*-+/.test(line) || /^\|\s*id\s*\|/i.test(line)) continue;
    const cells = line.split("|").map((c) => c.trim()).filter((_, i, arr) => i > 0 && i < arr.length - 1);
    if (cells.length < 9) continue;
    rows.push({
      id: cells[0],
      kind: cells[1],
      state: cells[8],
    });
  }
  return rows;
}

function summarize(stateRoot) {
  const file = join(stateRoot, "capture.md");
  if (!existsSync(file)) {
    return {
      inbox_open: 0,
      inbox_intaken: 0,
      inbox_waived: 0,
      inbox_skipped: 0,
      inbox_failed: 0,
      records: 0,
      missing: true,
      ledger: null,
    };
  }

  const text = readFileSync(file, "utf8");
  const meta = parseFrontmatter(text);
  const body = text.replace(/^---[\s\S]*?---/, "");
  const rows = parseLedgerStates(body);
  let inbox_open = 0;
  let inbox_intaken = 0;
  let inbox_waived = 0;
  let inbox_skipped = 0;
  let inbox_failed = 0;
  for (const row of rows) {
    if (row.state === OPEN) inbox_open += 1;
    else if (row.state === INTAKEN) inbox_intaken += 1;
    else if (row.state === WAIVED) inbox_waived += 1;
    else if (SKIPPED.has(row.state)) inbox_skipped += 1;
    else if (row.state === "failed") inbox_failed += 1;
  }

  return {
    inbox_open,
    inbox_intaken,
    inbox_waived,
    inbox_skipped,
    inbox_failed,
    records: rows.length,
    missing: false,
    ledger: file,
    repo: meta.repo || null,
  };
}

function usage() {
  console.error("Usage: node capture-status.mjs --state-root <specdev-state-root> [--json]");
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
  const missing = summary.missing ? " (missing ledger, empty inbox)" : "";
  console.log(`inbox_open:    ${summary.inbox_open}${missing}`);
  console.log(`inbox_intaken: ${summary.inbox_intaken}`);
  console.log(`inbox_waived:  ${summary.inbox_waived}`);
  console.log(`inbox_skipped: ${summary.inbox_skipped}`);
  console.log(`inbox_failed:  ${summary.inbox_failed}`);
  return 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exit(main(process.argv.slice(2)));
}

export { summarize };
