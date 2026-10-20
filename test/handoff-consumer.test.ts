import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import { test } from "node:test";

const packageRoot = process.cwd();
const runtime = await import(pathToFileURL(join(packageRoot, "template/lib/speculo-runtime.mjs")).href);
const hash = (value: string | Buffer) => createHash("sha256").update(value).digest("hex");
const write = (path: string, value: string) => { mkdirSync(dirname(path), { recursive: true }); writeFileSync(path, value); };
function command(root: string, ...args: string[]) {
  const r = spawnSync(args[0], args.slice(1), { cwd: root, encoding: "utf8", env: { ...process.env, GIT_OPTIONAL_LOCKS: "0" } });
  assert.equal(r.error, undefined); assert.equal(r.status, 0, r.stdout + r.stderr); return r.stdout.trim();
}
function bytes(root: string): Record<string, string> {
  const out: Record<string, string> = {};
  function visit(dir: string, prefix = "") {
    for (const item of readdirSync(dir, { withFileTypes: true })) {
      const key = prefix + item.name, path = join(dir, item.name);
      if (item.isDirectory()) { out[key + "/"] = "directory"; visit(path, key + "/"); }
      else out[key] = hash(readFileSync(path));
    }
  }
  visit(root); return out;
}

test("handoff is consumed in another process through existing readers without accepting or redispatching tasks", async t => {
  const root = mkdtempSync(join(realpathSync(tmpdir()), "speculo-handoff-consumer-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const installation = randomUUID(), source = "export const candidate = 2;\n", held = "export const ownedElsewhere = true;\n";
  const scope = ".agents/speculo/.speculo/coordination", session = "20261019T120000Z", task = scope + "/sessions/" + session + "/001-candidate-check/TASK.md";
  const report = task.replace("TASK.md", "REPORT.md"), unresolved = scope + "/sessions/" + session + "/002-existing-writer/TASK.md";
  write(join(root, "src/example.mjs"), source); write(join(root, "src/held.mjs"), held);
  command(root, "git", "init", "-b", "main"); command(root, "git", "config", "user.name", "Disposable Test"); command(root, "git", "config", "user.email", "fixture@example.invalid");
  command(root, "git", "add", "src"); command(root, "git", "commit", "-m", "fixture baseline");
  const head = command(root, "git", "rev-parse", "HEAD");
  write(join(root, runtime.WORKSPACE_PATH), JSON.stringify({ schema_version: 2, layout_version: "agents-v2", installation_id: installation, path_base: "project-root", roots: runtime.DEFAULT_ROOTS }));
  write(join(root, runtime.DEFAULT_ROOTS.config), readFileSync(join(packageRoot, "template/config.json"), "utf8"));
  const installed = join(root, runtime.DEFAULT_ROOTS.speculo);
  for (const [from, to] of [["template/commands/handoff", "commands/handoff"], ["template/lib/speculo-runtime.mjs", "lib/speculo-runtime.mjs"], ["template/references/coordination/scripts/validate-dispatch.mjs", "references/coordination/scripts/validate-dispatch.mjs"]]) {
    mkdirSync(dirname(join(installed, to)), { recursive: true }); cpSync(join(packageRoot, from), join(installed, to), { recursive: true });
  }
  const taskBody = (id: string, file: string) => `---\nschema_version: 2\nsession: ${session}\ntask: ${id}\nkind: handoff\n---\n# Task\n\n## Goal\nLead owns final acceptance; return the assigned candidate.\n\n## Inputs\nRead ${file} and the existing task scope.\n\n## Workspace and Scope\nOnly ${file} is the assigned candidate; no other writer is handed over.\n\n## Acceptance\nLead independently reads the actual bytes and runs the explicitly scoped syntax check.\n\n## Return\nDeliver only this task's REPORT.md; a completed report is a candidate.\n`;
  write(join(root, task), taskBody("001-candidate-check", "src/example.mjs"));
  write(join(root, unresolved), taskBody("002-existing-writer", "src/held.mjs"));
  const reportBody = `# Task report\n\nSession: ${session}\nTask: 001-candidate-check\nStatus: completed\n\n## 聚焦交接\nThe actual candidate is available. Lead acceptance remains pending.\n\n## 产物与验证\nCandidate source: src/example.mjs\nCandidate SHA-256: ${hash(source)}\nSyntax has not yet been checked in the receiving process.\n\n## 问题与下一步\nRun only node --check on this candidate. Another writer remains unresolved; do not redispatch it.\n`;
  write(join(root, report), reportBody);
  const handoff = join(root, scope, "handoff.md"), body = `# 当前交接\n\nA candidate is ready for an independent read-only check. Lead has not accepted the business task. Another writer remains unresolved.\n\n## 背景与目标\nContinue only the known source check; preserve the other owner.\nInstallation: ${installation}\n\n## 关键决定\nUse existing TASK/REPORT and source bytes, with no new business state.\n\n## 当前进度\nHEAD: ${head}\nTASK: ${task}\nREPORT: ${report}\nSource: src/example.mjs\nSource SHA-256: ${hash(source)}\n\n## 验证与未验证\nWorker candidate received; receiver syntax check and Lead acceptance remain pending.\n\n## 接续与未闭合动作\nUnresolved TASK: ${unresolved}\nDo not redispatch the original writer. The safe next action is node --check src/example.mjs.\n\n## 建议 skills\nNo workflow activation is needed for this independent read-only check.\n\n## 来源与更新\nRead the actual referenced task, report, owner and source before acting.\n`;
  write(handoff, body);
  const scripts = [join(packageRoot, "template/commands/handoff/examples/consume-handoff.mjs"), join(installed, "commands/handoff/examples/consume-handoff.mjs")];
  function consume(script: string, pattern?: RegExp) {
    const before = bytes(root), result = spawnSync(process.execPath, [script, "--handoff", handoff], { cwd: tmpdir(), encoding: "utf8" });
    assert.equal(result.error, undefined);
    if (pattern) { assert.equal(result.status, 1, result.stdout + result.stderr); assert.match(result.stderr, pattern); }
    else {
      assert.equal(result.status, 0, result.stdout + result.stderr); const output = JSON.parse(result.stdout);
      assert.equal(output.check.exit_code, 0); assert.equal(output.baseline_head, head); assert.equal(output.source.sha256, hash(source));
      assert.match(output.lead_acceptance, /^pending/); assert.match(output.unresolved_writer.disposition, /do not redispatch/); assert.deepEqual(output.writes, []);
    }
    assert.deepEqual(bytes(root), before); assert.equal(existsSync(join(root, unresolved.replace("TASK.md", "REPORT.md"))), false);
  }
  for (const script of scripts) await t.test("actual source and installed consumer: " + (script === scripts[0] ? "source" : "installed"), () => consume(script));
  await t.test("source drift remains untouched", () => { write(join(root, "src/example.mjs"), "export const candidate = 3;\n"); consume(scripts[1], /source drift/); write(join(root, "src/example.mjs"), source); });
  await t.test("wrong installation cannot reuse another handoff", () => { write(handoff, body.replace(installation, randomUUID())); consume(scripts[1], /another installation/); write(handoff, body); });
  await t.test("the shared return validator rejects report identity drift", () => { write(join(root, report), reportBody.replace("Task: 001-candidate-check", "Task: 002-existing-writer")); consume(scripts[1], /REPORT identity/); write(join(root, report), reportBody); });
  await t.test("source locator may not escape the project", () => {
    write(handoff, body.replace("Source: src/example.mjs", "Source: ../outside.mjs"));
    write(join(root, report), reportBody.replace("Candidate source: src/example.mjs", "Candidate source: ../outside.mjs"));
    consume(scripts[1], /path-unsafe/); write(handoff, body); write(join(root, report), reportBody);
  });
  await t.test("a changed HEAD stops resumption with the old baseline", () => { command(root, "git", "commit", "--allow-empty", "-m", "different baseline"); consume(scripts[1], /HEAD drift/); });
});
