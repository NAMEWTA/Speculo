# @namewta/speculo

> Workflow-packaged specification-driven development assets with install, update, and migration tooling.

Speculo packages AI coding workflows as installable assets — commands, skills, workflow packages — delivered into any project via a unified CLI.

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
| `dev-worktree` | Git worktree isolation for development |

### 2 Workflow Packages

| Workflow | Work Entries | Description |
|---|---:|---|
| **specdev** | 7 | Full-cycle specification-driven development: init-setup, diagnose-bugs, grill-with-docs, implement, spec, tickets, wayfinder |
| **person** | 1 | Persona-methodology-based consulting workflow (Mao Zedong Cognitive OS) |

Every workflow ships an `INDEX.md` as its auto-generated work catalog. Work entries follow `<Letter>-<work_name>/<Letter>-<work_name>.md` naming with progressive-disclosure sub-files, and resolve runtime paths via `<Path>{roots.xxx}/...</Path>` pointers in `workspace.json`.

## Documentation

- [AGENTS.md](./AGENTS.md) — AI agent handbook (authoritative)
- [CHANGELOG.md](./CHANGELOG.md) — Release history
- [docs/](./docs/) — Authoring contracts for commands, skills, workflows, and persistence
- [.agents/skills/](./.agents/skills/) — Internal authoring tools for Speculo maintainers
- [README-ZH.md](./README-ZH.md) — 中文镜像

## Acknowledgments — Honoring Open Source Heritage

Speculo stands on the shoulders of pioneers — including our own failures. With deep gratitude, we honor:

- **[SpecForge](https://github.com/NAMEWTA/specforge)** — the author's own previous project. A CLI-driven SDD tool whose failure taught us the most important lesson: in the AI era, documents are the interface, not CLI commands. Making humans learn commands to manage AI documents gets the relationship backwards.
- **[Matt Pocock Skills](https://github.com/mattpocock/skills)** — the groundbreaking work that defined AI-assisted development workflows and inspired the very concept of packageable agent skills.
- **[Khazix Skills](https://github.com/KKKKhazix/khazix-skills)** — a rich ecosystem of practical agent skills that demonstrated the power of community-driven workflow sharing.
- **[OpenSpec](https://github.com/Fission-AI/OpenSpec)** — a lightweight spec-driven development framework whose changes/ directory structure and archive mechanism deeply influenced Speculo's persistence contract design.
- **[Superpowers](https://github.com/obra/superpowers)** — a complete agentic development methodology whose skill orchestration and subagent dispatch provided key reference for workflow package design.

Speculo synthesizes lessons from all: from failure we learned "documents are the interface"; from Matt we inherited skill methodology; from OpenSpec we adopted engineering management; from Superpowers we studied orchestration. Together they form package-based workflow management, persistence contracts, and a unified install/migrate lifecycle. We carry their spirit forward.

## License

MIT — see [LICENSE](./LICENSE)
