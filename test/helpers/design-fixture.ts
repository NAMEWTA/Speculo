import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, basename } from 'node:path';
import { pathToFileURL } from 'node:url';
import { stringify } from 'yaml';
import { deflateSync } from 'node:zlib';

const workflow = join(process.cwd(), 'template/workflows/specdev');
export const designTools = () => import(pathToFileURL(join(workflow, 'common/tools/design-artifacts.mjs')).href);
export const designValidator = () => import(pathToFileURL(join(workflow, 'specdev-p-prototype/scripts/validate-design-package.mjs')).href);
export const document = (meta: unknown, body: string) => `---\n${stringify(meta)}---\n\n${body}\n`;
export const time = '2026-10-14T00:00:00Z';

// Synthetic PNG data is only a validator fixture, never claimed as a browser run.
export function fixturePNG(width: number, height: number): Buffer {
  function chunk(type: string, data: Buffer): Buffer {
    const bytes = Buffer.concat([Buffer.from(type), data]);
    let crc = 0xffffffff;
    for (const byte of bytes) { crc ^= byte; for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0); }
    const size = Buffer.alloc(4), checksum = Buffer.alloc(4); size.writeUInt32BE(data.length); checksum.writeUInt32BE((crc ^ 0xffffffff) >>> 0);
    return Buffer.concat([size, bytes, checksum]);
  }
  const header = Buffer.alloc(13); header.writeUInt32BE(width); header.writeUInt32BE(height, 4); header[8] = 8; header[9] = 2;
  return Buffer.concat([Buffer.from('89504e470d0a1a0a', 'hex'), chunk('IHDR', header), chunk('IDAT', deflateSync(Buffer.alloc((width * 3 + 1) * height))), chunk('IEND', Buffer.alloc(0))]);
}

