/** The installer and standalone executor use the same OPS resource invariants. */
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import type { JsonObject } from "./config.js";

type ResourceValidator = {
  validateResourceSchema(value: unknown, schema: JsonObject): void;
  validateResourceState(value: JsonObject, schema: JsonObject): void;
};
const source = "template/workflows/ops/common/tools/opslib/resource-validation.mjs";
// These are the source and compiled npm layouts, never paths inferred from cwd.
const moduleUrl = [new URL("../" + source, import.meta.url), new URL("../../" + source, import.meta.url)]
  .find(url => existsSync(url));
if (!moduleUrl) throw new Error("OPS shared resource validator is missing from the package");
const validator = createRequire(import.meta.url)(fileURLToPath(moduleUrl)) as ResourceValidator;

export function validateOpsResourceSchema(value: unknown, schema: JsonObject): void {
  validator.validateResourceSchema(value, schema);
}
export function validateOpsResources(value: JsonObject, schema: JsonObject): void {
  validator.validateResourceState(value, schema);
}
