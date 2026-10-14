// Run the distributed, dependency-free scope behavior tests in the regular suite.
import { join } from "node:path";
import { pathToFileURL } from "node:url";

await import(pathToFileURL(join(process.cwd(), "template/workflows/specdev/common/tools/tests/review-source-files.test.mjs")).href);