export async function writeDesignFixture(changeRoot: string, status = 'ready', withComparison = true, options: Record<string, unknown> = {}): Promise<string> {
  const api = await designTools();
  const root = join(changeRoot, 'prototypes/UI-001');
  await mkdir(join(root, 'evidence'), { recursive: true });
  const change = basename(changeRoot);
  const candidates = ['dense-ide', 'responsive-web', 'local-first-content'].map((id, index) => ({
    id, template_id: id, primary_reference: 'vercel', auxiliaries: [], rationale: 'Use task structure already understood by this audience.',
    structural_difference: ['Tree navigation and editor', 'Task queue and detail panel', 'Readable document and contextual actions'][index],
    task_id: 'review-request', entry: `comparison/variants/${id}.html`,
  }));
  const meta = { schema_version: 3, artifact: 'ui-prototype', change, design_id: 'UI-001', status, project_kind: 'existing', platforms: ['web'], candidates,
    candidate_count_override: null, selected_candidate: status === 'ready' ? candidates[0].id : null,
    sources: [{ id: 'vercel', locator: 'catalog:vercel', revision: 'c7c1bada' }], prototype_files: ['final/index.html', 'final/styles.css', 'final/app.js'], browser_evidence: 'evidence/browser.json', updated_at: time };
  const html = '<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Review workspace</title><link rel="stylesheet" href="styles.css"></head><body><main><h1>Review incoming requests</h1><p>Review the project request details, confirm the proposed scope and keep the original request available while a decision is saved.</p><button id="approve">Approve request</button><p role="status" id="feedback">Waiting for review. Your existing work is preserved.</p></main><script src="app.js"></script></body></html>\n';
  const css = '*{box-sizing:border-box}body{margin:0;padding:24px;font:16px/1.5 system-ui;background:#fff;color:#17242e}main{max-width:60rem;margin:auto}button{min-height:44px;padding:10px 18px}button:focus-visible{outline:3px solid #175cd3}@media(prefers-reduced-motion:reduce){*{animation:none;transition:none}}\n';
  const js = 'document.querySelector("#approve").addEventListener("click",()=>{document.querySelector("#feedback").textContent="Request approved. You can return to the queue."});\n';
  const sources = [['final/index.html','html',html],['final/styles.css','css',css],['final/app.js','javascript',js]].map(([path, lang, code]) => `<!-- PROTOTYPE-FILE: ${path} -->\n\`\`\`${lang}\n${code.trimEnd()}\n\`\`\`\n<!-- /PROTOTYPE-FILE -->`).join('\n\n');
  const path = join(root, 'design-system.md');
  await writeFile(path, document(meta, '# Prototype fixture\n\n## Project Evidence\nFixture represents request review.\n\n## Prototype Sources\n\n' + sources));
  const { materialize } = await import(pathToFileURL(join(workflow, 'specdev-p-prototype/scripts/materialize-prototype.mjs')).href);
  await materialize(path);
  if (withComparison) {
    await mkdir(join(root, 'comparison/variants'), { recursive: true });
    await writeFile(join(root, 'comparison/index.html'), '<!doctype html><main><h1>Compare request review</h1>' + candidates.map(c => `<a href="variants/${c.id}.html">${c.id}</a>`).join('') + '</main>');
    for (const [i, c] of candidates.entries()) await writeFile(join(root, c.entry), html.replace('<main>', ['<nav><a href="#approve">Request tree</a></nav><main>', '<main><section><h2>Review queue</h2><ul><li>Current request</li></ul></section>', '<main><article><h2>Request document</h2></article>'][i]).replace('href="styles.css"', 'href="../../final/styles.css"').replace('src="app.js"', 'src="../../final/app.js"'));
  }
  if (status !== 'ready' || !withComparison) return path;
  const digest = await api.prototypeDigest(path);
  const projectMeta = { schema_version: 1, artifact: 'project-design', revision: 'DESIGN-0001', owner: 'specdev/archive-and-consolidate', scope: ['workspace'], tokens: { text: '#17242e', canvas: '#ffffff' }, rules: [{ id: 'feedback', statement: 'Keep the current task visible during feedback.', scope: ['workspace'], verification: 'approved-intent', sources: [] }], sources: [{ id: 'code', locator: 'src/app.ts' }], supersedes: null, updated_at: time };
  const project = document(projectMeta, '# Workspace design\n\n## Overview\nTask-focused workspace with stable feedback and readable content.');
  const state = api.designStateRoot(path, options);
  await mkdir(join(state, 'design/revisions'), { recursive: true });
  await writeFile(join(state, 'design/revisions/DESIGN-0001.md'), project);
  await writeFile(join(state, 'design/DESIGN.md'), project);
  await writeFile(join(state, 'design/INDEX.md'), '# Design index\n\nDESIGN-0001\n');
  const changeMeta = { schema_version: 1, artifact: 'change-design', change, revision: 1, status: 'approved', scope: ['workspace'], baseline: { revision: 'DESIGN-0001', digest: api.designDigest(project) }, prototype_ref: { id: 'UI-001', digest }, selection: { candidate_id: candidates[0].id }, tokens: projectMeta.tokens, pages: [{ id: 'review', route: '/review', task: 'Approve a request', states: ['default','success'], acceptance: ['UI-AC-01'] }], overrides: [], confirmation: { by: 'user', at: time, record: 'LOG.md', record_digest: '0'.repeat(64), digest: '0'.repeat(64) }, updated_at: time };
  const body = '# Request review design\n\n## Overview\nRetain request context until the user sees the confirmation. UI-AC-01 requires feedback after approval.';
  changeMeta.confirmation.digest = api.designDigest(document(changeMeta, body));
  const receipt = `# Synthetic test confirmation\n\nThis is simulated test approval, not real user authorization.\nDESIGN: ${changeMeta.confirmation.digest}\nPrototype: ${digest}\nBaseline: ${changeMeta.baseline.digest}\n`;
  changeMeta.confirmation.record_digest = api.sha256(receipt);
  await writeFile(join(changeRoot, 'LOG.md'), receipt);
  await writeFile(join(changeRoot, 'DESIGN.md'), document(changeMeta, body));
  const review = '# Synthetic test review\n\nThis validator fixture records task hierarchy, keyboard focus, content preservation and a completed recheck. It is not evidence of a real browser run.\n';
  await writeFile(join(root, 'evidence/design-review.md'), review);
  await writeFile(join(root, 'evidence/technical-review.md'), review);
  const cases = [];
  for (const width of [390,1440]) {
    await writeFile(join(root, `evidence/${width}.png`), fixturePNG(width, 844));
    for (const entry of ['final/index.html', ...candidates.map(c=>c.entry)]) cases.push({ id: `${entry}-${width}`, entry, width, height: 844, screenshot: `evidence/${width}.png`, checks: { rendered:true,no_overflow:true,keyboard:true,focus:true,long_text:true,zoom:true,reduced_motion:true,states:true }, states: ['review:default','review:success'] });
  }
  await writeFile(join(root, 'evidence/browser.json'), JSON.stringify({ schema_version:1,artifact:'prototype-browser-evidence',prototype_digest:digest,generated_at:time,provider:'synthetic-validator-fixture',inspected_files:['final/index.html',...candidates.map(c=>c.entry)],cases,console_errors:[],offline:true,design_review:'evidence/design-review.md',technical_review:'evidence/technical-review.md',rechecked:true },null,2));
  return path;
}
