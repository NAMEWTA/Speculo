import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { reconcileConfig } from "../src/config.js";

describe("configuration reconciliation", () => {
  it("applies template additions, deletions, and untouched default updates", () => {
    const result = reconcileConfig({
      baseline: { keep: 1, remove: true, update: "old" },
      local: { keep: 1, remove: true, update: "old" },
      incoming: { keep: 1, update: "new", add: false },
      allowsUnknown: () => false,
    });
    assert.deepEqual(result.value, { add: false, keep: 1, update: "new" });
    assert.deepEqual(result.stats, { added: 1, updated: 1, preserved: 0, removed: 1 });
    assert.deepEqual(result.removedPaths, ["remove"]);
  });

  it("preserves user overrides while updating unrelated defaults", () => {
    const result = reconcileConfig({
      baseline: { user: "old", managed: "old" },
      local: { user: "custom", managed: "old", extension: { enabled: true } },
      incoming: { user: "new", managed: "new" },
      allowsUnknown: () => true,
    });
    assert.deepEqual(result.value, { extension: { enabled: true }, managed: "new", user: "custom" });
    assert.equal(result.stats.preserved, 2);
    assert.equal(result.stats.updated, 1);
  });

  it("bootstraps without a baseline conservatively", () => {
    const result = reconcileConfig({
      local: { setting: "local", extension: 1 },
      incoming: { setting: "default", added: true },
      allowsUnknown: () => true,
    });
    assert.deepEqual(result.value, { added: true, extension: 1, setting: "local" });
  });

  it("rejects incompatible user value types", () => {
    assert.throws(() => reconcileConfig({
      baseline: { limit: 1 },
      local: { limit: "custom" },
      incoming: { limit: 2 },
      allowsUnknown: () => false,
    }), /has type string; expected number/);
  });
});
