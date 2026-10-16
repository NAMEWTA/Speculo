import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, readdir, rm, symlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { test } from "node:test";
import { readAssetCatalog, type AssetCatalog } from "../src/assets.js";
import { readProjectionManifest, resolveProjectionIds, resolveExposure } from "../src/agent-skills.js";
import { initSpeculo, type InstallPreview } from "../src/index.js";
import { InstallCancelled } from "../src/interaction.js";
import { exposureGroups, promptExposureConfiguration, promptExposure, promptWorkflows, promptPackages, renderPackageChoices, confirmInstallPreview, formatInstallPreview, wrapTerminalText, type PromptPort } from "../src/install-ui.js";
import { discoverHubCatalog } from "../src/hub-skills.js";
import { discoverWorkflowCatalog } from "../src/workflows.js";
import { fingerprintTree } from "../src/manifest.js";
import { RefreshBlockedError } from "../src/refresh.js";
import { cleanEmptyTransactionsDirectory, LOCK_NAME, TRANSACTIONS_ROOT } from "../src/transaction.js";

const packageRoot = process.cwd();
const catalog = await readAssetCatalog(join(packageRoot, "template"));
const workflows = await discoverWorkflowCatalog(packageRoot);
const emptyOptions = { targets: ["agents" as const], catalog, existing: [] as string[], hasHistory: false };
test("one package list has render-only sections, category labels, exact preselection and narrow scrolling", async () => {
  const hub = await discoverHubCatalog(packageRoot);
  const s = script([{ kind: "multiselect", value: ["hub:automation/orca", "workflow:specdev"], check: o => {
    assert.equal(o.options.length, 20);
    assert.deepEqual(o.initialValues, ["hub:automation/herdr", "workflow:learning"]);
    assert.equal(o.options[0].section, "SKILLS-HUB"); assert.equal(o.options[15].section, "WORKFLOWS");
    assert.equal(o.options[0].label, "automation/grok-bot-team-steward");
    assert.ok(o.options.every((v: any) => /^(hub|workflow):/.test(v.value)));
    const first = renderPackageChoices(o.options, o.initialValues, 0, 25, 12);
    const last = renderPackageChoices(o.options, o.initialValues, 19, 25, 12);
    assert.match(first, /---- SKILLS-HUB ----/); assert.match(first, /↓ 更多/);
    assert.match(last, /---- WORKFLOWS ----/); assert.match(last, /↑ 更多/);
    for (const line of (first + "\n" + last).split("\n")) assert.equal(wrapTerminalText(line, 25), line);
  } }]);
  assert.deepEqual(await promptPackages({ workflows, hub, workflowIds: ["learning"], hubIds: ["automation/herdr"], chooseWorkflows: true, chooseHub: true }, s.ui), { workflowIds: ["specdev"], hubIds: ["automation/orca"] });
  s.done();
});
test("Hub selection requires a target and repeats only the target page", async () => {
  const s = script([{ kind: "multiselect", value: [] }, { kind: "multiselect", value: ["claude"] }, { kind: "select", value: "none" }]);
  assert.deepEqual(await promptExposureConfiguration({ catalog, existing: { targets: ["agents"], assetIds: [] }, hasHistory: false, hubSelected: true }, s.ui), { targets: ["claude"], assetIds: [] });
  assert.ok(s.notes.some(n => n.includes("至少勾选"))); s.done();
});
test("terminal wrapping respects Chinese display cells and preserves complete text", () => {
  assert.equal(wrapTerminalText("中文ab入口", 6), "中文ab\n入口");
  const longId = "command/engineering-standards-builder";
  assert.equal(wrapTerminalText(longId, 20).replaceAll("\n", ""), longId);
});
type Step = { kind: "select" | "multiselect" | "confirm"; value: string | string[] | boolean | symbol; check?: (options: any) => void };
function script(steps: Step[]) {
  const notes: string[] = [];
  const invoke = async (kind: Step["kind"], options: unknown) => {
    const step = steps.shift();
    assert.ok(step, "unexpected prompt: " + kind);
    assert.equal(step.kind, kind);
    step.check?.(options);
    return step.value;
  };
  const ui: PromptPort = {
    select: options => invoke("select", options) as Promise<string | symbol>,
    multiselect: options => invoke("multiselect", options) as Promise<string[] | symbol>,
    confirm: options => invoke("confirm", options) as Promise<boolean | symbol>,
    note: (message, title) => { notes.push(title + "\n" + message); },
  };
  return { ui, notes, done: () => assert.equal(steps.length, 0, "unconsumed prompts") };
}
async function fixture(fn: (target: string) => Promise<void>) {
  const target = await mkdtemp(join(tmpdir(), "speculo-wizard-"));
  try { await fn(target); } finally { await rm(target, { recursive: true, force: true }); }
}
async function noTransactionResidue(target: string) {
  for (const path of [LOCK_NAME, TRANSACTIONS_ROOT]) await assert.rejects(readdir(join(target, path)), /ENOENT/);
}

