/** Validate current change workspace records. Read-only; never converts historical data. */
import { basename, resolve } from 'node:path';
import * as runtime from '../../../../lib/speculo-runtime.mjs';
import { readChangeExecution } from './plan-contract.mjs';
import { readChangeOwner } from './change-artifacts.mjs';
import { EXECUTION_VERSION, readExecutionContext, resolveExecutionWorkspace, validateExecutionRecord } from './execution-context.mjs';
import { diagnosticErrors } from './validation-diagnostics.mjs';

export function validateChangeExecution(change, errors, context) {
  const name = basename(change);
  let data;
  try {
    const facts = runtime.readChangeFactsSync(context, name);
    if (facts.location.root !== resolve(change)) throw new Error('change identity does not match requested location');
    data = {...facts, executions: readChangeExecution(change), executionContext: readExecutionContext(change)};
  } catch (error) {
    errors.push(`${change}: ${error.message}`);
    return null;
  }
  if (data.executionContext) {
    try {
      if (readChangeOwner(context, name).owner !== data.executionContext.owner) errors.push('Execution Context owner differs from original Lead');
      data.workspaceRoot = resolveExecutionWorkspace(context.projectRoot, data.executionContext);
    } catch (error) { errors.push(error.message); }
  }
  for (const record of data.executions) {
    const local = diagnosticErrors({
      code: 'execution-record-invalid', scope: record.ticket_id ? 'ticket' : 'change',
      change: name, ...(record.ticket_id ? {ticket: record.ticket_id} : {}),
      artifact: `evidence/${record.ticket_id ?? 'direct-spec'}.md`,
    }, errors);
    if (record.schema_version !== EXECUTION_VERSION) {
      local.push('unsupported execution record: Workspace Execution Record requires schema_version: 1; source bytes remain unchanged');
      continue;
    }
    local.push(...validateExecutionRecord(change, record, data.executionContext, {
      repoRoot: data.workspaceRoot ?? context.projectRoot, sourceRoot: context.projectRoot,
    }));
    if (record.purpose === 'direct-spec' && record.status === 'cancelled' && data.outcome !== 'cancelled') {
      local.push('cancelled Direct Spec execution requires the original whole-change cancellation');
    }
  }
  return data;
}
