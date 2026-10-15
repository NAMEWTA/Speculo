import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
await import(pathToFileURL(join(process.cwd(), 'template/workflows/specdev/common/tools/tests/review-working-tree.test.mjs')).href);
await import(pathToFileURL(join(process.cwd(), 'template/workflows/specdev/common/tools/tests/review-evidence.test.mjs')).href);
