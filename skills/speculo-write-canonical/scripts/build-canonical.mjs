#!/usr/bin/env node

import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';

const PROJECT_URL = 'https://github.com/NAMEWTA/Speculo';
const PORTABLE_ROOT = 'ai-workspace/';
const SOURCE_ROOTS = {
  config: 'template/config.json',
  speculo: 'template',
  state: 'template/.speculo',
  commands: 'template/commands',
  skills: 'template/skills',
  workflows: 'template/workflows',
};
const TEXT_EXTENSIONS = new Set([
  '.md', '.markdown', '.json', '.jsonc', '.txt', '.yaml', '.yml',
  '.js', '.mjs', '.cjs', '.ts', '.sh',
]);
const EXCLUDED_PARTS = new Set([
  '.git', 'node_modules', '.venv', 'changes', 'archive', 'back', 'dist',
]);

class CanonicalError extends Error {
  constructor(message) {
    super(message);
    this.name = 'CanonicalError';
  }
}

function fail(message) {
  throw new CanonicalError(message);
}

function usage(code = 0) {
  const output = code === 0 ? console.log : console.error;
  output(`Usage:
  node build-canonical.mjs --repo <repo-root> --entry <source-entry> --draft <standalone-draft.md> --output <canonical.md>
  node build-canonical.mjs --repo <repo-root> --entry <source-entry> --output <canonical.md> --check
  node build-canonical.mjs --repo <repo-root> --audit-dir <canonical-directory>
  node build-canonical.mjs --self-check

The script normalizes and mechanically audits semantically authored canonical documents.
A valid document must be source-isolated and must define portable persistence under ai-workspace/.
It intentionally does not concatenate or rewrite source files.`);
  process.exit(code);
}

function parseArgs(argv) {
  const args = {
    check: false,
    selfCheck: false,
    repo: null,
    entry: null,
    draft: null,
    output: null,
    auditDir: null,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help' || arg === '-h') usage(0);
    if (arg === '--check') {
      args.check = true;
      continue;
    }
    if (arg === '--self-check') {
      args.selfCheck = true;
      continue;
    }
    const valueFlags = new Map([
      ['--repo', 'repo'],
      ['--entry', 'entry'],
      ['--draft', 'draft'],
      ['--output', 'output'],
      ['--audit-dir', 'auditDir'],
    ]);
    const field = valueFlags.get(arg);
    if (field) {
      const value = argv[index + 1];
      if (!value || value.startsWith('--')) fail(`${arg} requires a value`);
      args[field] = value;
      index += 1;
      continue;
    }
    fail(`unexpected argument: ${arg}`);
  }

  if (args.selfCheck) {
    if (argv.length !== 1) fail('--self-check cannot be combined with other arguments');
    return args;
  }

  if (!args.repo) fail('missing --repo');
  args.repo = path.resolve(args.repo);

  if (args.auditDir) {
    if (args.entry || args.draft || args.output || args.check) {
      fail('--audit-dir cannot be combined with --entry, --draft, --output, or --check');
    }
    args.auditDir = path.resolve(args.repo, args.auditDir);
    return args;
  }

  for (const key of ['entry', 'output']) {
    if (!args[key]) fail(`missing --${key}`);
  }
  if (!args.check && !args.draft) {
    fail('build mode requires --draft; canonical content must be semantically authored before audit');
  }

  args.entry = path.resolve(args.repo, args.entry);
  args.output = path.resolve(args.repo, args.output);
  if (args.draft) args.draft = path.resolve(args.draft);
  return args;
}

async function exists(target) {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}

function normalizePath(value) {
  return value.split(path.sep).join('/');
}

function relativeTo(repo, target) {
  return normalizePath(path.relative(repo, target));
}

function inside(root, target) {
  const resolvedRoot = path.resolve(root);
  const resolvedTarget = path.resolve(target);
  return resolvedTarget === resolvedRoot || resolvedTarget.startsWith(`${resolvedRoot}${path.sep}`);
}

function assertInside(root, target, label) {
  if (!inside(root, target)) fail(`${label} escapes allowed root: ${target}`);
}

function normalizeCanonical(text) {
  const normalized = text
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => line.replace(/[ \t]+$/g, ''))
    .join('\n')
    .replace(/^\uFEFF/, '')
    .replace(/\n+$/g, '');
  return `${normalized}\n`;
}

