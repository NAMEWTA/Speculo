---
schema_version: 2
artifact: ui-design-system
change: <YYYY-MM-DD-topic>
design_id: UI-001
status: detecting
project_kind: existing
platforms: [desktop, web]
detected_style: null
style_candidates: [dense-ide, responsive-web]
selected_style: null
density: null
color_mode: null
research_snapshot: 49b5659
prototype_files: [final/index.html, final/styles.css, final/app.js]
updated_at: <ISO-8601>
---

# UI Design System UI-001: <产品或功能名称>

## Project Evidence

### Scope and Tasks

- **Target app:**
- **Primary users:**
- **Top tasks:**
- **Platforms:**
- **Evidence mode:** rendered / source-only / new-product

### Existing Stack and Design Facts

| Dimension | Observed fact | Project-relative evidence | Confidence |
|---|---|---|---|
| Framework | | | |
| Styling | | | |
| Components and icons | | | |
| Layout | | | |
| Color and themes | | | |
| Type and density | | | |
| Radius and elevation | | | |
| Interaction and states | | | |
| Responsive and accessibility | | | |

### Keep, Adjust, Replace, Add

| Action | Decision | Evidence and reason |
|---|---|---|
| Keep | | |
| Adjust | | |
| Replace | | |
| Add | | |

## Style Decision

### Functional Candidates

| Candidate | Product fit | Structural difference | Research references | Migration cost | Decision |
|---|---|---|---|---|---|
| dense-ide | | | DBX, DBeaver, cdesktop | | pending |
| responsive-web | | | CloudCLI | | pending |

### Decision Log

| Layer | Decision | Status | Reason |
|---|---|---|---|
| Product and platform | | pending | |
| Information architecture | | pending | |
| Density and typography | | pending | |
| Tone and theme | | pending | |
| Shape and elevation | | pending | |
| Interaction and motion | | pending | |
| Cross-platform reflow | | pending | |
| Visual convergence | | pending | |

### Selected Direction and Rejections

- **Selected style:** pending
- **Composition boundary:** none
- **Rejected candidates and reasons:** pending

## Foundation Tokens

### Design Intent

Describe how the chosen shell, density, tone and hierarchy serve the primary task. Fixed defaults use a 4px spacing base, role-based colors, two or three main radii, borders for persistent regions and shadows only for overlays. Record every justified override.

### Token Contract

| Role | Token | Value | Usage |
|---|---|---|---|
| Canvas | `--canvas` | | App background |
| Surface | `--surface-1` | | Primary work area |
| Text | `--text-primary` | | Main content |
| Border | `--border-default` | | Persistent separation |
| Accent | `--accent` | | Primary action and selection |
| Focus | `--focus-ring` | | Keyboard focus only |
| Radius | `--radius-control` | | Input and button |
| Density | `--control-height` | | Default control |

## Component and State Contract

| Component or pattern | Default | Hover | Pressed | Focus | Disabled/loading/error | Keyboard and touch |
|---|---|---|---|---|---|---|
| App shell | | | | | | |
| Navigation | | | | | | |
| Button and icon button | | | | | | |
| Form controls | | | | | | |
| Primary work surface | | | | | | |
| Overlay | | | | | | |

Include empty, no-result, loading, error, offline, read-only and permission-denied where applicable. A state color always has a text, icon or shape cue.

## Interaction Contract

| Trigger | Immediate response | Completion response | Failure/recovery | Persistence |
|---|---|---|---|---|
| Navigation | | | | URL / local state |
| Primary action | | | | |
| Async action | | | | |
| Destructive action | | | | |

- Under 100ms: no loading indicator unless state would otherwise be ambiguous.
- 100ms-1s: local progress or skeleton without whole-page flashing.
- Over 1s: persistent progress with cancellation or background-task access.
- Motion defaults to 120-180ms for local state and 200-240ms for sheets; reduced motion removes nonessential transforms.

## Responsive Contract

| Desktop structure | Narrow-screen replacement | Breakpoint evidence | Return/recovery path |
|---|---|---|---|
| Fixed sidebar | Drawer or single-level navigation | | |
| Right inspector | Sheet or full-screen detail | | |
| Wide toolbar | Primary action plus overflow | | |
| Hover tools | Explicit button or menu | | |

Document desktop, Web and mobile separately when their primary tasks differ. Touch targets are at least 44px; compact desktop controls may look smaller while keeping a usable hit area.

## Prototype Sources

The following named blocks are the authoritative runnable prototype. Materialized files must match them exactly.

