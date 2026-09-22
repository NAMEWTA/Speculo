#!/usr/bin/env node
import { createHash } from "node:crypto";
import { lstat, readFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import { pathToFileURL } from "node:url";

const kinds = new Set(["capability", "context", "tool", "transition", "approval", "evidence"]);
const object = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const text = (v) => typeof v === "string" && !!v.trim();
const hash = (v) => createHash("sha256").update(v).digest("hex");
const subset = (expected, actual) => object(expected) && object(actual) && Object.entries(expected).every(([k, v]) => JSON.stringify(actual[k]) === JSON.stringify(v));

async function artifactPath(root, caseId, path) {
  if (!text(path) || /[\\:\x00-\x1f]/.test(path) || path.startsWith("/") || path.split("/").some((p) => !p || p === "." || p === "..")) throw new Error("unsafe artifact path");
  const full = join(root, caseId, path);
  let current = resolve(root);
  for (const part of [caseId, ...path.split("/")]) {
    current = join(current, part);
    try { if ((await lstat(current)).isSymbolicLink()) throw new Error("artifact symlink is not permitted"); }
    catch (error) { if (error.code !== "ENOENT") throw error; }
  }
  return full;
}

/** Evaluates supplied trace + actual fixture files, never authenticates external tools or model self-reports. */
export async function evaluateScenarios(scenarios, trace = null, artifactRoot = null) {
  if (!Array.isArray(scenarios) || !scenarios.length) throw new Error("scenario fixture must be a non-empty array");
  const ids = new Set();
  for (const scenario of scenarios) {
    if (!object(scenario) || !["id", "workflow", "trigger", "expected"].every((key) => text(scenario[key])) ||
        !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(scenario.id) || ids.has(scenario.id)) throw new Error("invalid/duplicate scenario");
    ids.add(scenario.id);
  }
  const base = { schema_version: 2, scenarios: scenarios.length, score: null, evidence_scope: "supplied trace and local fixture artifacts; tool provenance not authenticated" };
  if (trace === null) return { ...base, trace_events: 0, status: "fixture-ready", behavior: "not-evaluated", exit_code: 0, cases: [] };
  if (!Array.isArray(trace)) throw new Error("trace must be an event array");
  let sequence = 0;
  const traceErrors = [];
  for (const e of trace) {
    if (!object(e) || e.schema_version !== 1 || e.sequence !== ++sequence || !kinds.has(e.kind) || !object(e.payload) || !ids.has(e.scenario_id)) traceErrors.push(`event ${sequence}: invalid structure, kind or scenario_id`);
  }
  if (traceErrors.length || !trace.length) return { ...base, trace_events: trace.length, status: "blocked-trace", behavior: "not-evaluated", exit_code: 2, trace_errors: traceErrors, cases: [] };
  const cases = [];
  for (const scenario of scenarios) {
    const events = trace.filter((e) => e.scenario_id === scenario.id), assertions = scenario.assertions;
    const failures = [];
    if (!object(assertions) || !Array.isArray(assertions.artifacts) || !assertions.artifacts.length || !artifactRoot) {
      cases.push({ id: scenario.id, status: "not-evaluated", reason: "requires artifact assertions and an explicit fixture root, not an expected prose string" });
      continue;
    }
    if (!events.length) failures.push("missing scenario trace");
    if (assertions.events !== undefined && !Array.isArray(assertions.events)) throw new Error("events assertions must be an array");
    if (assertions.forbidden_effects !== undefined && !Array.isArray(assertions.forbidden_effects)) throw new Error("forbidden effects must be an array");
    for (const effect of assertions.forbidden_effects ?? []) {
      if (!text(effect)) throw new Error("invalid forbidden effect");
      if (events.some((e) => e.kind === "tool" && e.payload.effect === effect)) failures.push("forbidden effect: " + effect);
    }
    let index = -1;
    for (const required of assertions.events ?? []) {
      if (!object(required) || !kinds.has(required.kind) || !object(required.payload)) throw new Error("invalid event assertion");
      const next = events.findIndex((e, i) => i > index && e.kind === required.kind && subset(required.payload, e.payload));
      if (next < 0) failures.push("missing/out-of-order event: " + required.kind); else index = next;
    }
    for (const a of assertions.artifacts) {
      try {
        if (!object(a) || !text(a.path) || !["sha256", "equals", "absent"].some((key) => key in a)) throw new Error("artifact requires a SHA-256, exact text or absence assertion");
        if (a.sha256 !== undefined && !/^[a-f0-9]{64}$/.test(a.sha256)) throw new Error("invalid artifact digest assertion");
        if (a.equals !== undefined && typeof a.equals !== "string") throw new Error("invalid exact content assertion");
        if (a.absent !== undefined && a.absent !== true) throw new Error("absent must be true");
        if (a.absent === true && ("equals" in a || "sha256" in a)) throw new Error("absence cannot be combined with content assertions");
        const path = await artifactPath(artifactRoot, scenario.id, a.path);
        let data = null;
        try { data = await readFile(path); } catch (error) { if (error.code !== "ENOENT") throw error; }
        if (a.absent === true) { if (data !== null) throw new Error("unexpected artifact exists"); }
        else {
          if (data === null) throw new Error("artifact missing");
          if (a.sha256 !== undefined && hash(data) !== a.sha256) throw new Error("artifact digest differs");
          if (a.equals !== undefined && !data.equals(Buffer.from(a.equals))) throw new Error("artifact contents differ");
        }
      } catch (error) { failures.push(`${a?.path ?? "artifact"}: ${error.message}`); }
    }
    cases.push({ id: scenario.id, status: failures.length ? "failed" : "passed", failures });
  }
  const passed = cases.filter((c) => c.status === "passed").length;
  const unevaluated = cases.filter((c) => c.status === "not-evaluated").length;
  return { ...base, trace_events: trace.length, status: passed === cases.length ? "passed-artifact-gates" : "blocked-scenarios", behavior: passed === cases.length ? "artifact-gates-passed" : "not-proven", passed, not_evaluated: unevaluated, cases, exit_code: passed === cases.length ? 0 : 2 };
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    if (process.argv.length > 5) throw new Error("usage: evaluate-scenarios.mjs [fixtures.json] [trace.jsonl] [artifact-root]");
    const scenarios = JSON.parse(await readFile(resolve(process.argv[2] ?? "test/fixtures/scenarios.json"), "utf8"));
    const trace = process.argv[3] ? (await readFile(resolve(process.argv[3]), "utf8")).split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line)) : null;
    const result = await evaluateScenarios(scenarios, trace, process.argv[4] ? resolve(process.argv[4]) : null);
    console.log(JSON.stringify(result, null, 2)); process.exitCode = result.exit_code;
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
