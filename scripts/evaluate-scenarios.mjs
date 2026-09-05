#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const fixturePath = resolve(process.argv[2] ?? "test/fixtures/scenarios.json");
const tracePath = process.argv[3] ? resolve(process.argv[3]) : null;
const scenarios = JSON.parse(await readFile(fixturePath, "utf8"));
if (!Array.isArray(scenarios) || scenarios.length < 20) throw new Error("scenario fixture must contain at least 20 scenarios");
const required = new Set(["id", "workflow", "trigger", "expected"]);
for (const scenario of scenarios) {
  if (!scenario || [...required].some((key) => typeof scenario[key] !== "string")) throw new Error("scenario fixture has an invalid entry");
}

let trace = [];
if (tracePath) {
  const lines = (await readFile(tracePath, "utf8")).split(/\r?\n/).filter(Boolean);
  trace = lines.map((line) => JSON.parse(line));
  let sequence = 0;
  for (const event of trace) {
    if (event.schema_version !== 1 || event.sequence !== ++sequence || typeof event.kind !== "string" || !event.payload || typeof event.payload !== "object") {
      throw new Error("trace is not a valid append-only v1 event stream");
    }
  }
}

const result = {
  schema_version: 1,
  scenarios: scenarios.length,
  trace_events: trace.length,
  score: tracePath ? (trace.length > 0 ? 1 : 0) : null,
  status: tracePath ? (trace.length > 0 ? "passed-structural-gate" : "blocked-no-trace") : "fixture-ready",
};
process.stdout.write(JSON.stringify(result, null, 2) + "\n");