test("target selection defaults to agents and asks for capabilities only once for either or both targets", async () => {
  for (const targets of [["agents"], ["claude"], ["agents", "claude"]]) {
    const s = script([
      { kind: "multiselect", value: targets, check: o => {
        assert.deepEqual(o.initialValues, ["agents"]);
        assert.deepEqual(o.options.map((v: any) => v.value), ["agents", "claude"]);
      } },
      { kind: "select", value: "custom" },
      { kind: "select", value: "commands" },
      { kind: "multiselect", value: ["command/status"] },
      { kind: "select", value: "done" },
    ]);
    assert.deepEqual(await promptExposureConfiguration({ catalog, existing: { targets: ["agents"], assetIds: [] }, hasHistory: false }, s.ui), {
      targets, assetIds: ["command/status"],
    });
    assert.equal(s.notes.filter(n => n.includes("配置统一的能力曝光")).length, 1);
    s.done();
  }
});

test("empty target selection skips capabilities and recorded targets are preselected", async () => {
  const s = script([{ kind: "multiselect", value: [], check: o => assert.deepEqual(o.initialValues, ["claude"]) }]);
  assert.deepEqual(await promptExposureConfiguration({ catalog, existing: { targets: ["claude"], assetIds: ["command/status"] }, hasHistory: true }, s.ui), { targets: [], assetIds: [] });
  s.done();
});

test("prefilled exposure options skip only their own prompts", async () => {
  const base = { catalog, existing: { targets: ["agents" as const], assetIds: ["command/status"] }, hasHistory: true };
  const targetsOnly = script([{ kind: "select", value: "keep", check: o => assert.equal(o.initialValue, "keep") }]);
  assert.deepEqual(await promptExposureConfiguration({ ...base, targets: ["agents", "claude"] }, targetsOnly.ui), { targets: ["agents", "claude"], assetIds: ["command/status"] });
  targetsOnly.done();
  const skillsOnly = script([{ kind: "multiselect", value: ["claude"] }]);
  assert.deepEqual(await promptExposureConfiguration({ ...base, request: { mode: "keep" } }, skillsOnly.ui), { targets: ["claude"], assetIds: ["command/status"] });
  skillsOnly.done();
  const neither = script([]);
  assert.deepEqual(await promptExposureConfiguration({ ...base, targets: ["claude"], request: { mode: "keep" } }, neither.ui), { targets: ["claude"], assetIds: ["command/status"] });
  neither.done();
});

test("target prompt cancellation propagates and never reaches capabilities", async () => {
  const s = script([{ kind: "multiselect", value: Symbol("cancel") }]);
  await assert.rejects(promptExposureConfiguration({ catalog, existing: { targets: ["agents"], assetIds: [] }, hasHistory: false }, s.ui), InstallCancelled);
  s.done();
});

test("five modes, shared default selection, and workflow/command groups", async () => {
  assert.deepEqual(exposureGroups(catalog).map(g => [g.id, g.assets.length]), [
    ["learning", 10], ["media", 8], ["ops", 6], ["person", 3], ["specdev", 16], ["commands", 10],
  ]);
  for (const mode of ["all", "keep", "none"] as const) {
    for (const hasHistory of [false, true]) {
      const s = script([{ kind: "select", value: mode, check: o => {
        assert.equal(o.initialValue, hasHistory ? "keep" : "none");
        assert.deepEqual(o.options.map((x: any) => x.value), ["all", "groups", "custom", "keep", "none"]);
      } }]);
      const result = await promptExposure({ ...emptyOptions, hasHistory }, s.ui);
      assert.deepEqual(result, { mode }); s.done();
    }
  }
});

