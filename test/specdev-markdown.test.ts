import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, symlinkSync, rmSync, renameSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { assertChangeName, parseOutcome, resolveWorkContextSync, safeWorkPathSync, discoverChangesSync, readChangeFactsSync, readArtifactSectionSync } from "../src/specdev-artifacts.js";
import { DEFAULT_ROOTS, WORKSPACE_PATH } from "../src/paths.js";

function fixture(t: { after(fn: () => void): void }) {
  const root = realpathSync(mkdtempSync(join(tmpdir(), "specdev-markdown-"))); t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, "methods")); mkdirSync(join(root, "data/specdev/changes"), { recursive: true });
  return { root, context: resolveWorkContextSync({ projectRoot: root, methodRoot: "methods", stateRoot: "data" }) };
}
test("direct context is read-only, explicit, supports missing data leaves and an external method package", t => {
  const { root, context } = fixture(t), before = readdirSync(root);
  assert.equal(context.installation, "absent"); assert.equal(context.specdevRoot, join(root, "data/specdev"));
  const absent = resolveWorkContextSync({ projectRoot: root, methodRoot: "methods", stateRoot: "fresh/data" });
  assert.equal(absent.stateRoot, join(root, "fresh/data")); assert.deepEqual(readdirSync(root), before);
  assert.throws(() => resolveWorkContextSync({ projectRoot: root }), /root-ambiguous/);
  assert.throws(() => resolveWorkContextSync({ projectRoot: root, methodRoot: "methods", stateRoot: "../escape" }), /path-unsafe/);
  const other = fixture(t);
  assert.equal(resolveWorkContextSync({ projectRoot: root, methodRoot: other.context.methodRoot, stateRoot: "data" }).methodRoot, other.context.methodRoot);
});
test("installed context preserves workspace identity and rejects nested or conflicting project roots", t => {
  const { root } = fixture(t); mkdirSync(join(root, ".agents/speculo/.speculo"), { recursive: true });
  writeFileSync(join(root, WORKSPACE_PATH), JSON.stringify({ schema_version: 2, layout_version: "agents-v2", path_base: "project-root", installation_id: "01234567-1234-1234-1234-0123456789ab", roots: DEFAULT_ROOTS }));
  assert.equal(resolveWorkContextSync({ projectRoot: root }).installation, "present");
  assert.throws(() => resolveWorkContextSync({ projectRoot: root, stateRoot: "data" }), /root-ambiguous/);
  assert.throws(() => resolveWorkContextSync({ projectRoot: join(root, "methods"), methodRoot: ".", stateRoot: "data" }), /root-ambiguous/);
  writeFileSync(join(root, ".agents/.speculo-install.lock"), "pending");
  assert.throws(() => resolveWorkContextSync({ projectRoot: root }), /recovery-required/);
});
test("safe paths reject linked parents, wrong case, non-directories and traversal", t => {
  const { root } = fixture(t); symlinkSync("data", join(root, "linked")); writeFileSync(join(root, "plain"), "x"); mkdirSync(join(root, "Mixed"));
  for (const path of ["linked/new/file", "plain/file", "mixed/file", "../escape", "a/../b", "data//child", "data\\child"]) assert.throws(() => safeWorkPathSync(root, path), /path-unsafe/, path);
  assert.equal(safeWorkPathSync(root, "data/missing/file"), join(root, "data/missing/file"));
});
test("Outcome excludes fenced, quoted, commented and indented examples with CRLF support", () => {
  const text = ["# Task", "~~~md", "Outcome: cancelled", "~~~", "```", "Outcome: completed", "```", "> Outcome: completed", "    Outcome: completed", "<!--", "Outcome: cancelled", "-->", "Outcome: active  "].join("\r\n");
  assert.deepEqual(parseOutcome(text), { outcome: "active", line: 13 });
});
test("Outcome rejects ambiguity, invalid declarations, comments and incomplete blocks with diagnostics", () => {
  for (const text of ["", "Outcome: completed\nOutcome: completed", "Outcome: completed\nOutcome: archived", "outcome: active", "Outcome: active # ok", " Outcome: completed", "- Outcome: completed", "Outcome: active\n```", "Outcome: active\n<!--", "Outcome: active <!-- comment -->", "Outcome: complete", "---\nOutcome: completed\n---", "---\nstatus: completed\n---\nOutcome: completed"]) assert.throws(() => parseOutcome(text, "case/README.md"), /outcome-invalid: case\/README.md/);
});
test("names enforce real dates and stable lowercase identity", () => {
  for (const n of ["2024-02-29-valid", "2000-02-29-valid", "2026-10-14-topic-02"]) assert.doesNotThrow(() => assertChangeName(n));
  for (const n of ["2026-02-29-invalid", "1900-02-29-invalid", "2026-13-01-invalid", "2026-04-31-invalid", "0000-01-01-invalid", "2026-10-14-Upper", "2026-10-14-a_b"]) assert.throws(() => assertChangeName(n), /identity-conflict/);
});
test("discovery follows current locations, rejects stale locators and detects duplicate identity", t => {
  const { context } = fixture(t), name = "2026-10-14-one", active = join(context.specdevRoot, "changes", name);
  mkdirSync(active); writeFileSync(join(active, "README.md"), "# One\nOutcome: completed\n");
  const original = readChangeFactsSync(context, name);
  assert.equal(original.outcome, "completed");
  mkdirSync(join(context.specdevRoot, "changes/archive")); renameSync(active, join(context.specdevRoot, "changes/archive", name));
  assert.equal(discoverChangesSync(context).length, 0); assert.equal(readChangeFactsSync(context, name).location.kind, "archive");
  assert.throws(() => readChangeFactsSync(context, original.location), /locator no longer matches/);
  assert.deepEqual(discoverChangesSync(context, { includeArchived: true }).map(location => [location.name, location.kind]), [[name, "archive"]]);
  mkdirSync(active); writeFileSync(join(active, "README.md"), "Outcome: active\n");
  assert.throws(() => discoverChangesSync(context), /duplicate identity/);
});
test("historical files outside current locations cannot become discovered or readable changes", t => {
  const { context } = fixture(t);
  const oldName = "2025-01-01-history", old = join(context.specdevRoot, "archive/2025-01", oldName); mkdirSync(old, { recursive: true });
  const bytes = '{"historical":"opaque source bytes"}\r\n'; writeFileSync(join(old, ".status.json"), bytes);
  assert.deepEqual(discoverChangesSync(context, { includeArchived: true }), []);
  assert.throws(() => readChangeFactsSync(context, oldName), /identity-conflict/);
  assert.equal(readFileSync(join(old, ".status.json"), "utf8"), bytes);
});
test("unsupported authority, pending operations, invalid UTF-8 and active archives cannot appear valid", t => {
  const { context } = fixture(t), name = "2026-10-14-one", active = join(context.specdevRoot, "changes", name);
  mkdirSync(active); writeFileSync(join(active, "README.md"), "Outcome: active\n"); writeFileSync(join(active, ".status.json"), "{}");
  assert.throws(() => readChangeFactsSync(context, name), /mixed-protocol/); rmSync(join(active, ".status.json"));
  for (const [marker, diagnostic] of [["status.json", /unsupported-specdev-protocol/], [".markdown-conversion-pending", /recovery-required/]] as const) {
    writeFileSync(join(context.specdevRoot, marker), "{}");
    assert.throws(() => readChangeFactsSync(context, name), diagnostic);
    assert.equal(readFileSync(join(context.specdevRoot, marker), "utf8"), "{}");
    rmSync(join(context.specdevRoot, marker));
  }
  writeFileSync(join(active, "README.md"), Buffer.from([0xff])); assert.throws(() => readChangeFactsSync(context, name), /UTF-8/);
  writeFileSync(join(active, "README.md"), "Outcome: active\n"); mkdirSync(join(context.specdevRoot, "changes/archive")); renameSync(active, join(context.specdevRoot, "changes/archive", name));
  assert.throws(() => readChangeFactsSync(context, name), /active change/);
});
test("lightweight sections require unique visible anchors and nonempty content", t => {
  const { root } = fixture(t), file = join(root, "README.md");
  writeFileSync(file, '# Task\nOutcome: active\n<a id="scope"></a>\n## Scope\nOne behavior.\n<a id="acceptance"></a>\n## Acceptance\n- [ ] AC-1 verifies it.\n<a id="verification"></a>\n## Evidence\nTests pending.\n');
  assert.equal(readArtifactSectionSync(file, "scope").text, "## Scope\nOne behavior.");
  assert.throws(() => readArtifactSectionSync(file, "missing"), /closure-evidence-missing/);
  writeFileSync(file, '<a id="scope"></a>\n## Scope\n'); assert.throws(() => readArtifactSectionSync(file, "scope"), /empty scope/);
});
