# AGENTS.md — Speculo Agent Handbook

## Project Identity

- Package: `@namewta/speculo` v0.7.4
- Repository: `github.com/NAMEWTA/Speculo`
- Type: npm CLI tool (TypeScript, ESM)
- Runtime: Node.js 22.22.3, pnpm@11.1.3
- License: MIT
- Binary: `speculo` → `dist/src/cli.js`

## Directory Map

```
src/                 CLI source (cli.ts, index.ts, migrations.ts, version.ts, workflows.ts, utils.ts)
template/             Shipped asset bundle
  .speculo/           workspace.json + README.md (runtime state contract)
  commands/           7 command definitions
  skills/             8 skill directories
  workflows/          workflow packages with INDEX.md + work entries
  canonical/          Single-file pure-Markdown distribution format for AI platforms
test/                 CLI test suite
scripts/              Build, validation, verification tooling
.agents/skills/       Internal authoring skills (5 speculo-write-* skills + _shared/ + per-skill references/scripts)
.github/workflows/    CI (build, test, verify-bin) + Release (npm publish + GitHub Release)
```

## Essential Commands

| Command | What it does |
|---|---|
| `pnpm build` | Clean `dist/`, then run `tsc -p tsconfig.json` |
| `pnpm test` | `node --test dist/test/*.test.js` (builds first via pretest) |
| `pnpm validate-source-parity` | Check all `temp/skills` sources against their adopted, excluded, or pending SpecDev targets |
| `pnpm validate-assets` | Check source parity, canonical freshness, framework assets, and template links |
| `pnpm check` | `pnpm test && pnpm validate-assets` |
| `pnpm verify-bin` | `node scripts/verify-bin.mjs` |

## Architecture

- **cli.ts** — Thin command router exposing only init (also the bare command) and version.
- **index.ts** — `initSpeculo()` builds a staged installation before atomically replacing `<target>/speculo/`. It refreshes template-managed static assets and delegates runtime compatibility to `migrations.ts`.
- **migrations.ts** — Snapshots the previous runtime, keeps the latest backup, automatically migrates compatible v0.7+ state, and writes the pending marker for Agent-assisted repair.
- **workflows.ts** — Discover, scan, prompt workflow selection. Parses `INDEX.md`. Non-TTY auto-selects all.
- **utils.ts** — Single `pathExists()` helper.

## CLI Usage

```
speculo [init] [target]                 Initialize/refresh core + selected workflows
speculo version                          Show local version and check npm for updates
```

- Bare `speculo` is an alias for `speculo init`; `init` accepts at most one target path and shows the workflow picker in a TTY. Non-TTY installs all template workflows.
- Every refresh replaces managed commands, skills, workspace/install metadata, and selected workflow static assets. Compatible v0.7+ configuration and complete workflow/command runtime state are migrated into the new installation.
- Before replacement, the previous `config.json` and `.speculo/` state are saved under `speculo/.speculo/back/`; the previous backup and pending marker are excluded, so only the latest backup is retained.
- Unknown core schema, malformed JSON, state symlinks, command-state ownership gaps, and workflow index conflicts create a clean active state plus `.speculo/migration.json`. CLI exits `2`; repeated `init` blocks without modification until the Agent command `migrate-runtime-state` completes.
- Current supported workflows not selected in the refresh remain untouched. Unknown/removed static commands, skills, and workflow packages are removed; runtime evidence remains in active state when compatible or in the backup when pending.

## Template Asset Layout