test("bulk selection expands whole workflows and commands, but not unselected partial groups", async () => {
  const prior = catalog.assets.filter(a => a.kind === "command").map(a => a.id).concat("specdev/implement");
  const s = script([
    { kind: "select", value: "groups" },
    { kind: "multiselect", value: ["specdev", "commands"], check: o => {
      assert.deepEqual(o.initialValues, ["commands"]);
      assert.equal(o.required, false);
      assert.match(o.options.find((x: any) => x.value === "specdev").hint, /1\/16/);
    } },
  ]);
  const result = await promptExposure({ ...emptyOptions, existing: prior, hasHistory: true }, s.ui);
  const ids = resolveProjectionIds(result, catalog, prior);
  assert.equal(ids.length, 26); assert.ok(ids.includes("domain/specdev"));
  assert.ok(!ids.includes("domain/learning")); s.done();
});

test("custom drafts cross groups, return to mode choice, and do not add domain entry implicitly", async () => {
  const s = script([
    { kind: "select", value: "custom" },
    { kind: "select", value: "specdev" },
    { kind: "multiselect", value: ["specdev/implement", "specdev/code-review"], check: o => {
      assert.equal(o.options[0].value, "domain/specdev");
    } },
    { kind: "select", value: "back" },
    { kind: "select", value: "custom" },
    { kind: "select", value: "specdev" },
    { kind: "multiselect", value: ["specdev/implement", "specdev/code-review"], check: o => {
      assert.deepEqual(o.initialValues, ["specdev/code-review", "specdev/implement"]);
    } },
    { kind: "select", value: "commands" },
    { kind: "multiselect", value: ["command/status"] },
    { kind: "select", value: "done" },
  ]);
  const result = await promptExposure(emptyOptions, s.ui);
  assert.deepEqual(resolveProjectionIds(result, catalog, []), ["command/status", "specdev/code-review", "specdev/implement"]);
  s.done();
});

test("custom selection supports domain-only, removing all, and explicit stale-ID removal", async () => {
  for (const picked of [["domain/learning"], []]) {
    const s = script([
      { kind: "select", value: "custom" }, { kind: "select", value: "learning" },
      { kind: "multiselect", value: picked }, { kind: "select", value: "done" },
    ]);
    const result = await promptExposure({ ...emptyOptions, existing: ["learning/lesson"], hasHistory: true }, s.ui);
    assert.deepEqual(resolveProjectionIds(result, catalog, []), picked); s.done();
  }
  const s = script([
    { kind: "select", value: "custom" }, { kind: "select", value: "missing" }, { kind: "select", value: "done" },
  ]);
  const result = await promptExposure({ ...emptyOptions, existing: ["learning/retired"], hasHistory: true }, s.ui);
  assert.deepEqual(result, { mode: "set", assetIds: [] });
  assert.ok(s.notes.some(n => n.includes("learning/retired"))); s.done();
  assert.throws(() => resolveProjectionIds({ mode: "keep" }, catalog, ["learning/retired"]),
    e => e instanceof RefreshBlockedError && e.blockers[0].code === "unknown-projection-asset");
  assert.throws(() => resolveProjectionIds({ mode: "unknown" } as any, catalog, ["learning/lesson"]), /invalid-projection-selection/);
});

test("core-only and partial catalogs restrict menus, and empty bulk selection is allowed", async () => {
  for (const domain of [undefined, "learning"]) {
    const installed: AssetCatalog = { schema_version: 2, assets: catalog.assets.filter(a => a.kind === "command" || a.domain === domain) };
    for (const picked of [[], ["commands"]]) {
      const s = script([
        { kind: "select", value: "groups" },
        { kind: "multiselect", value: picked, check: o => {
          assert.deepEqual(o.options.map((x: any) => x.value), domain ? ["learning", "commands"] : ["commands"]);
        } },
      ]);
      const result = await promptExposure({ ...emptyOptions, catalog: installed }, s.ui);
      assert.equal(resolveProjectionIds(result, installed, []).length, picked.length ? 10 : 0); s.done();
    }
  }
});

