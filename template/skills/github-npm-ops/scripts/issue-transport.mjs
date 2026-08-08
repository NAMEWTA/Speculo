#!/usr/bin/env node

import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

function parseArgs(argv) {
  const [operation, ...rest] = argv;
  const options = { labels: [] };
  for (let index = 0; index < rest.length; index += 1) {
    const token = rest[index];
    if (token === "--apply") {
      options.apply = true;
      continue;
    }
    if (!token.startsWith("--")) throw new Error(`unexpected argument: ${token}`);
    const key = token.slice(2).replaceAll("-", "_");
    const value = rest[index + 1];
    if (value === undefined || value.startsWith("--")) {
      throw new Error(`${token} requires a value`);
    }
    index += 1;
    if (key === "label") options.labels.push(value);
    else options[key] = value;
  }
  return { operation, options };
}

function requireOptions(options, keys) {
  const missing = keys.filter((key) => !String(options[key] ?? "").trim());
  if (missing.length) throw new Error(`missing options: ${missing.map((key) => `--${key.replaceAll("_", "-")}`).join(", ")}`);
}

async function gh(args) {
  try {
    const { stdout } = await execFileAsync("gh", args, {
      maxBuffer: 16 * 1024 * 1024,
      encoding: "utf8",
    });
    return stdout.trim();
  } catch (error) {
    const detail = String(error?.stderr || error?.message || error).trim();
    throw new Error(`gh ${args[0]} failed: ${detail}`);
  }
}

async function readIssue(repo, number) {
  return JSON.parse(
    await gh([
      "issue",
      "view",
      number,
      "--repo",
      repo,
      "--json",
      "number,title,body,state,url,author,labels,createdAt,updatedAt,comments",
    ]),
  );
}

async function issueRead(options) {
  requireOptions(options, ["repo", "number"]);
  const issue = await readIssue(options.repo, options.number);
  return {
    operation: "issue-read",
    provider: "github",
    repo: options.repo,
    kind: "issue",
    ...issue,
  };
}

async function prRead(options) {
  requireOptions(options, ["repo", "number"]);
  const pull = JSON.parse(
    await gh([
      "pr",
      "view",
      options.number,
      "--repo",
      options.repo,
      "--json",
      "number,title,body,state,url,author,labels,createdAt,updatedAt,comments,baseRefName,baseRefOid,headRefName,headRefOid,files",
    ]),
  );
  return {
    operation: "pr-read",
    provider: "github",
    repo: options.repo,
    kind: "pull-request",
    ...pull,
  };
}

async function issueSearch(options) {
  requireOptions(options, ["repo", "query"]);
  const issues = JSON.parse(
    await gh([
      "issue",
      "list",
      "--repo",
      options.repo,
      "--search",
      options.query,
      "--state",
      options.state || "all",
      "--limit",
      options.limit || "20",
      "--json",
      "number,title,state,url,labels,updatedAt",
    ]),
  );
  return { operation: "issue-search", provider: "github", repo: options.repo, issues };
}

async function issueCreate(options) {
  requireOptions(options, ["repo", "title", "body_file"]);
  const plan = {
    operation: "issue-create",
    provider: "github",
    repo: options.repo,
    title: options.title,
    body_file: options.body_file,
    labels: options.labels,
    mode: options.apply ? "apply" : "dry-run",
  };
  if (!options.apply) return plan;

  await readFile(options.body_file, "utf8");
  const args = [
    "issue",
    "create",
    "--repo",
    options.repo,
    "--title",
    options.title,
    "--body-file",
    options.body_file,
  ];
  for (const label of options.labels) args.push("--label", label);
  return { ...plan, url: await gh(args), status: "created" };
}

async function issueCommentClose(options) {
  requireOptions(options, ["repo", "number", "comment_file", "marker"]);
  const marker = `<!-- ${options.marker} -->`;
  const comment = (await readFile(options.comment_file, "utf8")).trim();
  const before = await readIssue(options.repo, options.number);
  const markerExists = (before.comments ?? []).some((item) =>
    String(item?.body ?? "").includes(marker),
  );
  const plan = {
    operation: "issue-comment-close",
    provider: "github",
    repo: options.repo,
    number: Number(options.number),
    url: before.url,
    mode: options.apply ? "apply" : "dry-run",
    state_before: before.state,
    comment_required: !markerExists,
    close_required: String(before.state).toUpperCase() !== "CLOSED",
    marker: options.marker,
    steps: [],
  };
  if (!options.apply) return plan;

  if (!markerExists) {
    await gh([
      "issue",
      "comment",
      options.number,
      "--repo",
      options.repo,
      "--body",
      `${comment}\n\n${marker}`,
    ]);
    plan.steps.push("commented");
  } else {
    plan.steps.push("comment-already-present");
  }
  if (String(before.state).toUpperCase() !== "CLOSED") {
    await gh([
      "issue",
      "close",
      options.number,
      "--repo",
      options.repo,
      "--reason",
      options.reason || "completed",
    ]);
    plan.steps.push("closed");
  } else {
    plan.steps.push("already-closed");
  }

  const after = await readIssue(options.repo, options.number);
  if (String(after.state).toUpperCase() !== "CLOSED") {
    throw new Error(`issue remained ${after.state} after close operation`);
  }
  return { ...plan, state_after: after.state, status: "closed" };
}

function usage() {
  return `Usage:
  issue-transport.mjs issue-read --repo OWNER/REPO --number N
  issue-transport.mjs pr-read --repo OWNER/REPO --number N
  issue-transport.mjs issue-search --repo OWNER/REPO --query TEXT [--state all] [--limit 20]
  issue-transport.mjs issue-create --repo OWNER/REPO --title TEXT --body-file PATH [--label LABEL] [--apply]
  issue-transport.mjs issue-comment-close --repo OWNER/REPO --number N --comment-file PATH --marker ID [--reason completed] [--apply]`;
}

try {
  const { operation, options } = parseArgs(process.argv.slice(2));
  if (!operation || ["help", "--help", "-h"].includes(operation)) {
    console.log(usage());
  } else {
    const handlers = { issueRead, prRead, issueSearch, issueCreate, issueCommentClose };
    const handler = handlers[operation.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())];
    if (!handler) throw new Error(`unknown operation: ${operation}\n${usage()}`);
    console.log(JSON.stringify(await handler(options), null, 2));
  }
} catch (error) {
  console.error(`ERROR: ${error.message}`);
  process.exitCode = 1;
}
