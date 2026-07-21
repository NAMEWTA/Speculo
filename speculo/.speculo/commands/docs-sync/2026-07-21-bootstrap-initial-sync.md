---
command: docs-sync
mode: bootstrap
scope: workspace
workflows: []
changes:
  - AGENTS.md: update (version v0.2.1→v0.2.5, directory map, template assets, internal skills, validation pipeline)
  - README.md: update (commands 5→4, skills 10→6, workflows matt-pocock→specdev, vendor, PERSISTENCE.md→INDEX.md)
  - README-ZH.md: update (mirror of README.md changes)
  - CHANGELOG.md: update (populate [Unreleased] with all staged changes)
  - docs/canonical-authoring.md: update (fix stale matt-pocock example)
  - scripts/check-template-links.mjs: update (skip canonical-format files)
  - template/CLAUDE.md: update (align with agents-contract.md redirect rule)
generated_at: 2026-07-21T00:00:00.000Z
---

# Docs Sync Report

## Git Range

- From: `null` (bootstrap)
- To: `b854b693e688f0cacccadc3a8011c769ad2fab95`
- Replay: `bootstrap current facts`

## Workspace Cleanup

Checkpoint commit `b854b69` — 138 files, 4596 insertions, 3166 deletions staged and committed as `chore(docs-sync): checkpoint workspace`.

Pre-commit validation:
- `git diff --check`: clean
- `pnpm build`: ok
- No secrets, large files, or untracked unknowns

## Confirmed Scopes

**Global project targets (bootstrap, 0 workflows):**
| Target | Kind | Owner |
|--------|------|-------|
| `AGENTS.md` | file | global |
| `CLAUDE.md` | file | global |
| `README.md` | file | global |
| `README-ZH.md` | file | global |
| `CHANGELOG.md` | file | global |
| `docs/` | directory | global |

No workflows installed (`speculo/workflows/` is empty). All targets are global.

## Evidence And Lifecycle

| Target | Action | Evidence | Result |
|--------|--------|----------|--------|
| AGENTS.md | update | package.json v0.2.5 vs AGENTS v0.2.1; ls template/ vs directory map; ls .agents/skills/ vs "Four skills" | Updated: version, directory map, template asset layout, internal skills (4→5), validation pipeline |
| README.md | update | ls template/commands/ (4 not 5); ls template/skills/ (6 not 10); ls template/workflows/ (specdev+person not matt-pocock+person); ls template/vendor/ (khazix-skills added) | Updated: commands/skills/workflows/vendor tables, PERSISTENCE.md→INDEX.md description |
| README-ZH.md | update | Same fact sources as README.md | Updated: mirror of README.md changes |
| CHANGELOG.md | update | Git staged changes (138 files); template/ structure diff | Updated: populated [Unreleased] with Added/Changed/Removed |
| docs/canonical-authoring.md | update | `ls template/workflows/matt-pocock` → no such file | Fixed: example references specdev instead of matt-pocock |
| scripts/check-template-links.mjs | update | `pnpm validate-assets` → 4 broken links in canonical-teach.md (self-contained canonical format) | Fixed: skip canonical-format files |
| template/CLAUDE.md | update | agents-contract.md requires standardized redirect | Fixed: aligned with contract |

## Workflow Sources

No workflows installed; no archive or knowledge store sources available.

## Synced Assets

| File | Action |
|------|--------|
| `AGENTS.md` | Updated (5 sections) |
| `README.md` | Updated (commands/skills/workflows/vendor tables) |
| `README-ZH.md` | Updated (mirror sync) |
| `CHANGELOG.md` | Updated ([Unreleased] populated) |
| `docs/canonical-authoring.md` | Updated (stale example fixed) |
| `scripts/check-template-links.mjs` | Updated (canonical skip added) |
| `template/CLAUDE.md` | Updated (standardized redirect) |

## Verification

```
pnpm check:
  pnpm test: 14/14 pass, 0 fail
  pnpm validate-assets:
    framework asset validation: ok
    framework link check: 0 broken markdown file links
```

## State

- Global state: `speculo/.speculo/commands/docs-sync/state.json` — v4, bootstrap, 6 confirmed project targets
- Sidecars: none (0 workflows installed)
- Baseline mode: explicit → state-file-commit on next run