test("workflow prompt preserves installed preselection and supports core-only", async () => {
  const s = script([{ kind: "multiselect", value: [], check: o => {
    assert.deepEqual(o.initialValues, ["learning"]); assert.equal(o.required, false);
  } }]);
  assert.deepEqual(await promptWorkflows(workflows, new Set(["learning", "retired"]), s.ui), { workflowIds: [] });
  s.done();
});

test("cancellation at every nested exposure prompt propagates without process.exit", async () => {
  const cancel = Symbol("cancel");
  for (const prefix of [
    [],
    [{ kind: "select", value: "groups" }],
    [{ kind: "select", value: "custom" }],
    [{ kind: "select", value: "custom" }, { kind: "select", value: "specdev" }],
  ] as Step[][]) {
    const kind = prefix.at(-1)?.value === "groups" || prefix.at(-1)?.value === "specdev" ? "multiselect" : "select";
    const s = script([...prefix, { kind, value: cancel }]);
    await assert.rejects(promptExposure(emptyOptions, s.ui), e => e instanceof InstallCancelled && e.exitCode === 130);
    s.done();
  }
  const s = script([{ kind: "multiselect", value: cancel }]);
  await assert.rejects(promptWorkflows(workflows, new Set(), s.ui), InstallCancelled); s.done();
});

test("explicit unified requests bypass prompts; fresh and recorded noninteractive defaults", () => fixture(async target => {
  const options = { target, catalog, prompt: false };
  assert.deepEqual(await resolveExposure(options), { targets: ["agents"], assetIds: [] });
  await initSpeculo(target, { packageRoot, selection: { workflowIds: [] }, skillTargets: ["claude"], skills: { mode: "all" } });
  const saved = await resolveExposure(options);
  assert.deepEqual(saved.targets, ["claude"]);
  assert.equal(saved.assetIds.length, 10);
  assert.deepEqual(await resolveExposure({ ...options, targets: ["agents"], prompt: true, request: { mode: "none" } }), { targets: ["agents"], assetIds: [] });
  const result = await initSpeculo(target, { packageRoot, selection: { workflowIds: [] } });
  assert.equal(result.projections.agents.selected.length, 0);
  assert.equal(result.projections.claude.ready, 10);
  await noTransactionResidue(target);
}));

test("preview cancellation changes no active files and cleans staging and lock", () => fixture(async target => {
  await initSpeculo(target, { packageRoot, selection: { workflowIds: ["learning"] }, skills: { mode: "all" } });
  const before = await fingerprintTree(target);
  for (const choice of [false, Symbol("cancel")]) {
    const s = script([{ kind: "confirm", value: choice }]);
    await assert.rejects(initSpeculo(target, {
      packageRoot, selection: { workflowIds: [] }, skills: { mode: "none" },
      confirmInstall: preview => {
        assert.equal(preview.projections.agents.removed.length, 20);
        assert.deepEqual(preview.retainedWorkflowIds, []);
        assert.deepEqual(preview.removedWorkflowIds, ["learning"]);
        assert.match(formatInstallPreview(preview), /learning\/lesson/);
        return confirmInstallPreview(preview, s.ui);
      },
    }), e => e instanceof InstallCancelled && e.exitCode === (choice === false ? 0 : 130));
    s.done(); await noTransactionResidue(target);
    assert.equal(await fingerprintTree(target), before);
  }
}));

test("first-install rejection leaves no installation or external files", () => fixture(async target => {
  await assert.rejects(initSpeculo(target, {
    packageRoot, selection: { workflowIds: [] }, confirmInstall: async () => false,
  }), InstallCancelled);
  await noTransactionResidue(target);
  await assert.rejects(readdir(join(target, ".agents/speculo")), /ENOENT/);
  await assert.rejects(readFile(join(target, "AGENTS.md")), /ENOENT/);
}));

