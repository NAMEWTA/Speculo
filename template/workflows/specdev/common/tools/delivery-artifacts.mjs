import { existsSync, lstatSync, readFileSync, readdirSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

const schemas = join(dirname(fileURLToPath(import.meta.url)), "..", "schemas");
function check(value, rule, at, errors) {
  if (rule.anyOf) {
    if (!rule.anyOf.some(r => { const e=[]; check(value,r,at,e); return !e.length; })) errors.push(at + ": invalid value");
    return;
  }
  if (rule.const !== undefined && value !== rule.const) errors.push(at + ": invalid constant");
  if (rule.enum && !rule.enum.includes(value)) errors.push(at + ": invalid enum");
  if (rule.type) {
    const types = Array.isArray(rule.type) ? rule.type : [rule.type];
    const t = value === null ? "null" : Array.isArray(value) ? "array" : typeof value;
    if (!types.includes(t) && !(types.includes("integer") && Number.isInteger(value))) { errors.push(at + ": invalid type"); return; }
  }
  if (typeof value === "string") {
    if (rule.minLength && value.trim().length < rule.minLength) errors.push(at + ": empty");
    if (rule.pattern && !new RegExp(rule.pattern).test(value)) errors.push(at + ": invalid format");
    if (rule.format === "date-time" && (!/^\d{4}-\d{2}-\d{2}T/.test(value) || Number.isNaN(Date.parse(value)))) errors.push(at + ": invalid timestamp");
  }
  if (typeof value === 'number' && rule.minimum !== undefined && value < rule.minimum) errors.push(at + ': below minimum');
  if (Array.isArray(value)) {
    if (rule.minItems && value.length < rule.minItems) errors.push(at + ": missing entries");
    if (rule.uniqueItems && new Set(value).size !== value.length) errors.push(at + ": duplicate entries");
    value.forEach((v,i) => check(v,rule.items ?? {},at+"["+i+"]",errors));
  } else if (value && typeof value === "object") {
    for (const k of rule.required ?? []) if (!(k in value)) errors.push(at + ": missing " + k);
    for (const [k,v] of Object.entries(value)) {
      if (Object.hasOwn(rule.properties ?? {},k)) check(v,rule.properties[k],at+"."+k,errors);
      else if (rule.additionalProperties === false) errors.push(at + ": unknown " + k);
    }
  }
}
const specs = {
  "delivery": ["delivery.schema.json", ["来源完成回写", "发布投影", "恢复"]],
  "pull-request": ["pull-request.schema.json", ["Summary","Evidence","Before / After","Merge Risk","Authorization","Receipt","Recovery"]],
  "logic-prototype": ["logic-prototype.schema.json", ["Model","Scenarios","Evidence","Decisions","Handoff"]],
  "delivery-run": ["delivery-run.schema.json", ["Targets","Plan","Evidence","Authorization","Receipts","Recovery"]],
};
export function validateRecord(path, kind, parse, expectedChange = null) {
  const errors = [];
  if (!existsSync(path) || !lstatSync(path).isFile() || lstatSync(path).isSymbolicLink()) return { errors: [path + ": missing or unsafe record"], meta: {} };
  const {meta, body} = parse(path), spec = specs[kind];
  check(meta, JSON.parse(readFileSync(join(schemas,spec[0]),"utf8")), basename(path), errors);
  if (expectedChange && meta.change !== expectedChange) errors.push(path + ": change mismatch");
  if (kind === "delivery" ? basename(path) !== "delivery.md" : kind === "logic-prototype" ? basename(dirname(path)) !== meta.id : basename(path) !== meta.id + ".md") errors.push(path + ": ID/path mismatch");
  for (const heading of spec[1]) {
    const section = new RegExp("^## " + heading.replace(/[.*+?^${}()|[\]\\]/g,"\\$&") + "\\r?\\n([\\s\\S]*?)(?=^## |$(?![\\s\\S]))","m").exec(body)?.[1];
    if (!section?.trim()) errors.push(path + ": missing or empty section " + heading);
  }
  if (kind === "pull-request") {
    if (meta.status === "ready" && meta.verification !== "passed") errors.push(path + ": ready PR requires passed verification");
    if (["draft","ready"].includes(meta.status) && !new RegExp("^https://github\\.com/" + String(meta.repo).replaceAll(".","\\.") + "/pull/[1-9]\\d*$").test(meta.url ?? "")) errors.push(path + ": missing matching PR URL");
  }
  if (kind === "delivery-run" && meta.status === "completed" && meta.mode !== "ci-security") {
    if (meta.npm_target === "unknown") errors.push(path + ": completed release target cannot be unknown");
    if (!meta.commit_sha) errors.push(path + ": completed release requires fixed commit");
    const targets = Array.isArray(meta.targets) ? meta.targets : [];
    if (!targets.some(t => t.required)) errors.push(path + ": completed preflight/release requires explicit targets");
    if (meta.npm_target === "required" && !targets.some(t => t.kind === "npm" && t.required)) errors.push(path + ": missing required npm target");
    if (meta.npm_target === "not-required" && targets.some(t => t.kind === "npm" && t.required)) errors.push(path + ": conflicting npm target decision");
    for (const target of targets.filter(t => t.required)) {
      if (target.kind === "npm" && (!target.version || !target.registry || !target.dist_tag)) errors.push(path + ": incomplete npm target metadata");
      if (meta.mode === "release" && (target.observed !== "verified" || !target.receipt?.trim())) errors.push(path + ": required target has no verified receipt");
    }
  }
  if (kind === "logic-prototype") {
    const htmlPath = join(dirname(path),"index.html");
    if (!existsSync(htmlPath) || lstatSync(htmlPath).isSymbolicLink()) errors.push(path + ": missing or unsafe index.html");
    else {
      const html = readFileSync(htmlPath,"utf8");
      if (/<(?:script|iframe)\b[^>]*\bsrc\s*=|<link\b[^>]*\bhref\s*=|\b(?:fetch|WebSocket|XMLHttpRequest|sendBeacon)\s*\(|@import\b|url\(\s*["']?(?:https?:|\/\/)|\b(?:src|href)\s*=\s*["'](?:https?:|\/\/)/i.test(html)) errors.push(path + ": logic prototype must be standalone and offline");
      if (!/reset/i.test(html) || !/<script\b/i.test(html)) errors.push(path + ": missing reset or inline logic");
      if (meta.status === "ready") {
        if (meta.verification !== "passed") errors.push(path + ": ready logic requires browser verification");
        if (meta.html_sha256 !== createHash("sha256").update(html).digest("hex")) errors.push(path + ": HTML digest mismatch");
      }
    }
  }
  return {errors,meta,body};
}
export function validateRecords(change, kind, parse) {
  const root=join(change,"pull-requests");
  const errors=[], records=[];
  if (!existsSync(root)) return {errors,records};
  if (lstatSync(root).isSymbolicLink() || !lstatSync(root).isDirectory()) return {errors:[root + ": unsafe directory"],records};
  for (const file of readdirSync(root)) {
    const result=validateRecord(join(root,file),kind,parse,basename(change));
    errors.push(...result.errors); records.push(result);
  }
  return {errors,records};
}

export { check as checkSchema };

export const VALID_TICKET_KIND = new Set([
  "bug",
  "feature",
  "refactor",
  "investigation",
  "operations",
  "documentation",
  "review",
]);
export const VALID_PUBLISH_ROW_STATE = new Set([
  "planned",
  "created",
  "commented",
  "closed",
  "skipped:cancelled",
  "skipped:excluded",
  "failed",
]);
export const FORBIDDEN_PUBLISH_LABELS = new Set([
  "needs-triage",
  "needs-info",
  "ready-for-agent",
  "ready-for-human",
  "wontfix",
  "duplicate",
  "invalid",
  "stale",
]);
export const COUNTED_PUBLISH_STATES = new Set(["closed", "created", "commented"]);

function parsePublishLedger(body) {
  const rows = [];
  for (const line of body.split(/\r?\n/)) {
    if (!/^\|/.test(line) || /^\|\s*-+/.test(line) || /^\|\s*ticket\s*\|/i.test(line)) continue;
    const cells = line.split("|").map((cell) => cell.trim());
    const inner = cells.slice(1, cells.length - 1);
    if (inner.length < 8) continue;
    rows.push({
      ticket: inner[0],
      kind: inner[1],
      labels: inner[2],
      number: inner[3],
      url: inner[4],
      marker: inner[5],
      sha256: inner[6],
      state: inner[7],
    });
  }
  return rows;
}

export function validatePublish(path, expectedChange, errors, parse) {
  if (!existsSync(path) || !lstatSync(path).isFile() || lstatSync(path).isSymbolicLink()) {
    errors.push("missing publish.md ledger");
    return null;
  }
  const { meta, body } = parse(path);
  const required = [
    "schema_version",
    "artifact",
    "change",
    "mode",
    "repo",
    "publish_action",
    "classification",
    "include_cancelled",
    "origin",
    "updated_at",
  ];
  const missing = required.filter((key) => !(key in meta));
  if (missing.length) errors.push(`publish.md: missing keys ${JSON.stringify(missing)}`);
  if (meta.schema_version !== 2 || meta.artifact !== "publish") {
    errors.push("publish.md: artifact/schema_version must be publish/2");
  }
  if (meta.change !== expectedChange) errors.push("publish.md: change must equal directory name");
  if (meta.mode !== "publish") errors.push(`publish.md: invalid mode ${meta.mode}`);
  if (!new Set(["pending", "published", "publish-failed", "waived"]).has(meta.publish_action)) {
    errors.push(`publish.md: invalid publish_action ${meta.publish_action}`);
  }
  if (!new Set(["local", "intake"]).has(meta.origin)) {
    errors.push(`publish.md: invalid origin ${meta.origin}`);
  }
  if (typeof meta.repo !== "string" || !/.+\/.+/.test(meta.repo)) {
    errors.push("publish.md: repo must be owner/repo");
  }
  for (const heading of ["## 发布计划", "## 账本", "## 计数", "## 重试"]) {
    if (!body.includes(heading)) errors.push(`publish.md: missing '${heading}'`);
  }
  const rows = parsePublishLedger(body);
  if (!rows.length) errors.push("publish.md: ledger table has no ticket rows");
  const mixed = meta.classification === "mixed";
  if (![...VALID_TICKET_KIND, 'mixed'].includes(meta.classification)) errors.push("publish.md: invalid classification");
  for (const row of rows) {
    if (!/^T-\d{2,}$/.test(row.ticket)) {
      errors.push(`publish.md: invalid ticket id ${row.ticket}`);
    }
    if (!VALID_PUBLISH_ROW_STATE.has(row.state)) {
      errors.push(`publish.md: ${row.ticket}: invalid state ${row.state}`);
    }
    const labels = row.labels.split(",").map((item) => item.trim()).filter(Boolean);
    for (const label of labels) {
      if (FORBIDDEN_PUBLISH_LABELS.has(label)) {
        errors.push(`publish.md: ${row.ticket}: forbidden label ${label}`);
      }
    }
    const skipped = row.state.startsWith("skipped:");
    if (!skipped && !VALID_TICKET_KIND.has(row.kind)) {
      errors.push(`publish.md: ${row.ticket}: invalid kind ${row.kind}`);
    }
    if (mixed && !skipped && !VALID_TICKET_KIND.has(row.kind)) {
      errors.push(`publish.md: mixed change requires kind on ${row.ticket}`);
    }
    if (COUNTED_PUBLISH_STATES.has(row.state) || row.state === "closed") {
      if (!/^\d+$/.test(row.number)) {
        errors.push(`publish.md: ${row.ticket}: ${row.state} row requires issue number`);
      }
      if (!String(row.url).startsWith("https://github.com/")) {
        errors.push(`publish.md: ${row.ticket}: ${row.state} row requires GitHub url`);
      }
      const expectedMarker = `specdev:${expectedChange}:${row.ticket}:published`;
      if (row.marker !== expectedMarker) {
        errors.push(`publish.md: ${row.ticket}: marker must be ${expectedMarker}`);
      }
    }
    if (row.state === "closed" || row.state === "created" || row.state === "commented") {
      if (!labels.includes("specdev:published")) {
        errors.push(`publish.md: ${row.ticket}: missing specdev:published`);
      }
      const originLabel = meta.origin === "intake" ? "origin:intake" : "origin:local";
      if (!labels.includes(originLabel)) {
        errors.push(`publish.md: ${row.ticket}: missing ${originLabel}`);
      }
    }
  }
  if (meta.publish_action === 'published' && rows.some(row => !['closed','skipped:cancelled','skipped:excluded'].includes(row.state))) errors.push('publish.md: published requires all rows closed or explicitly skipped');
  return { path, meta, body, rows };
}