function stripFrontmatterForDiscovery(text, file) {
  const normalized = text.replace(/\r\n?/g, '\n');
  if (!normalized.startsWith('---\n')) return normalized;
  const end = normalized.indexOf('\n---\n', 4);
  if (end < 0) fail(`${file}: unterminated YAML frontmatter`);
  return normalized.slice(end + 5).replace(/^\n+/, '');
}

function excluded(repo, target) {
  const rel = relativeTo(repo, target);
  const parts = rel.split('/');
  if (parts.some((part) => EXCLUDED_PARTS.has(part))) return true;
  if (rel.includes('/_state/') || rel.startsWith('template/.speculo/')) return true;
  return /(?:^|\/)(?:\.DS_Store|\.gitkeep)$/.test(rel);
}

function safeRepoTarget(repo, target) {
  const resolved = path.resolve(target);
  assertInside(repo, resolved, 'source dependency');
  return resolved;
}

function resolvePathReference(repo, raw) {
  const match = raw.trim().match(/^\{roots\.([a-zA-Z0-9_-]+)\}(.*)$/);
  if (!match) return { kind: 'ignored' };
  const [, alias, suffix] = match;
  if (!(alias in SOURCE_ROOTS)) return { kind: 'error', reason: `unknown root alias roots.${alias}` };
  if (alias === 'state') return { kind: 'runtime' };
  if (/\{[^}]+\}|<[^>]+>/.test(suffix)) return { kind: 'dynamic' };
  const target = alias === 'config'
    ? path.join(repo, SOURCE_ROOTS.config)
    : path.join(repo, SOURCE_ROOTS[alias], suffix.replace(/^\//, ''));
  return { kind: 'candidate', target: safeRepoTarget(repo, target) };
}

function resolveMarkdownReference(repo, fromFile, raw) {
  let target = raw.trim().replace(/^<|>$/g, '');
  if (/^(?:[a-z]+:|#|\/\/)/i.test(target)) return { kind: 'external' };
  target = decodeURIComponent(target.split('#')[0].split('?')[0]);
  if (!target) return { kind: 'anchor' };
  return {
    kind: 'candidate',
    target: safeRepoTarget(repo, path.resolve(path.dirname(fromFile), target)),
  };
}

function discoverReferences(repo, file, text) {
  const refs = [];
  const markdownLink = /(?<!!)\[[^\]]*\]\(([^)]+)\)/g;
  for (const match of text.matchAll(markdownLink)) {
    refs.push(resolveMarkdownReference(repo, file, match[1]));
  }
  const pathTag = /<Path>([\s\S]*?)<\/Path>/g;
  for (const match of text.matchAll(pathTag)) {
    refs.push(resolvePathReference(repo, match[1]));
  }
  return refs;
}

async function classifyCandidate(repo, target) {
  if (!(await exists(target))) {
    return { kind: 'error', reason: `missing static dependency: ${relativeTo(repo, target)}` };
  }
  const stat = await fs.stat(target);
  if (stat.isDirectory()) return { kind: 'directory' };
  if (excluded(repo, target)) return { kind: 'excluded' };
  if (!TEXT_EXTENSIONS.has(path.extname(target).toLowerCase())) return { kind: 'binary' };
  return { kind: 'include', target };
}

async function discoverSourceClosure(repo, entry) {
  const queue = [entry];
  const seen = new Set();
  const ordered = [];
  const internalIds = new Set();

  while (queue.length > 0) {
    const file = queue.shift();
    if (seen.has(file)) continue;
    seen.add(file);
    ordered.push(file);

    const raw = await fs.readFile(file, 'utf8');
    const idMatch = raw.match(/^id:\s*["']?([^\n"']+)["']?\s*$/m);
    if (idMatch && /[\/]/.test(idMatch[1])) internalIds.add(idMatch[1].trim());

    const ext = path.extname(file).toLowerCase();
    const body = ext === '.md' || ext === '.markdown'
      ? stripFrontmatterForDiscovery(raw, relativeTo(repo, file))
      : raw.replace(/\r\n?/g, '\n');

    for (const reference of discoverReferences(repo, file, body)) {
      if (reference.kind === 'error') fail(`${relativeTo(repo, file)}: ${reference.reason}`);
      if (reference.kind !== 'candidate') continue;
      const classified = await classifyCandidate(repo, reference.target);
      if (classified.kind === 'error') fail(`${relativeTo(repo, file)}: ${classified.reason}`);
      if (classified.kind === 'binary') {
        fail(`${relativeTo(repo, file)}: binary dependency cannot be audited: ${relativeTo(repo, reference.target)}`);
      }
      if (classified.kind === 'include' && !seen.has(classified.target)) queue.push(classified.target);
    }
  }

  return { files: ordered, internalIds: [...internalIds] };
}

function countOccurrences(text, needle) {
  let count = 0;
  let offset = 0;
  while (true) {
    const index = text.indexOf(needle, offset);
    if (index < 0) return count;
    count += 1;
    offset = index + needle.length;
  }
}

function cleanUrl(url) {
  return url.replace(/[.,，。;；!?！？:：]+$/g, '');
}

function assertNoSourceLeak(text, repo, closure, filePath) {
  if (!closure) return;
  const lower = text.toLowerCase();
  for (const source of closure.files) {
    const rel = relativeTo(repo, source);
    const withoutTemplate = rel.replace(/^template\//, '');
    const basename = path.basename(source);
    const candidates = new Set([rel, withoutTemplate, basename]);
    for (const candidate of candidates) {
      if (!candidate || candidate.length < 5) continue;
      if (lower.includes(candidate.toLowerCase())) {
        fail(`${filePath}: leaks source path or filename: ${candidate}`);
      }
    }
  }
  for (const id of closure.internalIds) {
    if (lower.includes(id.toLowerCase())) fail(`${filePath}: leaks internal source identifier: ${id}`);
  }
}

function portablePathOccurrences(text) {
  const matches = text.match(/ai-workspace\/[A-Za-z0-9_{}<>.\-\/]+/g) ?? [];
  return matches.map((value) => value.replace(/[.]+$/g, ''));
}

function validatePortablePaths(text, filePath) {
  const paths = portablePathOccurrences(text);
  if (paths.length === 0) fail(`${filePath}: missing portable persistence paths under ${PORTABLE_ROOT}`);

  for (const portablePath of paths) {
    if (!portablePath.startsWith(PORTABLE_ROOT)) {
      fail(`${filePath}: portable path must start with ${PORTABLE_ROOT}: ${portablePath}`);
    }
    if (portablePath.includes('..')) {
      fail(`${filePath}: portable path traversal is forbidden: ${portablePath}`);
    }
    if (portablePath.includes('\\')) {
      fail(`${filePath}: portable path must use forward slashes: ${portablePath}`);
    }
    if (portablePath.includes('//')) {
      fail(`${filePath}: portable path contains an empty segment: ${portablePath}`);
    }
  }

  if (!text.includes('ai-workspace/status.json')) {
    fail(`${filePath}: missing global portable state path ai-workspace/status.json`);
  }
  if (!/ai-workspace\/changes\/(?:\{change\}|<change>|YYYY-MM-DD-<topic>)\/\.status\.json/.test(text)) {
    fail(`${filePath}: missing change status path under ai-workspace/changes/{change}/.status.json`);
  }
  if (!/FILE:\s*ai-workspace\//.test(text)) {
    fail(`${filePath}: missing complete FILE bundle format for non-writable platforms`);
  }
  if (!/(?:无法|不能|不具备)[^\n]{0,30}(?:直接)?写(?:入)?文件/.test(text)) {
    fail(`${filePath}: missing explicit non-writable-platform persistence fallback`);
  }
  if (!/持久化/.test(text)) {
    fail(`${filePath}: missing persistence contract wording`);
  }
}

function auditCanonical(text, { repo, closure = null, filePath }) {
  const normalized = normalizeCanonical(text);
  const lines = normalized.split('\n');
  const firstNonEmptyIndex = lines.findIndex((line) => line.trim());
  const firstNonEmpty = firstNonEmptyIndex >= 0 ? lines[firstNonEmptyIndex] : null;
  if (firstNonEmpty?.trim() === '---') fail(`${filePath}: YAML frontmatter is forbidden`);
  if (!firstNonEmpty || !/^#\s+\S/.test(firstNonEmpty)) {
    fail(`${filePath}: first non-empty line must be a level-1 Markdown title`);
  }
  if (normalized.replace(/\s/g, '').length < 1200) {
    fail(`${filePath}: document is too short to be self-contained and persistent`);
  }

  const projectUrlCount = countOccurrences(normalized, PROJECT_URL);
  if (projectUrlCount !== 1) {
    fail(`${filePath}: allowed project URL must appear exactly once; found ${projectUrlCount}`);
  }
  const urls = normalized.match(/https?:\/\/[^\s)\]}>"']+/g) ?? [];
  for (const url of urls.map(cleanUrl)) {
    if (url !== PROJECT_URL) fail(`${filePath}: external URL is forbidden: ${url}`);
  }
  if (urls.length !== 1) fail(`${filePath}: canonical must contain exactly one URL; found ${urls.length}`);

  const withoutAllowedUrl = normalized.replaceAll(PROJECT_URL, '');
  if (/speculo/i.test(withoutAllowedUrl)) {
    fail(`${filePath}: project name may appear only inside the allowed project URL`);
  }
  if (/specdev/i.test(withoutAllowedUrl)) {
    fail(`${filePath}: internal framework name is forbidden`);
  }

  const forbidden = [
    { pattern: /<\/?Path>/i, label: '<Path> tag' },
    { pattern: /\{roots\.[^}]+\}/i, label: 'root alias' },
    { pattern: /canonical-manifest/i, label: 'canonical manifest' },
    { pattern: /<!--[\s\S]*?-->/, label: 'HTML comment or provenance' },
    { pattern: /(?:^|[\s`"'(（])(?:\.agents|template|speculo|\.speculo)[\\/]/im, label: 'project directory path' },
    { pattern: /\bsha-?256\b/i, label: 'source hash' },
    { pattern: /(?:SKILL|INDEX)\.md\b/i, label: 'source entry filename' },
    { pattern: /参见下方\s*`?<|参见[^\n]{0,40}(?:源文件|源码|标签)|子文件引用|参考内容\s*$/im, label: 'source-reference wording' },
    { pattern: /(?:root alias|根别名|仓库相对路径|源文件路径|源码附录|来源文件)/i, label: 'maintainer-only implementation wording' },
    { pattern: /\[TODO(?::[^\]]*)?\]|\bTODO\s*:/i, label: 'unresolved placeholder' },
    { pattern: /(?:^|\s)(?:\/(?:home|Users|mnt|private|tmp|var)\/|[A-Za-z]:\\)/m, label: 'machine absolute path' },
    { pattern: /^\s*<\/?[a-z_][a-z0-9._-]*>\s*$/im, label: 'XML source wrapper tag' },
    { pattern: /```(?:bash|sh|shell|console)\b/i, label: 'local command block' },
    { pattern: /\b(?:pnpm|npm|npx)\s+[a-z-]+/i, label: 'local package command' },
    { pattern: /\bnode\s+[^\n`]+\.m?js\b/i, label: 'local Node command' },
    { pattern: /只在当前对话中(?:维护|保存|记住)/i, label: 'conversation-only state' },
  ];
  for (const rule of forbidden) {
    if (rule.pattern.test(normalized)) fail(`${filePath}: forbidden ${rule.label}`);
  }

  const relativeLink = /(?<!!)\[[^\]]+\]\((?!https?:\/\/|mailto:|#)([^)]+)\)/i;
  const relativeMatch = normalized.match(relativeLink);
  if (relativeMatch) fail(`${filePath}: relative or local Markdown link is forbidden: ${relativeMatch[1]}`);

  validatePortablePaths(normalized, filePath);
  assertNoSourceLeak(normalized, repo, closure, filePath);
  return normalized;
}

async function validateSinglePaths(args) {
  if (!(await exists(args.repo))) fail(`repository root not found: ${args.repo}`);
  if (!(await exists(args.entry))) fail(`source entry not found: ${args.entry}`);
  assertInside(args.repo, args.entry, 'source entry');
  assertInside(path.join(args.repo, 'template', 'canonical'), args.output, 'canonical output');
  if (path.resolve(args.entry) === path.resolve(args.output)) fail('source entry and canonical output must differ');
  if (args.draft && !(await exists(args.draft))) fail(`standalone draft not found: ${args.draft}`);
}

async function buildOrCheck(args) {
  await validateSinglePaths(args);
  const closure = await discoverSourceClosure(args.repo, args.entry);

  if (args.check) {
    if (!(await exists(args.output))) fail(`canonical output not found: ${args.output}`);
    const existing = await fs.readFile(args.output, 'utf8');
    const normalized = auditCanonical(existing, {
      repo: args.repo,
      closure,
      filePath: relativeTo(args.repo, args.output),
    });
    if (existing !== normalized) fail(`${relativeTo(args.repo, args.output)} is not normalized; rebuild it`);
    console.log(`PASS isolated persistent canonical: ${relativeTo(args.repo, args.output)} (${closure.files.length} source files checked)`);
    return;
  }

  const draft = await fs.readFile(args.draft, 'utf8');
  const normalized = auditCanonical(draft, {
    repo: args.repo,
    closure,
    filePath: relativeTo(args.repo, args.output),
  });
  await fs.mkdir(path.dirname(args.output), { recursive: true });
  const temporary = `${args.output}.tmp-${process.pid}`;
  await fs.writeFile(temporary, normalized, 'utf8');
  await fs.rename(temporary, args.output);
  console.log(`Wrote isolated persistent canonical: ${relativeTo(args.repo, args.output)} (${closure.files.length} source files checked)`);
}

async function collectMarkdownFiles(directory) {
  const result = [];
  async function visit(current) {
    const entries = await fs.readdir(current, { withFileTypes: true });
    entries.sort((a, b) => a.name.localeCompare(b.name, 'en'));
    for (const entry of entries) {
      const target = path.join(current, entry.name);
      if (entry.isDirectory()) await visit(target);
      else if (entry.isFile() && /\.md$/i.test(entry.name)) result.push(target);
    }
  }
  await visit(directory);
  return result;
}

async function auditDirectory(args) {
  if (!(await exists(args.repo))) fail(`repository root not found: ${args.repo}`);
  if (!(await exists(args.auditDir))) fail(`canonical directory not found: ${args.auditDir}`);
  assertInside(args.repo, args.auditDir, 'canonical directory');
  const stat = await fs.stat(args.auditDir);
  if (!stat.isDirectory()) fail(`--audit-dir must point to a directory: ${args.auditDir}`);

  const files = await collectMarkdownFiles(args.auditDir);
  if (files.length === 0) fail(`no Markdown files found under ${args.auditDir}`);

  for (const file of files) {
    const existing = await fs.readFile(file, 'utf8');
    const normalized = auditCanonical(existing, {
      repo: args.repo,
      filePath: relativeTo(args.repo, file),
    });
    if (existing !== normalized) fail(`${relativeTo(args.repo, file)} is not normalized`);
    console.log(`PASS ${relativeTo(args.repo, file)}`);
  }
  console.log(`PASS canonical directory audit: ${relativeTo(args.repo, args.auditDir)} (${files.length} Markdown files)`);
}

async function expectFailure(label, action, fragment) {
  try {
    await action();
  } catch (error) {
    if (!(error instanceof CanonicalError)) throw error;
    if (!error.message.includes(fragment)) {
      fail(`self-check ${label}: expected ${JSON.stringify(fragment)}, got ${JSON.stringify(error.message)}`);
    }
    console.log(`PASS rejects ${label}`);
    return;
  }
  fail(`self-check ${label}: expected failure`);
}

function selfCheckCanonical(extra = '') {
  const paragraphs = Array.from({ length: 12 }, (_, index) =>
    `第${index + 1}条规则要求先理解目标，再区分事实、推断、偏好与未知。模型必须说明约束，建立可信方案，找到决定变量，在信息不足时诚实暂停，并给出可验证输出。`,
  ).join('\n\n');
  return `# 独立持久化能力示例\n\n项目地址：${PROJECT_URL}\n\n## 定位\n\n这是一份不依赖源仓库的独立能力。\n\n## 持久化输出合同\n\n所有运行状态写入 \`ai-workspace/\`。全局索引是 \`ai-workspace/status.json\`，当前 change 状态是 \`ai-workspace/changes/{change}/.status.json\`，原始请求保存在 \`ai-workspace/changes/{change}/source.md\`，主工件保存在 \`ai-workspace/changes/{change}/result.md\`。无法直接写入文件时，必须输出完整文件包，不能只在聊天中记忆。\n\n### FILE: ai-workspace/status.json\n\n\`\`\`json\n{"schema_version":1,"active":[]}\n\`\`\`\n\n### FILE: ai-workspace/changes/<change>/.status.json\n\n\`\`\`json\n{"schema_version":1,"change":"2026-08-18-example","status":"active","phase":"working"}\n\`\`\`\n\n### FILE: ai-workspace/changes/<change>/result.md\n\n\`\`\`markdown\n# 结果\n\n完整结果。\n\`\`\`\n\n## 执行协议\n\n${paragraphs}\n\n## 自检\n\n输出前确认结论明确、证据边界清楚、文件内容完整且可以恢复。\n${extra}`;
}

async function runSelfCheck() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'canonical-isolated-persistent-'));
  try {
    const entryDir = path.join(root, 'template', 'demo');
    const canonicalDir = path.join(root, 'template', 'canonical');
    await fs.mkdir(entryDir, { recursive: true });
    await fs.mkdir(canonicalDir, { recursive: true });
    const entry = path.join(entryDir, 'entry.md');
    const dependency = path.join(entryDir, 'rule.md');
    const draft = path.join(root, 'draft.md');
    const output = path.join(canonicalDir, 'canonical-demo.md');
    await fs.writeFile(entry, '---\nid: demo/example\n---\n\n# Demo\n\n[规则](rule.md)\n', 'utf8');
    await fs.writeFile(dependency, '# Rule\n\nInternal source behavior.\n', 'utf8');
    await fs.writeFile(draft, selfCheckCanonical(), 'utf8');

    const base = { repo: root, entry, draft, output, check: false };
    await buildOrCheck(base);
    await buildOrCheck({ ...base, draft: null, check: true });
    await auditDirectory({ repo: root, auditDir: canonicalDir });
    console.log('PASS builds, checks, and audits a persistent canonical directory');

    const closure = await discoverSourceClosure(root, entry);
    const audit = async (text) => auditCanonical(text, {
      repo: root,
      closure,
      filePath: 'template/canonical/canonical-demo.md',
    });

    await expectFailure('project path leakage', () => audit(selfCheckCanonical('\n请读取 `.agents/skills/demo/`。\n')), 'project directory path');
    await expectFailure('another URL', () => audit(selfCheckCanonical('\n资料：https://example.com\n')), 'external URL');
    await expectFailure('project name', () => audit(selfCheckCanonical('\n这是 Speculo 的规则。\n')), 'project name');
    await expectFailure('internal framework name', () => audit(selfCheckCanonical('\n使用 SpecDev 状态。\n')), 'internal framework name');
    await expectFailure('source filename leakage', () => audit(selfCheckCanonical('\n请继续读取 rule.md。\n')), 'source path or filename');
    await expectFailure('embedded manifest', () => audit(selfCheckCanonical('\ncanonical-manifest\n')), 'canonical manifest');
    await expectFailure('missing project URL', () => audit(selfCheckCanonical().replace(PROJECT_URL, '')), 'must appear exactly once');
    await expectFailure('frontmatter', () => audit(`---\nname: demo\n---\n\n${selfCheckCanonical()}`), 'YAML frontmatter');
    await expectFailure('XML source wrapper', () => audit(selfCheckCanonical('\n<rule>\n内容\n</rule>\n')), 'XML source wrapper');
    await expectFailure('missing portable root', () => audit(selfCheckCanonical().replaceAll('ai-workspace/', 'portable-state/')), 'missing portable persistence paths');
    await expectFailure('missing global status', () => audit(selfCheckCanonical().replaceAll('ai-workspace/status.json', 'ai-workspace/index.json')), 'missing global portable state path');
    await expectFailure('missing change status', () => audit(selfCheckCanonical().replaceAll('.status.json', 'phase.json')), 'missing change status path');
    await expectFailure('missing file bundle', () => audit(selfCheckCanonical().replaceAll('FILE:', 'OUTPUT:')), 'missing complete FILE bundle');
    await expectFailure('portable traversal', () => audit(selfCheckCanonical('\n额外工件：`ai-workspace/changes/{change}/../secret.md`。\n')), 'path traversal');
    await expectFailure('conversation-only state', () => audit(selfCheckCanonical('\n失败时只在当前对话中维护。\n')), 'conversation-only state');

    const bad = path.join(canonicalDir, 'bad.md');
    await fs.writeFile(bad, selfCheckCanonical('\n额外：https://example.com\n'), 'utf8');
    await expectFailure(
      'bad file in directory audit',
      () => auditDirectory({ repo: root, auditDir: canonicalDir }),
      'external URL',
    );

    console.log('Canonical isolated-persistence self-check passed.');
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.selfCheck) {
    await runSelfCheck();
    return;
  }
  if (args.auditDir) {
    await auditDirectory(args);
    return;
  }
  await buildOrCheck(args);
}

main().catch((error) => {
  const prefix = error instanceof CanonicalError ? 'CANONICAL ERROR' : 'ERROR';
  console.error(`${prefix}: ${error.message}`);
  process.exitCode = 1;
});
