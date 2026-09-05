import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { assertCapability, assertToolEffect, assertTransition, riskRequiresApproval, type CapabilityProfile } from "../src/kernel.js";

const profile: CapabilityProfile = {
  schema_version: 1,
  model: { id: "fixture", modalities: ["text"], context_window: 100000, max_output: 10000, reasoning_levels: ["standard"] },
  tools: { classes: ["read-only", "local-reversible"], parallel: true, programmatic: true },
  execution: { sandbox: true, network: false, filesystem_roots: ["."], data_retention: "session" },
  memory: { compaction: true, persistent: true, cache: true },
};

describe("runtime kernel", () => {
  it("enforces lifecycle transitions and risk approvals", () => {
    assert.doesNotThrow(() => assertTransition("draft", "active"));
    assert.throws(() => assertTransition("draft", "completed"), /invalid-change-transition/);
    assert.equal(riskRequiresApproval("read-only"), false);
    assert.equal(riskRequiresApproval("production-critical"), true);
  });

  it("performs provider-neutral capability checks", () => {
    assert.doesNotThrow(() => assertCapability(profile, { context_window: 50000, sandbox: true, parallel: true }));
    assert.throws(() => assertCapability(profile, { network: true }), /capability-network-required/);
    assert.throws(() => assertCapability(profile, { context_window: 200000 }), /capability-context-window-insufficient/);
  });

  it("keeps tool effect declarations aligned with stage risk", () => {
    assert.doesNotThrow(() => assertToolEffect("local-reversible", "local-reversible"));
    assert.throws(() => assertToolEffect("read-only", "external-mutation"), /tool-effect-risk-mismatch/);
  });
});
