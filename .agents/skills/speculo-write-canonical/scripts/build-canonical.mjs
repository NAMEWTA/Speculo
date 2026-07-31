#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const SOURCE_ROOTS = {
  config: 'template/config.json',
  speculo: 'template',
  state: 'template/.speculo',
  commands: 'template/commands',
  skills: 'template/skills',
  workflows: 'template/workflows',
};
const TEXT_EXTENSIONS = new Set(['.md', '.markdown', '.json', '.jsonc', '.txt', '.yaml', '.yml', '.js', '.mjs', '.cjs', '.ts', '.sh']);
const EXCLUDED_PARTS = new Set(['.git', 'node_modules', '.venv', 'changes', 'archive']);

function usage(code = 0) {
  const out = code === 0 ? console.log : console.error;
  out(`Usage: node build-canonical.mjs --repo <repo-root> --entry <source> --output <canonical.md> [--check]\n\nBuilds a deterministic canonical Markdown file from the transitive static dependency closure.\n--check  Exit non-zero when output is absent or stale.`);
  process.exit(code);
}

function parseArgs(argv) {
  const args = { check: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') usage(0);
    else if (arg === '--check') args.check = true;
    else if (['--repo', '--entry', '--output'].includes(arg)) args[arg.slice(2)] = argv[++i];
    else throw new Error(`Unexpected argument: ${arg}`);
  }
  for (const key of ['repo', 'entry', 'output']) if (!args[key]) throw new Error(`Missing --${key}`);
  args.repo = path.resolve(args.repo);
  args.entry = path.resolve(args.repo, args.entry);
  args.output = path.resolve(args.repo, args.output);
  return args;
}

async function exists(p) { try { await fs.access(p); return true; } catch { return false; } }
function posixRel(root, p) { return path.relative(root, p).split(path.sep).join('/'); }
function sha(text) { return crypto.createHash('sha256').update(text).digest('hex'); }

function stripFrontmatter(text) {
  const normalized = text.replace(/\r\n/g, '\n');
  if (!normalized.startsWith('---\n')) return normalized;
  const end = normalized.indexOf('\n---\n', 4);
  if (end < 0) throw new Error('Unterminated YAML frontmatter');
  return normalized.slice(end + 5).replace(/^\n+/, '');
}

function safeInside(repo, target) {
  const resolved = path.resolve(target);
  if (resolved !== repo && !resolved.startsWith(repo + path.sep)) throw new Error(`Path escapes repository: ${resolved}`);
  return resolved;
}

function excluded(rel) {
  const parts = rel.split('/');
  if (parts.some((part) => EXCLUDED_PARTS.has(part))) return true;
  if (rel.includes('/_state/') || rel.startsWith('template/.speculo/')) return true;
  return /(?:^|\/)(?:\.DS_Store|\.gitkeep)$/.test(rel);
}

function resolvePathTag(repo, raw) {
  const m = raw.trim().match(/^\{roots\.([a-zA-Z0-9_-]+)\}(.*)$/);
  if (!m) return { kind: 'error', reason: `Path lacks root alias: ${raw}` };
  const [, alias, suffix] = m;
  if (!(alias in SOURCE_ROOTS)) return { kind: 'error', reason: `Unknown root alias roots.${alias}` };
  if (alias === 'state') return { kind: 'runtime' };
  if (/\{[^}]+\}|<[^>]+>/.test(suffix)) return { kind: 'dynamic-static' };
  const target = alias === 'config'
    ? path.join(repo, SOURCE_ROOTS.config)
    : path.join(repo, SOURCE_ROOTS[alias], suffix.replace(/^\//, ''));
  return { kind: 'candidate', target: safeInside(repo, target) };
}

function resolveMarkdownLink(repo, fromFile, raw) {
  let target = raw.trim().replace(/^<|>$/g, '');
  if (/^(?:[a-z]+:|#|\/\/)/i.test(target)) return { kind: 'external' };
  target = decodeURIComponent(target.split('#')[0].split('?')[0]);
  if (!target) return { kind: 'anchor' };
  return { kind: 'candidate', target: safeInside(repo, path.resolve(path.dirname(fromFile), target)) };
}

async function classifyCandidate(repo, target) {
  if (!(await exists(target))) return { kind: 'error', reason: `Missing static dependency: ${posixRel(repo, target)}` };
  const st = await fs.stat(target);
  if (st.isDirectory()) return { kind: 'directory' };
  const rel = posixRel(repo, target);
  if (excluded(rel)) return { kind: 'excluded' };
  if (!TEXT_EXTENSIONS.has(path.extname(target).toLowerCase())) return { kind: 'binary' };
  return { kind: 'include', target };
}

function discoverRefs(repo, file, text) {
  const refs = [];
  const linkRe = /(?<!!)\[[^\]]*\]\(([^)]+)\)/g;
  for (const match of text.matchAll(linkRe)) refs.push({ type: 'markdown', raw: match[1], ...resolveMarkdownLink(repo, file, match[1]) });
  const pathRe = /<Path>([\s\S]*?)<\/Path>/g;
  for (const match of text.matchAll(pathRe)) refs.push({ type: 'path', raw: match[1].trim(), ...resolvePathTag(repo, match[1]) });
  return refs;
}

function baseTag(rel) {
  let value = rel.replace(/\.[^.\/]+$/, '').toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/-+/g, '-').replace(/^[^a-z_]+/, '');
  if (!value) value = 'source';
  if (!/^[a-z_]/.test(value)) value = `source-${value}`;
  return value;
}

