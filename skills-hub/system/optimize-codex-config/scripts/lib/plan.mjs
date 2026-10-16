import { at, patchDocument, ConfigError, parseDocument } from './document.mjs';
import { inspect, previewValue, rulesFor, normalizeSpec, selectedClients } from './inspect.mjs';
import { readBounded, fingerprint, sha256, canonical, newPrivateFile } from './io.mjs';

const digest = value => sha256(canonical(value));
export function planId(plan) { const { id, ...body } = plan; return digest(body); }
export async function createPlan(input, options) {
  const snapshot = await inspect(input, options);
  const entries = [], findings = [...snapshot.findings];
  for (const client of snapshot.clients) {
    const { target, targetFile, rules } = client;
    if (targetFile.error) continue;
    try {
      const text = targetFile.exists ? targetFile.text : target.format === 'toml' ? '' : '{}\n';
      const changed = patchDocument(text, target.format, rules);
      if (target.client === 'claude' && snapshot.spec.mode !== 'privacy-only') {
        const existing = await readBounded(client.runtime);
        // Content-addressed renderer names are immutable: do not overwrite a custom script.
        if (existing.exists && existing.sha256 !== client.source.sha256) throw new ConfigError('renderer_content_conflict');
        entries.push({ client: target.client, kind: 'renderer', root: target.root, path: client.runtime,
          before: fingerprint(existing), after_hash: client.source.sha256, noop: existing.exists,
        });
      }
      entries.push({ client: target.client, kind: 'config', root: target.root, path: target.path, format: target.format,
        before: fingerprint(targetFile), after_hash: sha256(changed), noop: targetFile.exists && targetFile.sha256 === sha256(changed),
        operations: rules,
        diff: rules.filter(rule => canonical(at(targetFile.value, rule.path)) !== canonical(rule.value)).map(rule => ({
          key: rule.path.join('.'), before: previewValue(at(targetFile.value, rule.path), rule.value), after: rule.value, reason: rule.reason,
        })),
      });
    } catch (error) { findings.push({ client: target.client, code: error.code ?? 'plan_failed', severity: 'blocker' }); }
  }
  const plan = {
    schema_version: 1, kind: 'wta-ai-cli-config-plan', policy_revision: '2026-10-10', spec: snapshot.spec,
    platform: process.platform, node: process.execPath,
    observations: {
      files: snapshot.files.map(f => ({ path: f.path, fingerprint: fingerprint(f), ...(f.error ? { error: f.error } : {}) })),
      evidence: snapshot.evidenceFingerprint, environment: snapshot.environment.digest,
    },
    entries, findings, ready: !findings.some(f => f.severity === 'blocker'),
    verification: 'offline parse/hash/policy only; host load, account limits and OS/remote policy not automatically verified',
    privacy: 'no runtime network; existing integrations preserved and not certified',
    backup: '<each-target-root>/.wta-ai-cli-config/transactions/<plan-id>/N.pre-optimize.bak',
  };
  return { ...plan, id: planId(plan) };
}
export async function savePlan(plan, path) {
  if (!path.endsWith('.plan.json') || plan.entries.some(entry => entry.path === path) || plan.spec.evidence === path) throw new ConfigError('plan_output_requires_new_plan_json');
  await newPrivateFile(path, JSON.stringify(plan, null, 2) + '\n');
}
export async function loadPlan(path) {
  const file = await readBounded(path);
  if (!file.exists) throw new ConfigError('plan_missing');
  const plan = parseDocument(file.text, 'json').value;
  if (plan.kind !== 'wta-ai-cli-config-plan' || plan.schema_version !== 1 || plan.id !== planId(plan)
      || !/^[0-9a-f]{64}$/.test(plan.id) || plan.platform !== process.platform || plan.node !== process.execPath) {
    throw new ConfigError('plan_integrity_or_platform_mismatch');
  }
  if (canonical(normalizeSpec(plan.spec)) !== canonical(plan.spec)) throw new ConfigError('noncanonical_plan_spec');
  const expected = [];
  for (const client of selectedClients(plan.spec)) {
    const r = await rulesFor(plan.spec, client);
    if (client === 'claude' && plan.spec.mode !== 'privacy-only') expected.push({ path: r.runtime, kind: 'renderer', client, root: r.target.root });
    expected.push({ ...r.target, kind: 'config', operations: r.rules });
  }
  if (plan.entries.length !== expected.length) throw new ConfigError('incomplete_plan');
  for (let i = 0; i < expected.length; i++) {
    for (const [key, value] of Object.entries(expected[i])) {
      if (canonical(plan.entries[i][key]) !== canonical(value)) throw new ConfigError('plan_target_or_operation_mismatch');
    }
  }
  return plan;
}
export async function desiredText(plan, entry) {
  const rules = await rulesFor(plan.spec, entry.client);
  if (entry.kind === 'renderer') return rules.source.text;
  const file = await readBounded(entry.path);
  return patchDocument(file.exists ? file.text : entry.format === 'toml' ? '' : '{}\n', entry.format, rules.rules);
}
