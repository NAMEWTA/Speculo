#!/usr/bin/env node
// Runtime: Node.js >=22.16. Exit 0 report/success, 2 invalid input or blocked,
// 1 unexpected failure. stdout JSON; stderr sanitized JSON errors. No network.
// doctor/plan never spawn clients, execute helpers, or read credential contents.
import { parseArgs } from 'node:util';
import { inspect, publicReport } from './lib/inspect.mjs';
import { createPlan, savePlan, loadPlan } from './lib/plan.mjs';
import { apply, verify, rollback } from './lib/transaction.mjs';
import { ConfigError } from './lib/document.mjs';

const help = `AI CLI configuration maintenance (offline, Node.js >=22.16)
Usage:
  node scripts/ai-cli-config.mjs doctor|plan [options]
  node scripts/ai-cli-config.mjs apply|verify|rollback --plan <absolute.plan.json>
Options for doctor/plan:
  --client codex|claude|all           Default: all
  --scope user|project               Default: user; project requires --project
  --project <absolute-project-root>  Inspect project overrides; Claude writes settings.local.json
  --codex-home <absolute-directory>  Otherwise CODEX_HOME or ~/.codex
  --claude-home <absolute-directory> Otherwise CLAUDE_CONFIG_DIR or ~/.claude
  --mode local-private|privacy-only|statusline-only
  --evidence <absolute-json>         Operator-verified installed capability attestation
  --replace-statusline              Include replacement of an existing Claude callback
  --out <absolute.plan.json>         plan only: explicitly create a new private plan artifact
Options for apply/rollback:
  --confirm <exact-plan-id>          Confirm this reviewed plan, never a blanket --yes
  --quiescent                       Caller confirms sessions/config managers are quiescent
  --json                            Accepted for automation; output is always JSON
  --help                            No probes or writes
A capability template is in assets/capabilities.example.json. Unknown support blocks apply.
No automatic account requests, remote tests, credential reads, updates or plugin installs.
Native Windows supports doctor/plan/verify; automated mutation is blocked until handle and ACL support is verified.
`;
try {
  const { values, positionals, tokens } = parseArgs({ strict: true, tokens: true, allowPositionals: true, options: {
    client: { type: 'string' }, scope: { type: 'string' }, project: { type: 'string' },
    'codex-home': { type: 'string' }, 'claude-home': { type: 'string' }, mode: { type: 'string' },
    evidence: { type: 'string' }, 'replace-statusline': { type: 'boolean' }, out: { type: 'string' },
    plan: { type: 'string' }, confirm: { type: 'string' }, quiescent: { type: 'boolean' },
    json: { type: 'boolean' }, help: { type: 'boolean', short: 'h' },
  } });
  const names = tokens.filter(token => token.kind === 'option').map(token => token.name);
  if (new Set(names).size !== names.length) throw new ConfigError('duplicate_option');
  if (values.help) process.stdout.write(help);
  else {
    if (positionals.length > 1) throw new ConfigError('one_command_required');
    const command = positionals[0] ?? 'doctor';
    let result;
    if (['doctor', 'plan'].includes(command)) {
      if (values.plan || values.confirm || values.quiescent || (command === 'doctor' && values.out)) throw new ConfigError('incompatible_options');
      const spec = Object.fromEntries(['client', 'scope', 'project', 'mode', 'evidence', 'codex-home', 'claude-home', 'replace-statusline']
        .filter(key => values[key] !== undefined).map(key => [key.replaceAll('-', '_'), values[key]]));
      if (command === 'doctor') result = publicReport(await inspect(spec));
      else { result = await createPlan(spec); if (values.out) await savePlan(result, values.out); }
    } else if (['apply', 'verify', 'rollback'].includes(command)) {
      if (!values.plan || Object.keys(values).some(key => !['plan', 'confirm', 'quiescent', 'json'].includes(key))) throw new ConfigError('incompatible_options');
      const plan = await loadPlan(values.plan);
      result = command === 'verify' ? await verify(plan) : await (command === 'apply' ? apply : rollback)(plan, values);
      if (command === 'verify' && !result.passed) process.exitCode = 2;
    } else throw new ConfigError('unknown_command');
    process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  }
} catch (error) {
  process.stderr.write(JSON.stringify({ error: error instanceof ConfigError ? error.code : String(error.code ?? '').startsWith('ERR_PARSE_ARGS') ? 'invalid_arguments' : 'operation_failed',
    ...(error.rollback ? { rollback: error.rollback } : {}) }) + '\n');
  process.exitCode = error instanceof ConfigError || String(error.code ?? '').startsWith('ERR_PARSE_ARGS') ? 2 : 1;
}
