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

AI agents follow these methods using current tools. Without an explicit execution choice, the agent works normally in its current host (`mode: lead`), whether an app, CLI or another environment. Native subagents/teams depend on the host’s capabilities and authorization. Explicit requests for CLI interaction or invocation, Herdr or Orca determine the execution method, independently of current/worktree selection. Complete approved Specs and Ready Tickets can enter implementation without an extra Goal. Read the selected tool's current guide before using it. Speculo provides no model runner, orchestration service, sandbox or Run state machine. Optional project choices are stored in state/coordination/project.json; normal execution requires no such configuration. Selecting Herdr activates project-local Skill setup from its designated upstream, followed by managed-session checks; installation does not imply runtime availability. Lead verifies candidate evidence and continues the authorized Goal through implementation, repair, integration and completion.

Discovery and configuration grant no authority for commits, pushes, publishing, deployment or other effects. Existing authorization and each action's owning entry determine what may run.

Ordinary SpecDev Works can also run directly with an explicit project, method-resource root and approved data root; CLI installation is optional. New changes keep one overall Outcome in README and progress in README, a lightweight Goal, or Ticket/Evidence according to scope. Complex planning, design approval and integration checks remain in their owning artifacts.

A closes out change, ADR, context and current engineering docs, plus DESIGN when relevant. Required current-document maintenance and design publication finish before the change moves to changes/archive under the same stable name. A completed or cancelled Outcome alone does not authorize archiving or prove its evidence.

Current engineering docs are created only on an explicit baseline request and point to existing project owners when available. I/A maintain the relevant scope; docs-sync remains the manual global audit/update/commit command, with its own Git and state contract.

## Version boundary

CLI installations retain the strict agents-v2 layout, staging and transaction recovery. New SpecDev activity uses the Markdown protocol and does not seed global/change status mirrors. Old active data requires an explicit, scoped conversion; mixed or unknown input blocks affected writes. Legacy monthly archives remain frozen in place and are read through a separate historical resolver. Other domains retain their own persistence contracts. See the [conversion guide](scripts/references/migrate-specdev-markdown.md) for the repository maintenance tool; init does not run it automatically.

## Develop

~~~bash
pnpm install --frozen-lockfile
pnpm generate-assets
pnpm check
pnpm verify-bin
pnpm verify-generated
~~~

Generators must be reproducible. Tests use disposable fixtures. Static format checks do not certify host invocation or live model behavior. See LICENSE and THIRD-PARTY-NOTICES.md for provenance and licensing. Version tags trigger release CI; publishing requires explicit authorization.