<!-- PROTOTYPE-FILE: final/index.html -->
```html
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Workspace Prototype</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <div class="app-shell">
    <aside class="sidebar" id="sidebar">
      <div class="brand">Project</div>
      <nav aria-label="Primary">
        <button class="nav-item active" type="button">Workspace</button>
        <button class="nav-item" type="button">Activity</button>
        <button class="nav-item" type="button">Settings</button>
      </nav>
    </aside>
    <main class="workspace">
      <header class="toolbar">
        <button class="menu-button" type="button" data-sidebar-toggle aria-controls="sidebar" aria-expanded="false">Menu</button>
        <div>
          <span class="eyebrow">Current project</span>
          <h1>Workspace</h1>
        </div>
        <div class="toolbar-actions">
          <button type="button" data-density-toggle>Density</button>
          <button type="button" data-theme-toggle>Theme</button>
        </div>
      </header>
      <section class="content" aria-live="polite">
        <div class="section-heading">
          <div>
            <h2>Recent work</h2>
            <p>Three active items, one waiting for review.</p>
          </div>
          <button class="primary" type="button" data-primary-action>New item</button>
        </div>
        <div class="work-list" role="list">
          <button class="work-row selected" type="button" role="listitem">
            <span><strong>Design system</strong><small>Updated 4 minutes ago</small></span>
            <span class="status">In progress</span>
          </button>
          <button class="work-row" type="button" role="listitem">
            <span><strong>Responsive shell</strong><small>Updated yesterday</small></span>
            <span class="status neutral">Review</span>
          </button>
        </div>
        <div class="feedback" data-feedback hidden>Draft created. The workspace state is preserved.</div>
      </section>
    </main>
  </div>
  <script src="app.js"></script>
</body>
</html>
```
<!-- /PROTOTYPE-FILE -->

<!-- PROTOTYPE-FILE: final/styles.css -->
```css
:root {
  color-scheme: light;
  --canvas: #f3f4f2;
  --surface-1: #ffffff;
  --surface-2: #eef0ed;
  --text-primary: #20221f;
  --text-secondary: #666b64;
  --border-default: #d9ddd7;
  --accent: #176b4d;
  --accent-subtle: #e2f0e9;
  --focus-ring: #2478d4;
  --radius-control: 6px;
  --radius-panel: 8px;
  --control-height: 36px;
  --sidebar-width: 248px;
  --font-ui: Inter, "Segoe UI", "PingFang SC", sans-serif;
}

html.dark {
  color-scheme: dark;
  --canvas: #151715;
  --surface-1: #1c1f1c;
  --surface-2: #272b27;
  --text-primary: #f1f3ef;
  --text-secondary: #adb3aa;
  --border-default: #343934;
  --accent: #79bd98;
  --accent-subtle: #21382c;
  --focus-ring: #72aef0;
}

* { box-sizing: border-box; }
html, body { min-width: 320px; min-height: 100%; margin: 0; }
body { background: var(--canvas); color: var(--text-primary); font: 14px/1.5 var(--font-ui); }
button { min-height: var(--control-height); border: 1px solid var(--border-default); border-radius: var(--radius-control); background: var(--surface-1); color: inherit; font: inherit; cursor: pointer; }
button:hover { background: var(--surface-2); }
button:active { transform: translateY(1px); }
button:focus-visible { outline: 3px solid color-mix(in srgb, var(--focus-ring) 35%, transparent); outline-offset: 2px; }
button:disabled { cursor: not-allowed; opacity: .48; }
.app-shell { display: flex; min-height: 100vh; }
.sidebar { width: var(--sidebar-width); flex: 0 0 var(--sidebar-width); border-right: 1px solid var(--border-default); background: var(--surface-1); }
.brand { height: 56px; padding: 17px 16px; border-bottom: 1px solid var(--border-default); font-weight: 700; }
.sidebar nav { display: grid; gap: 4px; padding: 10px; }
.nav-item { justify-content: flex-start; border-color: transparent; text-align: left; }
.nav-item.active { border-color: color-mix(in srgb, var(--accent) 32%, var(--border-default)); background: var(--accent-subtle); color: var(--accent); }
.workspace { min-width: 0; flex: 1; }
.toolbar { display: flex; min-height: 64px; align-items: center; gap: 12px; padding: 8px 20px; border-bottom: 1px solid var(--border-default); background: var(--surface-1); }
.toolbar h1, .section-heading h2 { margin: 0; font-size: 18px; letter-spacing: 0; }
.eyebrow, small { display: block; color: var(--text-secondary); font-size: 12px; }
.toolbar-actions { display: flex; gap: 8px; margin-left: auto; }
.menu-button { display: none; }
.content { width: min(960px, calc(100% - 40px)); margin: 0 auto; padding: 32px 0; }
.section-heading { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; }
.section-heading p { margin: 4px 0 0; color: var(--text-secondary); }
.primary { border-color: var(--accent); background: var(--accent); color: #fff; }
.primary:hover { background: color-mix(in srgb, var(--accent) 88%, #000); }
.work-list { margin-top: 20px; border-top: 1px solid var(--border-default); }
.work-row { display: flex; width: 100%; min-height: 64px; align-items: center; justify-content: space-between; border-width: 0 0 1px; border-radius: 0; padding: 10px 12px; text-align: left; }
.work-row.selected { background: var(--accent-subtle); }
.status { color: var(--accent); font-size: 12px; font-weight: 700; }
.status.neutral { color: var(--text-secondary); }
.feedback { margin-top: 16px; border-left: 3px solid var(--accent); padding: 10px 12px; background: var(--accent-subtle); }
.density-compact { --control-height: 30px; }
.density-compact .work-row { min-height: 48px; }

@media (max-width: 760px) {
  .sidebar { position: fixed; z-index: 20; inset: 0 auto 0 0; transform: translateX(-100%); transition: transform 180ms ease; }
  .sidebar.open { transform: translateX(0); }
  .menu-button { display: inline-flex; align-items: center; }
  .toolbar { padding-inline: 12px; }
  .toolbar-actions button { min-width: 44px; }
  .content { width: calc(100% - 24px); padding: 24px 0; }
  .section-heading { align-items: stretch; flex-direction: column; }
  .primary { min-height: 44px; }
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { scroll-behavior: auto !important; transition-duration: .01ms !important; animation-duration: .01ms !important; }
  button:active { transform: none; }
}
```
<!-- /PROTOTYPE-FILE -->

