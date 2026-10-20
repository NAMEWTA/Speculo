# Shared contracts

This directory describes shared data that has an actual consumer. It does not define a universal Change lifecycle, dispatch engine, process lock or checkpoint store.

- `capability-profile.schema.json` validates declared host facts in `.speculo/capabilities.json`. `doctor` checks its structure; invocation must still use actual host evidence and existing authorization.
- The workflow discovery contract lives at <Path>{roots.workflows}/workflow-manifest.schema.json</Path>. It registers Work entries, optional coordination stages and knowledge paths. Its descriptive stage graph does not authorize execution or replace a domain's state.
- The source contract module owns cross-field graph and identity checks. The shipped standalone validators are compiled from these JSON schemas; installed tools do not need Ajv.
- Evaluation traces remain evidence owned by the offline evaluation protocol. Fixture coverage, artifact checks and independently observed runs have separate conclusions.

SpecDev, Learning, OPS, Person and Media own their current artifacts, lifecycle, recovery and publication rules. An unfamiliar state is preserved and reported; a shared helper cannot invent a conversion or grant a write.
