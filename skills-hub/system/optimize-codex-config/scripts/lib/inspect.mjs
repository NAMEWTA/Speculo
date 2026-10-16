import { homedir } from 'node:os';
import { join, dirname } from 'node:path';
import { readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import { definition as codex } from '../adapters/codex.mjs';
import { definition as claude, disabledEnvironment } from '../adapters/claude.mjs';
import { ConfigError, parseDocument, at } from './document.mjs';
import { absolute, safePath, metadata, readBounded, fingerprint, sha256, canonical } from './io.mjs';

export const adapters = { codex, claude };
// Only built-in read-only system paths use macOS's canonical /private/etc.
// User homes and project paths retain safePath's strict no-symlink contract.
export function codexSystemPaths(platform = process.platform) {
  if (platform === 'win32') return { defaults: [], managed: [] };
  const root = platform === 'darwin' ? '/private/etc/codex' : '/etc/codex';
  return { defaults: [root + '/config.toml'],
    managed: [root + '/managed_config.toml', root + '/requirements.toml'] };
}
export const rendererSource = fileURLToPath(new URL('../statusline/claude-statusline.mjs', import.meta.url));
const specKeys = ['client', 'scope', 'project', 'codex_home', 'claude_home', 'mode', 'replace_statusline', 'evidence'];
export function normalizeSpec(input = {}, env = process.env) {
  if (Object.keys(input).some(key => !specKeys.includes(key))) throw new ConfigError('unknown_spec_key');
  const result = {
    client: input.client ?? 'all', scope: input.scope ?? 'user',
    project: input.project ? absolute(input.project) : null,
    codex_home: absolute(input.codex_home ?? env.CODEX_HOME ?? join(homedir(), '.codex')),
    claude_home: absolute(input.claude_home ?? env.CLAUDE_CONFIG_DIR ?? join(homedir(), '.claude')),
    mode: input.mode ?? 'local-private', replace_statusline: input.replace_statusline ?? false,
    evidence: input.evidence ? absolute(input.evidence) : null,
  };
  if (!['all', 'codex', 'claude'].includes(result.client) || !['user', 'project'].includes(result.scope)
      || !['local-private', 'privacy-only', 'statusline-only'].includes(result.mode)
      || typeof result.replace_statusline !== 'boolean') throw new ConfigError('invalid_selection');
  if (result.scope === 'project' && !result.project) throw new ConfigError('project_required');
  return result;
}
export const selectedClients = spec => spec.client === 'all' ? ['codex', 'claude'] : [spec.client];
export function targetFor(spec, client) {
  const root = spec.scope === 'user' ? spec[client + '_home'] : join(spec.project, '.' + client);
  const filename = client === 'claude' && spec.scope === 'project' ? 'settings.local.json' : adapters[client].filename;
  return { client, root, path: join(root, filename), format: adapters[client].format };
}
export async function rulesFor(spec, client) {
  const target = targetFor(spec, client);
  const source = await readBounded(rendererSource);
  const runtime = join(target.root, '.wta-ai-cli-config', 'runtime', 'claude-statusline-' + source.sha256.slice(0, 16) + '.mjs');
  const rules = [
    ...(spec.mode !== 'statusline-only' ? adapters[client].privacy : []),
    ...(spec.mode !== 'privacy-only' ? adapters[client].statusline(process.execPath, runtime) : []),
  ];
  return { rules, runtime, source, target };
}
const nonemptyOff = new Set(['CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC', 'DISABLE_TELEMETRY']);
function envMatches(key, value) {
  if (nonemptyOff.has(key)) return typeof value === 'string' && value.length > 0;
  return value === disabledEnvironment[key];
}
export function environmentState(env) {
  const observed = Object.keys(disabledEnvironment).map(key => ({
    key, present: Object.hasOwn(env, key), matches_policy: Object.hasOwn(env, key) ? envMatches(key, env[key]) : null,
  }));
  // Hash only explicitly named control values. Never enumerate process secrets.
  const digest = sha256(canonical(Object.fromEntries(Object.keys(disabledEnvironment).filter(k => Object.hasOwn(env, k)).map(k => [k, env[k]]))));
  return { digest: sha256(digest + (env.NODE_OPTIONS ? ':node-options-present' : ':clean-node-options')), observed };
}
function safeValue(value, desired) {
  if (value === undefined) return '<absent>';
  if (isDeepStrictEqual(value, desired)) return desired;
  if (typeof value === 'boolean' || ['none', 'otlp', 'statsig', '0', '1', 'true', 'false'].includes(value)) return value;
  // Config strings and objects can contain arbitrary secrets, even at innocent keys.
  return '<redacted-existing-value>';
}
export const previewValue = safeValue;
async function layer(path, label, format, files) {
  try {
    const file = await readBounded(path);
    const parsed = parseDocument(file.exists ? file.text : format === 'toml' ? '' : '{}', format);
    const entry = { path, label, ...fingerprint(file), value: parsed.value, text: file.text, format };
    files.push(entry); return entry;
  } catch (error) {
    const entry = { path, label, error: error.code ?? 'read_failed', format };
    files.push(entry); return entry;
  }
}
async function managedLayers(client, files) {
  const paths = client === 'codex'
    ? codexSystemPaths().managed
    : [join(process.platform === 'darwin' ? '/Library/Application Support/ClaudeCode'
      : process.platform === 'win32' ? 'C:\\Program Files\\ClaudeCode' : '/etc/claude-code', 'managed-settings.json')];
  for (const path of paths) await layer(path, client + '-managed', client === 'codex' ? 'toml' : 'json', files);
  if (client === 'claude') {
    const directory = join(dirname(paths[0]), 'managed-settings.d');
    try {
      await safePath(directory);
      const names = (await readdir(directory)).filter(n => !n.startsWith('.') && n.endsWith('.json')).sort();
      if (names.length > 32) throw new ConfigError('managed_fragment_limit');
      for (const name of names) await layer(join(directory, name), 'claude-managed-fragment', 'json', files);
    } catch (error) {
      if (error.code !== 'ENOENT') files.push({ path: directory, label: 'claude-managed-fragments', error: error.code ?? 'read_failed' });
    }
  }
}
export async function inspect(input = {}, { env = process.env } = {}) {
  const spec = normalizeSpec(input, env);
  const files = [], clients = [], findings = [];
  const add = (client, code, severity = 'warning') => findings.push({ client, code, severity });
  if (spec.project) {
    await safePath(spec.project);
    if ((await metadata(spec.project)).type !== 'directory') throw new ConfigError('project_directory_required');
  }
  const environment = environmentState(env);
  if (env.NODE_OPTIONS) add('runtime', 'node_startup_options_require_clean_environment', 'blocker');
  let evidence = null, evidenceFingerprint = null;
  if (spec.evidence) {
    const file = await readBounded(spec.evidence);
    if (file.exists) { evidence = parseDocument(file.text, 'json').value; evidenceFingerprint = fingerprint(file); }
  }
  for (const client of selectedClients(spec)) {
    const { target, rules, runtime, source } = await rulesFor(spec, client);
    const ownFiles = [];
    if (client === 'codex') for (const path of codexSystemPaths().defaults) await layer(path, 'codex-system', 'toml', ownFiles);
    const user = await layer(join(spec[client + '_home'], adapters[client].filename), client + '-user', target.format, ownFiles);
    if (spec.project) {
      const dirs = [spec.project];
      if (client === 'codex') {
        let directory = spec.project;
        for (let n = 0; n < 20 && !(await metadata(join(directory, '.git'))).exists; n++) {
          const parent = dirname(directory); if (parent === directory) break;
          dirs.unshift(parent); directory = parent;
        }
      }
      for (const directory of dirs) await layer(join(directory, '.' + client, adapters[client].filename), client + '-project', target.format, ownFiles);
      if (client === 'claude') await layer(join(spec.project, '.claude', 'settings.local.json'), 'claude-local', 'json', ownFiles);
    }
    await managedLayers(client, ownFiles);
    files.push(...ownFiles);
    for (const f of ownFiles) if (f.error) add(client, f.label + ':' + f.error, 'blocker');
    // Do not guess which server/OS-managed source is authoritative, execute a
    // policy helper, or merge its restrictions with a writable user document.
    if (ownFiles.some(f => f.label.includes('managed') && f.exists)) add(client, 'managed_policy_requires_operator_review', 'blocker');
    if (client === 'codex' && (at(user.value, ['profile']) !== undefined || at(user.value, ['profiles']) !== undefined)) {
      add(client, 'profile_selection_requires_operator_review', 'blocker');
    }
    const targetFile = ownFiles.find(f => f.path === target.path);
    if (!targetFile) throw new ConfigError('target_not_discovered');
    const credentials = [];
    const names = client === 'codex' ? ['auth.json'] : ['.credentials.json'];
    for (const name of names) {
      try { credentials.push({ name, ...await metadata(join(spec[client + '_home'], name)), contents_read: false }); }
      catch { credentials.push({ name, state: 'unknown', contents_read: false }); }
    }
    const integrations = [];
    for (const field of ['hooks', 'mcp_servers', 'mcpServers', 'plugins', 'enabledPlugins', 'extraKnownMarketplaces', 'apiKeyHelper', 'policyHelper', 'notify']) {
      if (ownFiles.some(f => at(f.value, [field]) !== undefined)) integrations.push(field);
    }
    if (integrations.length) add(client, 'integrations_preserved_not_executed_or_privacy_verified');
    if (client === 'claude' && environment.observed.some(v => v.present && !v.matches_policy) && spec.mode !== 'statusline-only') {
      add(client, 'inherited_environment_conflict', 'blocker');
    }
    const cells = rules.map(rule => {
      let found;
      for (const f of ownFiles) {
        if (f.error || !f.exists) continue;
        // Machine-local Codex telemetry cannot be supplied by project config.
        if (client === 'codex' && f.label.endsWith('project') && rule.scope === 'user') continue;
        const value = at(f.value, rule.path);
        if (value !== undefined) found = { file: f, value };
      }
      return { key: rule.path.join('.'), source: found?.file.label ?? 'client-default-unknown',
        observed: safeValue(found?.value, rule.value), matches_policy: found ? isDeepStrictEqual(found.value, rule.value) : null,
        higher_override: !!found && found.file.path !== target.path && ownFiles.indexOf(found.file) > ownFiles.indexOf(targetFile),
      };
    });
    for (const cell of cells) if (cell.higher_override && !cell.matches_policy) add(client, 'higher_precedence_override:' + cell.key, 'blocker');
    if (spec.mode !== 'privacy-only' && client === 'claude') {
      if (ownFiles.some(f => at(f.value, ['disableAllHooks']) === true)) add(client, 'statusline_disabled_by_disableAllHooks', 'blocker');
      const command = rules.find(r => r.path.join('.') === 'statusLine.command').value;
      const custom = ownFiles.some(f => {
        const prior = at(f.value, ['statusLine', 'command']);
        return prior !== undefined && prior !== command;
      });
      if (custom && !spec.replace_statusline) add(client, 'existing_statusline_requires_explicit_replacement', 'blocker');
    }
    for (const rule of rules) if (spec.scope === 'project' && rule.scope === 'user') add(client, 'requires_user_scope:' + rule.path.join('.'), 'blocker');
    const attestation = evidence?.schema_version === 1 ? evidence.clients?.[client] : null;
    const reviewedAt = Date.parse(evidence?.reviewed_at ?? '');
    const fresh = Number.isFinite(reviewedAt) && reviewedAt <= Date.now() && Date.now() - reviewedAt <= 30 * 86400_000;
    const version = typeof attestation?.version === 'string' && /^[A-Za-z0-9.+ -]{1,80}$/.test(attestation.version) ? attestation.version : null;
    const supported = version && fresh && attestation?.verification === 'manual-local'
      && attestation?.higher_precedence_reviewed === true
      && Array.isArray(attestation?.scopes) && attestation.scopes.includes(spec.scope)
      && Array.isArray(attestation?.keys) && rules.every(r => attestation.keys.includes(r.path.join('.')))
      && (client !== 'codex' || spec.mode === 'privacy-only' || adapters.codex.statusline()[0].value.every(item => attestation?.status_items?.includes(item)));
    if (!supported) add(client, 'installed_capabilities_not_attested', 'blocker');
    clients.push({ client, target, targetFile, rules, runtime, source,
      credentials, integrations, cells, version, capabilities: supported ? 'operator-attested-not-auto-probed' : 'unknown' });
  }
  return { spec, files, clients, findings, environment, evidenceFingerprint };
}
export function publicReport(snapshot) {
  return { schema_version: 2, scope: snapshot.spec.scope, mode: snapshot.spec.mode,
    network: 'not-used', commands: 'not-run', credential_contents: 'not-read',
    effective_configuration: 'observed-files-only; CLI flags, OS/remote policies and helpers require local review',
    clients: snapshot.clients.map(c => ({ client: c.client, version: c.version, capabilities: c.capabilities,
      configuration: fingerprint(c.targetFile), credentials: c.credentials, integrations: c.integrations, settings: c.cells,
    })),
    // Do not output targetFile.value/text or a provider's identifiers/URLs.
    findings: snapshot.findings, environment: snapshot.environment.observed,
  };
}
