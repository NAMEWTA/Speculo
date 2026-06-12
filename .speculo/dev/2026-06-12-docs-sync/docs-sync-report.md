# Docs Sync Report

## Range

- **Base:** `b04432d..HEAD` (committed range: empty — first run baseline)
- **Working tree diff:** `git diff HEAD` (uncommitted changes)
- **Files changed:** 9
- **Shortstat:** 9 files changed, 154 insertions(+), 29 deletions(-)

## Diff Summary

### Path grouping
```
   9 speculo/workflows
```

### Name-status
| Status | File |
|--------|------|
| M | speculo/workflows/dev/03-tdd/03-tdd.md |
| M | speculo/workflows/dev/03-tdd/tdd-finish.md |
| M | speculo/workflows/dev/03-tdd/tdd-plan.md |
| M | speculo/workflows/dev/04-finalize/04-finalize.md |
| M | speculo/workflows/dev/04-finalize/completion-gate.md |
| M | speculo/workflows/dev/I-to-issues/issues-slices.md |
| M | speculo/workflows/dev/_templates/issues-slices-template.md |
| M | speculo/workflows/dev/_templates/tdd-plan-template.md |
| M | speculo/workflows/doc/00-INDEX.md |
| A | speculo/workflows/doc/T-teach/ (new workflow: T-teach.md + 4 phase files) |
| A | speculo/workflows/doc/_templates/teach-*.md (4 new templates) |

### Change themes

1. **Terminology shift: `roadmap` → `slices`** (8 files in dev workflows)
   - All references to "roadmap" in TDD, finalize, and issues-slices workflows replaced with "slices"
   - Section title "roadmap 阶段状态（XML 契约）" → "phase 阶段状态（XML 契约）"
   - Document reference `roadmap.md` → `slices.md`
   - Template `tdd-plan-template.md` updated accordingly

2. **Enhanced `slices.md` format** (issues-slices.md + template)
   - New five-section structure: 战略锚点 / IN-REUSE-OUT / 架构上下文 / 切片(含phase id) / 横切关注点 / 依赖顺序
   - Each slice now carries `<phase id="...">` XML status contract
   - IN/REUSE/OUT triple-column table for scope boundary
   - Cross-cutting concerns and ASCII dependency chain sections

3. **New doc workflow entry** (doc/00-INDEX.md)
   - Added `doc/T` (T-teach) workflow alias for interactive course design

## Mapping

| Change | Tracked docs affected | Reason |
|--------|----------------------|--------|
| roadmap→slices terminology | None directly | External docs don't reference "roadmap" |
| Enhanced slices format | CHANGELOG.md | New capability worth documenting |
| doc/T workflow entry | docs/quick-reference.md | Doc workflow table needs new row |
| User request: reference links | README.md | New 致谢 section with project links |
| Pre-existing: outdated layout | docs/Speculo-architecture.md | Directory layout shows old flat install; v0.1.2 changed to `speculo/` prefix |

## Synced Docs

- **README.md** — added 致谢 / 参考项目 section with mattpocock/skills + NAMEWTA/specforge links; fixed stale `dev/R` description (双维度→三维度)
- **CHANGELOG.md** — populated [Unreleased] with Changed (roadmap→slices terminology, enhanced slices format), Added (doc/T workflow), Docs entries
- **docs/quick-reference.md** — added `doc/T` (T-teach) workflow row
- **docs/Speculo-architecture.md** — fixed outdated directory layout (flat install → `speculo/` prefix), updated CLI contract paths
- **AGENTS.md** — no changes (no "roadmap" refs, layout correct)
- **CLAUDE.md** — no changes (no "roadmap" refs, layout correct)
- **docs/adopting.md** — no changes (layout already correct)

## Verification

- `pnpm build` — not applicable (no CLI changes)
- Manual review of all tracked docs for "roadmap" references — none found
- Cross-check: adopting.md and quick-reference.md already reflect correct `speculo/` layout

## State

- Old baseline: `null` (first run)
- New baseline: `b04432d` (HEAD)
- Uncommitted changes synced via `git diff HEAD`