function assignTags(repo, dependencies) {
  const used = new Map();
  const tags = new Map();
  for (const file of dependencies) {
    const rel = posixRel(repo, file);
    const parts = rel.split('/');
    const filename = parts.pop();
    const stem = filename.replace(/\.[^.]+$/, '');
    const candidates = [stem];
    for (let i = parts.length - 1; i >= 0; i -= 1) candidates.push(`${parts[i]}-${candidates.at(-1)}`);
    let tag;
    for (const c of candidates) {
      const candidate = baseTag(c);
      if (!used.has(candidate)) { tag = candidate; break; }
    }
    if (!tag) {
      const root = baseTag(rel);
      let n = 2; tag = root;
      while (used.has(tag)) tag = `${root}-${n++}`;
    }
    used.set(tag, file); tags.set(file, tag);
  }
  return tags;
}

function language(file) {
  return ({ '.json': 'json', '.jsonc': 'json', '.js': 'javascript', '.mjs': 'javascript', '.cjs': 'javascript', '.ts': 'typescript', '.sh': 'bash', '.yaml': 'yaml', '.yml': 'yaml', '.txt': 'text' })[path.extname(file).toLowerCase()] || 'text';
}

function transformMarkdown(repo, file, body, tags) {
  let out = body.replace(/<Path>([\s\S]*?)<\/Path>/g, (_, raw) => `\`${raw.trim().replace(/`/g, '\\`')}\``);
  out = out.replace(/(?<!!)\[([^\]]*)\]\(([^)]+)\)/g, (whole, label, raw) => {
    const ref = resolveMarkdownLink(repo, file, raw);
    if (ref.kind !== 'candidate') return whole;
    const tag = tags.get(ref.target);
    return tag ? `${label || '该文件'}（参见下方 \`<${tag}>\`）` : whole;
  });
  return out.trim();
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!(await exists(args.entry))) throw new Error(`Entry not found: ${args.entry}`);
  if (args.entry === args.output) throw new Error('Entry and output must differ');
  if (!args.entry.startsWith(path.join(args.repo, 'template') + path.sep)) throw new Error('Entry must be inside template/');
  if (!args.output.startsWith(path.join(args.repo, 'template', 'canonical') + path.sep)) throw new Error('Output must be inside template/canonical/');

  const queue = [args.entry];
  const seen = new Set();
  const ordered = [];
  const rawByFile = new Map();
  const classifications = [];
  while (queue.length) {
    const file = queue.shift();
    if (seen.has(file)) continue;
    seen.add(file); ordered.push(file);
    const raw = await fs.readFile(file, 'utf8');
    rawByFile.set(file, raw);
    const body = path.extname(file).toLowerCase().startsWith('.md') ? stripFrontmatter(raw) : raw.replace(/\r\n/g, '\n');
    for (const ref of discoverRefs(args.repo, file, body)) {
      if (ref.kind !== 'candidate') { classifications.push({ from: file, ...ref }); continue; }
      const classified = await classifyCandidate(args.repo, ref.target);
      classifications.push({ from: file, ...ref, ...classified });
      if (classified.kind === 'error') throw new Error(`${posixRel(args.repo, file)}: ${classified.reason}`);
      if (classified.kind === 'binary') throw new Error(`${posixRel(args.repo, file)}: binary dependency cannot be inlined: ${posixRel(args.repo, ref.target)}`);
      if (classified.kind === 'include' && !seen.has(classified.target)) queue.push(classified.target);
    }
  }

  const dependencies = ordered.slice(1);
  const tags = assignTags(args.repo, dependencies);
  const entryRaw = rawByFile.get(args.entry);
  let entryBody = transformMarkdown(args.repo, args.entry, stripFrontmatter(entryRaw), tags);
  if (!/^#\s+/m.test(entryBody)) entryBody = `# ${path.basename(args.entry, path.extname(args.entry))}\n\n${entryBody}`;

  const sections = [];
  for (const file of dependencies) {
    const raw = rawByFile.get(file);
    const ext = path.extname(file).toLowerCase();
    const content = ext === '.md' || ext === '.markdown'
      ? transformMarkdown(args.repo, file, stripFrontmatter(raw), tags)
      : `\`\`\`${language(file)}\n${raw.trimEnd()}\n\`\`\``;
    const tag = tags.get(file);
    sections.push(`<${tag}>\n\n${content}\n\n</${tag}>`);
  }

  const manifest = ordered.map((file) => ({ path: posixRel(args.repo, file), sha256: sha(rawByFile.get(file).replace(/\r\n/g, '\n')) }));
  const manifestComment = `<!-- canonical-manifest\n${JSON.stringify(manifest, null, 2)}\n-->`;
  const output = `${entryBody}\n${sections.length ? `\n---\n\n## 参考内容\n\n${sections.join('\n\n')}\n` : '\n'}\n${manifestComment}\n`;

  if (/<Path>[\s\S]*?<\/Path>/.test(output)) throw new Error('Internal error: output still contains <Path>');
  const existing = await fs.readFile(args.output, 'utf8').catch(() => null);
  if (args.check) {
    if (existing !== output) { console.error(`Canonical is stale or missing: ${posixRel(args.repo, args.output)}`); process.exitCode = 1; return; }
    console.log(`Canonical is current: ${posixRel(args.repo, args.output)} (${ordered.length} sources)`);
    return;
  }
  await fs.mkdir(path.dirname(args.output), { recursive: true });
  const tmp = `${args.output}.tmp-${process.pid}`;
  await fs.writeFile(tmp, output, 'utf8');
  await fs.rename(tmp, args.output);
  console.log(`Wrote ${posixRel(args.repo, args.output)} from ${ordered.length} sources`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
