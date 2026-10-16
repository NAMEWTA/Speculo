// Build-only image: npm may omit dotfiles/empty directories and normalize modes.
// Source of truth remains skills-hub/. This artifact is never copied to a project.
import { readFile, rm, writeFile } from 'node:fs/promises';
import { discoverHubCatalog } from '../dist/src/hub-catalog.js';
const output = 'dist/src/hub-resources.json';
const before = await readFile(output).catch(() => null);
await rm(output, { force: true });
try {
  const catalog = await discoverHubCatalog(process.cwd());
  const image = { schema_version: 1, packages: [...catalog.values()].map(skill => ({
    id: skill.id, nodes: [...skill.tree].map(([path, node]) => ({ path, node })),
  })) };
  await writeFile(output, JSON.stringify(image) + '\n');
  console.log(`Hub bundle: ${catalog.size} complete packages (bytes, dotfiles, directories and modes)`);
} catch (error) {
  if (before) await writeFile(output, before);
  throw error;
}
