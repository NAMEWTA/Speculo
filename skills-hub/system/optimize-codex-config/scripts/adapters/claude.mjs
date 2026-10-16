import { isAbsolute } from 'node:path';
import { ConfigError } from '../lib/document.mjs';
// Never put package runners or a temporary npx cache in a refresh callback.
export function quoteArgument(path) {
  if (!isAbsolute(path) || /[\x00-\x1f\x7f"$`%!^]/.test(path)) throw new ConfigError('unsafe_command_path');
  return '"' + path.replaceAll('\\', '/') + '"';
}
export const disabledEnvironment = {
  CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: '1',
  DISABLE_TELEMETRY: '1', DISABLE_ERROR_REPORTING: '1',
  DISABLE_FEEDBACK_COMMAND: '1', CLAUDE_CODE_DISABLE_FEEDBACK_SURVEY: '1',
  CLAUDE_CODE_DISABLE_OFFICIAL_MARKETPLACE_AUTOINSTALL: '1', DISABLE_AUTOUPDATER: '1',
  FORCE_AUTOUPDATE_PLUGINS: '0', CLAUDE_CODE_ENABLE_GATEWAY_MODEL_DISCOVERY: '0',
  CLAUDE_CODE_ENABLE_TELEMETRY: '0', CLAUDE_CODE_ENABLE_FEEDBACK_SURVEY_FOR_OTEL: '0',
};
export const privacy = [
  ...Object.entries(disabledEnvironment).map(([key, value]) => ({ path: ['env', key], value, reason: 'local-private', scope: 'both' })),
  { path: ['skipWebFetchPreflight'], value: true, reason: 'no-external-domain-check; upstream-blocklist-not-consulted', scope: 'both' },
];
export const statusline = (node, script) => [
  { path: ['statusLine', 'type'], value: 'command', reason: 'stdin-only-statusline', scope: 'both' },
  { path: ['statusLine', 'command'], value: quoteArgument(node) + ' ' + quoteArgument(script), reason: 'managed-local-renderer', scope: 'both' },
];
export const definition = { client: 'claude', format: 'json', filename: 'settings.json', empty: '{}\n', privacy, statusline };
