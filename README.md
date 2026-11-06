# Speculo

A reusable library of AI workflows, task skills and durable project knowledge.

Speculo helps an existing AI assistant carry work from a requirement to a verified delivery. Domain entries point to the relevant Work skills; each Work keeps the practical knowledge needed for that task. The model chooses the route, while useful decisions and results remain readable outside the conversation.

[中文](README-ZH.md) · [Quick start](docs/getting-started.md) · [Capabilities](docs/capabilities.md) · [Workflow and persistence](docs/workflow.md) · [CLI](docs/cli.md)

## Start

Requires Node.js `>=22.22.3 <25`.

```bash
npm install -g @namewta/speculo
speculo init . --workflows specdev --skill-targets agents --skills domain/specdev
speculo doctor .
```

Then ask your AI:

> Use SpecDev to prepare the next release from these issues. Clarify the product decisions, show me a prototype where the interaction is uncertain, then implement and verify the agreed scope.

Installing a domain includes its Work skills and references. Exposing only its domain entry keeps the host's skill list small; the agent follows the relevant links when needed. You can also expose a particular Work directly:

```bash
speculo init . --workflows specdev --skill-targets agents --skills domain/specdev,specdev/prototype,specdev/implement
```

Use `--skill-targets claude` for `.claude/skills/`, or `agents,claude` for both. `--skills all` explicitly exposes all installed entries. Interactive `speculo init` offers the available choices. Speculo installs instructions and resources; the host supplies the model, tools and permissions.

For this source branch, run `pnpm install --frozen-lockfile` and `pnpm build`, then replace `speculo` with `node dist/src/cli.js`. The branch's version is not an npm publication announcement.

## Four domains, 39 independently usable Works

| Domain | Work capabilities |
| --- | --- |
| [SpecDev](docs/workflows/specdev.md) · 21 | Intake, assessment, investigation, prototypes, specs, planning, tickets, implementation, diagnosis, code and architecture review, delivery, retrospectives, learning and archives; environment setup, connection, inventory, host management and deployment |
| [Learning](docs/workflows/learning.md) · 9 | Learner context, assessment, goal planning, lessons, inquiry, practice, review, topic consolidation and archives |
| [Media](docs/workflows/media.md) · 7 | Setup, briefs, reference deconstruction, hand-drawn visual prompts, video production, publication drafts and retrospectives |
| [Person](docs/workflows/person.md) · 2 | Mao Zedong's investigation/practice/contradiction framework and steelman deliberation, with their distinct methods and source boundaries |

A **Work** is a reusable task capability, not a mandatory release gate. Domain `SKILL.md` files are small routers. Work `SKILL.md` files contain task-specific guidance and link to substantial references, examples or tools only when they help. Useful source libraries, design examples and media tools remain available on demand.

There are no workflow manifests, fixed worker roles, dispatch protocols, task DAGs, required handoff forms or business-status schema validators. Planning and decomposition remain useful capabilities; the model selects their depth for the actual task. See the [capability-by-capability refactor map](docs/refactor-map.md).

## Durable knowledge without form filling

The usual software flow is requirements → assessment → optional prototype → spec → optional decomposition → implementation and review → release/deployment → consolidation and archive.

Default project data lives under `.agents/speculo/.speculo/`:

| Location | Useful content |
| --- | --- |
| `releases/<name>/README.md` | Source links, scope, spec, decisions, progress, actual results and next action |
| `knowledge/adr/` | Important decisions, alternatives and lasting reasons |
| `knowledge/context/` | Current background that code and configuration do not explain |
| `knowledge/error/` | Proven causes, repairs and reusable prevention |
| `knowledge/design/` | Current design, including HTML, components, stories, tokens and images |
| `environments/<target>.md` | Known target, deployment procedure, data effects, health check and recovery |
| `archive/<name>/` | Historical delivery records and their adopted versions |

Create these only when there is something worth keeping. Existing project locations take precedence. A single release record usually suffices; a small fix may need only its issue or PR. Large specs or independent slices may use additional linked files. Current design lives outside a release record, which references the version used for that delivery.

## Commands and utility skills

Eight explicit AI commands cover status, handoff, project maintenance, repository audit, history consolidation, upstream assessment, source ZIPs and Speculo feedback. They are requests to the AI, not terminal subcommands. See the [command guide](docs/commands/README.md).

The [Skills Hub](docs/capabilities.md#skills-hub) contains 15 optional complete packages. Their specialized API, system, teaching, writing, image and document-rendering capabilities are retained. Installation does not execute their tools.

## Installation and upgrade

Methods live in `.agents/speculo/`; host entries optionally live in `.agents/skills/` and `.claude/skills/`. Refresh preserves user records and unowned additions. Installation ownership, path checks, staging, drift detection and recovery remain deterministic code.

v3 combines Ops into SpecDev and simplifies the instruction format. Existing Work capabilities remain; old Ops selections map to their SpecDev successors. Business records are preserved without being parsed against the retired protocols. See [upgrade notes](docs/upgrade-v3.md) and [transaction recovery](docs/transaction-recovery.md).

[Documentation](docs/README.md) · [Architecture](docs/architecture.md) · [Contributing](docs/contributing.md) · [Research](docs/research.md) · [Changelog](CHANGELOG.md) · [License](LICENSE) · [Third-party notices](THIRD-PARTY-NOTICES.md)
