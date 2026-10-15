import assert from "node:assert/strict";
import { test, type TestContext } from "node:test";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { readChangeFactsSync, resolveWorkContextSync } from "../src/specdev-artifacts.js";

const methodRoot = resolve("template");
const validator = join(methodRoot, "workflows/specdev/common/tools/validate-specdev.mjs");
const { validateChange } = await import(pathToFileURL(validator).href);
const change = "2026-10-15-learn-cache";

// These fixtures exercise artifact contracts and read-only validation, not host/model behavior.
function readme(outcome = "active", verified = false) {
  return `# Understand a cache
Outcome: ${outcome}

<a id="scope"></a>
## Scope
Explain cache lookup and misses from the selected source. Deliver learning materials only.
<a id="acceptance"></a>
## Acceptance
- [${verified ? "x" : " "}] AC-1: deliver a sourced flow diagram and a consistent index.
<a id="verification"></a>
## Verification
${verified ? "| AC | Result | Evidence |\n| --- | --- | --- |\n| AC-1 | passed | #observed-learning |" : "Learning materials have not been checked yet."}
${verified ? `<a id="observed-learning"></a>
## Observed learning artifacts
Method: read the fixture lesson and run the learn artifact validator
Source: learning/01_cache.md
Observed: four sections, an ASCII flow and the matching index entry are present; learn validation returned no errors
Result: passed
` : ""}
## Ownership
Owner: fixture-session
Work: specdev/learn
Evidence: #original-request
<a id="original-request"></a>
## Original fixture request
Session: fixture-session
Work: specdev/learn
Source: simulated learning request in a disposable fixture
Observed: this session owns delivery of the learning materials
## Next Steps
Return the lesson and index; implementation needs a separate request.
`;
}

function lesson(source = "../../../../../reference.md") {
  return `# 缓存如何工作

## 先看全图

\`\`\`text
[请求] -> [查找临时便签] -> [结果]
                |
                +-- [未找到] -> [读取原数据]
\`\`\`

## 一步一步看

来源：[本轮参考](${source})。先查找保存的结果；未找到时读取原数据。
这是对来源的静态讲解，没有声称运行过外部项目。是否适合本项目仍需另行决定。

## 术语小词典

- 临时便签（缓存）：把可能再次使用的结果放在手边。

## 你现在能复述什么

缓存保存可复用结果，减少重复读取；没有找到时仍需读取原数据。
`;
}

function fixture(t: TestContext) {
  const repo = realpathSync(mkdtempSync(join(tmpdir(), "specdev-learn-")));
  t.after(() => rmSync(repo, { recursive: true, force: true }));
  const root = join(repo, "data/specdev/changes", change);
  mkdirSync(root, { recursive: true });
  writeFileSync(join(repo, "reference.md"), "Cache reads check the saved value first; a miss reads the original data.\n");
  const file = join(root, "README.md");
  writeFileSync(file, readme());
  const learning = join(root, "learning");
  const index = join(learning, "index.md");
  const validate = (stage = "learn", target = root) => validateChange(target, stage, repo, null, null, { methodRoot, stateRoot: "data" });
  const saveIndex = (count = 1, title = "学习图解索引") => {
    writeFileSync(index, `# ${title}\n\n| 编号 | 文件 | 主题 | 简介 |\n| --- | --- | --- | --- |\n` +
      Array.from({ length: count }, (_, i) => {
        const number = String(i + 1).padStart(2, "0");
        return `| ${number} | ${number}_cache.md | 缓存 | 解释查找与未找到时的路径。 |\n`;
      }).join(""));
  };
  const saveLesson = (number = 1, source?: string) => {
    mkdirSync(learning, { recursive: true });
    writeFileSync(join(learning, `${String(number).padStart(2, "0")}_cache.md`), lesson(source), { flag: "wx" });
  };
  const deliver = () => {
    assert.deepEqual(validate().errors, []);
    writeFileSync(file, readme("completed", true));
    assert.deepEqual(validate("complete").errors, []);
  };
  return { repo, root, file, learning, index, validate, saveIndex, saveLesson, deliver };
}

