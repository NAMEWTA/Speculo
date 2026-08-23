# @namewta/speculo

> Workflow-packaged specification-driven development assets with state-safe refresh tooling.

Speculo packages AI coding workflows as installable assets — commands, skills, workflow packages — delivered into any project via a unified CLI.

## Quick Start

```bash
# Initialize Speculo in a target project
npx @namewta/speculo init

# Global install
npm install -g @namewta/speculo
speculo init [target]
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
| `speculo` / `speculo init [target]` | Initialize or refresh Speculo. Managed commands, skills, metadata, and selected workflow packages are replaced from the current template. Opaque runtime data is preserved byte-for-byte, structured state uses explicit migrators, and persistent configuration is reconciled against stored baselines. Conflicts stop before replacement with exit code `2`; only destructively changed config or structured files receive a targeted backup. |
| `speculo version` | Print the installed version and check npm for the latest release. |

Legacy CLI commands `migrate`, `mirror-skills`, and `update`, plus their flags, remain removed. The CLI exposes only `init` and `version`; refresh behavior is automatic and transactional.

## Installed Runtime Assets

After initialization, the target project gains the following AI agent-callable assets:

### 6 Commands

| Command | Purpose |
|---|---|
| `docs-sync` | Clean workspace, sync project documentation and Agent handbooks from reproducible Git ranges |
| `archive-and-consolidate` | Knowledge lifecycle governance: archive stale content, consolidate scattered knowledge, clean up outdated assets |
| `git-repository-audit` | Read-only, reproducible audit of one or more local Git repositories |
| `handoff` | Persist a compact, resumable context handoff for another agent |
| `retro` | Retrospective analysis with `gh issue` creation |
| `status` | Summary of installed workflows, active changes, and anomalies |

### 8 Skills

| Skill | Purpose |
|---|---|
| `archive-and-consolidate` | Archive stale content, consolidate scattered knowledge, and clean up outdated assets |
| `docs-sync` | Documentation audit plus incremental or full AGENTS.md / CLAUDE.md handbook synchronization |
| `github-npm-ops` | GitHub issue/PR triage and npm operations |
| `optimize-codex-config` | Audit and optimize local Codex configuration, custom Responses providers, permissions, and compaction failures |
| `source-code-zip` | Create a dependency-free, code-only ZIP for isolated source delivery |
| `speculo-retro` | Retrospective analysis |
| `engineering-standards-builder` | Interview-driven generator that produces a project-specific TypeScript/JS/React/Node standards skill |
| `writing-great-skills` | Authoring guidance for agent skills |

### 2 Workflow Packages

| Workflow | Work Entries | Description |
|---|---:|---|
| **specdev** | 14 | Local-first specification-driven development: archive, code review, diagnosis, mentoring, grilling, implementation, setup, goal planning, prototyping, architecture review, specs, tickets, triage, and wayfinding |
| **person** | 2 | Persona-methodology and rigorous deliberation workflows (Mao Zedong Cognitive OS; Bidirectional Steelman Deliberation) |

Every workflow ships an `INDEX.md` as its auto-generated work catalog. Work entries follow `<Letter>-<work_name>/<Letter>-<work_name>.md` naming with progressive-disclosure sub-files, and resolve runtime paths via `<Path>{roots.xxx}/...</Path>` pointers in `workspace.json`.

## Documentation

- [AGENTS.md](./AGENTS.md) — AI agent handbook (authoritative)
- [CHANGELOG.md](./CHANGELOG.md) — Release history
- [.agents/skills/](./.agents/skills/) — Internal authoring tools for Speculo maintainers (self-contained authoring contracts under `_shared/` and per-skill `references/`)
- [README-ZH.md](./README-ZH.md) — 中文镜像

## Acknowledgments — Honoring Open Source Heritage

Speculo stands on the shoulders of pioneers — including our own failures. With deep gratitude, we honor:

- **[SpecForge](https://github.com/NAMEWTA/specforge)** — the author's own previous project. A CLI-driven SDD tool whose failure taught us the most important lesson: in the AI era, documents are the interface, not CLI commands. Making humans learn commands to manage AI documents gets the relationship backwards.
- **[Matt Pocock Skills](https://github.com/mattpocock/skills)** — the groundbreaking work that defined AI-assisted development workflows and inspired the very concept of packageable agent skills.
- **[Khazix Skills](https://github.com/KKKKhazix/khazix-skills)** — a rich ecosystem of practical agent skills that demonstrated the power of community-driven workflow sharing.
- **[OpenSpec](https://github.com/Fission-AI/OpenSpec)** — a lightweight spec-driven development framework whose changes/ directory structure and archive mechanism deeply influenced Speculo's persistence contract design.
- **[Superpowers](https://github.com/obra/superpowers)** — a complete agentic development methodology whose skill orchestration and subagent dispatch provided key reference for workflow package design.

Speculo synthesizes lessons from all: from failure we learned "documents are the interface"; from Matt we inherited skill methodology; from OpenSpec we adopted engineering management; from Superpowers we studied orchestration. Together they form package-based workflow management, persistence contracts, and a state-safe refresh lifecycle. We carry their spirit forward.

## License

MIT — see [LICENSE](./LICENSE)
