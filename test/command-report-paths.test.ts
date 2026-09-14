import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const packageRoot = process.cwd();
const commandsDir = join(packageRoot, "template", "commands");

function read(relative: string): string {
  return readFileSync(join(packageRoot, relative), "utf8");
}

function commandFiles(): string[] {
  return readdirSync(commandsDir)
    .filter((name) => name.endsWith(".md") && statSync(join(commandsDir, name)).isFile())
    .sort();
}

describe("command report roots", () => {
  it("declares a state-root report path for every command", () => {
    const files = commandFiles();
    assert.ok(files.includes("git-history-squash.md"));
    assert.equal(files.length, 7);
    for (const name of files) {
      const content = readFileSync(join(commandsDir, name), "utf8");
      const id = content.match(/^id:\s*(\S+)/m)?.[1];
      assert.ok(id, `${name} missing id`);
      assert.match(content, new RegExp(`\\{roots\\.state\\}/commands/${id}/`));
    }
  });

  it("blocks archive-and-consolidate reports under {roots.commands}", () => {
    const command = read("template/commands/archive-and-consolidate.md");
    const skill = read("template/skills/archive-and-consolidate/SKILL.md");
    const procedure = read("template/skills/archive-and-consolidate/references/entry-procedure.md");

    assert.match(command, /<Path>\{roots\.state\}\/commands\/archive-and-consolidate\//);
    assert.match(command, /\{roots\.commands\}\/archive-and-consolidate\//);
    assert.match(command, /\*\*blocked，不写文件\*\*/);
    assert.match(command, /commands_root.*\{roots\.state\}\/commands/);
    assert.match(command, /不是报告根/);
    assert.match(command, /<Path>\{roots\.skills\}\/archive-and-consolidate\/SKILL\.md<\/Path>/);

    assert.match(skill, /when `commands_root` is not `\{roots\.state\}\/commands`/);

    assert.match(procedure, /`commands_root` 必须解析为 `<Path>\{roots\.state\}\/commands<\/Path>`/);
    assert.match(procedure, /<Path>\{roots\.state\}\/commands\/archive-and-consolidate\//);
    assert.match(procedure, /禁止写入 `\{roots\.commands\}\/archive-and-consolidate\//);
    assert.match(procedure, /commands_root === \{roots\.state\}\/commands, never \{roots\.commands\}/);
    assert.match(procedure, /不禁止写入 `\{roots\.state\}` 本身/);
    assert.doesNotMatch(
      procedure,
      /`commands_root` 从公共 `<Path>\{roots\.state\}\/commands<\/Path>` 解析，不放进 workflow 私有 state root/,
    );
  });

  it("routes git-history-squash through confirmation gates and split namespaces", () => {
    const command = read("template/commands/git-history-squash.md");
    const skill = read("template/skills/git-history-squash/SKILL.md");
    const procedure = read("template/skills/git-history-squash/references/entry-procedure.md");

    assert.match(command, /disable-model-invocation: true/);
    assert.match(command, /<Path>\{roots\.state\}\/commands\/git-history-squash\//);
    assert.match(command, /<Path>\{roots\.state\}\/skills\/git-history-squash\//);
    assert.match(command, /<Path>\{roots\.skills\}\/git-history-squash\/SKILL\.md<\/Path>/);
    assert.match(command, /plan_digest/);
    assert.match(command, /publish_digest/);
    assert.match(command, /--force-with-lease=<ref>:<old-sha>/);
    assert.match(command, /普通 `--force`/);
    assert.match(command, /不创建 `state\.json`/);

    assert.match(skill, /<Path>\{roots\.commands\}\/git-history-squash\.md<\/Path>/);
    assert.match(procedure, /<Path>\{roots\.state\}\/commands\/git-history-squash\//);
  });
});
