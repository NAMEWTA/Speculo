import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";
import { describe, it } from "node:test";
const load = (): Promise<any> => import(pathToFileURL(join(process.cwd(), "scripts/lib/workflow-document-graph.mjs")).href);

describe("work upgrade: potential reference graph and actual read accounting", () => {
  it("finds all 31 Work entries without reading evidence corpora as instructions", async () => {
    const { buildDocumentGraph, graphReport } = await load();
    const graph = await buildDocumentGraph(process.cwd());
    assert.deepEqual(graph.errors, []); assert.equal(graph.entries.length, 31);
    assert.equal(new Set(graph.entries.map((entry: any) => entry.id)).size, 31);
    const report = graphReport(graph, ["template/workflows/specdev/S-spec/S-spec.md"]);
    assert.ok(report.impact.generators.includes("scripts/generate-specdev-canonical.mjs"));
    assert.match(report.caveat, /not deletion authorization/);
    for (const node of graph.files.values()) if (node.role === "evidence") assert.equal(node.content, undefined);
  });
  it("distinguishes dynamic/runtime pointers, examples, conditionals and escaping references", async () => {
    const { extractDocumentReferences } = await load();
    const source = "template/workflows/specdev/S-spec/S-spec.md";
    const refs = extractDocumentReferences('## 分支\n| 写 Spec 时 | <Path>{roots.workflows}/specdev/S-spec/spec-template.md</Path> |\n<Path>{roots.state}/specdev/changes/{change}/spec.md</Path>\n`[example](not-a-file.md)`\n<Path>{roots.workflows}/../outside.md</Path>\n| | <Path>{roots.workflows}/specdev/README.md</Path> |\n', source);
    assert.equal(refs.length, 4);
    assert.equal(refs[0].kind, "conditional"); assert.equal(refs[0].condition, "写 Spec 时");
    assert.equal(refs[1].role, "runtime"); assert.match(refs[2].error, /escaping/); assert.match(refs[3].error, /no trigger/);
  });
  it("reports missing targets, navigation cycles and reverse callers, not automatic deletion", async () => {
    const { buildDocumentGraph, affectedCallers } = await load();
    const root = await mkdtemp(join(tmpdir(), "speculo-graph-"));
    try {
      const dir = join(root, "template/workflows/example/A-alpha"); await mkdir(dir, { recursive: true });
      await writeFile(join(root, "template/workflows/example/README.md"), "- **A-alpha** — 仅请求 alpha 时使用\n");
      await writeFile(join(dir, "A-alpha.md"), "---\nid: example/alpha\n---\n读取 [branch](branch.md)\n");
      await writeFile(join(dir, "branch.md"), "返回 [entry](A-alpha.md)\n读取 [missing](missing.md)\n");
      const graph = await buildDocumentGraph(root);
      assert.ok(graph.errors.some((error: string) => error.includes("missing.md")));
      assert.ok(graph.cycles.some((cycle: string[]) => cycle.length === 2));
      const callers = affectedCallers(graph, ["template/workflows/example/A-alpha/branch.md"]).callers;
      assert.ok(callers.includes("template/workflows/example/A-alpha/A-alpha.md"));
      assert.ok(callers.includes("template/workflows/example/README.md"));
    } finally { await rm(root, { recursive: true, force: true }); }
  });
  it("counts overlapping read ranges once and separates first-load phases", async () => {
    const { measureReadTrace } = await load();
    const file = { content: "one\n第二行\nthree\n", sha256: "source" };
    const graph = { files: new Map([["entry.md", file]]) };
    const trace = [
      { kind: "context", payload: { path: "entry.md", phase: "discovery", start_line: 1, end_line: 1 } },
      { kind: "context", payload: { path: "entry.md", phase: "activation", start_line: 1, end_line: 2 } },
      { kind: "tool", payload: { action: "effective" } },
      { kind: "context", payload: { path: "entry.md", phase: "branch", start_line: 2, end_line: 3 } },
    ];
    const result = measureReadTrace(graph, trace, { required: ["entry.md"] });
    assert.deepEqual(result.errors, []); assert.equal(result.bytes, Buffer.byteLength(file.content));
    assert.equal(result.characters, [...file.content].length); assert.equal(result.unique_files, 1);
    assert.equal(result.phases.activation.bytes, Buffer.byteLength("第二行\n"));
    assert.equal(result.before_first_effective_action.bytes, Buffer.byteLength("one\n第二行\n"));
    assert.equal(result.phases.branch.bytes, Buffer.byteLength("three\n"));
    assert.match(result.source, /not host-authenticated/);
  });
  it("rejects missing required reads, forbidden branches, drift and invalid ranges", async () => {
    const { measureReadTrace } = await load();
    const graph = { files: new Map([["entry.md", { content: "one\ntwo\n", sha256: "original" }]]) };
    const trace = [
      { kind: "context", payload: { path: "private/credentials.json" } },
      { kind: "context", payload: { path: "entry.md", sha256: "changed" } },
      { kind: "context", payload: { path: "entry.md", start_line: 0 } },
    ];
    const result = measureReadTrace(graph, trace, { required: ["entry.md"], forbidden: ["private"] });
    for (const expected of ["forbidden read", "source drift", "invalid read range", "required read missing"]) assert.ok(result.errors.some((error: string) => error.includes(expected)));
    assert.equal(result.bytes, 0); assert.deepEqual(result.unclassified_reads, ["private/credentials.json"]);
  });
  it("rejects aliased read paths and reports malformed encoded links", async () => {
    const { measureReadTrace, extractDocumentReferences } = await load();
    for (const path of ["docs/../private/key", "private//key", "private\\key", "./private/key", "/private/key"]) {
      const result = measureReadTrace({ files: new Map() }, [{ kind: "context", payload: { path } }], { forbidden: ["private"] });
      assert.match(result.errors.join("\n"), /canonical repository-relative/);
      assert.equal(result.bytes, 0);
    }
    assert.match(extractDocumentReferences("[broken](%ZZ.md)", "docs/entry.md")[0].error, /malformed encoded reference/);
  });
  it("does not infer a read or effective action from an empty trace", async () => {
    const { measureReadTrace } = await load();
    const result = measureReadTrace({ files: new Map() }, []);
    assert.equal(result.unique_files, 0); assert.equal(result.before_first_effective_action, null);
  });
});
