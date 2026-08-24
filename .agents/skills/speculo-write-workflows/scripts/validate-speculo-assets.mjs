#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';

const ALIASES = new Set(['config', 'speculo', 'state', 'commands', 'skills', 'workflows']);
const ROOT_MAP = {
  config: 'template/config.json',
  speculo: 'template',
  state: 'template/.speculo',
  commands: 'template/commands',
  skills: 'template/skills',
  workflows: 'template/workflows',
};
const EXCLUDE_DIRS = new Set(['.git', 'node_modules', '.venv', 'dist', 'build', 'coverage']);
const START = '<!-- AUTO-INDEX-START -->';
const END = '<!-- AUTO-INDEX-END -->';

function usage(code = 0) {
  const out = code === 0 ? console.log : console.error;
  out(`Usage: node validate-speculo-assets.mjs <repo-root> [--workflow <id>] [--skills-only] [--json]\n\nValidates maintainer-skill links and, when template/ exists, current Speculo assets.`);
  process.exit(code);
}

function parseArgs(argv) {
  let repo;
  let workflow;
  let skillsOnly = false;
  let json = false;
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') usage(0);
    if (arg === '--workflow') workflow = argv[++i];
    else if (arg === '--skills-only') skillsOnly = true;
    else if (arg === '--json') json = true;
    else if (!repo) repo = arg;
    else throw new Error(`Unexpected argument: ${arg}`);
  }
  if (!repo) usage(2);
  if (!workflow && argv.includes('--workflow')) throw new Error('--workflow requires an id');
  return { repo: path.resolve(repo), workflow, skillsOnly, json };
}

async function exists(p) {
  try { await fs.access(p); return true; } catch { return false; }
}

async function walk(root) {
  const result = [];
  async function visit(dir) {
    for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
      if (entry.isDirectory() && EXCLUDE_DIRS.has(entry.name)) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) await visit(full);
      else if (entry.isFile()) result.push(full);
    }
  }
  if (await exists(root)) await visit(root);
  return result;
}

function lineOf(text, index) {
  return text.slice(0, index).split('\n').length;
}