<!-- PROTOTYPE-FILE: final/app.js -->
```javascript
(function () {
  const root = document.documentElement;
  const body = document.body;
  const sidebar = document.querySelector("#sidebar");
  const themeButton = document.querySelector("[data-theme-toggle]");
  const densityButton = document.querySelector("[data-density-toggle]");
  const sidebarButton = document.querySelector("[data-sidebar-toggle]");
  const actionButton = document.querySelector("[data-primary-action]");
  const feedback = document.querySelector("[data-feedback]");

  const savedTheme = localStorage.getItem("prototype-theme");
  if (savedTheme === "dark" || (!savedTheme && matchMedia("(prefers-color-scheme: dark)").matches)) root.classList.add("dark");

  themeButton?.addEventListener("click", () => {
    root.classList.toggle("dark");
    localStorage.setItem("prototype-theme", root.classList.contains("dark") ? "dark" : "light");
  });

  densityButton?.addEventListener("click", () => body.classList.toggle("density-compact"));

  sidebarButton?.addEventListener("click", () => {
    const open = sidebar?.classList.toggle("open") ?? false;
    sidebarButton.setAttribute("aria-expanded", String(open));
  });

  document.querySelectorAll(".work-row").forEach((row) => row.addEventListener("click", () => {
    document.querySelectorAll(".work-row").forEach((item) => item.classList.toggle("selected", item === row));
  }));

  actionButton?.addEventListener("click", () => {
    actionButton.disabled = true;
    actionButton.textContent = "Creating...";
    window.setTimeout(() => {
      actionButton.disabled = false;
      actionButton.textContent = "New item";
      feedback.hidden = false;
    }, 650);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && sidebar?.classList.contains("open")) {
      sidebar.classList.remove("open");
      sidebarButton?.setAttribute("aria-expanded", "false");
      sidebarButton?.focus();
    }
  });
})();
```
<!-- /PROTOTYPE-FILE -->

## Validation and Handoff

### Commands and Evidence

| Command | Exit code | Key result | Evidence path |
|---|---:|---|---|
| materialize | | | |
| materialize --check | | | |
| design package validator | | | |
| desktop viewport | | | |
| mobile viewport | | | |

### Acceptance

- [ ] Every candidate has a standalone comparison HTML page.
- [ ] Final source blocks and materialized files are byte-equivalent.
- [ ] Light/dark, keyboard, focus, long text and reduced motion were checked.
- [ ] Desktop and mobile screenshots show no blank canvas, overlap or unintended overflow.
- [ ] No unresolved high-impact design decision remains.

### Handoff

- **Authoritative artifact:** `<Path>{roots.state}/specdev/changes/{change}/prototypes/{design-id}/design-system.md</Path>`
- **Comparison:** `<Path>{roots.state}/specdev/changes/{change}/prototypes/{design-id}/comparison/index.html</Path>`
- **Runnable final:** `<Path>{roots.state}/specdev/changes/{change}/prototypes/{design-id}/final/index.html</Path>`
- **Next Work:** G / S / T / I / blocked
- **Unresolved high-impact questions:** none / ...
