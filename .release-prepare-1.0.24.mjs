import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
const base = '3b639f4b2a0af9fef770c8db58fda2b389f9f802';
const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();
assert.equal(git('rev-parse', 'HEAD'), base);
assert.equal(git('hash-object', 'package.json'), '096e3cf415b77d80d2a73c3e15ef3d5726c30f6a');
assert.equal(git('hash-object', 'CHANGELOG.md'), '238cbd2c1cf003714d3cf01f2b54800825e2d42e');
assert.equal(git('hash-object', '.github/workflows/release.yml'), '6ef7808ab6a61ab6ed4b024a963fb81aa6bc4807');
const manifest = readFileSync('package.json', 'utf8');
assert.equal(JSON.parse(manifest).version, '1.0.23');
writeFileSync('package.json', manifest.replace('"version": "1.0.23"', '"version": "1.0.24"'));
const changelog = readFileSync('CHANGELOG.md', 'utf8');
const anchor = '## [Unreleased]\n\n';
assert.equal(changelog.split(anchor).length, 2);
assert.ok(!changelog.includes('## [1.0.24]'));
const notes = `## [1.0.24] - 2026-10-11

### Added
- Add performance investigation to SpecDev architecture review, documentation execution to Implement, and incident-evidence triage to Diagnosis while keeping all 15 Work entry paths, IDs, and recovery keys (#86).
- Add shared error/recovery, test-reliability, Agent-experience, documentation, and engineering-evidence rules, plus read-only Git review-scope and specialist-evidence validators with 51 focused regression tests.

### Changed
- Connect evidence-led discovery, decisions, specifications, Tickets, Goals, implementation, review, delivery, learning, retrospectives, and archival through the existing SpecDev owners and artifacts.
- Allow the existing Release workflow to be explicitly dispatched for a version tag; branch dispatches cannot publish. Tag/version validation, tests, npm authentication, and publication remain in the original workflow.

### Fixed
- Replace unconditional test deletion, adapter-count requirements, terminology bans, and blanket side-effect advice with context-dependent design rules and explicit regression-coverage obligations.
- Distinguish exact Git review scopes, valid empty diffs, unconfirmed incident explanations, incomparable performance claims, stale evidence, and partial remote outcomes.

### Upgrade Notes
- No runtime schema migration: existing configuration, persistence roots, ownership, authorization, archive gateways, and historical records remain unchanged. Other workflow sources, top-level Skills, commands, and CLI behavior are unchanged by #86.
- This package also includes the Media and Learning changes documented under 1.0.23 below; the latest GitHub Release verified during preparation was v1.0.22.
- Real model/host multi-turn Work evaluation was not performed; passing structural and executable tests does not certify model compliance or token savings.

AI assistance was used for implementation, review, and release preparation.

`;
writeFileSync('CHANGELOG.md', changelog.replace(anchor, anchor + notes));
let workflow = readFileSync('.github/workflows/release.yml', 'utf8');
assert.equal(workflow.split('jobs:\n  release:\n').length, 2);
workflow = workflow.replace("      - 'v*'\n", "      - 'v*'\n  workflow_dispatch:\n");
workflow = workflow.replace('jobs:\n  release:\n', "jobs:\n  release:\n    if: github.ref_type == 'tag' && startsWith(github.ref_name, 'v')\n");
writeFileSync('.github/workflows/release.yml', workflow);
assert.deepEqual(git('diff','--name-only').split('\n').sort(), ['.github/workflows/release.yml','CHANGELOG.md','package.json']);
assert.equal(git('diff','--name-only','--','pnpm-lock.yaml'), '');
assert.equal(JSON.parse(readFileSync('package.json','utf8')).version,'1.0.24');
const restored = workflow.replace('  workflow_dispatch:\n','').replace("    if: github.ref_type == 'tag' && startsWith(github.ref_name, 'v')\n",'');
assert.equal(restored, git('show',base+':.github/workflows/release.yml')+'\n');
writeFileSync(process.env.RUNNER_TEMP + '/release-notes-1.0.24.md', notes);
console.log('Version, CHANGELOG, tag-only manual trigger and three-file scope verified.');
