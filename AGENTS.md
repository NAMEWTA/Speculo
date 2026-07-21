# AGENTS.md — Speculo Agent Handbook

## Project Identity

- Package: `@namewta/speculo` v0.2.5
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
  commands/           4 command definitions
  skills/             6 skill directories
  workflows/          workflow packages with INDEX.md + work entries
  vendor/             Native skill collections (matt-pocock, khazix-skills)
  canonical/          Single-file canonical distribution format for AI platforms
test/                 CLI test suite
scripts/              Build, validation, verification, and canonicalize tooling
.agents/skills/       Internal authoring skills (5 speculo-write-* skills + _shared)
.github/workflows/    CI (build, test, verify-bin) + Release (npm publish + GitHub Release)
docs/                 Authoring contracts (skill, command, canonical, persistence)
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
- **workflows.ts** — Discover, scan, prompt workflow selection. Parses `INDEX.md`. Non-TTY auto-selects all.
- **utils.ts** — Single `pathExists()` helper.

## CLI Usage

```
speculo init [--all] [target]       Install/refresh core + selected workflows
speculo migrate [--apply] [target]  Preview/apply legacy state migration
speculo update                       Deprecated → delegates to speculo init --all
```

- `--all` only valid with `init`; `--apply` only valid with `migrate`.
- Existing `.speculo/` state is never overwritten on init.
- `update` command is deprecated and will be removed in a future version.

## Template Asset Layout

- **template/.speculo/workspace.json** — 7 root aliases: config, speculo, state, commands, skills, workflows, vendor
- **template/commands/** — archive-and-consolidate, docs-sync, retro, status
- **template/skills/** — agents-md-builder, archive-and-consolidate, docs-sync, github-npm-ops, speculo-retro, worktree-isolation
- **template/workflows/** — specdev（研发全流程: D-diagnose-bugs, G-grill-with-docs, I-implement, I-init-setup, S-spec, T-tickets, W-wayfinder）, person（1 work entry: M-mao-zedong-cognitive-os）
- **template/vendor/** — matt-pocock (raw upstream skills), khazix-skills (neat-freak: knowledge governance)
- **template/canonical/** — canonical 格式规范、示例（README.md + canonical-skill-example.md）与 `scripts/canonicalize.mjs` 自动化工具

## Workflow Package Contract

- Each workflow must have `INDEX.md` (auto-generated work catalog, not manually edited).
- Work entries follow `<Letter>-<work_name>/<Letter>-<work_name>.md` naming, with progressive disclosure sub-files.
- All cross-references use `<Path>{roots.xxx}/...</Path>` format based on workspace.json root aliases.
- `_state/` skeleton must contain `status.json`, `changes/`, `archive/`; other content decided by workflow.
- `docs-sync.json` is a lazy command sidecar; never put it in `_state/` template.
- Workflow root resolves to `speculo/workflows/<workflow>`; state root to `speculo/.speculo/<workflow>`.

## Internal Authoring Skills

Five skills in `.agents/skills/` for maintaining Speculo itself:
- **speculo-write-canonical** — Generate/audit single-file canonical distribution format for AI platforms
- **speculo-write-command** — Create/audit single-file commands
- **speculo-write-skill** — Create/audit reusable skills
- **speculo-write-work** — Write individual work entry files and progressive-disclosure sub-files within a workflow
- **speculo-write-workflows** — Create/audit workflow packages, generate INDEX.md, and reconcile vendor Git changes

All reference: `AGENTS.md`, `docs/<type>-authoring.md`, `docs/persistence-contract.md`, `_shared/authoring-quality.md`.

## Validation Pipeline

- `validate-framework-assets.mjs` — Validates workflow XML blocks, frontmatter, state templates, agent skills.
- `check-template-links.mjs` — Validates all relative markdown links in `template/` and `.agents/`.
- `canonicalize.mjs` — Auto-generates single-file canonical documents from skill/command/workflow directories.
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