test("preview matches application across hosts and distinguishes conflicted removals", () => fixture(async target => {
  await initSpeculo(target, { packageRoot, selection: { workflowIds: ["learning"] }, skills: { mode: "all" } });
  const edited = join(target, ".agents/skills/learning-l-lesson/SKILL.md");
  await writeFile(edited, "manual edit");
  let seen: InstallPreview | undefined;
  const phases: string[] = [];
  const result = await initSpeculo(target, {
    packageRoot, selection: { workflowIds: [] }, skills: { mode: "set", assetIds: ["command/status"] },
    skillTargets: ["agents", "claude"], onProgress: p => { phases.push(p); },
    confirmInstall: async preview => { seen = preview; return true; },
  });
  assert.deepEqual(result.projections, seen!.projections);
  assert.deepEqual(phases, ["staging", "staged", "committing", "committed"]);
  assert.deepEqual(result.projections.agents.conflicts, ["learning/lesson"]);
  assert.equal(result.projections.agents.ready, 1);
  assert.deepEqual(result.projections.agents.retained, ["command/status"]);
  assert.equal(result.projections.agents.removed.length, 19);
  assert.deepEqual(result.projections.claude.selected, ["command/status"]);
  assert.equal(await readFile(edited, "utf8"), "manual edit");
  const manifest = (await readProjectionManifest(target))!;
  assert.deepEqual(manifest.targets, ["agents", "claude"]);
  assert.deepEqual(manifest.asset_ids, ["command/status"]);
  assert.equal(result.projections.agents.deleted, 18);
  assert.equal(result.projections.claude.created, 1);
  assert.equal(formatInstallPreview(seen!).match(/command\/status/g)?.length, 1);
  await assert.rejects(readFile(join(target, ".agents/skills/learning-g-goal/SKILL.md")), /ENOENT/);
  await noTransactionResidue(target);
}));

test("confirmation does not bypass drift recheck", () => fixture(async target => {
  await initSpeculo(target, { packageRoot, selection: { workflowIds: [] } });
  const file = join(target, ".agents/speculo/commands/status/COMMAND.md");
  await assert.rejects(initSpeculo(target, {
    packageRoot, selection: { workflowIds: [] },
    confirmInstall: async () => { await writeFile(file, "concurrent edit"); return true; },
  }), /concurrent-drift/);
  assert.equal(await readFile(file, "utf8"), "concurrent edit");
  await noTransactionResidue(target);
}));

test("keep never follows newly installed groups; all recomputes the catalog", () => fixture(async target => {
  await initSpeculo(target, { packageRoot, selection: { workflowIds: [] }, skills: { mode: "all" } });
  const kept = await initSpeculo(target, { packageRoot, selection: { workflowIds: ["learning"] } });
  assert.equal(kept.projections.agents.selected.length, 10);
  const expanded = await initSpeculo(target, { packageRoot, skills: { mode: "all" } });
  assert.equal(expanded.projections.agents.selected.length, 20);
  assert.equal(expanded.projections.agents.added.length, 10);
  await noTransactionResidue(target);
}));

test("legacy empty transaction container is cleaned but unknown residue is preserved", () => fixture(async target => {
  await mkdir(join(target, TRANSACTIONS_ROOT), { recursive: true });
  await initSpeculo(target, { packageRoot, selection: { workflowIds: [] } });
  await noTransactionResidue(target);
  const residue = join(target, TRANSACTIONS_ROOT, "unknown-evidence");
  await mkdir(join(target, TRANSACTIONS_ROOT));
  await writeFile(residue, "preserve");
  await initSpeculo(target, { packageRoot, selection: { workflowIds: [] } });
  assert.equal(await readFile(residue, "utf8"), "preserve");
  await assert.rejects(readdir(join(target, LOCK_NAME)), /ENOENT/);
}));

test("transaction container cleanup rejects symlinks", { skip: process.platform === "win32" }, () => fixture(async target => {
  const outside = join(target, "other");
  await mkdir(outside); await mkdir(join(target, ".agents"));
  await symlink(outside, join(target, TRANSACTIONS_ROOT));
  await assert.rejects(cleanEmptyTransactionsDirectory(target), /symlink|unsafe/);
  assert.deepEqual(await readdir(outside), []);
}));
