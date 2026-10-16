// Exact keys from the reviewed official reference; installed support is a separate gate.
export const statusItems = ['model-with-reasoning', 'context-used', 'five-hour-limit', 'weekly-limit', 'context-window-size'];
export const privacy = [
  ['check_for_update_on_startup', false],
  ['features.remote_plugin', false], ['analytics.enabled', false], ['feedback.enabled', false],
  ['otel.exporter', 'none'], ['otel.trace_exporter', 'none'], ['otel.metrics_exporter', 'none'],
  ['otel.log_user_prompt', false],
].map(([key, value]) => ({ path: key.split('.'), value, reason: 'local-private', scope: 'user' }));
export const statusline = () => [{ path: ['tui', 'status_line'], value: statusItems, reason: 'native-statusline', scope: 'both' }];
export const definition = { client: 'codex', format: 'toml', filename: 'config.toml', empty: '', privacy, statusline };
