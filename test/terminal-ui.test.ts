import assert from "node:assert/strict";
import { test } from "node:test";
import { spawnSync } from "node:child_process";
import { stripVTControlCharacters } from "node:util";
import { join } from "node:path";
import stringWidth from "string-width";
import { fitChoices, fitTerminalText, terminalColors, visibleChoiceCount, wrapTerminalText } from "../src/terminal-ui.js";

test("colors require a terminal and respect NO_COLOR, TERM and FORCE_COLOR=0", () => {
  assert.match(terminalColors({ isTTY: true }, {}).cyan("Speculo"), /\x1b\[/);
  for (const env of [{ NO_COLOR: "" }, { NO_COLOR: "1", FORCE_COLOR: "1" }, { TERM: "dumb" }, { FORCE_COLOR: "0" }]) {
    assert.equal(terminalColors({ isTTY: true }, env).cyan("Speculo"), "Speculo");
  }
  assert.equal(terminalColors({ isTTY: false }, { FORCE_COLOR: "1" }).cyan("Speculo"), "Speculo");
});

test("wrapping preserves colored Chinese and long paths without counting escape codes", () => {
  const c = terminalColors({ isTTY: true }, {});
  const text = c.cyan("中文ab入口") + " /a/very-long-project/skills/example";
  const wrapped = wrapTerminalText(text, 12);
  assert.equal(stripVTControlCharacters(wrapped).replaceAll("\n", ""), stripVTControlCharacters(text));
  for (const line of wrapped.split("\n")) assert.ok(stringWidth(line) <= 12);
  assert.equal(fitTerminalText("👩‍💻中文test", 5), "👩‍💻中…");
  assert.equal(fitTerminalText(c.green("中文ab入口"), 6), "中文a…");
});

test("choices fit narrow screens and tall screens can show more than twelve items", () => {
  const choices = fitChoices([
    { value: "skill", label: "非常长的中文 Skill 名称", hint: "描述信息" },
    { value: "workflow", label: "Learning", hint: "学习工作流的描述" },
  ], 20);
  for (const choice of choices) assert.ok(stringWidth(choice.label) + (choice.hint ? stringWidth(choice.hint) + 3 : 0) + 2 <= 20);
  assert.equal(choices[0].hint, undefined);
  assert.equal(visibleChoiceCount(11, "安装内容\n↑↓ 移动", 24, 75), 11);
  assert.equal(visibleChoiceCount(30, "选择", 40, 75), 30);
  assert.equal(visibleChoiceCount(30, "选择\n操作提示", 12, 35), 6);
  assert.ok(visibleChoiceCount(30, "中文很长的提示".repeat(5), 10, 15) >= 1);
});

test("redirected CLI output stays plain even with FORCE_COLOR", () => {
  const cli = join(process.cwd(), "dist/src/cli.js");
  const env = { ...process.env, FORCE_COLOR: "1" };
  const help = spawnSync(process.execPath, [cli, "--help"], { encoding: "utf8", env });
  assert.equal(help.status, 0, help.stderr);
  assert.doesNotMatch(help.stdout, /\x1b\[/);
  assert.match(help.stdout, /Hub 分类与 Workflow 同层/);
  const error = spawnSync(process.execPath, [cli, "--invalid"], { encoding: "utf8", env });
  assert.equal(error.status, 1);
  assert.doesNotMatch(error.stderr, /\x1b\[/);
  assert.match(error.stderr, /Unknown option/);
  const doctor = spawnSync(process.execPath, [cli, "doctor", "--json"], { encoding: "utf8", env });
  assert.equal(doctor.status, 2);
  assert.equal(JSON.parse(doctor.stdout).scope, "installation-integrity");
  assert.doesNotMatch(doctor.stdout, /\x1b\[/);
});
