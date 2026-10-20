/** Read-only SpecDev Markdown artifacts. These readers never grant write authority. */
import { lstatSync, readFileSync, readdirSync, realpathSync } from "node:fs";
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { TextDecoder } from "node:util";
import { DEFAULT_ROOTS, WORKSPACE_PATH, validateWorkspace } from "./paths.js";

export type WorkContext = { projectRoot: string; methodRoot: string; stateRoot: string; specdevRoot: string; installation: "present" | "absent" };
export type ChangeLocation = { name: string; root: string; kind: "active" | "archive" };
export type Outcome = "active" | "completed" | "cancelled";
export type ChangeFacts = { location: ChangeLocation; outcome: Outcome; readmePath: string; outcomeLine: number };
export class ArtifactError extends Error {
  constructor(public code: string, public path: string, message: string, public line?: number) {
    super(`${code}: ${path}${line ? `:${line}` : ""}: ${message}`); this.name = "ArtifactError";
  }
}
function fail(code: string, path: string, message: string, line?: number): never { throw new ArtifactError(code, path, message, line); }
function exists(path: string): boolean { try { lstatSync(path); return true; } catch (e) { if ((e as NodeJS.ErrnoException).code === "ENOENT") return false; throw e; } }

/** Reject links, wrong case, non-directory parents and lexical traversal, including missing leaves. */
export function safeWorkPathSync(root: string, portable: string, options: { mustExist?: boolean; type?: "file" | "directory"; allowRoot?: boolean } = {}): string {
  const base = resolve(root);
  if (isAbsolute(portable) || /[\\:\x00-\x1f]/.test(portable) || portable.split("/").some(p => p === ".." || p === "." || (!p && portable !== ""))) fail("path-unsafe", portable, "expected a contained portable path");
  if (!portable && !options.allowRoot) fail("path-unsafe", base, "root is not a leaf target");
  if (exists(base) && (lstatSync(base).isSymbolicLink() || !lstatSync(base).isDirectory())) fail("path-unsafe", base, "root must be a real directory");
  let cursor = base;
  const parts = portable ? portable.split("/") : [];
  for (let i = 0; i < parts.length; i++) {
    if (exists(cursor)) {
      if (!lstatSync(cursor).isDirectory()) fail("path-unsafe", cursor, "parent is not a directory");
      const names = readdirSync(cursor), matches = names.filter(n => n.toLocaleLowerCase("en-US") === parts[i].toLocaleLowerCase("en-US"));
      if (matches.length > 1 || (matches.length === 1 && matches[0] !== parts[i])) fail("path-unsafe", join(cursor, parts[i]), "ambiguous or noncanonical case");
    }
    cursor = join(cursor, parts[i]);
    if (exists(cursor) && lstatSync(cursor).isSymbolicLink()) fail("path-unsafe", cursor, "symbolic links are not writable artifact paths");
  }
  if (options.mustExist && !exists(cursor)) fail("path-unsafe", cursor, "required path does not exist");
  if (exists(cursor) && options.type && !(options.type === "file" ? lstatSync(cursor).isFile() : lstatSync(cursor).isDirectory())) fail("path-unsafe", cursor, `expected ${options.type}`);
  return cursor;
}
function pathWithin(root: string, target: string): string {
  const rel = relative(root, target);
  if (rel === ".." || rel.startsWith(`..${sep}`) || isAbsolute(rel)) fail("path-unsafe", target, "business data must remain inside the confirmed project");
  return safeWorkPathSync(root, rel.split(sep).join("/"), { allowRoot: true, type: "directory" });
}
export function resolveWorkContextSync(input: { projectRoot: string; methodRoot?: string; stateRoot?: string }): WorkContext {
  if (!input?.projectRoot) fail("root-ambiguous", "projectRoot", "an explicit project boundary is required");
  const projectRoot = resolve(input.projectRoot);
  safeWorkPathSync(projectRoot, "", { allowRoot: true, mustExist: true, type: "directory" });
  // Canonicalize host ancestors (e.g. macOS /var) without accepting a linked project root.
  const actualProject = realpathSync(projectRoot);
  const workspacePath = safeWorkPathSync(actualProject, WORKSPACE_PATH, { type: "file" });
  for (const p of [".agents/.speculo-install.lock", ".speculo-init.lock", ".agents/speculo/.speculo/migration.json", "speculo/.speculo"]) {
    if (exists(safeWorkPathSync(actualProject, p))) fail("recovery-required", join(actualProject, p), "inspect the installation with its original owner before dependent work");
  }
  const installed = exists(workspacePath);
  if (!installed) {
    for (let parent = dirname(actualProject); parent !== dirname(parent); parent = dirname(parent)) {
      if (exists(join(parent, WORKSPACE_PATH))) fail("root-ambiguous", actualProject, `installed workspace belongs to ${parent}; specify its actual project root`);
    }
    if (exists(join(actualProject, DEFAULT_ROOTS.speculo))) fail("recovery-required", join(actualProject, DEFAULT_ROOTS.speculo), "method installation exists without valid workspace metadata");
  } else {
    const value: unknown = JSON.parse(readFileSync(workspacePath, "utf8")); validateWorkspace(value);
  }
  if (!installed && (!input.methodRoot || !input.stateRoot)) fail("root-ambiguous", actualProject, "direct Work requires explicit methodRoot and stateRoot");
  const methodRoot = resolve(actualProject, input.methodRoot ?? DEFAULT_ROOTS.speculo);
  const stateRoot = pathWithin(actualProject, resolve(actualProject, input.stateRoot ?? DEFAULT_ROOTS.state));
  if (installed && (methodRoot !== join(actualProject, DEFAULT_ROOTS.speculo) || stateRoot !== join(actualProject, DEFAULT_ROOTS.state))) fail("root-ambiguous", actualProject, "explicit roots conflict with the validated installed workspace");
  safeWorkPathSync(methodRoot, "", { allowRoot: true, mustExist: true, type: "directory" });
  const specdevRoot = safeWorkPathSync(stateRoot, "specdev", { type: "directory" });
  if (exists(join(specdevRoot, ".markdown-conversion-pending"))) fail("recovery-required", specdevRoot, "unfinished data operation; preserve its evidence and resolve it with the original owner before dependent work");
  return { projectRoot: actualProject, methodRoot: realpathSync(methodRoot), stateRoot, specdevRoot, installation: installed ? "present" : "absent" };
}
export async function resolveWorkContext(input: Parameters<typeof resolveWorkContextSync>[0]): Promise<WorkContext> { return resolveWorkContextSync(input); }
export function assertChangeName(name: string): void {
  const m = /^(\d{4})-(\d{2})-(\d{2})-[a-z0-9]+(?:-[a-z0-9]+)*$/.exec(name);
  if (!m) fail("identity-conflict", name, "expected YYYY-MM-DD-lowercase-topic");
  const year = Number(m[1]), month = Number(m[2]), day = Number(m[3]);
  const days = [31, year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (year < 1 || month < 1 || month > 12 || day < 1 || day > days[month - 1]) fail("identity-conflict", name, "date is not a real calendar date");
}

/** Visible top-level Markdown lines; rejects incomplete blocks instead of guessing. */
export function markdownBodyLines(text: string, path = "README.md"): { text: string; line: number }[] {
  if (text.includes("\u0000")) fail("outcome-invalid", path, "invalid text encoding");
  const out: { text: string; line: number }[] = [];
  let fence: { char: string; length: number; line: number } | undefined, comment = false, commentLine = 0;
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  let firstBody = 0;
  if (lines[0] === '---') {
    const end = lines.findIndex((line, index) => index > 0 && /^(?:---|\.\.\.)$/.test(line));
    if (end < 0) fail('outcome-invalid', path, 'unclosed frontmatter', 1);
    firstBody = end + 1;
  }
  for (let i = firstBody; i < lines.length; i++) {
    const raw = lines[i];
    if (fence) { if (new RegExp(`^ {0,3}${fence.char}{${fence.length},}[ \\t]*$`).test(raw)) fence = undefined; continue; }
    let visible = "", offset = 0;
    while (offset < raw.length) {
      if (comment) { const end = raw.indexOf("-->", offset); if (end < 0) { offset = raw.length; break; } comment = false; offset = end + 3; }
      else { const start = raw.indexOf("<!--", offset); if (start < 0) { visible += raw.slice(offset); break; } visible += raw.slice(offset, start); comment = true; commentLine = i + 1; offset = start + 4; }
    }
    // A declaration split by an HTML comment is not an independent Outcome line.
    if (visible !== raw && /^Outcome\b/i.test(visible.trimStart())) fail("outcome-invalid", path, "Outcome must occupy an uncommented independent line", i + 1);
    const open = /^ {0,3}(`{3,}|~{3,})(.*)$/.exec(visible);
    if (open) { if (open[1][0] === "`" && open[2].includes("`")) fail("outcome-invalid", path, "ambiguous code fence", i + 1); fence = { char: open[1][0], length: open[1].length, line: i + 1 }; continue; }
    if (/^(?: {4}|\t| {0,3}>)/.test(visible)) continue;
    out.push({ text: visible, line: i + 1 });
  }
  if (fence) fail("outcome-invalid", path, "unclosed code fence", fence.line);
  if (comment) fail("outcome-invalid", path, "unclosed HTML comment", commentLine);
  return out;
}
export function parseOutcome(text: string, path = "README.md"): { outcome: Outcome; line: number } {
  const header = /^---\r?\n([\s\S]*?)\r?\n(?:---|\.\.\.)(?:\r?\n|$)/.exec(text);
  if (header) for (const [index, line] of header[1].split(/\r?\n/).entries()) if (/^(?:Outcome|outcome|status|change_status):/.test(line)) fail('outcome-invalid', path, 'business Outcome must not be duplicated in frontmatter', index + 2);
  const declarations = markdownBodyLines(text, path).filter(l => /^\s*(?:[-+*]\s+)?Outcome\b/i.test(l.text));
  if (declarations.length !== 1) fail("outcome-invalid", path, `expected one Outcome declaration; found ${declarations.length}`, declarations[1]?.line ?? declarations[0]?.line);
  const value = /^Outcome: (active|completed|cancelled)[ \t]*$/.exec(declarations[0].text);
  if (!value) fail("outcome-invalid", path, "expected Outcome: active|completed|cancelled", declarations[0].line);
  return { outcome: value[1] as Outcome, line: declarations[0].line };
}
export function readUtf8ArtifactSync(path: string): string {
  safeWorkPathSync(dirname(path), basename(path), { mustExist: true, type: "file" });
  try { return new TextDecoder("utf-8", { fatal: true }).decode(readFileSync(path)); }
  catch (e) { fail("outcome-invalid", path, `cannot read UTF-8: ${String(e)}`); }
}
function specdevRoot(context: WorkContext | string): string { return typeof context === "string" ? resolve(context) : context.specdevRoot; }
function allLocations(root: string): ChangeLocation[] {
  const locations: ChangeLocation[] = [];
  function scan(portable: string, kind: ChangeLocation["kind"]) {
    const dir = safeWorkPathSync(root, portable, { type: "directory" }); if (!exists(dir)) return;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (kind === "active" && entry.name === "archive") continue;
      const target = join(dir, entry.name);
      if (!/^\d{4}-/.test(entry.name)) continue;
      assertChangeName(entry.name);
      safeWorkPathSync(root, relative(root, target).split(sep).join("/"), { mustExist: true, type: "directory" });
      locations.push({ name: entry.name, root: target, kind });
    }
  }
  scan("changes", "active"); scan("changes/archive", "archive");
  const seen = new Map<string, ChangeLocation>();
  for (const location of locations) {
    const previous = seen.get(location.name);
    if (previous) fail("identity-conflict", location.root, `duplicate identity also at ${previous.root}`);
    seen.set(location.name, location);
  }
  return locations;
}
export function discoverChangesSync(context: WorkContext | string, options: { includeArchived?: boolean } = {}): ChangeLocation[] {
  return allLocations(specdevRoot(context)).filter(l => l.kind === "active" || options.includeArchived);
}
export async function discoverChanges(context: WorkContext | string, options: Parameters<typeof discoverChangesSync>[1] = {}): Promise<ChangeLocation[]> { return discoverChangesSync(context, options); }
export function resolveChangeSync(context: WorkContext | string, name: string, options: { includeArchived?: boolean } = {}): ChangeLocation {
  assertChangeName(name);
  const found = allLocations(specdevRoot(context)).find(l => l.name === name);
  if (!found || (!options.includeArchived && found.kind !== "active")) fail("identity-conflict", name, "change not found in the requested locations");
  return found;
}
export async function resolveChange(context: WorkContext | string, name: string, options: Parameters<typeof resolveChangeSync>[2] = {}): Promise<ChangeLocation> { return resolveChangeSync(context, name, options); }
export function assertMarkdownProtocolSync(context: WorkContext | string, location?: ChangeLocation): void {
  const root = specdevRoot(context);
  for (const marker of [".markdown-conversion-pending", "status.json"]) {
    const path = safeWorkPathSync(root, marker, { type: "file" });
    if (exists(path)) fail(marker === "status.json" ? "unsupported-specdev-protocol" : "recovery-required", path, "current SpecDev requires Markdown authority with no unfinished data operation; preserve source bytes and inspect with the original owner");
  }
  if (location && exists(join(location.root, ".status.json"))) fail("mixed-protocol", join(location.root, ".status.json"), "unsupported JSON business authority beside the current Markdown change; preserve source bytes");
}
export function readChangeFactsSync(context: WorkContext | string, nameOrLocation: string | ChangeLocation): ChangeFacts {
  const location = resolveChangeSync(context, typeof nameOrLocation === "string" ? nameOrLocation : nameOrLocation.name, { includeArchived: true });
  if (typeof nameOrLocation !== "string" && (location.root !== nameOrLocation.root || location.kind !== nameOrLocation.kind)) fail("identity-conflict", nameOrLocation.root, "locator no longer matches actual location");
  assertMarkdownProtocolSync(context, location);
  const readmePath = safeWorkPathSync(location.root, "README.md", { mustExist: true, type: "file" });
  const parsed = parseOutcome(readUtf8ArtifactSync(readmePath), readmePath);
  if (location.kind === "archive" && parsed.outcome === "active") fail("closure-evidence-missing", readmePath, "active change cannot be in the sealed archive");
  return { location, outcome: parsed.outcome, readmePath, outcomeLine: parsed.line };
}
export async function readChangeFacts(context: WorkContext | string, target: string | ChangeLocation): Promise<ChangeFacts> { return readChangeFactsSync(context, target); }
export function readArtifactSectionSync(path: string, anchor: string): { path: string; section: string; text: string; line: number } {
  if (!/^[a-z][a-z0-9-]*$/.test(anchor)) fail("closure-evidence-missing", path, "invalid section anchor");
  const text = readUtf8ArtifactSync(path), lines = markdownBodyLines(text, path);
  const matches = lines.filter(l => l.text === `<a id="${anchor}"></a>`);
  if (matches.length !== 1) fail("closure-evidence-missing", path, `expected one explicit ${anchor} anchor`);
  const start = matches[0].line;
  const after = lines.filter(l => l.line > start);
  let end = text.split(/\r?\n/).length + 1, headingSeen = false;
  for (const l of after) {
    if (/^<a id="[a-z][a-z0-9-]*"><\/a>$/.test(l.text)) { end = l.line; break; }
    if (/^#{1,2} /.test(l.text)) { if (headingSeen) { end = l.line; break; } headingSeen = true; }
  }
  const body = text.split(/\r?\n/).slice(start, end - 1).join("\n").trim();
  if (!body.replace(/^#+ .*$/gm, "").trim()) fail("closure-evidence-missing", path, `empty ${anchor} section`, start);
  return { path, section: anchor, text: body, line: start };
}