test("learn is independently routed and accepts new learning changes without installation or implementation artifacts", t => {
  const manifest = JSON.parse(readFileSync(join(methodRoot, "workflows/specdev/manifest.json"), "utf8"));
  const stage = manifest.stages.find((entry: { id: string }) => entry.id === "learn");
  assert.deepEqual(stage.after, []);
  assert.deepEqual(stage.inputs, ["learning-request"]);
  assert.ok(manifest.works.includes("specdev-l-learn/SKILL.md"));
  const f = fixture(t);
  assert.match(f.validate().errors.join("\n"), /learn stage requires learning\/index\.md/);
  f.saveLesson(); f.saveIndex(); f.deliver();
  assert.deepEqual(readdirSync(f.root).sort(), ["README.md", "learning"]);
  assert.deepEqual(readdirSync(join(f.repo, "data/specdev")), ["changes"]);
  const before = readFileSync(f.file);
  const cli = spawnSync(process.execPath, [validator, "--stage", "learn", "--repo", f.repo, "--method-root", methodRoot, "--state-root", "data", f.root], { encoding: "utf8" });
  assert.equal(cli.status, 0, cli.stdout + cli.stderr);
  assert.deepEqual(readFileSync(f.file), before);
});

test("completed learning changes accept follow-up diagrams without changing previous lessons or Outcome", t => {
  const f = fixture(t); f.saveLesson(); f.saveIndex(); f.deliver();
  const before = readFileSync(f.file), original = readFileSync(join(f.learning, "01_cache.md"));
  f.saveLesson(2); f.saveIndex(2);
  assert.deepEqual(f.validate().errors, []);
  assert.deepEqual(f.validate("complete").errors, []);
  assert.deepEqual(readFileSync(f.file), before);
  assert.deepEqual(readFileSync(join(f.learning, "01_cache.md")), original);
});

test("learning on a development change neither completes it nor bypasses its implementation gate", t => {
  const f = fixture(t);
  const original = "# Implement a cache\nOutcome: active\n\n## Ownership\nOwner: implementation-owner\nEvidence: owner.md\n";
  writeFileSync(f.file, original);
  writeFileSync(join(f.root, "owner.md"), "Owner: implementation-owner\nSource: simulated implementation request\n");
  const spec = `---
schema_version: 3
artifact: spec
change: ${change}
status: ready
ready_for_tickets: true
sources: [USER-DECISION:fixture]
---
# Cache implementation
## 1. 问题与目标
Implement cache invalidation.
## 2. 解决方案与外部行为
Expired values must be refetched.
## 4. 验收合同
AC-001: expired values are never returned.
## 5. 范围
The project cache implementation.
## 9. 验证策略
Run invalidation tests.
### 未决问题
无。
`;
  writeFileSync(join(f.root, "spec.md"), spec);
  f.saveLesson(); f.saveIndex();
  assert.deepEqual(f.validate().errors, []);
  assert.equal(readFileSync(f.file, "utf8"), original);
  assert.equal(readFileSync(join(f.root, "spec.md"), "utf8"), spec);
  writeFileSync(f.file, original.replace("Outcome: active", "Outcome: completed"));
  assert.match(f.validate("complete").errors.join("\n"), /direct-spec/);
});

test("historical learning index titles remain readable and are not rewritten on validation", t => {
  const f = fixture(t); f.saveLesson(); f.saveIndex(1, "Change 学习图解索引");
  const before = readFileSync(f.index);
  assert.deepEqual(f.validate().errors, []);
  assert.deepEqual(readFileSync(f.index), before);
  f.saveLesson(2); f.saveIndex(2, "Change 学习图解索引");
  assert.deepEqual(f.validate().errors, []);
});

