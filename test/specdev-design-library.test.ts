import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, lstat } from "node:fs/promises";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { test } from "node:test";

const library = join(process.cwd(), "template/workflows/specdev/specdev-p-prototype/design-library");
const revision = "c7c1bada4eda972236d124e06ee58df129a9266b";
const original = ["dense-ide", "monochrome-console", "soft-personal-ai", "responsive-web", "mobile-supervisor", "cross-platform-workspace", "local-first-content", "media-first"];
const added = ["enterprise-data", "marketing-conversion", "commerce-service", "brand-editorial"];
type Template = { id: string; title: string; tasks: string[]; platforms: string[]; density: string; preview: string; guide: string; reference_ids: string[]; avoid: string[] };
type Reference = { id: string; title: string; source: string; revision: string; license: string; document: string; guide: string };
type Catalog = { schema_version: number; templates: Template[]; references: Reference[] };
const json = async (path: string) => JSON.parse(await readFile(join(library, path), "utf8"));
const sha = (data: Buffer) => createHash("sha256").update(data).digest("hex");

async function ownedFile(path: string): Promise<string> {
  assert(!isAbsolute(path) && !path.includes("\\") && !path.split("/").includes("..") && !/^[a-z]+:/i.test(path), `unsafe catalog path: ${path}`);
  const absolute = resolve(library, path);
  assert(relative(library, absolute) && !relative(library, absolute).startsWith(`..${sep}`));
  let current = library;
  for (const part of path.split("/")) {
    current = join(current, part);
    assert(!(await lstat(current)).isSymbolicLink(), `symlink in catalog resource: ${path}`);
  }
  assert((await lstat(absolute)).isFile(), `missing catalog resource: ${path}`);
  return absolute;
}

test("design catalog separates twelve task templates from ten pinned visual references", async () => {
  const catalog: Catalog = await json("catalog.json");
  assert.equal(catalog.schema_version, 1);
  assert.deepEqual(catalog.templates.map((item) => item.id), [...original, ...added]);
  assert.deepEqual(catalog.references.map((item) => item.id), ["linear", "vercel", "stripe", "airbnb", "spotify", "apple", "figma", "mintlify", "notion", "ibm"]);
  const referenceIds = new Set(catalog.references.map((item) => item.id));
  for (const template of catalog.templates) {
    assert(template.tasks.length > 0 && template.avoid.length > 0);
    assert(template.platforms.every((platform) => ["desktop", "web", "mobile"].includes(platform)));
    assert(["compact", "default", "comfortable", "touch"].includes(template.density));
    assert(template.reference_ids.every((id) => referenceIds.has(id)));
    assert.equal(new Set(template.reference_ids).size, template.reference_ids.length);
    await ownedFile(template.preview);
    await ownedFile(template.guide);
    if (original.includes(template.id)) assert(template.preview.startsWith("research-snapshot/ui-gallery/"));
    else assert.equal(template.preview, `templates/${template.id}.html`);
  }
  const gallery = await readFile(join(library, "gallery.html"), "utf8");
  assert.equal((gallery.match(/data-gallery-template=/g) ?? []).length, 12);
  for (const item of catalog.templates) {
    assert(gallery.includes(`data-gallery-template="${item.id}"`));
    assert(gallery.includes(`href="${item.preview}"`));
  }
});

test("catalog schema refuses unsupported versions and escaped resource path forms", async () => {
  const schema = await json("catalog.schema.json");
  assert.equal(schema.properties.schema_version.const, 1);
  assert.equal(schema.additionalProperties, false);
  assert.equal(schema.$defs.template.additionalProperties, false);
  const pattern = new RegExp(schema.$defs.localPath.pattern);
  for (const safe of ["templates/enterprise-data.html", "upstream/awesome-design-md/linear/DESIGN.md"]) assert(pattern.test(safe));
  for (const unsafe of ["../outside.html", "/tmp/outside.html", "templates/../../outside.html", "C:\\outside.html", "https://example.com/file.html", "templates\\outside.html"]) assert(!pattern.test(unsafe), unsafe);
  for (const field of ["preview", "guide", "reference_ids", "tasks", "platforms", "avoid"]) assert(schema.$defs.template.required.includes(field));
  for (const field of ["source", "revision", "license", "document", "guide"]) assert(schema.$defs.reference.required.includes(field));
});

