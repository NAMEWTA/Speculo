import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { test } from 'node:test';
const tool = join(process.cwd(), 'template/workflows/learning/Q-question/tools/validate-inquiry.mjs');
const load = (): Promise<any> => import(pathToFileURL(tool).href);
function batch(n: number, response = 'pending') {
  return `---\ninquiry_id: IQ-001\nquestion_count: ${n}\n---\n# 批次\n\n## Questions\n\n` +
    Array.from({ length: n }, (_, i) => `### Q${i + 1} — 问题\n\n问题 ${i + 1}\n`).join('\n') +
    '\n## Learner Answers\n\n' + Array.from({ length: n }, (_, i) => `### A${i + 1}\n\n原始回答 ${i + 1}\n`).join('\n') +
    `\nResponse: ${response}\n` + (response === 'closed' ? '\n## Teaching\n\nExplain (English)\n\n## Inquiry Lesson\n\n本批讲解。\n' : '');
}
for (const n of [1, 5, 7, 12]) test(`inquiry uses the actual requested ${n} questions, not a fixed five or mine cap`, async () => {
  const { validateInquiry } = await load();
  assert.equal(validateInquiry(batch(n), { expectedCount: n }).valid, true);
  assert.equal(validateInquiry(batch(n), { expectedCount: n + 1 }).valid, false);
});
test('inquiry rejects duplicates, gaps, unpaired answers and duplicate metadata', async () => {
  const { validateInquiry } = await load();
  for (const text of [batch(7).replace('### A7', '### A8'), batch(5).replace('### Q5', '### Q1'), batch(5).replace('question_count: 5', 'question_count: 5\nquestion_count: 5'), batch(5).replace('question_count: 5', 'question_count: 0')]) {
    assert.equal(validateInquiry(text).valid, false);
  }
});
test('inquiry freezes original ready bytes and rejects premature teaching and fabricated closure', async () => {
  const { validateInquiry } = await load();
  const ready = batch(7, 'ready'), closed = batch(7, 'closed');
  assert.equal(validateInquiry(closed, { expectedCount: 7, before: ready }).valid, true);
  for (const text of [closed.replace('原始回答 1', 'AI 改写'), closed.replace('inquiry_id: IQ-001', 'inquiry_id: IQ-002'), closed.replace('Response: closed', 'Response: pending'), closed.replace('Explain (English)', 'verdict: correct')]) {
    assert.equal(validateInquiry(text, { before: ready }).valid, false);
  }
  assert.equal(validateInquiry(closed).valid, false);
  assert.equal(validateInquiry(closed, { before: batch(7) }).valid, false);
});
test('inquiry ignores headings in fenced examples but requires real ordered sections', async () => {
  const { validateInquiry } = await load();
  assert.equal(validateInquiry(batch(1).replace('问题 1\n', '问题 1\n\n```md\n### Q99\nResponse: closed\n```\n')).valid, true);
  assert.equal(validateInquiry(batch(1).replace('## Learner Answers', '## Lost')).valid, false);
  assert.equal(validateInquiry(batch(1) + '\nResponse: ready\n').valid, false);
});
test('inquiry CLI is read-only and rejects escape, symlink and ambiguous flags', async () => {
  const root = await mkdtemp(join(tmpdir(), 'speculo-inquiry-'));
  try {
    const source = batch(7); await writeFile(join(root, 'batch.md'), source);
    const run = (...args: string[]) => spawnSync(process.execPath, [tool, '--change-dir', root, ...args], { encoding: 'utf8' });
    assert.equal(run('--file', 'batch.md', '--expected-count', '7').status, 0);
    assert.equal(run('--file', 'batch.md', '--expected-count', '5').status, 1);
    assert.equal(run('--file', '../escape.md').status, 1);
    assert.equal(run('--file', 'batch.md', '--file', 'batch.md').status, 1);
    if (process.platform !== 'win32') { await symlink(join(root, 'batch.md'), join(root, 'link.md')); assert.equal(run('--file', 'link.md').status, 1); }
    assert.equal(await readFile(join(root, 'batch.md'), 'utf8'), source);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('fenced Response examples cannot shorten the frozen answer prefix, including CRLF', async () => {
  const { validateInquiry } = await load();
  const insert = (s: string) => s.replace('问题 1\n', '问题 1\n\n```md\nResponse: pending\n```\n').replace(/\n/g, '\r\n');
  const ready = insert(batch(7, 'ready')), closed = insert(batch(7, 'closed'));
  assert.equal(validateInquiry(closed, { before: ready }).valid, true);
  assert.equal(validateInquiry(closed.replace('原始回答 7', '伪造回答'), { before: ready }).valid, false);
});
