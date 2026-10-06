#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { evidencePath, sha256, verifyObservation } from "./lib/evaluation-evidence.mjs";
import { resolve, join } from "node:path";
import { pathToFileURL } from "node:url";

const kinds = new Set(["capability", "context", "tool", "transition", "approval", "evidence"]);
const object = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const text = (v) => typeof v === "string" && !!v.trim();
const hash = sha256;
const subset = (expected, actual) => object(expected) && object(actual) && Object.entries(expected).every(([k, v]) => JSON.stringify(actual[k]) === JSON.stringify(v));

async function artifactPath(root, caseId, path) {
  if (!text(path)) throw new Error("unsafe artifact path");
  return evidencePath(root, `${caseId}/${path}`);
}

/** Evaluates supplied trace + actual fixture files, never authenticates external tools or model self-reports. */
export async function evaluateScenarios(scenarios, trace = null, artifactRoot = null, options = {}) {
  if (!["fixtures", "artifacts", "observed"].includes(options.require ?? "fixtures")) throw new Error("invalid evaluation requirement");
  if (!Array.isArray(scenarios) || !scenarios.length) throw new Error("scenario fixture must be a non-empty array");
  const ids = new Set();
  for (const scenario of scenarios) {
    if (!object(scenario) || !["id", "workflow", "trigger", "expected"].every((key) => text(scenario[key])) ||
        !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(scenario.id) || ids.has(scenario.id)) throw new Error("invalid/duplicate scenario");
    ids.add(scenario.id);
  }
  const base = { schema_version: 2, scenarios: scenarios.length, score: null, evaluation_level: trace === null ? "fixtures" : "artifacts", release_eligible: false, evidence_scope: "supplied trace and local fixture artifacts; tool provenance not authenticated" };
  if (trace === null) return { ...base, trace_events: 0, status: "fixture-ready", behavior: "not-evaluated", exit_code: options.require && options.require !== "fixtures" ? 2 : 0, cases: [] };
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
    if (assertions.forbidden_reads !== undefined && !Array.isArray(assertions.forbidden_reads)) throw new Error("forbidden reads must be an array");
    for (const path of assertions.forbidden_reads ?? []) {
      if (!text(path)) throw new Error("invalid forbidden read");
      if (events.some((e) => e.kind === "context" && (e.payload.path === path || e.payload.path?.startsWith(path.endsWith("/") ? path : `${path}/`)))) failures.push("forbidden read: " + path);
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
  const result = { ...base, trace_events: trace.length, status: passed === cases.length ? "passed-artifact-gates" : "blocked-scenarios", behavior: passed === cases.length ? "artifact-gates-passed" : "not-proven", passed, not_evaluated: unevaluated, cases, exit_code: passed === cases.length ? 0 : 2 };
  if (options.require === "observed" || options.bundleRoot) {
    try {
      const observation = await verifyObservation({ ...options, scenarios, trace, artifactRoot });
      if (result.exit_code === 0) return { ...result, evaluation_level: "observed", status: "passed-observed-gates", behavior: "observer-gates-passed", release_eligible: true, observation, evidence_scope: "declared assertions and complete reads/effects/artifacts attested by the configured independent observer; not general semantic correctness" };
    } catch (error) {
      return { ...result, status: "blocked-observer-evidence", behavior: "not-proven", exit_code: 2, evidence_error: error.message };
    }
  }
  return result;
}
export function parseEvaluationArgs(args) {
  const options = {}, positional = [];
  const flags = new Map([["--require", "require"], ["--bundle", "bundleRoot"], ["--trust", "trustPath"], ["--repo", "repoRoot"]]);
  for (let i = 0; i < args.length; i++) {
    const key = flags.get(args[i]);
    if (key) {
      if (!args[i + 1] || args[i + 1].startsWith("--") || key in options) throw new Error(`missing or duplicate ${args[i]}`);
      options[key] = args[++i];
    } else if (args[i].startsWith("--")) throw new Error(`unknown option ${args[i]}`);
    else positional.push(args[i]);
  }
  if (positional.length > 3) throw new Error("usage: evaluate-scenarios.mjs [fixtures.json] [trace.jsonl] [artifact-root] [--require fixtures|artifacts|observed] [--bundle directory --trust keys.json --repo repository]");
  if (options.bundleRoot && positional.length > 1) throw new Error("--bundle cannot be combined with trace/artifact positional arguments");
  return { options, positional };
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const { options, positional } = parseEvaluationArgs(process.argv.slice(2));
    const scenarios = JSON.parse(await readFile(resolve(positional[0] ?? "test/fixtures/scenarios.json"), "utf8"));
    const tracePath = options.bundleRoot ? await evidencePath(options.bundleRoot, "trace.jsonl") : positional[1];
    const trace = tracePath ? (await readFile(resolve(tracePath), "utf8")).split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line)) : null;
    const artifactRoot = options.bundleRoot ? join(resolve(options.bundleRoot), "artifacts") : positional[2] ? resolve(positional[2]) : null;
    const result = await evaluateScenarios(scenarios, trace, artifactRoot, options);
    console.log(JSON.stringify(result, null, 2)); process.exitCode = result.exit_code;
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
