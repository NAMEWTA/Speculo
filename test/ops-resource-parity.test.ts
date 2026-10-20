import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";
import { validateOpsResources } from "../src/ops-resources.js";
import type { JsonObject } from "../src/config.js";

test("OPS installer and standalone validator accept the same domain examples without mutation", async () => {
  const common = join(process.cwd(), "template/workflows/ops/common");
  const { resourceCases } = await import(pathToFileURL(join(common, "tests/resource-cases.mjs")).href);
  const { validateStatus } = await import(pathToFileURL(join(common, "tools/opslib/model.mjs")).href);
  const schema = JSON.parse(await readFile(join(common, "schemas/status.schema.json"), "utf8"));
  for (const c of resourceCases() as Array<{ name: string; valid: boolean; value: JsonObject }>) {
    const before = structuredClone(c.value);
    for (const [name, validate] of [["installer", () => validateOpsResources(c.value, schema)], ["standalone", () => validateStatus(c.value)]] as const) {
      if (c.valid) assert.doesNotThrow(validate, name + ": " + c.name);
      else assert.throws(validate, name + ": " + c.name);
    }
    assert.deepEqual(c.value, before);
  }
});
