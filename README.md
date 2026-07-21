# @namewta/speculo

> Workflow-packaged specification-driven development assets with install, update, and migration tooling.

Speculo packages AI coding workflows as installable assets — commands, skills, workflow packages, and vendor skill collections — delivered into any project via a unified CLI.

## Quick Start

```bash
# Initialize Speculo in a target project
npx @namewta/speculo init

# Install all workflow packages
npx @namewta/speculo init --all

# Global install
npm install -g @namewta/speculo
speculo init [--all] [target]
```

After initialization, the target project's `speculo/` directory contains all core assets and selected workflow packages.

## Install

```bash
npm install -g @namewta/speculo
```

Requires: Node.js ≥ 22.22.3

## Commands

| Command | Description |
|---|---|
| `speculo init [--all] [target]` | Install or refresh Speculo core assets and selected workflow packages. Existing `speculo/.speculo/` state is never overwritten. |
| `speculo migrate [--apply] [target]` | Preview (or apply) migration from v2 or transitional v3 state to current v3 contract. Dry-run by default; `--apply` to perform the staged, rollback-safe migration. |
| `speculo update` | Deprecated. Delegates to `speculo init --all`. |

## Installed Runtime Assets

After initialization, the target project gains the following AI agent-callable assets:

### 4 Commands

| Command | Purpose |
|---|---|
| `docs-sync` | Clean workspace, sync project documentation from reproducible Git ranges |
| `archive-and-consolidate` | Knowledge lifecycle governance: archive stale content, consolidate scattered knowledge, clean up outdated assets |
| `retro` | Retrospective analysis with `gh issue` creation |
| `status` | Summary of installed workflows, active changes, and anomalies |

### 6 Skills

| Skill | Purpose |
|---|---|
| `agents-md-builder` | Multi-layer AGENTS.md / CLAUDE.md handbook tree builder |
| `archive-and-consolidate` | Archive stale content, consolidate scattered knowledge, and clean up outdated assets |
| `docs-sync` | Core documentation audit and synchronization |
| `github-npm-ops` | GitHub issue/PR triage and npm operations |
| `speculo-retro` | Retrospective analysis |
| `worktree-isolation` | Git worktree isolation |

### 2 Workflow Packages

| Workflow | Work Entries | Description |
|---|---:|---|
| **specdev** | 7 | Full-cycle specification-driven development: init-setup, diagnose-bugs, grill-with-docs, implement, spec, tickets, wayfinder |
| **person** | 1 | Persona-methodology-based consulting workflow (Mao Zedong Cognitive OS) |

Every workflow ships an `INDEX.md` as its auto-generated work catalog. Work entries follow `<Letter>-<work_name>/<Letter>-<work_name>.md` naming with progressive-disclosure sub-files, and resolve runtime paths via `<Path>{roots.xxx}/...</Path>` pointers in `workspace.json`.

### Vendor Skill Collections

- **Matt Pocock skills** — The complete stable and explicitly enabled inventory, preserved as read-only vendor sources behind workflow-owned atomic wrappers.
- **Khazix Skills (neat-freak)** — Knowledge governance and cleanup: stale content archiving, scattered knowledge consolidation, and outdated asset cleanup.

## Documentation

- [AGENTS.md](./AGENTS.md) — AI agent handbook (authoritative)
- [CHANGELOG.md](./CHANGELOG.md) — Release history
- [docs/](./docs/) — Authoring contracts for commands, skills, workflows, and persistence
- [.agents/skills/](./.agents/skills/) — Internal authoring tools for Speculo maintainers
- [README-ZH.md](./README-ZH.md) — 中文镜像

## Acknowledgments

Inspired by and built upon [Matt Pocock Skills](https://github.com/mattpocock/skills) — the pioneering work that shaped AI-assisted development workflows. Speculo extends this foundation with package-based workflow management, persistence contracts, and a unified install/migrate lifecycle.

## License

MIT — see [LICENSE](./LICENSE)
