import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { test } from "node:test";
import { stripVTControlCharacters } from "node:util";

type Observation = {
  type: "result";
  value?: unknown;
  cancellation?: { name: string; exitCode: number };
  before: number[];
  after: number[];
  exitCode?: number;
  symbols: { stop: string; cancel: string; error: string };
};

// Isolate the real library's process hooks and terminal streams. The readiness
// message sends keys only after Clack has installed its actual input listeners.
const childSource = `
  import assert from "node:assert/strict";
  import { S_STEP_SUBMIT, S_STEP_CANCEL, S_STEP_ERROR } from "@clack/prompts";
  import { createInstallUI, prompts, promptWorkflows } from ${JSON.stringify(new URL("../src/install-ui.js", import.meta.url).href)};
  import { InstallCancelled } from ${JSON.stringify(new URL("../src/interaction.js", import.meta.url).href)};
  Object.defineProperty(process.stdout, "columns", { value: 35 });
  Object.defineProperty(process.stdout, "rows", { value: 12 });
  const hooks = ["SIGINT", "SIGTERM", "exit", "uncaughtExceptionMonitor", "unhandledRejection"];
  const counts = () => hooks.map(name => process.listenerCount(name));
  const before = counts(), action = process.argv[1];
  let value, cancellation;
  if (action.startsWith("spinner-")) {
    const ui = createInstallUI();
    ui.progress("staging");
    if (action === "spinner-stop") ui.progress("staged");
    else {
      const error = action === "spinner-error"
        ? new Error("SYNTHETIC rendering failure")
        : new InstallCancelled(action === "spinner-decline" ? 0 : 130);
      ui.fail(error);
      if (error instanceof InstallCancelled) cancellation = { name: error.name, exitCode: error.exitCode };
    }
    assert.deepEqual(counts(), before, "the first spinner must release its process hooks");
    ui.progress("committing");
    ui.progress("committed");
  } else {
    let pending;
    const options = [
      { value: "first", label: "第一个候选：保留当前安装", hint: "本地测试" },
      { value: "second", label: "第二个候选：很长的中文名称用于窄终端显示" },
    ];
    if (action === "select") pending = prompts.select({ message: "选择测试项目", options, initialValue: "first" });
    else if (action === "multiselect") pending = prompts.multiselect({ message: "空选测试项目", options, initialValues: [], required: false });
    else if (action === "cancel") pending = promptWorkflows(new Map([
      ["learning", { id: "learning", description: "独立交互夹具" }],
    ]), new Set());
    else throw new Error("Unknown test action");
    process.send({ type: "ready" });
    try { value = await pending; }
    catch (error) {
      if (!(error instanceof InstallCancelled)) throw error;
      cancellation = { name: error.name, exitCode: error.exitCode };
    }
  }
  process.send({ type: "result", value, cancellation, before, after: counts(), exitCode: process.exitCode,
    symbols: { stop: S_STEP_SUBMIT, cancel: S_STEP_CANCEL, error: S_STEP_ERROR } });
  process.disconnect();
`;

async function run(action: string, keys = ""): Promise<{ stdout: string; stderr: string; observation: Observation }> {
  const env: NodeJS.ProcessEnv = { ...process.env, NO_COLOR: "1", FORCE_COLOR: "0", TERM: "xterm-256color", CI: "true" };
  delete env.NODE_TEST_CONTEXT;
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["--input-type=module", "-e", childSource, action], {
      env, stdio: ["pipe", "pipe", "pipe", "ipc"],
    });
    let stdout = "", stderr = "", observation: Observation | undefined;
    const timeout = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error(`Clack ${action} did not cleanly finish: ${stdout}\n${stderr}`));
    }, 15000);
    child.stdout!.setEncoding("utf8").on("data", chunk => { stdout += chunk; });
    child.stderr!.setEncoding("utf8").on("data", chunk => { stderr += chunk; });
    child.on("message", (message: { type?: string }) => {
      if (message.type === "ready") child.stdin!.write(keys);
      else if (message.type === "result") {
        observation = message as Observation;
        child.stdin!.end();
      }
    });
    child.once("error", error => { clearTimeout(timeout); reject(error); });
    child.once("close", (code, signal) => {
      clearTimeout(timeout);
      try {
        assert.equal(signal, null, stderr);
        assert.equal(code, 0, stdout + stderr);
        assert.ok(observation, "the UI must return rather than exiting the process");
        assert.equal(observation.exitCode, undefined, "the CLI owns the exit code");
        assert.deepEqual(observation.after, observation.before, "Clack hooks must be released");
        resolve({ stdout: stripVTControlCharacters(stdout), stderr: stripVTControlCharacters(stderr), observation });
      } catch (error) { reject(error); }
    });
  });
}

test("real Clack spinner distinguishes completion, cancellation and failure without taking CLI ownership", async () => {
  for (const action of ["stop", "cancel", "decline", "error"] as const) {
    const { stdout, stderr, observation } = await run(`spinner-${action}`);
    const outcome = action === "decline" ? "cancel" : action;
    const message = outcome === "stop" ? "安装内容已准备并验证" : "安装未完成";
    const ending = stdout.split(/\r?\n/).find(line => line.includes(message));
    assert.equal(ending?.trim(), `${observation.symbols[outcome]}  ${message}`);
    assert.ok(stdout.includes(`${observation.symbols.stop}  安装事务已完成`), "a later spinner must work after cleanup");
    if (action === "cancel" || action === "decline") {
      assert.equal(observation.cancellation?.exitCode, action === "decline" ? 0 : 130);
      assert.ok(stdout.includes("已取消，未应用安装变更。"));
    }
    if (action === "error") assert.match(stderr, /SYNTHETIC rendering failure/);
  }
});

test("real Clack select accepts navigation in a narrow viewport with only the existing Chinese keyboard help", async () => {
  const result = await run("select", "\x1b[B\r");
  assert.equal(result.observation.value, "second");
  assert.match(result.stdout, /移动/);
  assert.match(result.stdout, /…/);
  assert.doesNotMatch(result.stdout, /to navigate|Enter: confirm/);
});

test("real Clack multiselect preserves an explicitly permitted empty selection", async () => {
  const result = await run("multiselect", "\r");
  assert.deepEqual(result.observation.value, []);
  assert.match(result.stdout, /空格勾选/);
  assert.doesNotMatch(result.stdout, /to navigate|Space: select|Enter: confirm/);
});

test("real Clack Escape and Ctrl+C reach the existing InstallCancelled boundary", async () => {
  for (const keys of ["\x1b", "\x03"]) {
    const result = await run("cancel", keys);
    assert.deepEqual(result.observation.cancellation, { name: "InstallCancelled", exitCode: 130 });
    assert.equal(result.observation.value, undefined);
  }
});
