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
    if (!types.includes(t)) { errors.push(at + ": invalid type"); return; }
  }
  if (typeof value === "string") {
    if (rule.minLength && value.trim().length < rule.minLength) errors.push(at + ": empty");
    if (rule.pattern && !new RegExp(rule.pattern).test(value)) errors.push(at + ": invalid format");
    if (rule.format === "date-time" && (!/^\d{4}-\d{2}-\d{2}T/.test(value) || Number.isNaN(Date.parse(value)))) errors.push(at + ": invalid timestamp");
  }
  if (Array.isArray(value)) {
    if (rule.minItems && value.length < rule.minItems) errors.push(at + ": missing entries");
    if (rule.uniqueItems && new Set(value).size !== value.length) errors.push(at + ": duplicate entries");
    value.forEach((v,i) => check(v,rule.items ?? {},at+"["+i+"]",errors));
  } else if (value && typeof value === "object") {
    for (const k of rule.required ?? []) if (!(k in value)) errors.push(at + ": missing " + k);
    for (const [k,v] of Object.entries(value)) {
      if (rule.properties?.[k]) check(v,rule.properties[k],at+"."+k,errors);
      else if (rule.additionalProperties === false) errors.push(at + ": unknown " + k);
    }
  }
}
const specs = {
  "pull-request": ["pull-request.schema.json", ["Summary","Evidence","Before / After","Merge Risk","Authorization","Receipt","Recovery"]],
  retrospective: ["retrospective.schema.json", ["Scope","Evidence","Findings","Acceptance","Routes"]],
  "logic-prototype": ["logic-prototype.schema.json", ["Model","Scenarios","Evidence","Decisions","Handoff"]],
  "triage-run": ["triage-run.schema.json", ["Targets","Plan","Evidence","Authorization","Receipts","Recovery"]],
};
export function validateRecord(path, kind, parse, expectedChange = null) {
  const errors = [];
  if (!existsSync(path) || !lstatSync(path).isFile() || lstatSync(path).isSymbolicLink()) return { errors: [path + ": missing or unsafe record"], meta: {} };
  const {meta, body} = parse(path), spec = specs[kind];
  check(meta, JSON.parse(readFileSync(join(schemas,spec[0]),"utf8")), basename(path), errors);
  if (expectedChange && meta.change !== expectedChange) errors.push(path + ": change mismatch");
  if (kind === "logic-prototype" ? basename(dirname(path)) !== meta.id : basename(path) !== meta.id + ".md") errors.push(path + ": ID/path mismatch");
  for (const heading of spec[1]) {
    const section = new RegExp("^## " + heading.replace(/[.*+?^${}()|[\]\\]/g,"\\$&") + "\\r?\\n([\\s\\S]*?)(?=^## |$(?![\\s\\S]))","m").exec(body)?.[1];
    if (!section?.trim()) errors.push(path + ": missing or empty section " + heading);
  }
  if (kind === "pull-request") {
    if (meta.status === "ready" && meta.verification !== "passed") errors.push(path + ": ready PR requires passed verification");
    if (["draft","ready"].includes(meta.status) && !new RegExp("^https://github\\.com/" + String(meta.repo).replaceAll(".","\\.") + "/pull/[1-9]\\d*$").test(meta.url ?? "")) errors.push(path + ": missing matching PR URL");
  }
  if (kind === "retrospective" && (meta.sources ?? []).some(s => typeof s !== "string" || !s.trim() || /(?:[A-Za-z]:[\\/]|\b(?:token|secret)=)/i.test(s))) errors.push(path + ": unsafe source");
  if (kind === "triage-run" && meta.status === "completed" && meta.mode !== "ci-security") {
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
  const folder = kind === "retrospective" ? "retro" : "pull-requests", root=join(change,folder);
  const errors=[], records=[];
  if (!existsSync(root)) return {errors,records};
  if (lstatSync(root).isSymbolicLink() || !lstatSync(root).isDirectory()) return {errors:[root + ": unsafe directory"],records};
  for (const file of readdirSync(root)) {
    const result=validateRecord(join(root,file),kind,parse,basename(change));
    errors.push(...result.errors); records.push(result);
  }
  return {errors,records};
}
