#!/usr/bin/env node
// Verify the published CLI entry: built, shebang-prefixed, and responds to --help.
// Run after `pnpm build`. Used by CI and the release workflow.
import { existsSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const bin = resolve(root, "dist/src/cli.js");

if (!existsSync(bin)) {
  console.error(`verify-bin: missing build artifact ${bin}. Run \`pnpm build\` first.`);
  process.exit(1);
}

const firstLine = readFileSync(bin, "utf8").split("\n", 1)[0];
if (!firstLine.startsWith("#!/usr/bin/env node")) {
  console.error(`verify-bin: ${bin} is missing the '#!/usr/bin/env node' shebang (got: ${firstLine}).`);
  process.exit(1);
}

try {
  const out = execFileSync(process.execPath, [bin, "--help"], { encoding: "utf8" });
  if (!/speculo init/.test(out) || !/speculo migrate/.test(out)) {
    console.error("verify-bin: `speculo --help` did not print the expected usage banner.");
    process.exit(1);
  }
} catch (err) {
  console.error(`verify-bin: failed to run \`speculo --help\`: ${err.message}`);
  process.exit(1);
}

console.log("verify-bin: OK - dist/src/cli.js exposes init and migrate through --help.");
