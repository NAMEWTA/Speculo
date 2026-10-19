/** Stable validation ownership. Messages are presentation and never control dispatch. */
const collectors = new WeakMap();
const scopes = new Set(['global', 'change', 'ticket']);

function append(errors, diagnostic) {
  Array.prototype.push.call(errors, diagnostic.message);
  const collector = collectors.get(errors);
  if (collector) {
    collector.diagnostics.push(diagnostic);
    if (collector.parent) append(collector.parent, diagnostic);
  }
}

/** Ordinary error arrays remain usable by the existing deterministic validators. */
export function diagnosticErrors(context = {}, parent = null) {
  const errors = [];
  const defaults = {code: 'validation-failed', scope: 'global', ...context};
  const diagnostics = [];
  collectors.set(errors, {defaults, diagnostics, parent});
  Object.defineProperties(errors, {
    diagnostics: {value: diagnostics},
    push: {value(...messages) {
      for (const message of messages) append(errors, {...defaults, message: String(message)});
      return errors.length;
    }},
  });
  return errors;
}

/** Emit a distinct code or narrower owner without changing human-readable diagnostics. */
export function addDiagnostic(errors, context, message) {
  append(errors, {...(collectors.get(errors)?.defaults ?? {code: 'validation-failed', scope: 'global'}), ...context, message});
}

/** Retain child ownership when rolling up member validation. */
export function appendDiagnostics(errors, result, {prefix = ''} = {}) {
  const records = result.diagnostics ?? result.errors?.diagnostics;
  if (Array.isArray(records)) {
    for (const record of records) append(errors, {...record, message: prefix + record.message});
  } else {
    // Unclassified third-party errors fail closed at the current caller's scope.
    for (const message of result.errors ?? result) errors.push(prefix + message);
  }
}

export function validationResult(errors, warnings = [], extra = {}) {
  return {errors: [...errors], warnings: [...warnings], diagnostics: [...(errors.diagnostics ?? [])], ...extra};
}

/** Missing structure, unknown scopes and unresolved owners always block dispatch. */
export function partitionDiagnostics(diagnostics, tasks) {
  const global = [], byTask = new Map([...tasks.keys()].map(id => [id, []]));
  if (!Array.isArray(diagnostics)) return {global: [{code: 'diagnostics-missing', scope: 'global', message: 'validator returned no structured diagnostics'}], byTask};
  for (const item of diagnostics) {
    if (!item || typeof item.code !== 'string' || !item.code || !scopes.has(item.scope) || typeof item.message !== 'string') {
      global.push({code: 'diagnostic-invalid', scope: 'global', message: 'validator returned an invalid structured diagnostic'});
      continue;
    }
    if (item.scope === 'global') { global.push(item); continue; }
    const matches = [...tasks].filter(([, task]) => task.member === item.change && (item.scope === 'change' || task.ticket === item.ticket));
    if (!matches.length) { global.push({...item, scope: 'global', message: `unresolved diagnostic owner: ${item.message}`}); continue; }
    for (const [id] of matches) byTask.get(id).push(item);
  }
  return {global, byTask};
}