function frontmatter(text) {
  const normalized = text.replace(/\r\n/g, '\n');
  if (!normalized.startsWith('---\n')) return null;
  const end = normalized.indexOf('\n---\n', 4);
  if (end < 0) return { error: 'unterminated frontmatter' };
  const block = normalized.slice(4, end);
  const data = {};
  const lines = block.split('\n');
  for (let i = 0; i < lines.length; i += 1) {
    const m = lines[i].match(/^([A-Za-z0-9_-]+):(?:\s*(.*))?$/);
    if (!m) continue;
    let raw = (m[2] || '').trim();
    if (raw === '>' || raw === '|') {
      const parts = [];
      while (i + 1 < lines.length && (/^\s+/.test(lines[i + 1]) || !lines[i + 1].trim())) {
        parts.push(lines[++i].trim());
      }
      raw = raw === '>' ? parts.filter(Boolean).join(' ') : parts.join('\n').trim();
    }
    data[m[1]] = raw.replace(/^['"]|['"]$/g, '');
  }
  return { data };
}

function maskCode(text) {
  const fenced = text.replace(/```[\s\S]*?```|~~~[\s\S]*?~~~/g, (block) => block.replace(/[^\n]/g, ' '));
  return fenced.replace(/`[^`\n]*`/g, (span) => ' '.repeat(span.length));
}

function stripLinkTarget(raw) {
  const target = raw.trim().replace(/^<|>$/g, '');
  return target.split('#')[0].split('?')[0];
}

function isExternal(target) {
  return /^(?:[a-z]+:|#|\/\/)/i.test(target);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const errors = [];
  const warnings = [];
  const checked = { files: 0, links: 0, paths: 0, json: 0, workflows: 0 };
  const rel = (p) => path.relative(args.repo, p).split(path.sep).join('/');
  const issue = (list, file, message, line) => list.push({ file: rel(file), ...(line ? { line } : {}), message });

  const skillsRoot = path.join(args.repo, '.agents', 'skills');
  if (!(await exists(skillsRoot))) throw new Error(`${skillsRoot}: not found`);
  const skillFiles = await walk(skillsRoot);
  for (const file of skillFiles.filter((p) => p.endsWith('.md'))) {
    const text = await fs.readFile(file, 'utf8');
    checked.files += 1;
    const regex = /\[[^\]]*\]\(([^)]+)\)/g;
    const linkText = maskCode(text);
    for (const m of linkText.matchAll(regex)) {
      const target = stripLinkTarget(m[1]);
      if (!target || isExternal(target)) continue;
      checked.links += 1;
      const resolved = path.resolve(path.dirname(file), decodeURIComponent(target));
      if (!resolved.startsWith(args.repo + path.sep) && resolved !== args.repo) {
        issue(errors, file, `relative link escapes repository: ${target}`, lineOf(text, m.index));
      } else if (!(await exists(resolved))) {
        issue(errors, file, `missing relative link target: ${target}`, lineOf(text, m.index));
      }
    }
    if (path.basename(file) === 'SKILL.md') {
      const fm = frontmatter(text);
      if (!fm) issue(errors, file, 'SKILL.md requires frontmatter', 1);
      else if (fm.error) issue(errors, file, fm.error, 1);
      else {
        if (!fm.data.name) issue(errors, file, 'frontmatter missing name', 1);
        if (!fm.data.description) issue(errors, file, 'frontmatter missing description', 1);
        const expected = path.basename(path.dirname(file));
        if (fm.data.name && fm.data.name !== expected && !rel(file).includes('/common/skills/')) {
          issue(errors, file, `name ${fm.data.name} does not match directory ${expected}`, 1);
        }
      }
    }
  }

  if (!args.skillsOnly && await exists(path.join(args.repo, 'template'))) {
    const templateRoot = path.join(args.repo, 'template');
    const templateFiles = await walk(templateRoot);
    for (const file of templateFiles) {
      const text = await fs.readFile(file, 'utf8').catch(() => null);
      if (text === null) continue;
      checked.files += 1;
      const isJson = file.endsWith('.json');
      const isMarkdown = file.endsWith('.md');
      if (isJson) {
        try { JSON.parse(text); checked.json += 1; }
        catch (error) { issue(errors, file, `invalid JSON: ${error.message}`); }
      }
      if (!isMarkdown && !isJson) continue;
      const underCommandsOrSkills = file.startsWith(path.join(templateRoot, 'commands') + path.sep)
        || file.startsWith(path.join(templateRoot, 'skills') + path.sep);
      if (underCommandsOrSkills) {
        const legacyPatterns = [
          [/speculo\/\.speculo(?:\/|\b)/, 'runtime state must use <Path>{roots.state}/...</Path>'],
          [/speculo\/config\.json\b/, 'config must use <Path>{roots.config}</Path>'],
          [/speculo\/workflows(?:\/|\b)/, 'workflow assets must use <Path>{roots.workflows}/...</Path>'],
          [/(?:^|[\s`(])(?:\.\.\/)+skills\//m, 'cross-package skill references must use roots.skills'],
          [/(?:^|[\s`(])(?:\.\.\/)+commands\//m, 'cross-package command references must use roots.commands'],
        ];
        for (const [pattern, message] of legacyPatterns) {
          if (pattern.test(text)) issue(errors, file, message);
        }
      }
      if (isJson && !underCommandsOrSkills) continue;
      // README.md and .speculo/ docs explain <Path> syntax in prose (bare tags, {roots.X}
      // placeholders, ellipses); they are human docs, not instruction assets — skip Path checks.
      const isProseDoc = path.basename(file) === 'README.md' || file.includes('/.speculo/');
      if (isProseDoc) continue;
      const openCount = (text.match(/<Path>/g) || []).length;
      const closeCount = (text.match(/<\/Path>/g) || []).length;
      if (openCount !== closeCount) issue(errors, file, `unbalanced <Path> tags: ${openCount} open, ${closeCount} close`);
      const pathRegex = /<Path>([\s\S]*?)<\/Path>/g;
      for (const m of text.matchAll(pathRegex)) {
        checked.paths += 1;
        const value = m[1].trim();
        const line = lineOf(text, m.index);
        // Ellipsis is a prose placeholder for an omitted path tail, not a real target.
        if (value.includes('...')) continue;
        if (value.includes('\\') || /(^|\/)\.\.(\/|$)/.test(value)) issue(errors, file, `unsafe Path: ${value}`, line);
        const root = value.match(/^\{roots\.([a-zA-Z0-9_-]+)\}(.*)$/);
        if (!root) {
          // Project-relative paths (e.g. src/example.ts, packages/example/**) carry no
          // root alias by contract (path-reference-contract §3); only reject machine-absolute paths.
          if (/^(?:\/|[A-Za-z]:[\\/]|~)/.test(value)) {
            issue(errors, file, `project path must be repo-relative, not absolute: ${value}`, line);
          }
          continue;
        }
        const [, alias, suffix] = root;
        // {roots.X} / {roots.xxx} are metasyntactic placeholders used when documenting the
        // alias mechanism itself, not concrete aliases to resolve.
        if (alias === 'X' || alias === 'xxx') continue;
        if (!ALIASES.has(alias)) { issue(errors, file, `unknown root alias: roots.${alias}`, line); continue; }
        if (alias === 'workflows' && /\/_state(?:\/|$)/.test(suffix)) {
          issue(errors, file, `runtime references must use roots.state, not workflow _state: ${value}`, line);
        }
        if (alias === 'state') continue;
        const hasVariable = /\{[^}]+\}|<[^>]+>/.test(suffix);
        const source = alias === 'config'
          ? path.join(args.repo, ROOT_MAP.config)
          : path.join(args.repo, ROOT_MAP[alias], suffix.replace(/^\//, ''));
        if (!hasVariable) {
          if (!(await exists(source))) issue(errors, file, `static Path target does not exist: ${value} -> ${rel(source)}`, line);
        } else {
          const staticPrefix = suffix.split(/\{|</, 1)[0].replace(/^\//, '').replace(/\/$/, '');
          const prefixPath = alias === 'config' ? source : path.join(args.repo, ROOT_MAP[alias], staticPrefix);
          if (!(await exists(prefixPath))) issue(errors, file, `static Path prefix does not exist: ${value} -> ${rel(prefixPath)}`, line);
        }
      }
    }

    const commandsDir = path.join(templateRoot, 'commands');
    for (const file of (await walk(commandsDir)).filter((p) => p.endsWith('.md'))) {
      const text = await fs.readFile(file, 'utf8');
      const fm = frontmatter(text);
      if (!fm || fm.error) { issue(errors, file, 'command requires valid frontmatter', 1); continue; }
      const expected = path.basename(file, '.md');
      if (fm.data.id !== expected) issue(errors, file, `command id must equal filename: expected ${expected}`, 1);
      if (fm.data.type !== 'command') issue(errors, file, 'command type must be command', 1);
      for (const key of ['name', 'description']) if (!fm.data[key]) issue(errors, file, `frontmatter missing ${key}`, 1);
    }

    const workflowRoot = path.join(templateRoot, 'workflows');
    if (await exists(workflowRoot)) {
      const workflowDirs = (await fs.readdir(workflowRoot, { withFileTypes: true }))
        .filter((d) => d.isDirectory() && (!args.workflow || d.name === args.workflow));
      for (const wf of workflowDirs) {
        checked.workflows += 1;
        const dir = path.join(workflowRoot, wf.name);
        const index = path.join(dir, 'INDEX.md');
        if (!(await exists(index))) { issue(errors, dir, 'workflow missing INDEX.md'); continue; }
        const text = await fs.readFile(index, 'utf8');
        const indexFm = frontmatter(text);
        // Two catalog modes: `type: workflow` uses an AUTO-INDEX marker pair in README.md;
        // `type: workflow-index` (auto_generated: true) is a fully generated file with no markers.
        const wholeFileGenerated = indexFm && !indexFm.error &&
          (indexFm.data.type === 'workflow-index' || indexFm.data.auto_generated === 'true');
        if (!wholeFileGenerated) {
          if ((text.split(START).length - 1) !== 0 || (text.split(END).length - 1) !== 0) {
            issue(errors, index, 'type: workflow INDEX must not contain AUTO-INDEX markers');
          }
          const activation = path.join(dir, 'README.md');
          if (!(await exists(activation))) {
            issue(errors, activation, 'type: workflow requires README.md activation contract');
          } else {
            const activationText = await fs.readFile(activation, 'utf8');
            if ((activationText.split(START).length - 1) !== 1 ||
                (activationText.split(END).length - 1) !== 1) {
              issue(errors, activation, 'README requires exactly one AUTO-INDEX marker pair');
            }
          }
        }
        const workDirs = (await fs.readdir(dir, { withFileTypes: true }))
          .filter((d) => d.isDirectory() && /^[A-Z]-[a-z0-9][a-z0-9-]*$/.test(d.name));
        for (const work of workDirs) {
          const entry = path.join(dir, work.name, `${work.name}.md`);
          if (!(await exists(entry))) { issue(errors, entry, 'work directory missing same-named entry'); continue; }
          const wt = await fs.readFile(entry, 'utf8');
          const fm = frontmatter(wt);
          if (!fm || fm.error) { issue(errors, entry, 'work entry requires valid frontmatter', 1); continue; }
          if (fm.data.type !== 'workflow-entry') issue(errors, entry, 'work type must be workflow-entry', 1);
          if (fm.data.workflow !== wf.name) issue(errors, entry, `workflow field must be ${wf.name}`, 1);
          for (const key of ['id', 'name', 'description']) if (!fm.data[key]) issue(errors, entry, `frontmatter missing ${key}`, 1);
        }
      }
    }
  }

  const result = { ok: errors.length === 0, checked, errors, warnings };
  if (args.json) console.log(JSON.stringify(result, null, 2));
  else {
    for (const e of errors) console.error(`ERROR ${e.file}${e.line ? `:${e.line}` : ''} — ${e.message}`);
    for (const w of warnings) console.warn(`WARN  ${w.file}${w.line ? `:${w.line}` : ''} — ${w.message}`);
    console.log(`${result.ok ? 'PASS' : 'FAIL'}: ${checked.files} files, ${checked.links} links, ${checked.paths} Path tags, ${checked.json} JSON files, ${checked.workflows} workflows; ${errors.length} errors.`);
  }
  if (!result.ok) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