test("all imported design text and its license match immutable provenance", async () => {
  const catalog: Catalog = await json("catalog.json");
  const provenance = await json("upstream/awesome-design-md/provenance.json");
  assert.equal(provenance.revision, revision);
  assert.equal(provenance.documents.length, 10);
  for (const reference of catalog.references) {
    assert.equal(reference.revision, revision);
    assert.equal(reference.license, "MIT");
    assert(reference.source.includes(`/blob/${revision}/design-md/`));
    const source = provenance.documents.find((item: { id: string }) => item.id === reference.id);
    assert(source, reference.id);
    assert.equal(source.path, reference.document);
    const bytes = await readFile(await ownedFile(reference.document));
    assert.equal(sha(bytes), source.sha256, reference.id);
    assert.equal(bytes.length, source.bytes, reference.id);
    assert(!/<script\b|@import\b|^```(?:js|javascript|sh|bash)/mi.test(bytes.toString("utf8")), reference.id);
    const guide = await readFile(await ownedFile(reference.guide), "utf8");
    assert(guide.includes("证据限制") && guide.includes("项目适配"), reference.id);
  }
  const license = await readFile(await ownedFile(provenance.license.path));
  assert.equal(sha(license), provenance.license.sha256);
  assert.match(license.toString("utf8"), /Copyright \(c\) 2026 VoltAgent/);
});

test("all twelve HTML entrypoints have a complete local resource closure", async () => {
  const catalog: Catalog = await json("catalog.json");
  const visited = new Set<string>();
  const visit = async (path: string): Promise<void> => {
    const absolute = resolve(library, path);
    if (visited.has(absolute)) return;
    visited.add(absolute);
    const rel = relative(library, absolute);
    assert(rel && !rel.startsWith(`..${sep}`), `resource escapes library: ${path}`);
    const source = await readFile(await ownedFile(rel.split('\\').join('/')), "utf8");
    if (!/\.(html|css)$/.test(path)) return;
    const resources = path.endsWith(".html")
      ? [...source.matchAll(/<(?:script|img|link)\b[^>]*\b(?:src|href)=["']([^"']+)["']/gi)].map((match) => match[1])
      : [...source.matchAll(/url\(\s*["']?([^)'"\s]+)["']?\s*\)/gi)].map((match) => match[1]);
    for (const resource of resources) {
      assert(!/^(?:https?:|\/\/)/i.test(resource), `remote resource: ${path} -> ${resource}`);
      if (/^(?:data:|#)/.test(resource)) continue;
      const next = relative(library, resolve(dirname(absolute), resource.split(/[?#]/)[0])).split('\\').join('/');
      if (/\.(?:html|css|js)$/.test(next)) await visit(next);
      else await ownedFile(next);
    }
  };
  await visit("gallery.html");
  for (const template of catalog.templates) await visit(template.preview);
});

test("new task previews provide honest local state and accessible interaction controls", async () => {
  const script = await readFile(join(library, "templates/assets/prototypes.js"), "utf8");
  assert(!/\b(?:fetch|XMLHttpRequest|WebSocket|sendBeacon)\s*\(/.test(script));
  assert(!/localStorage|sessionStorage/.test(script));
  for (const id of added) {
    const html = await readFile(join(library, `templates/${id}.html`), "utf8");
    assert(html.includes(`data-template="${id}"`));
    assert(html.includes('aria-live="polite"'));
    assert(html.includes('href="../gallery.html"'));
    assert(!/\b(?:onclick|onchange)=/i.test(html));
    assert.match(html, /fictional|Fictional|sample|Sample/);
  }
  assert(script.includes("indeterminate"), "table selection must represent mixed selection");
  assert(script.includes("Your selection is preserved"), "failed operation must preserve recoverable input");
  assert(script.includes("dialogTrigger?.focus()"), "dialog close returns focus");
  const css = await readFile(join(library, "templates/assets/prototypes.css"), "utf8");
  assert(css.includes(":focus-visible") && css.includes("prefers-reduced-motion"));
});
