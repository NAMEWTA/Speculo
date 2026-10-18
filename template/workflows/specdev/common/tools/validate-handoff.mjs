#!/usr/bin/env node
/** Legacy TASK v1 SpecDev adapter; new dispatches use the shared TASK v2 validator. */
import { relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readChangeFactsSync, resolveWorkContextSync } from '../../../../lib/speculo-runtime.mjs';
import { validateDispatch, validateSessionLocator } from '../../../../references/coordination/scripts/validate-dispatch.mjs';
export { validateSessionLocator };
const requireThat = (condition, message) => { if (!condition) throw new Error(message); };
export function validateHandoff(input) {
  try {
    const context = resolveWorkContextSync(input);
    const facts = readChangeFactsSync(context, input.change);
    requireThat(facts.location.kind === 'active', 'archived handoffs are frozen; use the original archive integrity checks');
    if (input.stage === 'dispatch') requireThat(facts.outcome === 'active', 'dispatch requires an active change');
    return validateDispatch({...input, projectRoot:context.projectRoot,
      scopeRoot:relative(context.projectRoot, facts.location.root).split(sep).join('/'), schemaVersions:[1]});
  } catch (error) {
    return {errors:[String(error.message ?? error)], warnings:[], caveat:'Read-only legacy structure checks do not authenticate authorization or completion.'};
  }
}

export function handoffCLI(argv) {
  const names = {'--repo':'projectRoot','--method-root':'methodRoot','--state-root':'stateRoot','--change':'change','--session':'session','--task':'task','--stage':'stage'}, input = {};
  if (argv.length === 1 && argv[0] === '--help') {
    console.log('Usage: node validate-handoff.mjs --repo <project> [--method-root <methods> --state-root <data-parent>] --change <id> --session <round> --task <id> --stage dispatch|return\nDirect use requires all three roots. Read-only; no log discovery or external transcript access.'); return 0;
  }
  try {
    for (let i=0;i<argv.length;i++) {
      const key = Object.hasOwn(names,argv[i]) ? names[argv[i]] : undefined, value = argv[++i];
      requireThat(key && !Object.hasOwn(input,key) && value && !value.startsWith('--'), 'unknown, duplicate or incomplete option'); input[key] = value;
    }
    requireThat(['projectRoot','change','session','task','stage'].every(key => input[key]), 'missing required arguments');
    requireThat(['dispatch','return'].includes(input.stage), 'invalid stage');
  } catch (error) { console.error(String(error.message ?? error)); return 2; }
  const result = validateHandoff(input); console.log(JSON.stringify(result,null,2)); return result.errors.length ? 1 : 0;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) process.exitCode = handoffCLI(process.argv.slice(2));
