# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

Runtime is pinned: Node `22.22.3`, pnpm `11.1.3` (`engines` in package.json; CI installs with `--frozen-lockfile`).

```bash
pnpm install
pnpm build        # tsc -p tsconfig.json → emits dist/ (src + test compiled together)
pnpm test         # node --test dist/test/*.test.js  (pretest runs build first)
pnpm check        # build + test
pnpm verify-bin   # node scripts/verify-bin.mjs — asserts dist/src/cli.js exists, has the shebang, and `--help` works
```

**Tests run against compiled JS in `dist/`, not `src/`.** `pnpm test` is safe because `pretest` rebuilds. To run a single test you must build manually first, then target the compiled file with a name pattern:

```bash
pnpm build && node --test --test-name-pattern="init fails on existing" dist/test/cli.test.js
```

## Two layers in one repo

This repo is both a CLI and the payload it ships. Keep them distinct:

1. **CLI source** — `src/` (`cli.ts`, `index.ts`, `utils.ts`) + `test/`. A tiny ESM/TypeScript tool with two commands. This is the only code that is built and tested.
2. **Framework asset source** — `speculo/`. Markdown `commands/`, `workflows/`, `skills/`, and a `.speculo/` state skeleton. This is the *content* the CLI copies into other projects. Most editing in this repo happens here, and it is plain Markdown/JSON — not compiled, not unit-tested directly.

`package.json` `files: ["dist/src", "speculo"]` ships exactly these two layers; `bin.speculo` → `dist/src/cli.js`.

## CLI contract (`src/index.ts`)

The whole tool is two functions driven by two constant arrays — these arrays are the single source of truth for what gets copied:

- `INIT_ASSETS = [".speculo", "commands", "skills", "workflows"]` → `initSpeculo` copies each from `<packageRoot>/speculo/<asset>` into `<target>/speculo/<asset>`. Assets nest under a **single `speculo/` directory** in the target (`INSTALL_SUBDIR`), mirroring the package layout — never scattered into the target root. It **collects all conflicts first and refuses (throws) if any destination already exists** — never overwrites on init (`cp` with `errorOnExist`).
- `UPDATE_ASSETS = ["commands", "skills", "workflows"]` → `updateSpeculo` does `rm -rf` then `cp` for each under `<target>/speculo/`. **`.speculo/` is deliberately excluded** so user state/artifacts survive an update.

`cli.ts` resolves `packageRoot` as `dirname(import.meta.url)/../..` — correct only because the compiled entry lives at `dist/src/cli.js` (two levels under the package root). Changing the build layout breaks asset resolution.

### Tests are coupled to the shipped asset list

`test/cli.test.ts` asserts specific files exist after `init` under `<target>/speculo/` (e.g. `speculo/skills/speculo-write/SKILL.md`, `speculo/workflows/dev/R-review/R-review.md`, `speculo/.speculo/dev/docs-sync-state.json`), that nothing scatters into the target root (e.g. no `<target>/.speculo`), and that removed paths stay gone (e.g. no `adapters/`). **If you add, rename, or remove a shipped asset under `speculo/`, update these assertions.**

## The two `.speculo/` directories

Don't confuse them:

- **`speculo/.speculo/`** — the *template* skeleton (`.config/RULES.md`, `.config/LESSONS.md`, empty `dev/`, `doc/`, `archive/`, status index JSONs). This is what `init` copies into a fresh project.
- **`.speculo/` at the repo root** — the *live working state* from this repo dogfooding its own framework. `dev-status.json`, `dev/docs-sync-state.json`, etc. track Speculo's own development. This is not shipped.

## Editing framework assets

The framework is an SDD (Specification-Driven Development) system: commands, workflows, and skills are distinguished by form and persistence responsibility (see `docs/Speculo-architecture.md`). When creating or changing any asset under `speculo/`:

- **`docs/persistence-contract.md` is the authoritative machine spec** — `.status.json` schema, directory naming (`YYYY-MM-DD-<kebab>`), minimal frontmatter sets per asset type, and write-responsibility table. Conform to it.
- All references between assets (skills, templates, phase files, other workflows) **must use relative paths** — no bare ids, no absolute paths.
- The `speculo/skills/speculo-write/` skill is the meta-skill for authoring assets and carries its own copy of every contract under `references/`. When authoring, follow that skill's references; it intentionally does **not** read the repo's `docs/`.
- Framework content and docs are primarily in Chinese — match the surrounding language.

## Release flow

CI (`.github/workflows/ci.yml`) runs build → test → verify-bin on push/PR to `main`. Release (`release.yml`) triggers on `v*` tags and **fails if the tag version ≠ `package.json` version**; it then tests, builds, verify-bins, extracts the matching `## [version]` section from `CHANGELOG.md` as release notes, and publishes to npm with provenance. Bump `package.json` and add the `CHANGELOG.md` section before tagging.
