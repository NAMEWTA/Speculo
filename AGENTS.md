# AGENTS.md — Speculo Agent Handbook

## Project Identity

- Package: `@namewta/speculo` v0.2.1
- Repository: `github.com/NAMEWTA/Speculo`
- Type: npm CLI tool (TypeScript, ESM)
- Runtime: Node.js 22.22.3, pnpm@11.1.3
- License: MIT
- Binary: `speculo` → `dist/src/cli.js`

## Directory Map

```
src/                 CLI source (cli.ts, index.ts, migrate.ts, workflows.ts, utils.ts)
template/             Shipped asset bundle
  .speculo/           workspace.json + README.md (runtime state contract)
  commands/           5 command definitions
  skills/             10 skill directories
  workflows/          2 workflow packages with PERSISTENCE + route/atomic entries
  vendor/             Native skill collections (matt-pocock, officecli)
test/                 Test suite (cli.test.ts)
scripts/              Validation + verification tooling
.agents/skills/       Internal authoring skills (speculo-write-command/skill/workflows)
.github/workflows/    CI (build, test, verify-bin) + Release (npm publish + GitHub Release)
docs/                 Authoring contracts (skill, command, workflow, persistence)
```

## Essential Commands

| Command | What it does |
|---|---|
| `pnpm build` | `tsc -p tsconfig.json` |
| `pnpm test` | `node --test dist/test/*.test.js` (builds first via pretest) |
| `pnpm validate-assets` | `node scripts/validate-framework-assets.mjs && node scripts/check-template-links.mjs` |
| `pnpm check` | `pnpm test && pnpm validate-assets` |
| `pnpm verify-bin` | `node scripts/verify-bin.mjs` |

## Architecture

- **cli.ts** — Thin command router: parse command → delegate to index.ts (init) or migrate.ts (migrate). `update` is deprecated.
- **index.ts** — `initSpeculo()` copies template assets to `<target>/speculo/`. Core assets (`.speculo`, `commands`, `skills`) always installed. Workflow packages selected interactively or via `--all`.
- **migrate.ts** — `planMigration()` + `migrateSpeculo()`: v2/transitional-v3 → current v3 state. Staged, rollback-safe with backup/restore.
- **workflows.ts** — Discover, scan, prompt workflow selection. Parses `WORKFLOW.md` frontmatter. Non-TTY auto-selects all.
- **utils.ts** — Single `pathExists()` helper.

## CLI Usage

```
speculo init [--all] [target]       Install/refresh core + selected workflows
speculo migrate [--apply] [target]  Preview/apply legacy state migration
speculo update                       Deprecated → delegates to speculo init --all
```

- `--all` only valid with `init`; `--apply` only valid with `migrate`.
- Existing `.speculo/` state is never overwritten on init.

## Template Asset Layout

- **template/.speculo/workspace.json** — 7 root aliases: config, speculo, state, commands, skills, workflows, vendor
- **template/commands/** — docs-sync, finalize, knowledge-prune, retro, status
- **template/skills/** — agents-md-builder, change-lifecycle, config-prune, docs-sync, github-npm-ops, knowledge-prune, runtime-context, scaffold-exercises, speculo-retro, worktree-isolation
- **template/workflows/** — matt-pocock (10 routes, 28 atomic skills), person (1 route)
- **template/vendor/** — matt-pocock (raw upstream skills), officecli (one skill)

## Workflow Package Contract

- Each workflow must have `WORKFLOW.md` and peer `PERSISTENCE.md`; the latter exclusively owns `<runtime-context>`, `<persistence>`, change startup and side-effect boundaries.
- `WORKFLOW.md` must load `PERSISTENCE.md` first. Workflows with SKILL dependencies expose one-to-one `atomic-skills/` wrappers and route through them.
- `_state/` skeleton must contain `status.json`, `changes/`, `archive/`.
- `docs-sync.json` is a lazy command sidecar; never put it in `_state/` template.
- Workflow root resolves to `speculo/workflows/<workflow>`; state root to `speculo/.speculo/<workflow>`.

## Internal Authoring Skills

Three skills in `.agents/skills/` for maintaining Speculo itself:
- **speculo-write-command** — Create/audit single-file commands
- **speculo-write-skill** — Create/audit reusable skills
- **speculo-write-workflows** — Create/audit workflow packages

All reference: `AGENTS.md`, `docs/<type>-authoring.md`, `docs/persistence-contract.md`, `_shared/authoring-quality.md`.

## Validation Pipeline

- `validate-framework-assets.mjs` — Validates workflow XML blocks, frontmatter, state templates, agent skills.
- `check-template-links.mjs` — Validates all relative markdown links in `template/` and `.agents/`.
- Tests use `mkdtemp` for temp directories, always clean up.

## Dangerous Patterns (verified regressions)

- **Do not** put `docs-sync.json` in workflow `_state/` template — it's a lazy command sidecar.
- **Do not** overwrite existing `.speculo/` state on init (merge/copy-missing only).
- **Do not** mutate state when migration blockers exist — all or nothing.
- **Do not** leave legacy workflow directories (`workflows/dev`, `workflows/doc`) after migration.

## Release

- Tags `v*` trigger `.github/workflows/release.yml`.
- Tag version must match `package.json` version (enforced in CI).
- Release notes extracted from CHANGELOG.md via awk.
- npm publish with `--provenance --access public`; GitHub Release via `softprops/action-gh-release`.
