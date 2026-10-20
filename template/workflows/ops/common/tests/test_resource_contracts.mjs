import assert from "node:assert/strict";
import test from "node:test";
import { validateStatus } from "../tools/opslib/model.mjs";
import { resourceCases } from "./resource-cases.mjs";

for (const c of resourceCases()) {
  test("standalone resource contract: " + c.name, () => {
    const before = structuredClone(c.value);
    if (c.valid) assert.doesNotThrow(() => validateStatus(c.value));
    else assert.throws(() => validateStatus(c.value));
    assert.deepEqual(c.value, before, "validation must not normalize or mutate caller state");
  });
}
