# Speculo

Concise skills and durable project knowledge for your existing AI assistant.

Speculo helps carry software work from requirements to deployment. It gives the agent a small amount of useful context, lets it choose how to work, and keeps the facts needed to continue later.

[中文](README-ZH.md) · [Quick start](docs/getting-started.md) · [Workflow and persistence](docs/workflow.md) · [CLI](docs/cli.md) · [Upgrading to v3](docs/upgrade-v3.md)

## Start

Requires Node.js `>=22.22.3 <25`.

```bash
npm install -g @namewta/speculo
speculo init . --workflows specdev --skill-targets agents --skills domain/specdev
speculo doctor .
```

Then ask your AI:

> Use SpecDev to prepare the next release from these issues. Clarify the product decisions, show me a prototype if the interaction needs work, then implement and verify the agreed scope.

For this source branch, run `pnpm install --frozen-lockfile`, `pnpm build`, then use `node dist/src/cli.js` in place of `speculo`. The version in this branch does not imply that it is already published.

Use `--skill-targets claude` for a host reading `.claude/skills/`, or `agents,claude` for both. Use `speculo init` interactively to choose methods and utility skills. Installing a skill exposes instructions; your AI host supplies the model and tools.

## Four methods

| Skill | Purpose |
| --- | --- |
| [specdev](template/workflows/specdev/SKILL.md) | Requirements, optional UI design, spec, implementation, review, deployment and knowledge |
| [learning](template/workflows/learning/SKILL.md) | Lessons, questions, exploration, practice and durable learning notes |
| [media](template/workflows/media/SKILL.md) | Briefs, reference analysis, visual/media production and review of real outputs |
| [person](template/workflows/person/SKILL.md) | Deliberation, diagnosis, strategy and concrete decisions |

Each method is one `SKILL.md`. There are no mandatory stage manifests, goal-plan loops, ticket graphs, worker roles or handoff schemas. Enter at the point your task needs; a small fix can go straight to implementation.

## A release, remembered

The usual software flow is requirements → optional prototype → spec → implementation and verification → deployment. A single release note can hold the source links, scope, decisions, a small checklist and actual results. Separate tickets are useful only when they make a large piece of work easier to deliver.

Default project data lives under `.agents/speculo/.speculo/`:

| Location | Useful content |
| --- | --- |
| `releases/<name>/README.md` | Current delivery scope, progress, verification and next action |
| `knowledge/adr/` | Lasting decisions and their reasons |
| `knowledge/context/` | Current facts that code does not explain |
| `knowledge/error/` | Proven causes and fixes worth remembering |
| `knowledge/design/` | Current design, including HTML, components, stories or images |
| `environments/<target>.md` | Known deployment target, procedure, data effects, health check and recovery |
| `archive/<name>/` | Historical release records |

These are lazy conventions, not required directories or document templates. Prefer the project's existing owner for a fact. Link to code, tests and configuration instead of copying them into prose. A PR may be enough persistence for a small change.

Approved UI structures remain implementation requirements. Review the real page in a comparable state; passing tests alone does not establish visual conformance. If the user explicitly requires final acceptance, keep that decision separate from technical verification. No acceptance requirement is invented for ordinary autonomous work.

## Explicit commands

Commands are requests to the AI, not shell subcommands:

| Command | Use |
| --- | --- |
| `status` | Read the current work and report what is complete, blocked or next |
| `handoff` | Leave just enough context to resume in the current record |
| `project-maintenance` | Update durable knowledge and archive finished work |
| `git-repository-audit` | Inspect repository structure, history and risks |
| `git-history-squash` | Consolidate an explicitly selected history range |
| `upstream-assess` | Assess upstream changes against the local project |
| `source-code-zip` | Package the requested source with exclusions checked |
| `speculo-feedback` | Prepare or submit authorized, evidence-backed upstream feedback |

## Installation safety

Methods live in `.agents/speculo/`; optional host entries live in `.agents/skills/` and `.claude/skills/`. Utility skills are installed as complete packages only when selected.

Refresh replaces managed methods while preserving user runtime files and unowned additions. Installation manifests, path checks, staging, drift detection and explicit recovery remain in the CLI. They protect files; they do not grade an AI's project decisions.

[Architecture](docs/architecture.md) · [Contributing](docs/contributing.md) · [Research behind v3](docs/research.md) · [Changelog](CHANGELOG.md) · [License](LICENSE) · [Third-party notices](THIRD-PARTY-NOTICES.md)
