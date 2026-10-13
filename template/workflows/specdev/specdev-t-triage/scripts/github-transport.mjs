#!/usr/bin/env node
import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { promisify } from "node:util";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const exec = promisify(execFile);
export const sha256 = value => createHash("sha256").update(value).digest("hex");
const must = (value, message) => { if (!value) throw new Error(message); };
const commentFields = value => ({ ...value, author: value.user ?? value.author, createdAt: value.created_at ?? value.createdAt, updatedAt: value.updated_at ?? value.updatedAt, url: value.html_url ?? value.url });
function required(o, keys) { for (const k of keys) must(typeof o[k] === "string" && o[k].trim(), "missing --" + k.replaceAll("_", "-")); }
function validateTarget(o) {
  must(/^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/.test(o.repo ?? ""), "invalid repo");
  if (o.number !== undefined) must(/^[1-9]\d*$/.test(String(o.number)), "invalid number");
  if (o.marker !== undefined) must(/^[a-zA-Z0-9:_./-]+$/.test(o.marker), "invalid marker");
}
export function createTransport(run = async args => {
  try { return (await exec("gh", args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 })).stdout.trim(); }
  catch { throw new Error("GitHub operation failed; remote outcome may be unknown. Re-read before retrying (raw credential-bearing stderr omitted)."); }
}, readText = path => readFile(path, "utf8")) {
  const json = async args => JSON.parse(await run(args));
  const api = path => json(["api", path]);
  const pages = async path => {
    const value = await json(["api", path + (path.includes("?") ? "&" : "?") + "per_page=100", "--paginate", "--slurp"]);
    must(Array.isArray(value) && value.every(Array.isArray), "incomplete or invalid pagination");
    return value.flat();
  };
  async function readIssue(repo, number) {
    const item = await api("repos/" + repo + "/issues/" + number);
    must(!item.pull_request, "target is a pull request; use pr-read");
    const comments = await pages("repos/" + repo + "/issues/" + number + "/comments");
    must(comments.length === item.comments, "issue comments changed or pagination incomplete");
    const after = await api("repos/" + repo + "/issues/" + number);
    must(after.updated_at === item.updated_at && after.body === item.body && after.comments === item.comments && after.state === item.state, "issue drift during read");
    return { ...item, author: item.user, state: item.state.toUpperCase(), url: item.html_url, comments: comments.map(commentFields),
      createdAt: item.created_at, updatedAt: item.updated_at,
      pagination_complete: true, fetched_at: new Date().toISOString() };
  }
  async function readPull(repo, number) {
    const root = "repos/" + repo + "/pulls/" + number;
    const before = await api(root);
    const [comments, reviews, review_comments, files, diff] = await Promise.all([
      pages("repos/" + repo + "/issues/" + number + "/comments"), pages(root + "/reviews"),
      pages(root + "/comments"), pages(root + "/files"),
      run(["api", root, "-H", "Accept: application/vnd.github.diff"]),
    ]);
    const after = await api(root);
    must(before.base.sha === after.base.sha && before.head.sha === after.head.sha && before.updated_at === after.updated_at &&
      before.body === after.body && before.comments === after.comments && before.review_comments === after.review_comments, "PR drift during read");
    must(files.length === after.changed_files && comments.length === after.comments && review_comments.length === after.review_comments,
      "PR pagination incomplete");
    must(typeof diff === "string" && (after.changed_files === 0 || diff.includes("diff --git")), "missing PR diff");
    return { number: after.number, title: after.title, body: after.body ?? "", state: after.merged_at ? "MERGED" : after.state.toUpperCase(),
      url: after.html_url, author: after.user, labels: after.labels, createdAt: after.created_at, updatedAt: after.updated_at,
      baseRefName: after.base.ref, headRefName: after.head.ref, baseRefOid: after.base.sha, headRefOid: after.head.sha,
      isDraft: after.draft, comments: comments.map(commentFields), reviews: reviews.map(commentFields), review_comments: review_comments.map(commentFields),
      files: files.map(file => ({ ...file, path: file.filename ?? file.path })), diff, pagination_complete: true,
      body_sha256: sha256(after.body ?? ""), fetched_at: new Date().toISOString() };
  }
  function fixed(o, p) {
    for (const k of ["base_sha", "head_sha"]) must(/^[a-f0-9]{40,64}$/.test(o[k] ?? ""), "invalid " + k);
    must(p.baseRefOid === o.base_sha && p.headRefOid === o.head_sha, "PR SHA drift");
    if (o.expected_body_sha256 !== undefined) must(p.body_sha256 === o.expected_body_sha256, "PR body drift");
  }
  async function candidate(o) {
    const qualifiedHead = o.head.includes(":") ? o.head : o.repo.split("/")[0] + ":" + o.head;
    const found = await pages("repos/" + o.repo + "/pulls?state=all&head=" + encodeURIComponent(qualifiedHead) + "&base=" + encodeURIComponent(o.base));
    const matches = found.filter(p => String(p.body ?? "").includes("<!-- " + o.marker + " -->"));
    must(matches.length < 2, "multiple PRs with marker");
    if (matches.length) return readPull(o.repo, String(matches[0].number));
    must(found.every(p => p.state !== "open"), "existing open PR for branches needs explicit update");
    return null;
  }
  async function createPr(o, plan) {
    required(o, ["base", "head", "base_sha", "head_sha", "title", "body_file", "marker"]);
    const raw = await readText(o.body_file);
    const marker = "<!-- " + o.marker + " -->";
    const body = raw.includes(marker) ? raw : raw.trimEnd() + "\n\n" + marker;
    const existing = await candidate(o);
    if (existing) {
      fixed(o, existing);
      must(existing.body === body && existing.title === o.title, "existing PR content differs; use explicit update");
      return { ...plan, status: "already-present", ...existing };
    }
    const base = await api("repos/" + o.repo + "/commits/" + encodeURIComponent(o.base));
    const colon = o.head.indexOf(":");
    if (colon >= 0) required(o, ["head_repo"]);
    const headRepo = colon >= 0 ? o.head_repo : o.repo;
    must(/^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/.test(headRepo), "invalid head-repo");
    if (colon >= 0) must(headRepo.split("/")[0] === o.head.slice(0, colon), "head owner disagrees with head-repo");
    const head = await api("repos/" + headRepo + "/commits/" + encodeURIComponent(colon >= 0 ? o.head.slice(colon + 1) : o.head));
    fixed({ ...o, expected_body_sha256: undefined }, { baseRefOid: base.sha, headRefOid: head.sha });
    if (!o.apply) return { ...plan, body_sha256: sha256(body), draft: true };
    let failure;
    try { await run(["pr", "create", "--repo", o.repo, "--base", o.base, "--head", o.head, "--title", o.title, "--body", body, "--draft"]); }
    catch (e) { failure = e; }
    const after = await candidate(o);
    if (!after) throw failure ?? new Error("PR create result unknown; query marker before retry");
    fixed(o, after);
    must(after.body === body && after.title === o.title && after.isDraft, "PR creation readback mismatch");
    return { ...plan, status: "created", ...after };
  }
  return async function transport(operation, options) {
    const o = { labels: [], ...options }; validateTarget(o);
    const plan = { operation, provider: "github", repo: o.repo, mode: o.apply ? "apply" : "dry-run" };
    if (operation === "issue-read") { required(o, ["number"]); return { ...plan, kind: "issue", ...await readIssue(o.repo, o.number) }; }
    if (operation === "pr-read") { required(o, ["number"]); return { ...plan, kind: "pull-request", ...await readPull(o.repo, o.number) }; }
    if (operation === "issue-search") {
      required(o, ["query"]);
      const issues = await json(["issue", "list", "--repo", o.repo, "--search", o.query, "--state", o.state || "all", "--limit", o.limit || "20", "--json", "number,title,state,url,labels,updatedAt"]);
      return { ...plan, issues, exhaustive: false };
    }
    if (operation === "issue-create") {
      required(o, ["title", "body_file"]);
      Object.assign(plan, { title: o.title, body_file: o.body_file, labels: o.labels });
      if (!o.apply) return plan;
      const body = await readText(o.body_file);
      const args = ["issue", "create", "--repo", o.repo, "--title", o.title, "--body-file", o.body_file];
      for (const label of o.labels) args.push("--label", label);
      // Optional marker enables exact retry recovery for callers with durable ledgers.
      const find = async () => {
        if (!o.marker) return null;
        must(body.includes("<!-- " + o.marker + " -->"), "body must include marker");
        const list = await pages("repos/" + o.repo + "/issues?state=all");
        const found = list.filter(i => !i.pull_request && String(i.body ?? "").includes("<!-- " + o.marker + " -->"));
        must(found.length < 2, "multiple issues with marker");
        return found.length ? readIssue(o.repo, String(found[0].number)) : null;
      };
      const previous = await find();
      if (previous) { must(previous.body === body && previous.title === o.title, "existing issue content drift"); return { ...plan, status: "already-present", url: previous.url }; }
      let url;
      try { url = await run(args); } catch (error) { const recovered = await find(); if (!recovered) throw error; url = recovered.url; }
      const number = /\/issues\/(\d+)$/.exec(url)?.[1]; must(number, "unknown issue create result");
      const after = await readIssue(o.repo, number);
      must(after.body === body && after.title === o.title, "issue readback mismatch");
      return { ...plan, url: after.url, status: "created" };
    }
    if (operation === "issue-comment-close") {
      required(o, ["number", "comment_file", "marker"]);
      const comment = (await readText(o.comment_file)).trim(), marker = "<!-- " + o.marker + " -->";
      const before = await readIssue(o.repo, o.number);
      const exists = before.comments.some(c => String(c.body).includes(marker));
      const result = { ...plan, number: Number(o.number), url: before.url, state_before: before.state, marker: o.marker,
        comment_required: !exists, close_required: before.state !== "CLOSED", steps: [] };
      if (!o.apply) return result;
      if (!exists) { await run(["issue", "comment", o.number, "--repo", o.repo, "--body", comment + "\n\n" + marker]); result.steps.push("commented"); }
      else result.steps.push("comment-already-present");
      if (before.state !== "CLOSED") { await run(["issue", "close", o.number, "--repo", o.repo, "--reason", o.reason || "completed"]); result.steps.push("closed"); }
      const after = await readIssue(o.repo, o.number);
      must(after.state === "CLOSED" && after.comments.some(c => String(c.body).includes(marker)), "issue close readback mismatch");
      return { ...result, state_after: after.state, status: "closed" };
    }
    if (operation === "pr-create") return createPr(o, plan);
    if (["pr-update", "pr-ready"].includes(operation)) {
      required(o, ["number", "base_sha", "head_sha", "expected_body_sha256"]);
      must(/^[a-f0-9]{64}$/.test(o.expected_body_sha256), "invalid expected-body-sha256");
      const before = await readPull(o.repo, o.number); fixed(o, before);
      must(before.state === "OPEN", "PR is not open");
      if (operation === "pr-ready") {
        if (!o.apply) return { ...plan, number: before.number, ready_required: before.isDraft };
        if (before.isDraft) await run(["pr", "ready", o.number, "--repo", o.repo]);
        const after = await readPull(o.repo, o.number); fixed(o, after);
        must(!after.isDraft, "PR remained draft");
        return { ...plan, status: "ready", ...after };
      }
      required(o, ["title", "body_file", "marker"]);
      const body = await readText(o.body_file), marker = "<!-- " + o.marker + " -->";
      must(before.body.includes(marker) && body.includes(marker), "PR marker mismatch");
      if (!o.apply) return { ...plan, number: before.number, body_sha256: sha256(body) };
      await run(["pr", "edit", o.number, "--repo", o.repo, "--title", o.title, "--body", body]);
      const after = await readPull(o.repo, o.number);
      fixed({ ...o, expected_body_sha256: sha256(body) }, after);
      must(after.title === o.title, "PR title readback mismatch");
      return { ...plan, status: "updated", ...after };
    }
    throw new Error("unknown operation: " + operation);
  };
}
export function parseArgs(argv) {
  const [operation, ...rest] = argv, options = { labels: [] };
  const allowed = new Set(["repo", "number", "query", "state", "limit", "title", "body_file", "comment_file", "marker", "reason", "base", "head", "head_repo", "base_sha", "head_sha", "expected_body_sha256", "label"]);
  for (let i = 0; i < rest.length; i++) {
    if (rest[i] === "--apply") { options.apply = true; continue; }
    must(rest[i].startsWith("--"), "unexpected argument");
    const k = rest[i].slice(2).replaceAll("-", "_"), value = rest[++i];
    must(allowed.has(k) && value !== undefined && !value.startsWith("--"), "invalid option or missing value");
    if (k === "label") options.labels.push(value); else { must(!(k in options), "duplicate option"); options[k] = value; }
  }
  return { operation, options };
}
export const usage = `github-transport.mjs <operation> --repo OWNER/REPO [options]
issue-read | pr-read --number N
issue-search --query TEXT [--state all] [--limit 20]
issue-create --title TEXT --body-file PATH [--label LABEL] [--marker ID] [--apply]
issue-comment-close --number N --comment-file PATH --marker ID [--reason completed] [--apply]
pr-create --base BRANCH --head BRANCH|OWNER:BRANCH [--head-repo OWNER/REPO] --base-sha SHA --head-sha SHA --title TEXT --body-file PATH --marker ID [--apply]
pr-update --number N --base-sha SHA --head-sha SHA --expected-body-sha256 HASH --title TEXT --body-file PATH --marker ID [--apply]
pr-ready --number N --base-sha SHA --head-sha SHA --expected-body-sha256 HASH [--apply]
Defaults to dry-run; caller owns authorization and state. --apply never implies push, merge or release.`;
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const { operation, options } = parseArgs(process.argv.slice(2));
    if (!operation || ["--help", "-h", "help"].includes(operation)) console.log(usage);
    else console.log(JSON.stringify(await createTransport()(operation, options), null, 2));
  } catch (error) { console.error("ERROR: " + error.message); process.exitCode = 1; }
}
