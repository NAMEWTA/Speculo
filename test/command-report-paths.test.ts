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
    .filter((name) => name !== "references" && statSync(join(commandsDir, name)).isDirectory()).map(name=>name+"/COMMAND.md")
    .sort();
}

describe("command report roots", () => {
  it("declares a state-root report path for every command", () => {
    const files = commandFiles();
    assert.ok(files.includes("git-history-squash/COMMAND.md"));
    assert.equal(files.length, 10);
    for (const name of files) {
      const content = readFileSync(join(commandsDir, name), "utf8");
      const id = content.match(/^id:\s*(\S+)/m)?.[1];
      assert.ok(id, `${name} missing id`);
      assert.match(content, new RegExp(`\\{roots\\.state\\}/commands/${id}/`));
    }
  });

  it("routes archive execution to domain owners and keeps command receipts separate", () => {
    const command = read("template/commands/archive-and-consolidate/COMMAND.md");
    const owner = "{roots.workflows}/specdev/specdev-a-archive-and-consolidate";
    const work = read("template/workflows/specdev/specdev-a-archive-and-consolidate/SKILL.md");
    const operation = read("template/workflows/specdev/specdev-a-archive-and-consolidate/references/operation-contract.md");
    const commandPaths = [...command.matchAll(/<Path>([^<]+)<\/Path>/g)].map(match => match[1]);
    assert.ok(commandPaths.includes(`${owner}/SKILL.md`));
    assert.ok(commandPaths.includes("{roots.workflows}/learning/learning-a-archive/SKILL.md"));
    assert.ok(commandPaths.includes("{roots.workflows}/learning/learning-c-consolidate/SKILL.md"));
    const reportPaths = commandPaths.filter(path => path.includes("{date}"));
    assert.deepEqual(reportPaths, ["{roots.state}/commands/archive-and-consolidate/{date}-{scope}-{topic}[-NN].md"]);
    assert.ok(command.includes(".agents/speculo/.speculo/workspace.json"));
    assert.ok(work.includes(`${owner}/references/operation-contract.md`));
    assert.ok(operation.includes("{roots.state}/specdev/changes/{change}/archive-receipt.md"));
    for (const content of [command, work, operation]) {
      assert.ok(!content.includes("{roots.commands}/archive-and-consolidate/references/"));
    }
    assert.match(command, /unsupported/);
    assert.match(operation, /no-candidates/);
  });

  it("routes git-history-squash through confirmation gates and its own command namespace", () => {
    const command = read("template/commands/git-history-squash/COMMAND.md");
    const skill = read("template/commands/git-history-squash/references/operation-contract.md");
    const procedure = read("template/commands/git-history-squash/references/operation-contract.md");

    assert.match(command, /^id: git-history-squash$/m);
    assert.match(command, /<Path>\{roots\.state\}\/commands\/git-history-squash\//);
    assert.match(command, /<Path>\{roots\.state\}\/commands\/git-history-squash\//);
    assert.match(command, /<Path>\{roots\.commands\}\/git-history-squash\/references\/operation-contract\.md<\/Path>/);
    assert.match(command, /plan_digest/);
    assert.match(command, /publish_digest/);
    assert.match(command, /--force-with-lease=<ref>:<old-sha>/);
    assert.match(command, /普通 `--force`/);
    assert.match(command, /不创建 `state\.json`/);

    assert.match(skill, /<Path>\{roots\.commands\}\/git-history-squash\/COMMAND\.md<\/Path>/);
    assert.match(procedure, /<Path>\{roots\.state\}\/commands\/git-history-squash\//);
  });
});
