# Speculo

Reusable methods for software development, learning, operations, decisions and content creation, used by your current AI app or CLI. Speculo provides readable Skills, explicit Commands and recoverable project artifacts. Without an explicit execution choice, work proceeds normally in the current host; requests for CLI interaction, Herdr or another method select that route.

[中文说明](README-ZH.md) · **[User manual (中文)](docs/README.md)** · [Getting started (中文)](docs/getting-started.md) · [All capabilities](docs/capabilities.md) · [Troubleshooting](docs/troubleshooting.md)

## Get started

Requires Node.js `>=22.22.3 <25`. Run in the project where you want to use Speculo:

```bash
npm install -g @namewta/speculo
speculo init . --workflows specdev,learning --skill-targets agents --skills domain/specdev,domain/learning
speculo doctor .
```

Then ask your AI:

```text
Read this project's AGENTS.md and use specdev/init-setup to inspect the project
entry points and test commands. Keep this task read-only.
```

For all domains and public entries, use `--workflows all --skills all`. Use `--skill-targets claude` for hosts reading `.claude/skills/`, or `--skill-targets agents,claude` to expose the same selection in both locations. Installation, host exposure and execution are separate steps. See the [walkthrough](docs/getting-started.md) and [CLI reference](docs/cli.md).

## Workflow guides

Five domains contain 38 Works. Each guide explains every Work's purpose, use cases, inputs, outputs, example requests and next steps. The detailed manual is currently in Chinese.

| Domain | Works | What it covers |
|---|---:|---|
| [SpecDev — software development](docs/workflows/specdev.md) | 15 | Discovery, specifications, prototypes, tickets, goals, implementation, reviews, diagnosis and delivery |
| [Learning](docs/workflows/learning.md) | 9 | Course planning, complete lessons, tutor questions, exploration, homework, review and consolidation |
| [OPS — operations and deployment](docs/workflows/ops.md) | 5 | Controller setup, trusted server access, host environments, project deployment and offline inventory |
| [Person — analysis and decisions](docs/workflows/person.md) | 2 | Two-sided steelman deliberation and a dedicated diagnostic, strategic and action-planning method |
| [Media — content creation](docs/workflows/media.md) | 7 | Briefs, reference analysis, visual prompts, video, local drafts and evidence-based retrospectives |

Enter the Work you need; there is no mandatory end-to-end sequence. Complete approved Specs and Ready Tickets can enter implementation directly. Execution method and current/worktree selection remain independent. See the [workflow comparison](docs/workflows/README.md).

## Commands by category

The ten Commands are explicit requests to an AI, not `speculo <command>` terminal subcommands.

| Category | Guides |
|---|---|
| [Navigation and handoff](docs/commands/README.md#navigation) | [status](docs/commands/status.md), [handoff](docs/commands/handoff.md) |
| [Documentation, standards and knowledge](docs/commands/README.md#documentation) | [docs-sync](docs/commands/docs-sync.md), [engineering-standards-builder](docs/commands/engineering-standards-builder.md), [archive-and-consolidate](docs/commands/archive-and-consolidate.md) |
| [Git analysis and history](docs/commands/README.md#git) | [git-repository-audit](docs/commands/git-repository-audit.md), [git-history-squash](docs/commands/git-history-squash.md), [upstream-fork-sync](docs/commands/upstream-fork-sync.md) |
| [Source exchange and feedback](docs/commands/README.md#exchange) | [source-code-zip](docs/commands/source-code-zip.md), [retro](docs/commands/retro.md) |

## Data, permissions and portable use

Authoritative methods install into `.agents/speculo/`; runtime data lives in `.agents/speculo/.speculo/`. Optional host projections live in `.agents/skills/` and `.claude/skills/`. Existing user instructions, third-party Skills and edited files retain their ownership. See [concepts and invocation](docs/concepts.md).

Discovery and installation do not authorize commits, pushes, publishing, deployment or archival moves. Existing scoped authorization is reused; additional effects follow their owning entry. Speculo does not provide a model runner, sandbox or persistent orchestration service.

Ordinary SpecDev Works also support [direct use with explicit project, method and data roots](docs/workflows/specdev.md#不安装-cli-时如何使用). Browser-only AI environments can use [12 standalone Canonical documents](docs/canonical.md). For refresh and failures, see [CLI usage](docs/cli.md) and [transaction recovery](docs/transaction-recovery.md).

## Project and maintenance

[Architecture](docs/architecture.md) · [Contributor guide](docs/contributing.md) · [Changelog](CHANGELOG.md) · [License](LICENSE) · [Third-party notices](THIRD-PARTY-NOTICES.md)

Repository package manager: `pnpm@11.1.3`. The current version is defined in [package.json](package.json). Documentation describes the current product and its use; one-off implementation reports belong outside the user manual.
