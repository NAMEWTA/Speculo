# @namewta/speculo

> Provider-neutral, resumable AI collaboration workflows with state-safe refresh tooling.

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

Requires: Node.js ≥ 22.22.3 and < 25

## Commands

| Command | Description |
|---|---|
| `speculo` / `speculo init [target]` | Initialize or refresh a Speculo 1.0 runtime. 0.x installations are intentionally incompatible and must be removed or renamed first. |
| `speculo version` | Print the installed version and check npm for the latest release. |
| `speculo doctor [target] [--json]` | Read-only installation integrity and recovery diagnostics. |
| `speculo resolve [target] --path <reference>` | Read-only pointer resolution; does not execute a shell. |
| `speculo recover [target] --transaction <id>` | Explicit recovery of an identified interrupted refresh. |

Legacy CLI commands and 0.x migration paths remain removed. The CLI also offers read-only `resolve` and explicit transaction-ID `recover`; doctor reports its installation-only scope.

Initialization updates controlled passive-bootstrap and persistent-knowledge blocks in project `AGENTS.md` for all installed workflows. The block contains references to promoted knowledge paths and explicitly remains lazy: it does not activate a workflow, create a Change, or execute a Work. A missing `CLAUDE.md` is created as a fixed redirect to `AGENTS.md`; existing handbook content is preserved.

## Installed Runtime Assets

After initialization, the target project gains the following AI agent-callable assets:

### 7 Commands

| Command | Purpose |
|---|---|
| `docs-sync` | Audit (default), update, or explicitly commit documentation from reproducible Git ranges |
| `archive-and-consolidate` | Knowledge lifecycle governance: archive stale content, consolidate scattered knowledge, clean up outdated assets |
| `git-history-squash` | Confirmed first-parent history convergence with recoverable refs and exact remote leases |
| `git-repository-audit` | Read-only, reproducible audit of one or more local Git repositories |
| `handoff` | Persist a compact, resumable context handoff for another agent |
| `retro` | Retrospective analysis with `gh issue` creation |
| `status` | Summary of installed workflows, active changes, and anomalies |

### 10 Skills

| Skill | Purpose |
|---|---|
| `archive-and-consolidate` | Archive stale content, consolidate scattered knowledge, and clean up outdated assets |
| `docs-sync` | Documentation audit plus incremental or full AGENTS.md / CLAUDE.md handbook synchronization |
| `github-npm-ops` | GitHub issue/PR triage and npm operations |
| `git-history-squash` | Controlled first-parent history convergence with recoverable local ref transactions and exact remote leases |
| `optimize-codex-config` | Audit and optimize local Codex configuration, custom Responses providers, permissions, and compaction failures |
| `source-code-zip` | Create a dependency-free, code-only ZIP for isolated source delivery |
| `speculo-retro` | Retrospective analysis |
| `upstream-fork-sync` | Assess fork/upstream deltas from proven integration checkpoints and persist reproducible diff and conflict reports |
| `engineering-standards-builder` | Interview-driven generator that produces a project-specific TypeScript/JS/React/Node standards skill |
| `writing-great-skills` | Authoring guidance for agent skills |

### 4 Workflow Packages

| Workflow | Work Entries | Description |
|---|---:|---|
| **learning** | 9 | Evidence-aware learning for projects, products, subjects, languages, and skills: complete 30–40 minute plain-language lessons, Socratic inquiry lessons, Goal-Plan compilation for later external /goal execution (teach a mine-unit of ≤15 lessons, then fan out miners), single-file homework review, optional retention review, and provenance-preserving topic synthesis |
| **specdev** | 14 | Local-first specification-driven development: archive, code review, diagnosis, grilling, implementation, setup, learning, goal planning, prototyping, architecture review, specs, tickets, triage (intake / reconcile / publish / capture), and wayfinding |
| **ops** | 3 | Host inventory and project deployment: initialize, host manage, and APP/shared-service deploy with dual documentation |
| **person** | 2 | Persona-methodology and rigorous deliberation workflows (Mao Zedong Cognitive OS; Bidirectional Steelman Deliberation) |

Every workflow ships an `INDEX.md` discovery entry. SpecDev/Learning/Ops keep their generated Work catalog in the README activation contract; Person lists Works directly in INDEX. Work entries follow `<Letter>-<work_name>/<Letter>-<work_name>.md` naming with progressive-disclosure sub-files, and resolve runtime paths via `<Path>{roots.xxx}/...</Path>` pointers in `workspace.json`.

SpecDev T-triage stays the only remote boundary. Use **intake** to freeze a source, **reconcile** to close that original source Issue after local completion, **publish** to project each completed Ticket as a classified GitHub Issue (local-origin work included), and **capture** to park a not-yet-Change note as a still-open GitHub Issue. GitHub is a projection, counter, and inbox — not the development source of truth. Run both reconcile and publish when an intake Change should also count its tickets. Capture does not create a Change.

## Documentation

- [AGENTS.md](./AGENTS.md) — AI agent handbook (authoritative)
- [CHANGELOG.md](./CHANGELOG.md) — Release history
- [skills/](./skills/) — Internal authoring tools for Speculo maintainers (self-contained authoring contracts under `_shared/` and per-skill `references/`)
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

## SpecDev Goal migration

The unified P Goal entry, O compatibility route, Initiative exploration and Plan Ticket contracts are documented in [the migration guide](docs/specdev-goal-migration.md). Existing runtime state is not silently rewritten.

## Agent contract hardening

Unattended first installation now installs core only. Select packages explicitly with `speculo init [target] --workflows specdev,learning`; unattended refresh selects already-installed supported packages. `--core-only` refreshes core without removing existing supported workflows. Installed and selected-for-update are separate; no automatic activation or uninstall is implied.

The project AGENTS bootstrap points to `speculo/.speculo/workspace.json`, a generated read-only capability catalog and the runtime guide. Agents that do not read project instructions need an explicit user-provided entry. Public Skill metadata follows the emitted standard profile; workflow-private Skills declare their resolver requirement. `INDEX.md` is a discovery entry: SpecDev/Learning/Ops list Works in README activation contracts, while Person lists them directly in INDEX.

`speculo doctor [target] --json` checks installation integrity (not live services or agent behavior). `speculo resolve [target] --path <reference>` resolves one contained pointer without executing it. Interrupted refreshes retain transaction evidence; after verifying that the original process has stopped, `speculo recover [target] --transaction <id>` performs evidence-checked rollback or committed cleanup. Unknown locks, links and drift are never silently discarded. This is process-interruption recovery, not a universal power-loss or adversarial-filesystem guarantee.

Docs Sync defaults to read-only audit; update and commit require their corresponding user requests. New Ops controllers export credential references by default; plaintext documentation requires an explicitly approved plan. Existing active bindings, historical evidence and legacy plaintext policies are not silently migrated. See [migration and verification notes](docs/agent-contracts-upgrade.md).
