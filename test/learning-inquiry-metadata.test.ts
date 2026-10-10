import assert from 'node:assert/strict';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { test } from 'node:test';

const tool = join(process.cwd(), 'template/workflows/learning/Q-question/tools/validate-exploration.mjs');
const load = (): Promise<any> => import(pathToFileURL(tool).href);
function fixture(): any {
  return { schema_version: 1, questions: [{
    id: 'P-001', parent_id: null, origin: 'user', trigger: 'Original question',
    dimension: 'boundary', why_it_matters: 'A structured record must preserve its semantic identity.',
    gap_kind: 'potential', status: 'exploring', evidence_status: 'unverified', evidence: [],
    artifact: 'inquiry/explorations/EX-001-topic.md', conclusion: '', verification: 'Await evidence.',
  }] };
}
const record = '---\nexploration_id: EX-001-topic\nmode: explore\nstatus: active\nquestion_ids: [P-001]\n---\n\n# Exploration\n\n## Scope\n\nContext.\n\n## Discovery\n\nP-001 potential gap.\n\n## Deep Dive\n\nMechanism.\n\n## Verification\n\nNot tested.\n\n## Next\n\nAwait evidence.\n';

test('problem identifiers reject string coercion and non-string JSON shapes', async () => {
  const { validateQuestionMap } = await load();
  assert.equal(validateQuestionMap(fixture()).valid, true);
  for (const value of [['P-001'], { value: 'P-001' }, 1, null, true]) {
    const map = fixture(); map.questions[0].id = value;
    assert.equal(validateQuestionMap(map).valid, false);
  }
});

test('learner assessment and answers cannot be hidden in exploration metadata', async () => {
  const { validateQuestionMap, validateExploration } = await load();
  assert.equal(validateExploration(record, fixture()).valid, true);
  for (const name of ['mastered', 'mastery', 'retention_verified', 'verdict', 'response', 'submission', 'q1', 'a1']) {
    assert.equal(validateExploration(record.replace('mode: explore', `mode: explore\n${name}: fabricated`), fixture()).valid, false);
  }
  for (const name of ['Response', 'response', 'Submission', 'submission', 'verdict', 'MASTERED']) {
    const map = fixture(); map.questions[0][name] = 'fabricated';
    assert.equal(validateQuestionMap(map).valid, false);
  }
});
