# Changelog

All notable changes to Speculo are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added
- Package-based workflow system with XML route declarations (`<runtime-context>`, `<persistence>`, `<routes>`, `<sequence>`, `<dependencies>`, `<state-schema>`, `<transitions>`).
- Two installable workflow packages: **matt-pocock** (10 routes: idea-to-delivery, wayfinder, triage, diagnose, architecture, review, merge-conflicts, research-prototype, productivity, experimental) and **person** (1 route: Mao Zedong Cognitive OS consulting workflow).
- Five command definitions: docs-sync, finalize, knowledge-prune, retro, status.
- Ten skills: agents-md-builder, change-lifecycle, config-prune, docs-sync, github-npm-ops, knowledge-prune, runtime-context, scaffold-exercises, speculo-retro, worktree-isolation.
- `speculo migrate [--apply] [target]` for v2 and transitional v3 state to current v3 contract migration, with staged rollback safety.
- `speculo init [--all] [target]` with interactive workflow selection via `@inquirer/prompts`.
- Vendor skill collection support: matt-pocock (engineering + productivity) and officecli.
- `docs-sync` skill with six reference contracts: git-state, workflow-scope, document-lifecycle, readme, changelog, agents.
- CI pipeline: build, test, validate-assets, verify-bin.
- npm release workflow with package provenance and tag-version verification.
- `--all` flag for `speculo init` to select every workflow and fully refresh vendor assets on update.
- Workflow status state extensions: `current_route`, `route_history`, `skill_history`, `external_refs`, `legacy_source`.

### Changed
- `speculo update` deprecated; delegates to `speculo init --all`.
- Vendor directory restructured: `vendor/` as native skill collection directory.
- `speculo/` directory renamed to `template/` for clearer shipped asset semantics.
- init/update merged into unified `speculo init` command with smarter state preservation.
- docs-sync state schema upgraded to v4 with per-workflow `docs-sync.json` sidecars.
- Workflow assets migrated from flat vendor directory to structured package-based layout.

### Removed
- Legacy v2 workflow categories (dev, doc, person as top-level state trees).
- Legacy config files: RULES.md, LESSONS.md under `.speculo/.config/`.
- Legacy skills: handoff, write-a-skill, caveman (superseded by standalone skill assets in `template/skills/`).