- **template/.speculo/workspace.json** — 6 root aliases: config, speculo, state, commands, skills, workflows
- **template/commands/** — archive-and-consolidate, docs-sync, git-repository-audit, handoff, migrate-runtime-state, retro, status
- **template/skills/** — archive-and-consolidate, docs-sync, github-npm-ops, migrate-runtime-state, optimize-codex-config, speculo-retro, engineering-standards-builder, writing-great-skills
- **template/workflows/** — specdev（14 works: A-archive-and-consolidate, C-code-review, D-diagnose-bugs, E-engineering-cognitive-mentor, G-grill-with-docs, I-implement, I-init-setup, P-goal-plan, P-prototype, R-review-architecture, S-spec, T-tickets, T-triage, W-wayfinder）, person（2 work entries: M-mao-zedong-cognitive-os, S-steelman-deliberation）
- **template/canonical/** — pure-Markdown 单文件分发格式（README.md + canonical-specdev-* 等）；由 `scripts/generate-specdev-canonical.mjs` 从源依赖闭包重建

## Workflow Package Contract

- Each workflow must have `INDEX.md`: `type: workflow` uses one AUTO-INDEX marker pair inside a full package contract; `type: workflow-index` / `auto_generated: true` is a generator-owned whole-file catalog without markers.
- Work entries follow `<Letter>-<work_name>/<Letter>-<work_name>.md` naming, with progressive disclosure sub-files.
- All cross-references use `<Path>{roots.xxx}/...</Path>` format based on workspace.json root aliases.
- `_state/` skeleton must contain `status.json`, `changes/`, `archive/`; other content decided by workflow.
- `docs-sync.json` is a lazy command sidecar; never put it in `_state/` template.
- Workflow root resolves to `speculo/workflows/<workflow>`; state root to `speculo/.speculo/<workflow>`.

## Internal Authoring Skills

Five skills in `.agents/skills/` for maintaining Speculo itself:
- **speculo-write-canonical** — Generate/audit single-file pure-Markdown canonical distribution format for AI platforms
- **speculo-write-command** — Create/audit single-file commands
- **speculo-write-skill** — Create/audit reusable skills
- **speculo-write-work** — Write individual work entry files and progressive-disclosure sub-files within a workflow
- **speculo-write-workflows** — Create/audit workflow packages, generate INDEX.md, and track asset changes

每个 skill 先读 `_shared/` 共同事实源（`project-model.md`、`path-and-reference-rules.md`、`authoring-quality.md`、`validation-gates.md`），再读本包内 `references/<type>-contract.md`。创作契约不再集中在 `docs/`，而是随各 skill 自包含（`docs/` 已废弃）。

## Validation Pipeline

- `pnpm validate-assets` 依次运行四步：
  - `check-specdev-source-parity.mjs` — 确认 `temp/skills` 的 26 个上游来源全部登记为已采用、明确排除或待处理，并校验已采用目标 hash。
  - `generate-specdev-canonical.mjs --check` — 确认 `template/canonical/canonical-specdev-*` 与源文件闭包一致（stale 即失败）。
  - `validate-framework-assets.mjs` — Validates INDEX frontmatter/sections, `_state/` skeleton, `<Path>` root aliases, docs-sync templates, agent skills.
  - `check-template-links.mjs` — Validates markdown links and `<Path>` pointers in `template/` (and markdown links in `.agents/`).
- `.agents/skills/speculo-write-workflows/scripts/validate-speculo-assets.mjs .` — 维护者 skill 自带的最低门校验器，检查 skill 链接、frontmatter、`<Path>`、command/workflow/work 结构；由各 speculo-write-* skill 手动调用。
- `generate-index.mjs <workflow>` — 从 `<Letter>-<slug>` work 目录重建 AUTO-INDEX（specdev 用 AUTO-INDEX 标记，person 用整文件自动生成）。
- Tests use `mkdtemp` for temp directories, always clean up.

## Dangerous Patterns (verified regressions)

- **Do not** put `docs-sync.json` in workflow `_state/` template — it's a lazy command sidecar.
- **Do not** delete initialized workflow configuration, permanent knowledge, sidecars, or command state during a compatible refresh.
- **Do not** run workflows or repeat `speculo init` while `.speculo/migration.json` is pending; route only to `migrate-runtime-state`.
- **Do not** modify `.speculo/back/` from workflows or Agent commands; the migration skill treats it as an immutable source.
- **Do not** replace an existing installation until staging the complete next installation succeeds.
- **Do not** retain legacy workflow directories (such as `workflows/dev` or `workflows/doc`) in a refreshed installation.

## Release

- Tags `v*` trigger `.github/workflows/release.yml`.
- Tag version must match `package.json` version (enforced in CI).
- Release notes extracted from CHANGELOG.md via awk.
- npm publish with `--provenance --access public`; GitHub Release via `softprops/action-gh-release`.
