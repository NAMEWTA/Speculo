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

### 5 Commands

| Command | Purpose |
|---|---|
| `docs-sync` | Clean workspace, sync project documentation from reproducible Git ranges |
| `finalize` | Completion gates, status finalization, and safe archiving |
| `knowledge-prune` | Dry-run audit of workflow knowledge namespaces |
| `retro` | Retrospective analysis with `gh issue` creation |
| `status` | Summary of installed workflows, active changes, and anomalies |

### 10 Skills

| Skill | Purpose |
|---|---|
| `agents-md-builder` | Multi-layer AGENTS.md / CLAUDE.md handbook tree builder |
| `change-lifecycle` | Change state transitions, verification, and archival |
| `config-prune` | Configuration namespace pruning |
| `docs-sync` | Core documentation audit and synchronization |
| `github-npm-ops` | GitHub issue/PR triage and npm operations |
| `knowledge-prune` | Knowledge namespace pruning |
| `runtime-context` | Path resolution for Speculo roots |
| `scaffold-exercises` | Exercise scaffolding |
| `speculo-retro` | Retrospective analysis |
| `worktree-isolation` | Git worktree isolation |

### 2 Workflow Packages

| Workflow | Routes | Atomic entries | Description |
|---|---:|---:|---|
| **matt-pocock** | 10 | 28 | Route composition plus one-to-one access to every stable and experimental Matt Pocock SKILL |
| **person** | 1 | 0 | Persona-methodology-based consulting workflow without synthetic skill wrappers |

Every workflow ships a peer `PERSISTENCE.md` as its sole runtime contract. `WORKFLOW.md` and each `atomic-skills/<id>.md` entry load it first, so composed routes and direct atomic calls resolve the same state root, active change, namespaces, and confirmation boundaries.

### Vendor Skill Collections

- **Matt Pocock skills** — 22 stable Engineering/Productivity skills and 6 explicitly enabled `in-progress` skills, all preserved as read-only vendor sources behind workflow-owned atomic wrappers.

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