test("a lesson written before a failed index update is rejected until its original row is restored", t => {
  const f = fixture(t); f.saveLesson(); f.saveIndex();
  f.saveLesson(2);
  const first = readFileSync(join(f.learning, "01_cache.md")), second = readFileSync(join(f.learning, "02_cache.md"));
  assert.match(f.validate().errors.join("\n"), /missing entry for '02_cache\.md'/);
  assert.equal(readFileSync(f.file, "utf8"), readme());
  f.saveIndex(2);
  assert.deepEqual(f.validate().errors, []);
  assert.deepEqual(readFileSync(join(f.learning, "01_cache.md")), first);
  assert.deepEqual(readFileSync(join(f.learning, "02_cache.md")), second);
  assert.deepEqual(readdirSync(f.learning).sort(), ["01_cache.md", "02_cache.md", "index.md"]);
});

test("duplicate numbers, missing files, gaps and invalid lesson formats block delivery without rewriting evidence", t => {
  const f = fixture(t); f.saveLesson(); f.saveIndex();
  writeFileSync(join(f.learning, "01_other.md"), lesson());
  assert.match(f.validate().errors.join("\n"), /duplicate diagram number 1/);
  rmSync(join(f.learning, "01_other.md"));
  f.saveIndex(2);
  assert.match(f.validate().errors.join("\n"), /'02_cache\.md' does not exist/);
  f.saveLesson(3); f.saveIndex(3);
  assert.match(f.validate().errors.join("\n"), /'02_cache\.md' does not exist/);
  const gap = readFileSync(f.index, "utf8").replace(/^\| 02 .*\n/m, "");
  writeFileSync(f.index, gap);
  assert.match(f.validate().errors.join("\n"), /continuous/);
  rmSync(join(f.learning, "03_cache.md")); f.saveIndex();
  for (const invalid of [lesson().replace("## 术语小词典", "## 其他"), lesson() + "\n![external image](https://example.invalid/image.png)\n", lesson().replace(/```text[\s\S]*?```/, "No diagram")]) {
    writeFileSync(join(f.learning, "01_cache.md"), invalid);
    assert.notEqual(f.validate().errors.length, 0);
    assert.equal(readFileSync(join(f.learning, "01_cache.md"), "utf8"), invalid);
  }
  assert.equal(readFileSync(f.file, "utf8"), readme());
});

test("lesson numbering continues beyond 99 and linked artifacts are rejected", t => {
  const f = fixture(t);
  for (let number = 1; number <= 101; number++) f.saveLesson(number);
  f.saveIndex(101);
  assert.deepEqual(f.validate().errors, []);
  rmSync(join(f.learning, "101_cache.md"));
  symlinkSync(join(f.repo, "reference.md"), join(f.learning, "101_cache.md"));
  assert.match(f.validate().errors.join("\n"), /path-unsafe|symlink/);
});

test("archived sources can be read for a new learning change while the source remains byte-for-byte unchanged", t => {
  const f = fixture(t), sourceName = "2026-10-14-source";
  const archived = join(f.repo, "data/specdev/changes/archive", sourceName);
  mkdirSync(archived, { recursive: true });
  const original = "# Historical source\nOutcome: completed\n\nFrozen implementation explanation.\n";
  writeFileSync(join(archived, "README.md"), original);
  const context = resolveWorkContextSync({ projectRoot: f.repo, methodRoot, stateRoot: "data" });
  assert.equal(readChangeFactsSync(context, sourceName).location.kind, "archive");
  f.saveLesson(1, `../../archive/${sourceName}/README.md`); f.saveIndex(); f.deliver();
  assert.equal(readFileSync(join(archived, "README.md"), "utf8"), original);
  assert.deepEqual(readdirSync(archived), ["README.md"]);
});

test("a completed label alone cannot complete a learning change without original owner and actual verification", t => {
  const f = fixture(t); f.saveLesson(); f.saveIndex();
  writeFileSync(f.file, readme("completed"));
  assert.match(f.validate("complete").errors.join("\n"), /verification|unchecked/);
  writeFileSync(f.file, readme("completed", true).replace("Session: fixture-session", "Session: someone-else"));
  assert.match(f.validate("complete").errors.join("\n"), /owner-unresolved/);
});
