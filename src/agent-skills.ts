import { createHash } from "node:crypto";
import { lstat, readdir, readFile, readlink } from "node:fs/promises";
import { join } from "node:path";
import { containedPath } from "./paths.js";
import { pathToFileURL } from "node:url";
import { RefreshBlockedError, type RefreshBlocker } from "./refresh.js";
import type { SkillNode, SkillRecord } from "./transaction.js";
import { pathExists } from "./utils.js";
import { discoverWorkflowCatalog, type WorkflowCatalog } from "./workflows.js";

export const MANAGED_MANIFEST = ".speculo-managed.json";
const WORK_DIR = /^[A-Z]-[a-z0-9][a-z0-9-]*$/;
const SKILL_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const REQUIRED_TAIL = "选中后必须先读工作入口；选择本技能不构成执行授权。";

export type AgentSkillRequest =
  | { mode: "skip" }
  | { mode: "none" }
  | { mode: "keep" }
  | { mode: "set"; workflowIds: string[]; templateNames: string[] | "all" };

export type ManagedWork = { id: string; workflow: string; work: string; entry: string; sha256: string };
export type ManagedTemplate = { name: string; link: string; sha256: string };
export type ManagedManifest = {
  schema_version: 1;
  package_version: string;
  works: ManagedWork[];
  template_skills: ManagedTemplate[];
};

export type RenderedWorkSkill = ManagedWork & { body: string; title: string };

type ValidateSkill = (content: string, directory: string) => string[];
let validateSkill: ValidateSkill | undefined;

async function skillValidator(packageRoot: string): Promise<ValidateSkill> {
  if (!validateSkill) {
    const href = pathToFileURL(join(packageRoot, "scripts/validate-skills.mjs")).href;
    validateSkill = (await import(href) as { validateSkill: ValidateSkill }).validateSkill;
  }
  return validateSkill;
}

