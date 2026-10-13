# Speculo

Domain methods, standard Agent Skills and explicit Commands for AI-assisted work. Version 2.0.0.

[中文说明](README-ZH.md) · [Architecture](docs/architecture.md) · [All capabilities](docs/capabilities.md) · [Recovery](docs/transaction-recovery.md)

## Install

Requires Node.js >=22.22.3 <25. Repository package manager: pnpm 11.1.3.

~~~bash
npm install -g @namewta/speculo
speculo init . --workflows specdev,learning --agent-skills domains
speculo init . --workflows all --agent-skills all --claude-skills all
speculo doctor .
~~~

The source installation lives in .agents/speculo/. Runtime state lives in .agents/speculo/.speculo/. The project AGENTS file receives only managed discovery and knowledge blocks. Existing CLAUDE instructions remain user owned.

A fresh non-interactive init installs the core. Select domains with --workflows; --core-only refreshes core assets. Previously installed unselected domains remain available. Exposure to each host is separate: --agent-skills and --claude-skills accept none, keep, domains, all, or comma-separated business IDs such as specdev/implement,command/status. Fresh installs expose nothing by default; refresh keeps existing selections.

Domain and Work pointers preserve source YAML verbatim and require reading the authoritative source entry first. Command wrappers carry host-specific explicit invocation policies. Conflicting third-party directories and edited files are preserved, with per-asset warnings.

## Capabilities

Five domains contain 38 Works: SpecDev (15), Learning (9), OPS (5), Person (2), Media (7). Ten Commands cover documentation sync, archive/consolidation, history squash, repository audit, handoff, retrospective, status, source ZIP, upstream sync and engineering standards. Shared references own coordination, retrospective and writing methods. Twelve canonical documents provide isolated single-file use.

AI agents follow these methods using current tools. Coordination supports Lead, Orca, Herdr and a user-selected headless CLI. Read the selected tool's current guide before using it. Speculo provides no model runner, orchestration service, sandbox or Run state machine. Optional project choices are stored in state/coordination/project.json; without them, Lead is the default. Lead verifies candidate evidence and continues the authorized Goal through implementation, repair, integration and completion.

Discovery and configuration grant no authority for commits, pushes, publishing, deployment or other effects. Existing authorization and each action's owning entry determine what may run.

## Version boundary

Only agents-v2 layout and current schemas are writable. Old installations or transactions are rejected without moving or deleting user data. There is no automatic migration or second reader for old paths. Installation staging, transaction recovery and business coordination are separate responsibilities.

## Develop

~~~bash
pnpm install --frozen-lockfile
pnpm generate-assets
pnpm check
pnpm verify-bin
pnpm verify-generated
~~~

Generators must be reproducible. Tests use disposable fixtures. Static format checks do not certify host invocation or live model behavior. See LICENSE and THIRD-PARTY-NOTICES.md for provenance and licensing. Version tags trigger release CI; publishing requires explicit authorization.
