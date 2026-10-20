import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { lstat, mkdir, mkdtemp, readFile, readlink, rm, symlink, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { hostname, tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";

const base = join(process.cwd(), "template/workflows/person/person-m-mao-zedong-cognitive-os");
const tool = join(base, "scripts/consultation-state.mjs");
const { validateConsultationState } = await import(pathToFileURL(tool).href);
const stamp = "2026-10-18T00:00:00.000Z";
const phases = ["activating", "diagnosing", "strategizing", "mobilizing", "delivering", "completed"];
const artifacts = ["problem-statement.md", "analysis.md", "strategy.md", "action-plan.md", "consultation-output.md"];
const hash = (value: string) => createHash("sha256").update(value).digest("hex");
const json = (value: unknown) => JSON.stringify(value, null, 2) + "\n";
const readJson = async (path: string) => JSON.parse(await readFile(path, "utf8"));
const declaration = /^> "(.+)"$/m.exec(await readFile(join(base, "references/activate.md"), "utf8"))![1];
const quote = "一切真知都是从直接经验发源的。";

async function fixture(t: { after: (fn: () => Promise<unknown>) => void }) {
  const root = await mkdtemp(join(tmpdir(), "speculo-person-consultation-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const steelman = { change: "2026-10-19-steelman", work_id: "person/steelman-deliberation", phase: "awaiting-answer", updated_at: stamp, unknown: { frozen: true } };
  await writeFile(join(root, "status.json"), json({ schema_version: 1, workflow: "person", active: [steelman], unknown: { preserved: "top-level" } }));
  await mkdir(join(root, "changes", steelman.change), { recursive: true });
  await writeFile(join(root, "changes", steelman.change, "steelman-dossier.md"), "用户回答前冻结的 dossier。\n");
  const create = async (suffix: string) => {
    const change = "2026-10-19-" + suffix, changeRoot = join(root, "changes", change);
    await mkdir(changeRoot, { recursive: true });
    const state = await readJson(join(base, "assets/templates/consultation-status-template.json"));
    Object.assign(state, { change, created_at: stamp, updated_at: stamp });
    const candidate = join(changeRoot, "state.candidate.json");
    const save = () => writeFile(candidate, json(state));
    const run = (args: string[] = []) => {
      const result = spawnSync(process.execPath, [tool, "--state-root", root, "--change", change, "--candidate", candidate, ...args], { encoding: "utf8" });
      assert.ifError(result.error);
      return result;
    };
    const publish = async () => {
      await save();
      const preview = run();
      assert.equal(preview.status, 0, preview.stderr);
      const result = run(["--publish", "--expect-digest", JSON.parse(preview.stdout).candidate_sha256]);
      assert.equal(result.status, 0, result.stderr);
      return result;
    };
    return { root, change, changeRoot, state, candidate, save, run, publish };
  };
  return { root, steelman, create };
}
type Consultation = Awaited<ReturnType<Awaited<ReturnType<typeof fixture>>["create"]>>;

async function phaseArtifact(f: Consultation, index: number) {
  const questions = [{ question: "谁是你的朋友？", answer: "合作团队是支持者。" }, { question: "主要困难是什么？", answer: "当前关键资源不足。" }];
  const bodies = [
    "# 问题陈述\n\n" + ["背景", "敌我友格局", "主要矛盾", "强弱对比"].map((heading) => "## " + heading + "\n本例具体的情境与证据。\n").join("\n") + "\n## 问题类型\n决策方法\n\n## 主框架\nA3 调查研究 + A2 实践检验 (006/016)\n\n## 首次声明与原始问答\n" + declaration + "\n" + questions.map((item) => item.question + "\n" + item.answer).join("\n"),
    "# 诊断分析\n\n## 应用的模型\nA1 和 A2；条件与局限已分项说明。\n\n## A1 · 矛盾分析\n主要矛盾取决于当前条件，局限是信息范围。\n\n## A2 · 实践检验\n诊断结论有可验证条件与局限。\n\n## 综合定性\n主要矛盾有明确证据和转化条件。\n",
    "# 战略方案\n\n## 战略判断\n定性、定向、站位、时间、投放、运用逐步展开。\n\n## 主框架\n阶段一与阶段二；关键战役有依据，风险和底线明确。\n\n## 战略箴言\n“" + quote + "”《实践论》(016)\n",
    "# 行动方案\n\n## 组织方法\nC1、C5。\n\n## 阶段一\n任务、执行者与骨干、方法、检验、期限、完成条件、失败处置、反馈。\n\n## 阶段二\n具体行动。\n\n## 行动纪律\n1、2、3。\n\n## 底线\n出现明确停止条件时回到相应阶段。\n",
    "# 咨询输出\n\n## 答复\n本测试只验证状态和工件关联，不代替原方法的语义评估。\n\n## 内在张力\n本次保留判断边界。\n\n## 引用索引\n《实践论》(016)，“" + quote + "”。\n",
  ];
  const body = bodies[index];
  await writeFile(join(f.changeRoot, artifacts[index]), body);
  f.state.phase_evidence[phases[index]] = { artifact: artifacts[index], sha256: hash(body) };
  if (index === 0) {
    f.state.problem_type = "决策方法";
    f.state.primary_framework = "A3 调查研究 + A2 实践检验 (006/016)";
    f.state.activation = { statement_delivered: true, statement_evidence: declaration, opening_questions: questions };
  }
  if (index === 1) f.state.models_applied = ["A1", "A2"];
  if (index === 2) {
    f.state.strategy_stages = 2;
    f.state.quotes_cited = [{ kind: "direct", text: quote, article_id: "016", source: "books/src/016-实践论.md", artifact: "strategy.md" }];
  }
  if (index === 3) { f.state.methods_applied = ["C1", "C5"]; f.state.action_disciplines = ["1", "2", "3"]; }
  if (index === 4) for (const key of Object.keys(f.state.delivery_checks)) f.state.delivery_checks[key] = true;
  f.state.phase = phases[index + 1];
  if (index === 4) { f.state.status = "completed"; f.state.completed_at = stamp; }
}

test("Person publishes isolated consultation state and preserves other Changes/Steelman fields", async (t) => {
  const f = await fixture(t), one = await f.create("consultation-one"), two = await f.create("consultation-two");
  one.state.problem_type = "决策方法"; two.state.problem_type = "团队/组织问题";
  await one.publish(); await two.publish();
  const global = await readJson(join(f.root, "status.json"));
  assert.deepEqual(global.unknown, { preserved: "top-level" });
  assert.deepEqual(global.active[0], f.steelman);
  assert.equal(global.active.length, 3);
  assert.equal("problem_type" in global, false);
  assert.equal((await readJson(join(one.changeRoot, ".status.json"))).problem_type, "决策方法");
  assert.equal((await readJson(join(two.changeRoot, ".status.json"))).problem_type, "团队/组织问题");
  assert.equal(await readFile(join(f.root, "changes", f.steelman.change, "steelman-dossier.md"), "utf8"), "用户回答前冻结的 dossier。\n");
});

test("Person phase publication enforces original question gate, artifact hashes and ordered stages", async (t) => {
  const f = await fixture(t), one = await f.create("ordered");
  await one.publish(); await phaseArtifact(one, 0);
  const oldState = await readFile(join(one.changeRoot, ".status.json"), "utf8"), oldIndex = await readFile(join(f.root, "status.json"), "utf8");
  one.state.activation.opening_questions.pop();
  await one.save();
  assert.match(one.run().stderr, /at least two/);
  await phaseArtifact(one, 0);
  await one.save();
  await writeFile(join(one.changeRoot, "problem-statement.md"), "外来变更后的证据。\n");
  assert.match(one.run().stderr, /artifact hash/);
  assert.equal(await readFile(join(one.changeRoot, ".status.json"), "utf8"), oldState);
  assert.equal(await readFile(join(f.root, "status.json"), "utf8"), oldIndex);
  await phaseArtifact(one, 0); await phaseArtifact(one, 1); await one.save();
  assert.match(one.run(["--publish", "--expect-digest", hash(await readFile(one.candidate, "utf8"))]).stderr, /ordered completion/);
});

test("Person completed publication removes only its own active entry and supports explicit phase revision", async (t) => {
  const f = await fixture(t), one = await f.create("complete"), two = await f.create("independent");
  await one.publish(); await two.publish();
  for (let i = 0; i < 5; i += 1) { await phaseArtifact(one, i); await one.publish(); }
  const global = await readJson(join(f.root, "status.json"));
  assert.deepEqual(global.active.map((entry: { change: string }) => entry.change), [f.steelman.change, two.change]);
  assert.equal((await readJson(join(one.changeRoot, ".status.json"))).phase, "completed");
  one.state.phase = "diagnosing"; one.state.status = "active"; one.state.completed_at = null;
  one.state.phase_evidence = { activating: one.state.phase_evidence.activating };
  await one.save();
  assert.match(one.run(["--publish", "--expect-digest", hash(await readFile(one.candidate, "utf8"))]).stderr, /revision_reason/);
  one.state.revision_reason = "用户指出诊断输入发生变化，需要回到诊断。";
  await one.publish();
  assert.equal((await readJson(join(one.changeRoot, ".status.json"))).phase, "diagnosing");
});

test("Person rejects global consultation scalars, wrong owners, stale candidates and foreign locks", async (t) => {
  const f = await fixture(t), one = await f.create("boundary");
  await one.save();
  const preview = one.run();
  assert.equal(preview.status, 0, preview.stderr);
  one.state.problem_type = "资源/兵力分配"; await one.save();
  assert.match(one.run(["--publish", "--expect-digest", JSON.parse(preview.stdout).candidate_sha256]).stderr, /differs from reviewed digest/);
  const global = await readJson(join(f.root, "status.json"));
  global.problem_type = "旧全局咨询标量";
  await writeFile(join(f.root, "status.json"), json(global));
  assert.match(one.run().stderr, /belong to a Person Change/);
  delete global.problem_type;
  await writeFile(join(f.root, "status.json"), json(global));
  await writeFile(join(f.root, ".person-status.lock"), "foreign lock\n");
  const valid = one.run();
  const blocked = one.run(["--publish", "--expect-digest", JSON.parse(valid.stdout).candidate_sha256]);
  assert.equal(blocked.status, 1);
  assert.equal(await readFile(join(f.root, ".person-status.lock"), "utf8"), "foreign lock\n");
  assert.equal(existsSync(join(one.changeRoot, ".status.json")), false);
  await rm(join(f.root, ".person-status.lock"));
  await writeFile(join(one.changeRoot, ".status.json"), json({ ...one.state, work_id: "person/steelman-deliberation" }));
  assert.match(one.run().stderr, /different Person Change owner/);
});

test("Person quote checking uses the cited original and required conditional models", async (t) => {
  const f = await fixture(t), one = await f.create("evidence");
  await phaseArtifact(one, 0); await phaseArtifact(one, 1); await phaseArtifact(one, 2);
  assert.deepEqual(validateConsultationState(one.state, { changeRoot: one.changeRoot, change: one.change }), []);
  one.state.analysis_conditions.second_hand = true;
  assert.match(validateConsultationState(one.state, { changeRoot: one.changeRoot, change: one.change }).join("\n"), /requires A3/);
  one.state.analysis_conditions.second_hand = false;
  one.state.quotes_cited[0].text = "这是一句伪造的引语，不在所引原文中。";
  await writeFile(join(one.changeRoot, "strategy.md"), "定性 定向 站位 时间 投放 运用 阶段 关键战役 风险\n" + one.state.quotes_cited[0].text + "《实践论》(016)\n");
  one.state.phase_evidence.strategizing.sha256 = hash(await readFile(join(one.changeRoot, "strategy.md"), "utf8"));
  assert.match(validateConsultationState(one.state, { changeRoot: one.changeRoot, change: one.change }).join("\n"), /direct quote not found/);
  if (process.platform !== "win32") {
    one.state.quotes_cited = [];
    await symlink(join(f.root, "status.json"), join(one.changeRoot, "linked-candidate.json"));
    const result = spawnSync(process.execPath, [tool, "--state-root", f.root, "--change", one.change, "--candidate", join(one.changeRoot, "linked-candidate.json")], { encoding: "utf8" });
    assert.ifError(result.error);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /linked Person path/);
  }
});

test("Person repairs its index after interrupted publication using only the matching dead owner", async (t) => {
  const f = await fixture(t), one = await f.create("recover");
  await one.publish();
  await phaseArtifact(one, 0); await one.save();
  // Simulate the durable Change write having completed before index publication.
  await writeFile(join(one.changeRoot, ".status.json"), json(one.state));
  const exited = spawnSync(process.execPath, ["-e", "process.exit(0)"], { encoding: "utf8" });
  assert.ifError(exited.error); assert.equal(exited.status, 0);
  const candidateDigest = hash(await readFile(one.candidate, "utf8"));
  const owner = { token: "fixture-owner", work_id: "person/mao-zedong-cognitive-os", change: one.change, candidate_sha256: candidateDigest, host: hostname(), pid: exited.pid };
  await writeFile(join(f.root, ".person-status.lock"), json(owner));
  const repaired = one.run(["--publish", "--expect-digest", candidateDigest]);
  assert.equal(repaired.status, 0, repaired.stderr);
  const global = await readJson(join(f.root, "status.json"));
  assert.equal(global.active.find((entry: { change: string }) => entry.change === one.change).phase, "diagnosing");
  assert.deepEqual(global.active[0], f.steelman);
  assert.equal(existsSync(join(f.root, ".person-status.lock")), false);
  await writeFile(join(f.root, ".person-status.lock"), json({ ...owner, change: "2026-10-19-someone-else" }));
  const blocked = one.run(["--publish", "--expect-digest", candidateDigest]);
  assert.equal(blocked.status, 1);
  assert.equal((await readJson(join(f.root, ".person-status.lock"))).change, "2026-10-19-someone-else");
});

test("Person publication preserves dangling state, candidate and lock links instead of treating them as absent", { skip: process.platform === "win32" }, async t => {
  const f = await fixture(t), one = await f.create("dangling");
  await one.save();
  const candidateBytes = await readFile(one.candidate, "utf8"), digest = hash(candidateBytes);
  const indexBytes = await readFile(join(f.root, "status.json"), "utf8");
  for (const path of [join(one.changeRoot, ".status.json"), join(f.root, ".person-status.lock"), one.candidate]) {
    if (path === one.candidate) await rm(path);
    const target = join(f.root, "missing-link-target.json");
    await symlink(target, path);
    const before = await lstat(path), originalTarget = await readlink(path);
    const result = one.run(["--publish", "--expect-digest", digest]);
    assert.equal(result.status, 1, result.stdout + result.stderr);
    assert.match(result.stderr, /linked Person path/);
    const after = await lstat(path);
    assert.equal(after.isSymbolicLink(), true);
    assert.equal(after.ino, before.ino); assert.equal(after.dev, before.dev);
    assert.equal(await readlink(path), originalTarget);
    assert.equal(await readFile(join(f.root, "status.json"), "utf8"), indexBytes);
    assert.equal(existsSync(target), false);
    await rm(path);
    if (path === one.candidate) await writeFile(path, candidateBytes);
  }
});
