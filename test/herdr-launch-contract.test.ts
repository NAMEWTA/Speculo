import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';

const skill = await readFile(join(process.cwd(), 'skills-hub/automation/herdr/SKILL.md'), 'utf8');

test('Herdr guidance preserves concrete Claude/Codex launches only through Herdr', () => {
  assert.match(skill, /## Claude 与 Codex 的启动方式/);
  assert.doesNotMatch(skill, /原生 CLI 直接启动|CLI 路线|两条路线|不经 Herdr/);
  assert.doesNotMatch(skill, /```(?:bash|sh)?\n(?:claude|codex)(?:\s|\n)/);
  assert.doesNotMatch(skill, /对应的原生命令是/);
  for (const kind of ['claude', 'codex']) {
    assert.ok(skill.includes(`herdr agent start <name> --kind ${kind} --pane <returned-pane-id>\n`));
  }
  assert.match(skill, /herdr agent start <name> --kind claude --pane <returned-pane-id> -- --dangerously-skip-permissions/);
  assert.match(skill, /herdr agent start <name> --kind codex --pane <returned-pane-id> -- --no-daemon --dangerously-bypass-approvals-and-sandbox/);
  assert.match(skill, /herdr agent prompt <name>/);
  assert.match(skill, /herdr agent read <name>/);
  assert.match(skill, /不是用 `herdr agent` 启动 Herdr 服务/);
  assert.match(skill, /`--` 后的原生参数原样透传/);
});

test('retained historical launch flags are conditional, not automatic permission escalation', () => {
  assert.match(skill, /仅当用户明确授权跳过审批，且当前 Claude Code CLI 支持该参数时/);
  assert.match(skill, /仅当用户明确授权绕过审批与沙箱，且当前 Codex CLI 帮助同时确认支持以下两个参数时/);
  assert.match(skill, /`--no-daemon` 是用户历史示例/);
  assert.match(skill, /它不是默认必需参数/);
  assert.match(skill, /不自动附加跳过审批、禁用沙箱/);
  assert.match(skill, /所需新增授权交用户，不自动确认/);
  assert.doesNotMatch(skill, /必须使用下面对应的命令，不要自行改用其他参数/);
});