function record(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

export function sha256Buffer(content: Buffer | string): string {
  return createHash("sha256").update(content).digest("hex");
}

function frontmatter(content: string): Record<string, string> {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  const fields: Record<string, string> = {};
  if (!match) return fields;
  for (const line of match[1].split(/\r?\n/)) {
    const field = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (field) fields[field[1]] = field[2].trim();
  }
  return fields;
}

function oneLine(value: string): string {
  return value.replace(/[\r\n|]+/g, " ").replace(/\s+/g, " ").trim();
}

function keywordsOf(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw.replace(/^\[/, "").replace(/\]$/, "").split(",").map((item) => item.trim()).filter(Boolean);
}

export function buildWorkDescription(workflowName: string, workName: string, workDescription: string, keywords: string[]): string {
  const keyText = keywords.length ? `关键词：${keywords.join("、")}。` : "";
  const tail = `${keyText}使用时机：用户要执行该 Work，或任务与其描述或关键词匹配。${REQUIRED_TAIL}`;
  const head = `${oneLine(workflowName)} Work「${oneLine(workName)}」：${oneLine(workDescription)}。`;
  const combined = `${head}${tail}`.replace(/\s+/g, " ").trim();
  if (combined.length <= 1024) return combined;
  const budget = Math.max(0, 1024 - tail.length);
  return `${head.slice(0, budget).trim()}${tail}`.slice(0, 1024);
}

export function renderWorkSkill(input: {
  workflowId: string;
  workflowName: string;
  work: string;
  entryId: string;
  title: string;
  workDescription: string;
  keywords: string[];
}): RenderedWorkSkill {
  const id = `${input.workflowId}-${input.work.toLowerCase()}`;
  const entry = `speculo/workflows/${input.workflowId}/${input.work}/${input.work}.md`;
  const relative = `../../../${entry}`;
  const description = buildWorkDescription(input.workflowName, input.title, input.workDescription, input.keywords);
  const metadata = JSON.stringify({
    "speculo-kind": "work-pointer",
    "speculo-workflow": input.workflowId,
    "speculo-work": input.work,
    "speculo-entry": input.entryId,
  });
  const body = [
    "---",
    `name: ${id}`,
    `description: ${description}`,
    `metadata: ${metadata}`,
    "---",
    "",
    `# ${oneLine(input.title)}`,
    "",
    "做任何步骤、扩读或改动之前，先读工作入口，并只以该文件为事实源。",
    "",
    `- 项目根路径：\`${entry}\``,
    `- 相对本文件：[${input.work}.md](${relative})`,
    "",
    "接着只执行该入口的第一条读取指令。不要把 `<Path>` 当宿主标签。先读 `speculo/.speculo/workspace.json`，按 `path_base: project-root` 解析：`{roots.workflows}`=`speculo/workflows`，`{roots.state}`=`speculo/.speculo`，`{roots.skills}`=`speculo/skills`。入口内的相对链接相对于入口文件所在目录，不相对于本 SKILL.md。",
    "",
    "不复制入口、references、scripts 或正文。选中本技能不是执行授权。缺入口、roots 或该 Work 要求的确认时停止。",
    "",
  ].join("\n");
  return { id, workflow: input.workflowId, work: input.work, entry, sha256: sha256Buffer(body), body, title: oneLine(input.title) };
}

export async function discoverWorks(workflowRoot: string, workflowId: string, workflowName: string): Promise<RenderedWorkSkill[]> {
  const skills: RenderedWorkSkill[] = [];
  let entries;
  try { entries = await readdir(workflowRoot, { withFileTypes: true }); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return skills; throw error; }
  for (const entry of entries) {
    if (!entry.isDirectory() || !WORK_DIR.test(entry.name)) continue;
    const file = join(workflowRoot, entry.name, `${entry.name}.md`);
    if (!(await pathExists(file))) continue;
    const fields = frontmatter(await readFile(file, "utf8"));
    if (fields.type !== "workflow-entry" || fields.workflow !== workflowId) continue;
    skills.push(renderWorkSkill({
      workflowId,
      workflowName,
      work: entry.name,
      entryId: fields.id || `${workflowId}/${entry.name}`,
      title: fields.name || entry.name,
      workDescription: fields.description || fields.name || entry.name,
      keywords: keywordsOf(fields.keywords),
    }));
  }
  return skills.sort((left, right) => left.id.localeCompare(right.id));
}

export async function listTemplateSkillNames(skillsRoot: string): Promise<string[]> {
  const names: string[] = [];
  for (const entry of await readdir(skillsRoot, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.isSymbolicLink()) continue;
    if (await pathExists(join(skillsRoot, entry.name, "SKILL.md"))) names.push(entry.name);
  }
  return names.sort();
}

export function templateLink(name: string): string {
  return `../../speculo/skills/${name}`;
}

export function parseAgentSkillSpec(spec: string, workflowIds: ReadonlySet<string>): AgentSkillRequest {
  if (spec === "none") return { mode: "none" };
  if (spec === "keep") return { mode: "keep" };
  if (!/^[a-z0-9:+,-]+$/.test(spec)) throw new Error("--agent-skills contains an invalid token");
  const parts = spec.split(",").filter((part) => part.length > 0);
  if (parts.length === 0 || parts.includes("none") || parts.includes("keep")) throw new Error("--agent-skills none and keep must be used alone");
  const workflowSelection: string[] = [];
  const templateNames: string[] = [];
  let templateAll = false;
  for (let index = 0; index < parts.length; index++) {
    const part = parts[index];
    if (part === "template") { templateAll = true; continue; }
    if (part.startsWith("template:")) {
      const inline = part.slice("template:".length).split("+").filter((id) => id.length > 0);
      if (inline.length === 0 || inline.some((id) => !SKILL_ID.test(id))) throw new Error("--agent-skills template id is invalid: " + part);
      templateNames.push(...inline);
      while (index + 1 < parts.length && !workflowIds.has(parts[index + 1]) && parts[index + 1] !== "template" && !parts[index + 1].startsWith("template:") && SKILL_ID.test(parts[index + 1])) {
        templateNames.push(parts[++index]);
      }
      continue;
    }
    if (!workflowIds.has(part)) throw new Error("--agent-skills unknown workflow: " + part);
    workflowSelection.push(part);
  }
  return {
    mode: "set",
    workflowIds: [...new Set(workflowSelection)].sort(),
    templateNames: templateAll ? "all" : [...new Set(templateNames)].sort(),
  };
}

function absent(): SkillNode { return { kind: "absent" }; }

function fileNode(content: string): SkillNode {
  return { kind: "file", content: Buffer.from(content, "utf8").toString("base64"), mode: 0o644 };
}

function directoryNode(content: string): SkillNode {
  return { kind: "directory", file: "SKILL.md", content: Buffer.from(content, "utf8").toString("base64"), mode: 0o644 };
}

function symlinkNode(target: string): SkillNode {
  return { kind: "symlink", target };
}

export function decodeSkillText(node: SkillNode): string {
  if (node.kind !== "file" && node.kind !== "directory") return "";
  return Buffer.from(node.content, "base64").toString("utf8");
}

async function readManifest(target: string): Promise<{ manifest: ManagedManifest | null; raw: string | null; blocker: RefreshBlocker | null }> {
  const path = join(target, ".agents", "skills", MANAGED_MANIFEST);
  let stat;
  try { stat = await lstat(path); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return { manifest: null, raw: null, blocker: null };
    throw error;
  }
  if (stat.isSymbolicLink() || !stat.isFile()) {
    return { manifest: null, raw: null, blocker: { code: "agent-skill-drift", path: `.agents/skills/${MANAGED_MANIFEST}`, message: "managed manifest must be a regular file" } };
  }
  const raw = await readFile(path, "utf8");
  let parsed: unknown;
  try { parsed = JSON.parse(raw); }
  catch { return { manifest: null, raw, blocker: { code: "agent-skill-drift", path: `.agents/skills/${MANAGED_MANIFEST}`, message: "managed manifest is not valid JSON" } }; }
  if (!record(parsed) || parsed.schema_version !== 1 || typeof parsed.package_version !== "string" || !Array.isArray(parsed.works) || !Array.isArray(parsed.template_skills)) {
    return { manifest: null, raw, blocker: { code: "agent-skill-drift", path: `.agents/skills/${MANAGED_MANIFEST}`, message: "managed manifest schema is invalid" } };
  }
  const works: ManagedWork[] = [];
  const templateSkills: ManagedTemplate[] = [];
  for (const work of parsed.works) {
    if (!record(work) || typeof work.id !== "string" || typeof work.workflow !== "string" || typeof work.work !== "string" || typeof work.entry !== "string" || typeof work.sha256 !== "string") {
      return { manifest: null, raw, blocker: { code: "agent-skill-drift", path: `.agents/skills/${MANAGED_MANIFEST}`, message: "managed work record is invalid" } };
    }
    works.push({ id: work.id, workflow: work.workflow, work: work.work, entry: work.entry, sha256: work.sha256 });
  }
  for (const skill of parsed.template_skills) {
    if (!record(skill) || typeof skill.name !== "string" || typeof skill.link !== "string" || typeof skill.sha256 !== "string") {
      return { manifest: null, raw, blocker: { code: "agent-skill-drift", path: `.agents/skills/${MANAGED_MANIFEST}`, message: "managed template record is invalid" } };
    }
    templateSkills.push({ name: skill.name, link: skill.link, sha256: skill.sha256 });
  }
  return { manifest: { schema_version: 1, package_version: parsed.package_version, works, template_skills: templateSkills }, raw, blocker: null };
}

async function parentBlocker(target: string): Promise<RefreshBlocker | null> {
  for (const relative of [".agents", ".agents/skills"]) {
    try {
      const stat = await lstat(join(target, relative));
      if (stat.isSymbolicLink() || !stat.isDirectory()) {
        return { code: "agent-skill-parent", path: relative, message: "expected a real directory so managed skills can be projected beside unmanaged entries" };
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }
  return null;
}

async function workNodeMatches(target: string, work: ManagedWork): Promise<boolean> {
  const dir = join(target, ".agents", "skills", work.id);
  let stat;
  try { stat = await lstat(dir); }
  catch (error) { return (error as NodeJS.ErrnoException).code === "ENOENT" ? false : Promise.reject(error); }
  if (stat.isSymbolicLink() || !stat.isDirectory()) return false;
  const entries = await readdir(dir);
  if (entries.length !== 1 || entries[0] !== "SKILL.md") return false;
  const file = join(dir, "SKILL.md");
  const fileStat = await lstat(file);
  if (fileStat.isSymbolicLink() || !fileStat.isFile()) return false;
  return sha256Buffer(await readFile(file)) === work.sha256;
}

async function templateNodeMatches(target: string, skill: ManagedTemplate): Promise<boolean> {
  const path = join(target, ".agents", "skills", skill.name);
  let stat;
  try { stat = await lstat(path); }
  catch (error) { return (error as NodeJS.ErrnoException).code === "ENOENT" ? false : Promise.reject(error); }
  if (!stat.isSymbolicLink()) return false;
  return await readlink(path) === skill.link && sha256Buffer(skill.link) === skill.sha256;
}

export async function cleanProjectionSelection(target: string, manifest: ManagedManifest): Promise<{ workflows: Set<string>; template: Set<string> }> {
  const workflows = new Set<string>();
  const byWorkflow = new Map<string, ManagedWork[]>();
  for (const work of manifest.works) {
    const group = byWorkflow.get(work.workflow) ?? [];
    group.push(work);
    byWorkflow.set(work.workflow, group);
  }
  for (const [workflow, works] of byWorkflow) {
    let clean = works.length > 0;
    for (const work of works) if (!(await workNodeMatches(target, work))) clean = false;
    if (clean) workflows.add(workflow);
  }
  const template = new Set<string>();
  for (const skill of manifest.template_skills) if (await templateNodeMatches(target, skill)) template.add(skill.name);
  return { workflows, template };
}

async function promptAgentSkills(input: {
  workflows: Array<{ id: string; label: string; checked: boolean }>;
  template: Array<{ name: string; checked: boolean }>;
}): Promise<{ workflowIds: string[]; templateNames: string[] }> {
  const { checkbox } = await import("@inquirer/prompts");
  const workflowIds = input.workflows.length === 0 ? [] : await checkbox({
    message: "选择要写入 .agents/skills/ 的 Work 组（供 Agents /skills；默认不写入，空格切换，回车确认）：",
    choices: input.workflows.map((workflow) => ({ name: workflow.label, value: workflow.id, checked: workflow.checked })),
    pageSize: 12,
  });
  const templateNames = input.template.length === 0 ? [] : await checkbox({
    message: "选择要链接到 .agents/skills/ 的模板 Skill（默认不链接，不影响 speculo/skills）：",
    choices: input.template.map((skill) => ({ name: skill.name, value: skill.name, checked: skill.checked })),
    pageSize: 12,
  });
  return { workflowIds, templateNames };
}

export async function resolveAgentSkillRequest(options: {
  target: string;
  packageRoot: string;
  catalog: WorkflowCatalog;
  installedWorkflowIds: string[];
  request?: AgentSkillRequest;
  prompt: boolean;
}): Promise<AgentSkillRequest> {
  if (options.request) return options.request;
  const existing = await readManifest(options.target);
  if (existing.blocker) throw new RefreshBlockedError([existing.blocker]);
  if (!options.prompt) return existing.manifest ? { mode: "keep" } : { mode: "skip" };
  const prechecked = existing.manifest ? await cleanProjectionSelection(options.target, existing.manifest) : { workflows: new Set<string>(), template: new Set<string>() };
  const workflows = [];
  for (const id of options.installedWorkflowIds) {
    const workflow = options.catalog.get(id);
    if (!workflow) continue;
    const works = await discoverWorks(join(options.packageRoot, "template", "workflows", id), id, workflow.displayName);
    workflows.push({ id, label: `${workflow.displayName} 的 ${works.length} 个 Work`, checked: prechecked.workflows.has(id) });
  }
  const template = (await listTemplateSkillNames(join(options.packageRoot, "template", "skills"))).map((name) => ({ name, checked: prechecked.template.has(name) }));
  const picked = await promptAgentSkills({ workflows, template });
  return { mode: "set", workflowIds: picked.workflowIds, templateNames: picked.templateNames };
}

function manifestText(manifest: ManagedManifest): string {
  return JSON.stringify(manifest, null, 2) + "\n";
}

function pushChange(records: SkillRecord[], name: string, before: SkillNode, after: SkillNode): void {
  if (JSON.stringify(before) === JSON.stringify(after)) return;
  records.push({ name, before, after });
}

export async function planSkillProjection(options: {
  target: string;
  stagedRoot: string;
  packageRoot: string;
  packageVersion: string;
  installedWorkflowIds: string[];
  request: AgentSkillRequest;
}): Promise<{ records: SkillRecord[] | null; blockers: RefreshBlocker[] }> {
  if (options.request.mode === "skip") return { records: null, blockers: [] };
  const loaded = await readManifest(options.target);
  if (loaded.blocker) return { records: null, blockers: [loaded.blocker] };
  const manifest = loaded.manifest;
  if ((options.request.mode === "none" || options.request.mode === "keep") && !manifest) return { records: null, blockers: [] };

  const installed = new Set(options.installedWorkflowIds);
  let workflowIds: string[] = [];
  let templateNames: string[] = [];
  if (options.request.mode === "none") {
    workflowIds = [];
    templateNames = [];
  } else if (options.request.mode === "keep") {
    workflowIds = [...new Set(manifest!.works.map((work) => work.workflow))].sort();
    templateNames = manifest!.template_skills.map((skill) => skill.name).sort();
  } else {
    workflowIds = [...options.request.workflowIds].sort();
    templateNames = options.request.templateNames === "all"
      ? await listTemplateSkillNames(join(options.stagedRoot, "skills"))
      : [...options.request.templateNames].sort();
  }

  const blockers: RefreshBlocker[] = [];
  for (const work of manifest?.works ?? []) {
    if (!SKILL_ID.test(work.id) || !SKILL_ID.test(work.workflow) || !WORK_DIR.test(work.work) || work.entry !== `speculo/workflows/${work.workflow}/${work.work}/${work.work}.md`) {
      blockers.push({ code: "agent-skill-drift", path: `.agents/skills/${MANAGED_MANIFEST}`, message: "managed work record is not a contained skill id" });
    }
  }
  for (const skill of manifest?.template_skills ?? []) {
    if (!SKILL_ID.test(skill.name) || skill.link !== templateLink(skill.name)) {
      blockers.push({ code: "agent-skill-drift", path: `.agents/skills/${MANAGED_MANIFEST}`, message: "managed template record is not a contained skill id" });
    }
  }
  if (blockers.length) return { records: null, blockers };
  for (const workflowId of workflowIds) {
    if (!installed.has(workflowId)) blockers.push({ code: "agent-skill-workflow", path: workflowId, message: "workflow is not installed; select it for installation before projecting its works" });
  }
  const availableTemplate = new Set(await listTemplateSkillNames(join(options.stagedRoot, "skills")));
  for (const name of templateNames) {
    if (!availableTemplate.has(name)) blockers.push({ code: "agent-skill-template", path: name, message: "unknown template skill" });
  }
  if (blockers.length) return { records: null, blockers };

  const catalog = await discoverWorkflowCatalog(options.packageRoot);
  const desiredWorks: RenderedWorkSkill[] = [];
  for (const workflowId of workflowIds) {
    const workflow = catalog.get(workflowId);
    desiredWorks.push(...await discoverWorks(join(options.stagedRoot, "workflows", workflowId), workflowId, workflow?.displayName ?? workflowId));
  }
  const validator = await skillValidator(options.packageRoot);
  for (const work of desiredWorks) {
    const errors = validator(work.body, work.id);
    if (errors.length) blockers.push({ code: "agent-skill-render", path: work.id, message: errors.join("; ") });
  }
  if (blockers.length) return { records: null, blockers };

  const desiredTemplates: ManagedTemplate[] = templateNames.map((name) => {
    const link = templateLink(name);
    return { name, link, sha256: sha256Buffer(link) };
  });
  const nextManifest: ManagedManifest = {
    schema_version: 1,
    package_version: options.packageVersion,
    works: desiredWorks.map(({ id, workflow, work, entry, sha256 }) => ({ id, workflow, work, entry, sha256 })),
    template_skills: desiredTemplates,
  };
  const desiredNames = new Set<string>([...desiredWorks.map((work) => work.id), ...desiredTemplates.map((skill) => skill.name)]);
  if (manifest) {
    for (const work of manifest.works) {
      if (!(await workNodeMatches(options.target, work))) {
        blockers.push({ code: "agent-skill-drift", path: `.agents/skills/${work.id}`, message: "managed work skill differs from the recorded projection; preserve the edited file and reconcile it explicitly" });
      }
    }
    for (const skill of manifest.template_skills) {
      if (!(await templateNodeMatches(options.target, skill))) {
        blockers.push({ code: "agent-skill-drift", path: `.agents/skills/${skill.name}`, message: "managed template link differs from the recorded projection" });
      }
    }
  }
  for (const name of desiredNames) {
    if (manifest?.works.some((work) => work.id === name) || manifest?.template_skills.some((skill) => skill.name === name)) continue;
    if (await pathExists(join(options.target, ".agents", "skills", name))) {
      blockers.push({ code: "agent-skill-unmanaged", path: `.agents/skills/${name}`, message: "path exists and is not a Speculo-managed skill" });
    }
  }
  if (nextManifest.works.length || nextManifest.template_skills.length || manifest) {
    const parent = await parentBlocker(options.target);
    if (parent) blockers.push(parent);
  }
  if (blockers.length) return { records: null, blockers };

  const records: SkillRecord[] = [];
  const previousWorks = new Map((manifest?.works ?? []).map((work) => [work.id, work]));
  for (const work of desiredWorks) {
    const before = previousWorks.has(work.id) ? directoryNode(await readFile(join(options.target, ".agents", "skills", work.id, "SKILL.md"), "utf8")) : absent();
    pushChange(records, work.id, before, directoryNode(work.body));
  }
  for (const work of manifest?.works ?? []) {
    if (!desiredNames.has(work.id)) pushChange(records, work.id, directoryNode(await readFile(join(options.target, ".agents", "skills", work.id, "SKILL.md"), "utf8")), absent());
  }
  const previousTemplates = new Map((manifest?.template_skills ?? []).map((skill) => [skill.name, skill]));
  for (const skill of desiredTemplates) {
    const before = previousTemplates.has(skill.name) ? symlinkNode(skill.link) : absent();
    pushChange(records, skill.name, before, symlinkNode(skill.link));
  }
  for (const skill of manifest?.template_skills ?? []) {
    if (!desiredNames.has(skill.name)) pushChange(records, skill.name, symlinkNode(skill.link), absent());
  }
  const nextText = nextManifest.works.length || nextManifest.template_skills.length ? manifestText(nextManifest) : null;
  const beforeManifest = manifest && loaded.raw !== null ? fileNode(loaded.raw) : absent();
  const afterManifest = nextText === null ? absent() : fileNode(nextText);
  pushChange(records, MANAGED_MANIFEST, beforeManifest, afterManifest);
  return { records: records.length ? records : null, blockers: [] };
}

export async function inspectProjectedSkills(target: string, installedWorkflows: string[]): Promise<Array<{ id: string; ok: boolean; message: string }>> {
  const loaded = await readManifest(target);
  if (!loaded.manifest && !loaded.blocker && !loaded.raw) return [];
  const checks: Array<{ id: string; ok: boolean; message: string }> = [];
  if (loaded.blocker || !loaded.manifest) {
    checks.push({ id: "agent-skills", ok: false, message: loaded.blocker?.message ?? "invalid managed skill manifest" });
    return checks;
  }
  const manifest = loaded.manifest;
  const skillsDir = join(target, ".agents", "skills");
  let names: string[] = [];
  try { names = await readdir(skillsDir); }
  catch (error) { checks.push({ id: "agent-skills", ok: false, message: String(error) }); return checks; }
  for (const name of names) {
    if (name.startsWith(".speculo-skill-")) checks.push({ id: "agent-skill-residue:" + name, ok: false, message: "preserve projection residue until recovery finishes" });
  }
  const installed = new Set(installedWorkflows);
  for (const work of manifest.works) {
    const id = "agent-skill:" + work.id;
    if (!SKILL_ID.test(work.id) || work.entry !== `speculo/workflows/${work.workflow}/${work.work}/${work.work}.md`) {
      checks.push({ id, ok: false, message: "work projection record is not a contained entry path" });
      continue;
    }
    if (!installed.has(work.workflow)) {
      checks.push({ id, ok: false, message: "projected workflow is not installed" });
      continue;
    }
    const matches = await workNodeMatches(target, work);
    let entryExists = false;
    try { await readFile(await containedPath(target, work.entry)); entryExists = true; } catch { entryExists = false; }
    checks.push({ id, ok: matches && entryExists, message: matches && entryExists ? "work pointer matches the recorded entry" : "work pointer drifted or its entry is missing" });
  }
  for (const skill of manifest.template_skills) {
    const id = "agent-skill-template:" + skill.name;
    const expected = templateLink(skill.name);
    const matches = SKILL_ID.test(skill.name) && skill.link === expected && await templateNodeMatches(target, skill);
    let targetExists = false;
    try { await readFile(join(target, "speculo", "skills", skill.name, "SKILL.md")); targetExists = true; } catch { targetExists = false; }
    checks.push({ id, ok: matches && targetExists, message: matches && targetExists ? "template link matches the installed skill" : "template link drifted or its target is missing" });
  }
  checks.push({ id: "agent-skills", ok: checks.every((check) => check.ok), message: checks.every((check) => check.ok) ? `verified ${manifest.works.length} work pointers and ${manifest.template_skills.length} template links; host invocation was not probed` : "projected skills drifted" });
  return checks;
}
