# Speculo

Speculo distributes concise AI instructions and installs them without losing project data. The package is `@namewta/speculo`; supported Node and pnpm versions are in `package.json`.

## Source map

- `src/`: CLI, asset discovery, host exposure, installation, updates and recovery.
- `template/workflows/<name>/SKILL.md`: four independent methods; SpecDev includes deployment.
- `template/commands/<name>/COMMAND.md`: explicit requests such as handoff or Git analysis.
- `template/references/memory.md`: optional durable knowledge conventions.
- `skills-hub/`: complete, selectively installed utility skills and their necessary tools.
- `.agents/skills/speculo-author/SKILL.md`: authoring guidance when changing instructions.
- `test/` and `scripts/`: executable installation and package verification.

Read the files relevant to the requested change. Use [architecture](docs/architecture.md) for installation boundaries, [workflow](docs/workflow.md) for persistence behavior, and [upgrade notes](docs/upgrade-v3.md) for removed interfaces.

## Development

```bash
pnpm install --frozen-lockfile
pnpm check
pnpm verify-bin
pnpm verify-package
```

Tests use disposable fixtures with no production access. Run relevant checks and fix regressions without asking at each step. `verify-package` creates and installs a real tarball; it needs dependencies available from the configured registry or cache.

Keep user runtime bytes, file ownership, path confinement and transaction recovery intact. Installation metadata is machine state; it must not grow into a task state machine. Skills describe outcomes and the context a model cannot infer. Add a script only for a real repeatable operation, and test that operation.

Preserve source licenses and cite upstream material when adapting it. Record actual verification and remaining limits; file-size changes do not establish token savings or model quality. User instructions and existing scoped authorization govern execution; do not add approval rounds to ordinary edits or tests.

A `v*` tag invokes the staged npm release workflow. A PR or successful build does not authorize publishing. The release workflow documents its registry approval and recovery steps.
