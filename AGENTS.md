# Speculo

Speculo distributes reusable AI workflows, Work skills and utility packages, and installs them without losing project data. The package is `@namewta/speculo`; supported Node and pnpm versions are in `package.json`.

## Source map

- `src/`: discovery, CLI, host exposure, installation, updates and recovery.
- `template/workflows/<domain>/SKILL.md`: four domain routers; SpecDev includes Ops.
- `template/workflows/<domain>/<work>/SKILL.md`: independently usable task methods and their necessary references, examples or tools.
- `template/commands/<name>/COMMAND.md`: explicit AI requests such as handoff or Git analysis.
- `template/references/memory.md`: durable knowledge conventions, read when saving or resuming work.
- `skills-hub/`: complete, selectively installed utility skills.
- `.agents/skills/speculo-author/SKILL.md`: authoring guidance for workflow, Work, Skill and Command changes.
- `docs/`: user and maintainer documentation; `test/` and `scripts/`: executable installation and package verification.

Read the files relevant to the task. Use [architecture](docs/architecture.md) for installation boundaries, [workflow](docs/workflow.md) for persistence and [refactor map](docs/refactor-map.md) to audit capability preservation.

## Development

```bash
pnpm install --frozen-lockfile
pnpm check
pnpm verify-bin
pnpm verify-package
```

Tests use disposable fixtures with no production access. Run relevant checks and fix regressions without asking at each step. `verify-package` installs a real tarball and needs dependencies from the configured registry or cache.

## Editing instructions

Preserve the capability behind a document before changing its packaging. Keep task-specific methods, source material, useful examples, executable tools and licenses; remove duplicate instructions, obsolete contracts and unnecessary process. A short router must still lead to the specialized content it replaces. File count and word count are not acceptance criteria.

Skills use standard frontmatter and directory discovery. Do not reintroduce business manifests, mandatory forms, state schemas or agent dispatch protocols. Progressive disclosure controls what is read; it does not justify deleting the material a task needs.

Keep user runtime bytes, file ownership, path confinement and transaction recovery intact. Installation metadata is machine state and must not become a task state machine. Test actual tool behavior when changing a tool, and inspect realistic task results when changing a method.

Preserve provenance and licenses. User instructions and existing scoped authorization govern execution. Report actual verification and limits. A `v*` tag invokes the staged npm release workflow; a PR or successful build does not authorize publishing.
