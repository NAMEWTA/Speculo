import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { lstat, mkdir, mkdtemp, readFile, readlink, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { describe, it } from "node:test";
import { discoverWorks, parseAgentSkillSpec, sha256Buffer } from "../src/agent-skills.js";
import { doctorSpeculo } from "../src/doctor.js";
import { initSpeculo } from "../src/index.js";
import { fingerprintTree } from "../src/manifest.js";
import { RefreshBlockedError } from "../src/refresh.js";

const packageRoot = process.cwd();
const workflows = ["learning", "ops", "person", "specdev"] as const;

async function fixture(fn: (target: string) => Promise<void>): Promise<void> {
  const target = await mkdtemp(join(tmpdir(), "speculo-agent-skills-"));
  try { await fn(target); } finally { await rm(target, { recursive: true, force: true }); }
}

describe("agent skill projection", () => {
  it("renders one valid pointer per work and resolves the relative entry", async () => {
    const href = pathToFileURL(join(packageRoot, "scripts/validate-skills.mjs")).href;
    const { validateSkill } = await import(href) as { validateSkill: (content: string, directory: string) => string[] };
    const root = join(tmpdir(), "speculo-skill-link");
    let count = 0;
    const ids = new Set<string>();
    for (const workflow of workflows) {
      const works = await discoverWorks(join(packageRoot, "template", "workflows", workflow), workflow, workflow);
      for (const work of works) {
        count += 1;
        assert.equal(ids.has(work.id), false);
        ids.add(work.id);
        assert.deepEqual(validateSkill(work.body, work.id), []);
        const link = /\(([^)]+)\)/.exec(work.body)?.[1];
        assert.ok(link);
        assert.equal(resolve(dirname(join(root, ".agents", "skills", work.id, "SKILL.md")), link), join(root, ...work.entry.split("/")));
        assert.match(work.body, /选中后必须先读工作入口/);
        assert.doesNotMatch(work.body, /disable-model-invocation/);
      }
    }
    assert.equal(count, 30);
    const person = await discoverWorks(join(packageRoot, "template", "workflows", "person"), "person", "Person");
    const mao = person.find((work) => work.id === "person-m-mao-zedong-cognitive-os");
    assert.ok(mao);
    assert.doesNotMatch(mao.body, /评蒋介石在双十节的演说/);
    assert.match(mao.body, /speculo\/workflows\/person\/M-mao-zedong-cognitive-os\/M-mao-zedong-cognitive-os\.md/);
  });

  it("parses the agent-skills flag without accepting removed commands", () => {
    const ids = new Set(["learning", "ops", "person", "specdev"]);
    assert.equal(parseAgentSkillSpec("none", ids).mode, "none");
    assert.equal(parseAgentSkillSpec("keep", ids).mode, "keep");
    const parsed = parseAgentSkillSpec("template:docs-sync+writing-great-skills,specdev", ids);
    assert.deepEqual(parsed, { mode: "set", workflowIds: ["specdev"], templateNames: ["docs-sync", "writing-great-skills"] });
    assert.throws(() => parseAgentSkillSpec("mirror-skills", ids), /unknown workflow/);
    assert.throws(() => parseAgentSkillSpec("none,specdev", ids), /used alone/);
  });

  it("leaves .agents untouched unless a projection is requested", async () => fixture(async (target) => {
    await initSpeculo(target, { packageRoot, selection: { workflowIds: ["learning"] } });
    assert.equal((await readdir(target)).includes(".agents"), false);
    const result = await doctorSpeculo(target);
    assert.equal(result.healthy, true);
    assert.ok(result.notChecked.includes("host-skill-invocation"));
  }));

  it("projects work pointers and preserves an unmanaged sibling", async () => fixture(async (target) => {
    await mkdir(join(target, ".agents", "skills", "custom-skill"), { recursive: true });
    await writeFile(join(target, ".agents", "skills", "custom-skill", "SKILL.md"), "user owned\n");
    const result = await initSpeculo(target, {
      packageRoot,
      selection: { workflowIds: ["learning"] },
      agentSkills: { mode: "set", workflowIds: ["learning"], templateNames: [] },
    });
    assert.equal(result.agentSkills.works, 9);
    const skill = await readFile(join(target, ".agents", "skills", "learning-l-lesson", "SKILL.md"), "utf8");
    assert.match(skill, /speculo\/workflows\/learning\/L-lesson\/L-lesson\.md/);
    assert.equal(await readFile(join(target, ".agents", "skills", "custom-skill", "SKILL.md"), "utf8"), "user owned\n");
    assert.equal((await doctorSpeculo(target)).healthy, true);
    const before = await fingerprintTree(join(target, "speculo"));
    await writeFile(join(target, ".agents", "skills", "learning-l-lesson", "SKILL.md"), skill + "edited\n");
    const dirty = await doctorSpeculo(target);
    assert.equal(dirty.healthy, false);
    assert.equal(await fingerprintTree(join(target, "speculo")), before);
    await assert.rejects(
      initSpeculo(target, { packageRoot, selection: { workflowIds: ["learning"] }, agentSkills: { mode: "keep" } }),
      (error) => error instanceof RefreshBlockedError && error.blockers.some((blocker) => blocker.code === "agent-skill-drift"),
    );
    assert.equal(await fingerprintTree(join(target, "speculo")), before);
    await writeFile(join(target, ".agents", "skills", "learning-l-lesson", "SKILL.md"), skill);
    await initSpeculo(target, { packageRoot, selection: { workflowIds: ["learning"] }, agentSkills: { mode: "none" } });
    assert.equal(await readFile(join(target, ".agents", "skills", "custom-skill", "SKILL.md"), "utf8"), "user owned\n");
    assert.equal((await readdir(join(target, ".agents", "skills"))).includes("learning-l-lesson"), false);
    assert.equal((await readdir(join(target, ".agents", "skills"))).includes(".speculo-managed.json"), false);
  }));

  it("refuses to replace an unmanaged skill of the same name", async () => fixture(async (target) => {
    await initSpeculo(target, { packageRoot, selection: { workflowIds: ["learning"] } });
    const before = await fingerprintTree(join(target, "speculo"));
    await mkdir(join(target, ".agents", "skills", "learning-l-lesson"), { recursive: true });
    await writeFile(join(target, ".agents", "skills", "learning-l-lesson", "SKILL.md"), "not managed\n");
    await assert.rejects(
      initSpeculo(target, { packageRoot, selection: { workflowIds: ["learning"] }, agentSkills: { mode: "set", workflowIds: ["learning"], templateNames: [] } }),
      (error) => error instanceof RefreshBlockedError && error.blockers.some((blocker) => blocker.code === "agent-skill-unmanaged"),
    );
    assert.equal(await readFile(join(target, ".agents", "skills", "learning-l-lesson", "SKILL.md"), "utf8"), "not managed\n");
    assert.equal(await fingerprintTree(join(target, "speculo")), before);
  }));

  it("links a selected template skill at the real package", { skip: process.platform === "win32" }, async () => fixture(async (target) => {
    await initSpeculo(target, { packageRoot, selection: { workflowIds: [] }, agentSkills: { mode: "set", workflowIds: [], templateNames: ["docs-sync"] } });
    const link = join(target, ".agents", "skills", "docs-sync");
    assert.equal((await lstat(link)).isSymbolicLink(), true);
    assert.equal(await readlink(link), "../../speculo/skills/docs-sync");
    assert.equal(await readFile(join(link, "SKILL.md"), "utf8"), await readFile(join(target, "speculo", "skills", "docs-sync", "SKILL.md"), "utf8"));
    await readFile(join(link, "references", "mode-contract.md"));
    assert.equal((await doctorSpeculo(target)).healthy, true);
  }));

  it("keeps a clean projection on a later refresh without the flag", async () => fixture(async (target) => {
    await initSpeculo(target, { packageRoot, selection: { workflowIds: ["learning"] }, agentSkills: { mode: "set", workflowIds: ["learning"], templateNames: [] } });
    const first = await readFile(join(target, ".agents", "skills", "learning-g-goal", "SKILL.md"), "utf8");
    await initSpeculo(target, { packageRoot, selection: { workflowIds: ["learning"] } });
    assert.equal(await readFile(join(target, ".agents", "skills", "learning-g-goal", "SKILL.md"), "utf8"), first);
    assert.equal(sha256Buffer(first).length, 64);
  }));
});

describe("CLI agent-skills flag", () => {
  it("documents --agent-skills and still rejects removed commands", () => {
    const cli = join(packageRoot, "dist", "src", "cli.js");
    const help = spawnSync(process.execPath, [cli, "--help"], { encoding: "utf8" });
    assert.equal(help.status, 0);
    assert.match(help.stdout, /--agent-skills/);
    assert.doesNotMatch(help.stdout, /migrate-runtime-state|mirror-skills|update\s+/);
    const removed = spawnSync(process.execPath, [cli, "init", "--agent-skills", "not-a-workflow"], { encoding: "utf8" });
    assert.equal(removed.status, 1);
    assert.match(removed.stderr, /unknown workflow/);
  });
});
