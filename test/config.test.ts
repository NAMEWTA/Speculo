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


describe("review R2: JSON own-key semantics", () => {
  const json = (text: string) => JSON.parse(text);
  const special = '{"__proto__":{"safe_marker":true},"constructor":"custom","toString":"text","hasOwnProperty":3}';
  it("preserves all allowed special keys, including nested data, without changing prototypes", () => {
    const local = json(special); local.nested = json(special);
    const before = JSON.stringify(local);
    const result = reconcileConfig({ baseline: { nested: {} }, local, incoming: { nested: {} }, allowsUnknown: () => true });
    assert.deepEqual(JSON.parse(JSON.stringify(result.value)), local);
    assert.equal(Object.getPrototypeOf(result.value), Object.prototype);
    assert.equal(Object.getPrototypeOf(result.value.nested), Object.prototype);
    assert.equal(Object.hasOwn(Object.prototype, "safe_marker"), false);
    assert.equal(JSON.stringify(local), before);
    assert.equal(Object.hasOwn(result.value, "__proto__"), true);
  });
  it("handles incoming and baseline special keys with the normal three-way merge rules", () => {
    const baseline = json('{"__proto__":{"default":1},"constructor":"old","toString":"old"}');
    const local = json('{"__proto__":{"default":1},"constructor":"user","toString":"old"}');
    const incoming = json('{"__proto__":{"default":2},"constructor":"new","hasOwnProperty":true}');
    const result = reconcileConfig({ baseline, local, incoming, allowsUnknown: () => true });
    assert.deepEqual(result.value, json('{"__proto__":{"default":2},"constructor":"user","hasOwnProperty":true}'));
    assert.deepEqual(result.removedPaths, ["toString"]);
  });
  it("counts disallowed special keys as explicit removals and still rejects real type conflicts", () => {
    const result = reconcileConfig({ local: json(special), incoming: {}, allowsUnknown: () => false });
    assert.deepEqual(result.value, {});
    assert.deepEqual(result.removedPaths, ["__proto__", "constructor", "hasOwnProperty", "toString"]);
    assert.equal(result.stats.removed, 4);
    assert.throws(() => reconcileConfig({ baseline: { constructor: 1 }, local: { constructor: "custom" }, incoming: { constructor: 2 }, allowsUnknown: () => true }), /expected number/);
  });
});
