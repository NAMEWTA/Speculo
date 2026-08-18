#!/usr/bin/env node

import { lstat, mkdir, readFile, readdir, realpath, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const SCHEMA_VERSION = '1.0.0';
const DEFAULT_IGNORED_DIRECTORIES = new Set([
  '.git', '.hg', '.svn', '.idea', '.vscode',
  'node_modules', 'bower_components', 'vendor',
  'dist', 'build', 'out', 'target', 'coverage',
  '.next', '.nuxt', '.output', '.turbo', '.gradle',
  '.cache', '.parcel-cache', '.vite', '.svelte-kit',
  'bin', 'obj', '.venv', 'venv', '__pycache__',
  '.pytest_cache', '.mypy_cache', '.ruff_cache',
]);

const SOURCE_EXTENSIONS = new Set([
  '.ts', '.tsx', '.mts', '.cts', '.js', '.jsx', '.mjs', '.cjs', '.vue',
  '.java', '.go', '.rs', '.kt', '.kts', '.py', '.cs', '.c', '.cc', '.cpp',
  '.h', '.hpp', '.swift', '.rb', '.php', '.scala', '.ex', '.exs',
]);

function usage() {
  return `Usage: node scripts/discover-project.mjs --root <path> [options]\n\n` +
    `Build a deterministic, read-only Project Inventory. No project command is executed.\n\n` +
    `Options:\n` +
    `  --root <path>       Repository/workspace root (required)\n` +
    `  --output <path>     Write JSON below --root; stdout when omitted\n` +
    `  --pretty            Pretty-print JSON\n` +
    `  --max-depth <n>     Maximum directory depth (default: 14)\n` +
    `  --max-files <n>     Maximum visited files (default: 30000)\n` +
    `  --max-bytes <n>     Maximum bytes read from one file (default: 2097152)\n` +
    `  --help              Show this help\n\n` +
    `Examples:\n` +
    `  node scripts/discover-project.mjs --root . --pretty\n` +
    `  node scripts/discover-project.mjs --root . --output .engineering/project-inventory.json --pretty\n`;
}

function fail(message, code = 1) {
  process.stderr.write(`discover-project: ${message}\n`);
  process.exitCode = code;
}

function parsePositiveInt(value, flag) {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new Error(`${flag} must be a positive integer`);
  }
  return parsed;
}

function parseArgs(argv) {
  const args = {
    root: null,
    output: null,
    pretty: false,
    maxDepth: 14,
    maxFiles: 30000,
    maxBytes: 2 * 1024 * 1024,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') return { help: true };
    if (arg === '--pretty') { args.pretty = true; continue; }
    if (['--root', '--output', '--max-depth', '--max-files', '--max-bytes'].includes(arg)) {
      const value = argv[i + 1];
      if (!value || value.startsWith('--')) throw new Error(`${arg} requires a value`);
      i += 1;
      if (arg === '--root') args.root = value;
      if (arg === '--output') args.output = value;
      if (arg === '--max-depth') args.maxDepth = parsePositiveInt(value, arg);
      if (arg === '--max-files') args.maxFiles = parsePositiveInt(value, arg);
      if (arg === '--max-bytes') args.maxBytes = parsePositiveInt(value, arg);
      continue;
    }
    throw new Error(`unknown argument: ${arg}`);
  }
  if (!args.root) throw new Error('--root is required');
  return args;
}

function toPosix(value) {
  return value.split(path.sep).join('/');
}

function normalizeRel(value) {
  if (!value || value === '') return '.';
  return toPosix(value);
}

function isPathInside(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
}

async function pathIsDirectory(candidate) {
  try { return (await stat(candidate)).isDirectory(); }
  catch { return false; }
}

function isWithinAny(candidate, roots) {
  return roots.some((root) => isPathInside(root, candidate));
}

async function nearestExistingAncestor(candidate) {
  let current = candidate;
  while (true) {
    try {
      await lstat(current);
      return current;
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error;
      const parent = path.dirname(current);
      if (parent === current) throw error;
      current = parent;
    }
  }
}

async function resolveSafeOutput(rootReal, outputArg) {
  const outputAbs = path.resolve(rootReal, outputArg);
  if (!isPathInside(rootReal, outputAbs)) {
    throw new Error(`--output escapes --root: ${outputArg}`);
  }
  const existingAncestor = await nearestExistingAncestor(path.dirname(outputAbs));
  const ancestorReal = await realpath(existingAncestor);
  if (!isPathInside(rootReal, ancestorReal)) {
    throw new Error(`--output traverses a symlink outside --root: ${outputArg}`);
  }
  try {
    const outputInfo = await lstat(outputAbs);
    if (outputInfo.isSymbolicLink()) {
      const outputReal = await realpath(outputAbs);
      if (!isPathInside(rootReal, outputReal)) {
        throw new Error(`--output symlink escapes --root: ${outputArg}`);
      }
    }
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }
  return outputAbs;
}

function addSortedUnique(target, values) {
  for (const value of values) {
    if (value) target.add(value);
  }
}

function sorted(values) {
  return [...values].sort((a, b) => a.localeCompare(b, 'en'));
}

function stableSortObjects(values, keys) {
  return values.sort((left, right) => {
    for (const key of keys) {
      const cmp = String(left[key] ?? '').localeCompare(String(right[key] ?? ''), 'en');
      if (cmp !== 0) return cmp;
    }
    return 0;
  });
}

function relativeToModule(fileRel, modulePath) {
  if (modulePath === '.') return fileRel;
  return fileRel === modulePath ? '.' : fileRel.slice(modulePath.length + 1);
}

function relIsWithin(fileRel, directoryRel) {
  return directoryRel === '.' || fileRel === directoryRel || fileRel.startsWith(`${directoryRel}/`);
}

async function walkFiles(rootReal, options, outputAbs, excludedRoots = []) {
  const files = [];
  const limitations = [];
  const skippedSymlinks = [];
  let visited = 0;
  let truncated = false;
  const outputRel = outputAbs ? normalizeRel(path.relative(rootReal, outputAbs)) : null;

  async function visit(directoryAbs, depth) {
    if (truncated) return;
    if (depth > options.maxDepth) {
      limitations.push({ type: 'max-depth', path: normalizeRel(path.relative(rootReal, directoryAbs)), limit: options.maxDepth });
      return;
    }
    let entries;
    try {
      entries = await readdir(directoryAbs, { withFileTypes: true });
    } catch (error) {
      limitations.push({ type: 'read-directory-failed', path: normalizeRel(path.relative(rootReal, directoryAbs)), error: error.message });
      return;
    }
    entries.sort((a, b) => a.name.localeCompare(b.name, 'en'));
    for (const entry of entries) {
      if (truncated) break;
      const abs = path.join(directoryAbs, entry.name);
      const rel = normalizeRel(path.relative(rootReal, abs));
      if (entry.isSymbolicLink()) {
        let target = null;
        try { target = await realpath(abs); } catch { /* broken link */ }
        skippedSymlinks.push({ path: rel, target: target && isPathInside(rootReal, target) ? normalizeRel(path.relative(rootReal, target)) : target ? '<outside-root>' : '<unresolved>' });
        continue;
      }
      if (entry.isDirectory()) {
        if (DEFAULT_IGNORED_DIRECTORIES.has(entry.name)) continue;
        if (isWithinAny(abs, excludedRoots)) continue;
        await visit(abs, depth + 1);
        continue;
      }
      if (!entry.isFile()) continue;
      if (outputRel && rel === outputRel) continue;
      visited += 1;
      if (visited > options.maxFiles) {
        limitations.push({ type: 'max-files', path: rel, limit: options.maxFiles });
        truncated = true;
        break;
      }
      let info;
      try { info = await stat(abs); } catch { continue; }
      files.push({ abs, rel, size: info.size, ext: path.extname(entry.name).toLowerCase(), name: entry.name });
    }
  }

  await visit(rootReal, 0);
  return { files, limitations, skippedSymlinks, truncated };
}

async function createReader(maxBytes, limitations) {
  const cache = new Map();
  return async function readText(file) {
    if (!file) return null;
    if (cache.has(file.abs)) return cache.get(file.abs);
    if (file.size > maxBytes) {
      limitations.push({ type: 'max-bytes', path: file.rel, size: file.size, limit: maxBytes });
      cache.set(file.abs, null);
      return null;
    }
    try {
      const value = await readFile(file.abs, 'utf8');
      cache.set(file.abs, value);
      return value;
    } catch (error) {
      limitations.push({ type: 'read-file-failed', path: file.rel, error: error.message });
      cache.set(file.abs, null);
      return null;
    }
  };
}

async function collectManagedSkillEntrypoints(rootReal, managedRoots) {
  const entries = [];
  let visited = 0;
  async function visit(directory, depth) {
    if (depth > 5 || visited > 5000 || !(await pathIsDirectory(directory))) return;
    const children = await readdir(directory, { withFileTypes: true });
    children.sort((a, b) => a.name.localeCompare(b.name, 'en'));
    for (const child of children) {
      visited += 1;
      if (visited > 5000) break;
      const abs = path.join(directory, child.name);
      if (child.isSymbolicLink()) continue;
      if (child.isDirectory()) { await visit(abs, depth + 1); continue; }
      if (child.isFile() && child.name === 'SKILL.md') entries.push(normalizeRel(path.relative(rootReal, abs)));
    }
  }
  for (const managedRoot of managedRoots) await visit(managedRoot, 0);
  return sorted(new Set(entries));
}

function findCandidateModulePaths(files) {
  const moduleFiles = new Map();
  const manifestNames = new Set(['package.json', 'pom.xml', 'build.gradle', 'build.gradle.kts', 'go.mod', 'go.work', 'Cargo.toml']);
  for (const file of files) {
    if (!manifestNames.has(file.name)) continue;
    const directory = normalizeRel(path.posix.dirname(file.rel));
    if (!moduleFiles.has(directory)) moduleFiles.set(directory, []);
    moduleFiles.get(directory).push(file);
  }
  if (moduleFiles.size === 0 && files.some((file) => SOURCE_EXTENSIONS.has(file.ext))) {
    moduleFiles.set('.', []);
  }
  return moduleFiles;
}

function assignFilesToModules(files, modulePaths) {
  const ordered = [...modulePaths].sort((a, b) => b.length - a.length || a.localeCompare(b, 'en'));
  const assigned = new Map(modulePaths.map((modulePath) => [modulePath, []]));
  const unscoped = [];
  for (const file of files) {
    const owner = ordered.find((modulePath) => relIsWithin(file.rel, modulePath));
    if (owner) assigned.get(owner).push(file);
    else unscoped.push(file);
  }
  return { assigned, unscoped };
}

function dependencyMap(packageJson) {
  return {
    ...(packageJson?.dependencies ?? {}),
    ...(packageJson?.devDependencies ?? {}),
    ...(packageJson?.peerDependencies ?? {}),
    ...(packageJson?.optionalDependencies ?? {}),
  };
}

function hasDependency(dependencies, names) {
  return names.some((name) => Object.prototype.hasOwnProperty.call(dependencies, name));
}

function firstMatchingRoot(paths, patterns) {
  const roots = new Set();
  for (const rel of paths) {
    for (const pattern of patterns) {
      if (rel === pattern || rel.startsWith(`${pattern}/`)) roots.add(pattern);
    }
  }
  return roots;
}

function detectSourceRoots(localFiles, modulePath, language) {
  const rels = localFiles.map((file) => relativeToModule(file.rel, modulePath));
  const roots = new Set();
  if (language === 'java') {
    addSortedUnique(roots, firstMatchingRoot(rels, ['src/main/java', 'src/main/resources', 'src/test/java', 'src/test/resources']));
  } else if (language === 'go') {
    addSortedUnique(roots, firstMatchingRoot(rels, ['cmd', 'internal', 'pkg', 'api']));
    if (rels.some((rel) => rel.endsWith('.go') && !rel.includes('/'))) roots.add('.');
  } else if (language === 'rust') {
    addSortedUnique(roots, firstMatchingRoot(rels, ['src', 'tests', 'examples', 'benches']));
  } else {
    addSortedUnique(roots, firstMatchingRoot(rels, ['src', 'app', 'pages', 'components', 'lib', 'test', 'tests', 'e2e']));
    if (rels.some((rel) => /\.(?:ts|tsx|js|jsx|vue)$/.test(rel) && !rel.includes('/'))) roots.add('.');
  }
  return roots;
}

function detectTestRoots(localFiles, modulePath) {
  const roots = new Set();
  for (const file of localFiles) {
    const rel = relativeToModule(file.rel, modulePath);
    if (rel.startsWith('src/test/')) roots.add(rel.startsWith('src/test/java') ? 'src/test/java' : 'src/test');
    if (/^(test|tests|e2e|__tests__)(\/|$)/.test(rel)) roots.add(rel.split('/')[0]);
    if (/(^|\/)(?:[^/]+\.)?(?:test|spec)\.[^.]+$/.test(rel)) {
      const first = rel.split('/')[0];
      roots.add(first === rel ? '.' : first);
    }
    if (rel.endsWith('_test.go')) {
      const dir = path.posix.dirname(rel);
      roots.add(dir === '.' ? '.' : dir);
    }
  }
  return roots;
}

function publicEntrypointsForPackage(pkg, localFiles, modulePath) {
  const entries = new Set();
  if (pkg) {
    for (const key of ['main', 'module', 'types', 'typings', 'browser']) {
      if (typeof pkg[key] === 'string') entries.add(pkg[key]);
    }
    if (typeof pkg.bin === 'string') entries.add(pkg.bin);
    if (pkg.bin && typeof pkg.bin === 'object') {
      for (const value of Object.values(pkg.bin)) if (typeof value === 'string') entries.add(value);
    }
    if (typeof pkg.exports === 'string') entries.add(pkg.exports);
    if (pkg.exports && typeof pkg.exports === 'object') {
      for (const key of Object.keys(pkg.exports)) entries.add(`package-export:${key}`);
    }
  }
  const common = new Set(['src/main.ts', 'src/main.tsx', 'src/main.js', 'src/main.jsx', 'src/index.ts', 'src/index.tsx', 'src/index.js', 'src/index.jsx', 'src/lib.rs', 'src/main.rs']);
  for (const file of localFiles) {
    const rel = relativeToModule(file.rel, modulePath);
    if (common.has(rel)) entries.add(rel);
    if (rel === 'module-info.java') entries.add(rel);
    if (rel.startsWith('cmd/') && rel.endsWith('/main.go')) entries.add(rel);
  }
  return entries;
}

function extractPackageManager(pkg, localFiles) {
  const managers = new Set();
  if (typeof pkg?.packageManager === 'string') managers.add(pkg.packageManager.split('@')[0]);
  for (const file of localFiles) {
    if (file.name === 'pnpm-lock.yaml') managers.add('pnpm');
    if (file.name === 'yarn.lock') managers.add('yarn');
    if (file.name === 'package-lock.json' || file.name === 'npm-shrinkwrap.json') managers.add('npm');
    if (file.name === 'bun.lock' || file.name === 'bun.lockb') managers.add('bun');
  }
  return managers;
}

function evidence(pathValue, signal, confidence = 'high') {
  return { path: pathValue, signal, confidence };
}

function dependencyVersion(dependencies, name) {
  const value = dependencies[name];
  return typeof value === 'string' ? value : null;
}

function parseTomlValue(text, key) {
  if (!text) return null;
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = text.match(new RegExp(`^\\s*${escaped}\\s*=\\s*["']([^"']+)["']`, 'm'));
  return match?.[1] ?? null;
}

function parseXmlTag(text, tag) {
  if (!text) return null;
  const escaped = tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = text.match(new RegExp(`<${escaped}>([^<]+)</${escaped}>`));
  return match?.[1]?.trim() ?? null;
}

function parseProjectArtifactId(pomText) {
  if (!pomText) return null;
  const withoutParent = pomText.replace(/<parent>[\s\S]*?<\/parent>/, '');
  return parseXmlTag(withoutParent, 'artifactId');
}

function parseGradleJavaVersion(text) {
  if (!text) return null;
  const patterns = [
    /JavaLanguageVersion\.of\((\d+)\)/,
    /sourceCompatibility\s*=\s*(?:JavaVersion\.VERSION_)?([0-9_]+)/,
    /jvmToolchain\((\d+)\)/,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[1].replaceAll('_', '.');
  }
  return null;
}

function sourceContains(localTexts, pattern) {
  return localTexts.some(({ text }) => text && pattern.test(text));
}

async function analyzeModule(modulePath, moduleFiles, localFiles, readText, rootFilesByRel) {
  const byName = new Map(moduleFiles.map((file) => [file.name, file]));
  const packageFile = byName.get('package.json');
  let pkg = null;
  if (packageFile) {
    const text = await readText(packageFile);
    try { pkg = text ? JSON.parse(text) : null; } catch { pkg = null; }
  }
  const dependencies = dependencyMap(pkg);
  const localSourceFiles = localFiles.filter((file) => SOURCE_EXTENSIONS.has(file.ext));
  const representativeSource = localSourceFiles.slice(0, 150);
  const localTexts = [];
  for (const file of representativeSource) {
    const text = await readText(file);
    if (text !== null) localTexts.push({ file, text });
  }

  const languages = new Set();
  const adapters = new Set();
  const frameworks = new Set();
  const runtimes = new Set();
  const buildSystems = new Set();
  const packageManagers = extractPackageManager(pkg, localFiles);
  const testSystems = new Set();
  const applicationTypes = new Set();
  const configuredTools = new Set();
  const versions = {};
  const moduleEvidence = [];
  const conflicts = [];
  const unknowns = [];

  const hasVueSource = localSourceFiles.some((file) => file.ext === '.vue');
  const vueUsesTypeScript = localTexts.some(({ file, text }) => file.ext === '.vue' && /<script\b[^>]*\blang=["']ts["']/i.test(text));
  const hasTsSource = localSourceFiles.some((file) => ['.ts', '.tsx', '.mts', '.cts'].includes(file.ext)) || vueUsesTypeScript;
  const hasJsSource = localSourceFiles.some((file) => ['.js', '.jsx', '.mjs', '.cjs'].includes(file.ext));
  const hasTsConfig = localFiles.some((file) => /^tsconfig(?:\..+)?\.json$/.test(file.name));
  const packageHasCodeSignal = hasTsSource || hasJsSource || hasVueSource || hasTsConfig || hasDependency(dependencies, ['typescript', 'tsx', 'ts-node']);
  if (packageFile && packageHasCodeSignal) {
    if (hasTsSource || hasTsConfig || hasDependency(dependencies, ['typescript'])) languages.add('typescript');
    else languages.add('javascript');
    adapters.add('typescript');
    moduleEvidence.push(evidence(packageFile.rel, 'JavaScript/TypeScript package manifest'));
  } else if (hasTsSource || hasTsConfig) {
    languages.add('typescript'); adapters.add('typescript');
    moduleEvidence.push(evidence(localSourceFiles.find((file) => ['.ts', '.tsx', '.mts', '.cts'].includes(file.ext))?.rel ?? localSourceFiles.find((file) => file.ext === '.vue')?.rel ?? modulePath, 'TypeScript-family source', 'medium'));
  } else if (hasJsSource || hasVueSource) {
    languages.add('javascript'); adapters.add('typescript');
    moduleEvidence.push(evidence(localSourceFiles.find((file) => ['.js', '.jsx', '.mjs', '.cjs', '.vue'].includes(file.ext))?.rel ?? modulePath, 'JavaScript or Vue source', 'medium'));
  }

  if (adapters.has('typescript')) {
    if (hasDependency(dependencies, ['typescript'])) versions.typescript = dependencyVersion(dependencies, 'typescript');
    if (typeof pkg?.engines?.node === 'string') versions.node = pkg.engines.node;
    if (typeof pkg?.packageManager === 'string') versions.packageManager = pkg.packageManager;
    if (pkg?.type === 'module') versions.moduleType = 'esm';
    else if (pkg?.type === 'commonjs') versions.moduleType = 'commonjs';

    const vueSource = localSourceFiles.find((file) => file.ext === '.vue');
    const reactSourceSignal = localSourceFiles.find((file) => ['.tsx', '.jsx'].includes(file.ext));
    if (hasDependency(dependencies, ['vue', '@vue/runtime-core', '@vue/runtime-dom']) || vueSource) {
      frameworks.add('vue'); runtimes.add('browser'); applicationTypes.add('web-app');
      moduleEvidence.push(evidence(vueSource?.rel ?? packageFile?.rel ?? modulePath, vueSource ? 'Vue single-file component' : 'Vue dependency'));
      versions.vue = dependencyVersion(dependencies, 'vue');
    }
    if (hasDependency(dependencies, ['pinia'])) { frameworks.add('pinia'); versions.pinia = dependencyVersion(dependencies, 'pinia'); }
    if (hasDependency(dependencies, ['vuex'])) { frameworks.add('vuex'); versions.vuex = dependencyVersion(dependencies, 'vuex'); }
    if (hasDependency(dependencies, ['react', 'react-dom', 'next']) || (reactSourceSignal && sourceContains(localTexts, /(?:from\s+['"]react|react-dom\/client|jsx-runtime)/))) {
      frameworks.add('react'); runtimes.add('browser'); applicationTypes.add('web-app');
      moduleEvidence.push(evidence(packageFile?.rel ?? reactSourceSignal?.rel ?? modulePath, 'React dependency or source import'));
      versions.react = dependencyVersion(dependencies, 'react');
    }
    if (hasDependency(dependencies, ['next'])) { frameworks.add('next'); runtimes.add('node'); versions.next = dependencyVersion(dependencies, 'next'); }
    if (hasDependency(dependencies, ['nuxt'])) { frameworks.add('nuxt'); frameworks.add('vue'); runtimes.add('node'); runtimes.add('browser'); versions.nuxt = dependencyVersion(dependencies, 'nuxt'); }
    if (hasDependency(dependencies, ['@nestjs/core'])) { frameworks.add('nestjs'); runtimes.add('node'); applicationTypes.add('service'); }
    if (hasDependency(dependencies, ['express', 'fastify', 'koa', 'h3'])) { frameworks.add('node-web'); runtimes.add('node'); applicationTypes.add('service'); }
    if (hasDependency(dependencies, ['electron'])) { frameworks.add('electron'); runtimes.add('electron'); runtimes.add('node'); runtimes.add('browser'); applicationTypes.add('desktop-app'); versions.electron = dependencyVersion(dependencies, 'electron'); }
    if (hasDependency(dependencies, ['vite']) || localFiles.some((file) => /^vite\.config\./.test(file.name))) { buildSystems.add('vite'); versions.vite = dependencyVersion(dependencies, 'vite'); }
    if (hasDependency(dependencies, ['webpack']) || localFiles.some((file) => /^webpack\.config\./.test(file.name))) buildSystems.add('webpack');
    if (hasTsConfig || hasDependency(dependencies, ['typescript'])) buildSystems.add('tsc');
    if (hasDependency(dependencies, ['rollup'])) buildSystems.add('rollup');
    if (hasDependency(dependencies, ['esbuild'])) buildSystems.add('esbuild');

    if (hasDependency(dependencies, ['vitest']) || Object.values(pkg?.scripts ?? {}).some((script) => /\bvitest\b/.test(String(script)))) testSystems.add('vitest');
    if (hasDependency(dependencies, ['jest', '@jest/core']) || Object.values(pkg?.scripts ?? {}).some((script) => /\bjest\b/.test(String(script)))) testSystems.add('jest');
    if (hasDependency(dependencies, ['@playwright/test', 'playwright'])) testSystems.add('playwright');
    if (hasDependency(dependencies, ['cypress'])) testSystems.add('cypress');
    if (hasDependency(dependencies, ['@vue/test-utils'])) testSystems.add('vue-test-utils');
    if (hasDependency(dependencies, ['@testing-library/react', '@testing-library/vue'])) testSystems.add('testing-library');
    if (localSourceFiles.some((file) => /\.(?:test|spec)\.(?:ts|tsx|js|jsx)$/.test(file.name)) && testSystems.size === 0) testSystems.add('javascript-test-runner:unknown');

    if (hasDependency(dependencies, ['eslint', 'typescript-eslint', '@typescript-eslint/parser'])) configuredTools.add('eslint');
    if (hasDependency(dependencies, ['eslint-plugin-vue'])) configuredTools.add('eslint-plugin-vue');
    if (hasDependency(dependencies, ['prettier'])) configuredTools.add('prettier');
    if (hasDependency(dependencies, ['@biomejs/biome'])) configuredTools.add('biome');
    if (hasDependency(dependencies, ['oxlint'])) configuredTools.add('oxlint');
    if (hasDependency(dependencies, ['vue-tsc'])) configuredTools.add('vue-tsc');

    if (pkg?.bin) { applicationTypes.add('cli'); runtimes.add('node'); }
    if (pkg?.exports || pkg?.main || pkg?.module || pkg?.types || pkg?.typings) applicationTypes.add('library');
    if (sourceContains(localTexts, /(?:from\s+['"]node:|require\(['"](?:fs|path|http|https|stream|child_process)['"]\)|\bprocess\.(?:env|argv|cwd))/)) runtimes.add('node');
    if ((frameworks.has('react') || frameworks.has('vue')) && !runtimes.has('browser')) runtimes.add('browser');
    if (frameworks.has('react') && frameworks.has('vue')) conflicts.push({ type: 'multiple-ui-frameworks', detail: 'React and Vue signals exist in the same module scope.' });
  }

  const pomFile = byName.get('pom.xml');
  const gradleFiles = [byName.get('build.gradle'), byName.get('build.gradle.kts')].filter(Boolean);
  const javaFiles = localSourceFiles.filter((file) => file.ext === '.java');
  const kotlinFiles = localSourceFiles.filter((file) => ['.kt', '.kts'].includes(file.ext));
  const pomText = pomFile ? await readText(pomFile) : null;
  const gradleTexts = [];
  for (const file of gradleFiles) gradleTexts.push((await readText(file)) ?? '');
  const javaText = localTexts.filter(({ file }) => file.ext === '.java').map(({ text }) => text).join('\n');
  const kotlinText = localTexts.filter(({ file }) => ['.kt', '.kts'].includes(file.ext)).map(({ text }) => text).join('\n');
  const combinedJavaBuild = `${pomText ?? ''}\n${gradleTexts.join('\n')}`;
  const kotlinBuildSignal = /kotlin-maven-plugin|org\.jetbrains\.kotlin|kotlin\(["']jvm["']\)/.test(combinedJavaBuild);
  const explicitJavaBuildSignal = /maven-compiler-plugin|<maven\.compiler\.|id\s*["']java["']|java-library|sourceCompatibility|JavaLanguageVersion/.test(combinedJavaBuild);
  const hasJvmBuild = Boolean(pomFile || gradleFiles.length > 0);
  if (pomFile) { buildSystems.add('maven'); moduleEvidence.push(evidence(pomFile.rel, 'Maven project')); }
  if (gradleFiles.length > 0) { buildSystems.add('gradle'); moduleEvidence.push(evidence(gradleFiles[0].rel, 'Gradle project')); }
  if (pomFile && gradleFiles.length > 0) conflicts.push({ type: 'multiple-java-build-systems', detail: 'Maven and Gradle build files exist in the same module scope.' });
  if (hasJvmBuild || javaFiles.length > 0 || kotlinFiles.length > 0) runtimes.add('jvm');
  const javaLanguageSignal = javaFiles.length > 0 || (hasJvmBuild && !kotlinBuildSignal) || explicitJavaBuildSignal;
  if (javaLanguageSignal) {
    languages.add('java'); adapters.add('java');
  }
  if (kotlinFiles.length > 0 || kotlinBuildSignal) languages.add('kotlin');
  if (hasJvmBuild || javaFiles.length > 0 || kotlinFiles.length > 0) {
    if (/spring-boot|org\.springframework\.boot/.test(combinedJavaBuild) || /@SpringBootApplication|SpringApplication\.run/.test(`${javaText}\n${kotlinText}`)) {
      frameworks.add('spring-boot'); applicationTypes.add('service');
      moduleEvidence.push(evidence(pomFile?.rel ?? gradleFiles[0]?.rel ?? javaFiles[0]?.rel ?? kotlinFiles[0]?.rel ?? modulePath, 'Spring Boot build or application signal'));
      const bootVersion = combinedJavaBuild.match(/spring-boot[^<\n]*<\/artifactId>\s*<version>([^<]+)/)?.[1]
        ?? combinedJavaBuild.match(/org\.springframework\.boot[^\n]*version\s*["']([^"']+)/)?.[1];
      if (bootVersion) versions.springBoot = bootVersion.trim();
    }
    if (/junit-jupiter|org\.junit|spring-boot-starter-test/.test(combinedJavaBuild) || localFiles.some((file) => file.rel.includes('/src/test/'))) testSystems.add('junit');
    if (/testcontainers/.test(combinedJavaBuild) || /org\.testcontainers/.test(`${javaText}\n${kotlinText}`)) testSystems.add('testcontainers');
    if (/mockito/.test(combinedJavaBuild)) testSystems.add('mockito');
    for (const [signal, tool] of [['spotless', 'spotless'], ['checkstyle', 'checkstyle'], ['pmd', 'pmd'], ['spotbugs', 'spotbugs'], ['error_prone', 'error-prone'], ['jacoco', 'jacoco'], ['archunit', 'archunit']]) {
      if (combinedJavaBuild.toLowerCase().includes(signal)) configuredTools.add(tool);
    }
    versions.java = parseXmlTag(pomText, 'java.version') ?? parseXmlTag(pomText, 'maven.compiler.release') ?? gradleTexts.map(parseGradleJavaVersion).find(Boolean) ?? null;
  }

  const goModFile = byName.get('go.mod');
  const goWorkFile = byName.get('go.work');
  const goFiles = localSourceFiles.filter((file) => file.ext === '.go');
  if (goModFile || goWorkFile || goFiles.length > 0) {
    languages.add('go'); adapters.add('go'); runtimes.add('native'); buildSystems.add('go-modules');
    moduleEvidence.push(evidence(goModFile?.rel ?? goWorkFile?.rel ?? goFiles[0]?.rel ?? modulePath, goWorkFile ? 'Go workspace/module' : 'Go module/source'));
    const goModText = goModFile ? await readText(goModFile) : null;
    const goWorkText = goWorkFile ? await readText(goWorkFile) : null;
    versions.go = (goModText ?? goWorkText)?.match(/^go\s+([^\s]+)$/m)?.[1] ?? null;
    versions.goToolchain = (goModText ?? goWorkText)?.match(/^toolchain\s+([^\s]+)$/m)?.[1] ?? null;
    const goTexts = localTexts.filter(({ file }) => file.ext === '.go');
    const mainFiles = goTexts.filter(({ text }) => /^package\s+main\b/m.test(text));
    if (mainFiles.length > 0) applicationTypes.add('cli');
    if (mainFiles.some(({ file, text }) => /(^|\/)(?:cmd\/)?(?:api|server|service|worker)(\/|$)/.test(relativeToModule(file.rel, modulePath)) || /net\/http|grpc|ListenAndServe/.test(text))) applicationTypes.add('service');
    if (goFiles.some((file) => file.name.endsWith('_test.go'))) testSystems.add('go-test');
    if (localFiles.some((file) => /^\.golangci\.(?:ya?ml|toml|json)$/.test(file.name))) configuredTools.add('golangci-lint');
    if (localFiles.some((file) => /staticcheck/.test(file.name))) configuredTools.add('staticcheck');
    if (goTexts.some(({ text }) => /go:generate/.test(text))) configuredTools.add('go-generate');
  }

  const cargoFile = byName.get('Cargo.toml');
  const rustFiles = localSourceFiles.filter((file) => file.ext === '.rs');
  if (cargoFile || rustFiles.length > 0) {
    languages.add('rust'); adapters.add('rust'); runtimes.add('native'); buildSystems.add('cargo'); testSystems.add('cargo-test');
    moduleEvidence.push(evidence(cargoFile?.rel ?? rustFiles[0]?.rel ?? modulePath, 'Cargo package/workspace or Rust source'));
    const cargoText = cargoFile ? await readText(cargoFile) : null;
    versions.rustEdition = parseTomlValue(cargoText, 'edition');
    versions.rustVersion = parseTomlValue(cargoText, 'rust-version');
    if (cargoText && /^\s*\[workspace\]/m.test(cargoText)) applicationTypes.add('workspace-root');
    if (rustFiles.some((file) => relativeToModule(file.rel, modulePath) === 'src/lib.rs')) applicationTypes.add('library');
    if (rustFiles.some((file) => relativeToModule(file.rel, modulePath) === 'src/main.rs' || relativeToModule(file.rel, modulePath).startsWith('src/bin/'))) applicationTypes.add('cli');
    if (sourceContains(localTexts.filter(({ file }) => file.ext === '.rs'), /\bunsafe\b/)) configuredTools.add('unsafe-rust-present');
    if (cargoText && /tokio|async-std|smol/.test(cargoText)) applicationTypes.add('async-application');
    if (rootFilesByRel.has(modulePath === '.' ? 'rust-toolchain.toml' : `${modulePath}/rust-toolchain.toml`)) configuredTools.add('rust-toolchain');
    configuredTools.add('rustfmt'); configuredTools.add('clippy');
  }

  // Pending adapters are evidence only; no language-specific rules are fabricated.
  const otherLanguageMap = new Map([
    ['.py', 'python'], ['.kt', 'kotlin'], ['.kts', 'kotlin'], ['.cs', 'csharp'],
    ['.c', 'c'], ['.cc', 'cpp'], ['.cpp', 'cpp'], ['.swift', 'swift'], ['.rb', 'ruby'],
    ['.php', 'php'], ['.scala', 'scala'], ['.ex', 'elixir'], ['.exs', 'elixir'],
  ]);
  for (const file of localSourceFiles) {
    const language = otherLanguageMap.get(file.ext);
    if (language) languages.add(language);
  }

  const sourceRoots = new Set();
  for (const language of languages) addSortedUnique(sourceRoots, detectSourceRoots(localFiles, modulePath, language));
  const testRoots = detectTestRoots(localFiles, modulePath);
  const publicEntrypoints = publicEntrypointsForPackage(pkg, localFiles, modulePath);
  const generatedPaths = new Set();
  for (const file of localFiles) {
    const rel = relativeToModule(file.rel, modulePath);
    const pathSignal = /(?:^|\/)(?:generated|gen)(?:\/|$)/i.test(rel);
    const markerSignal = SOURCE_EXTENSIONS.has(file.ext)
      ? /(?:^|\n)\/\/ Code generated .* DO NOT EDIT\.(?:\n|$)/.test((await readText(file)) ?? '')
      : false;
    if (pathSignal || markerSignal) {
      const dir = path.posix.dirname(rel);
      generatedPaths.add(dir === '.' ? rel : dir);
    }
  }

  const qualityGates = [];
  if (pkg?.scripts && typeof pkg.scripts === 'object') {
    for (const [name, command] of Object.entries(pkg.scripts)) {
      if (!['string'].includes(typeof command)) continue;
      const responsibility = /format/.test(name) ? 'format'
        : /lint/.test(name) ? 'lint'
          : /type|check/.test(name) ? 'compile-or-check'
            : /test/.test(name) ? 'test'
              : /build|package/.test(name) ? 'build-or-package'
                : null;
      if (responsibility) qualityGates.push({ name, command, responsibility, source: packageFile?.rel ?? 'package.json', status: 'configured' });
    }
  }

  const lockNames = localFiles.filter((file) => ['pnpm-lock.yaml', 'yarn.lock', 'package-lock.json', 'npm-shrinkwrap.json', 'bun.lock', 'bun.lockb'].includes(file.name)).map((file) => file.name);
  if (new Set(lockNames).size > 1) conflicts.push({ type: 'multiple-package-manager-lockfiles', detail: sorted(new Set(lockNames)).join(', ') });
  if (languages.size === 0 && moduleFiles.length > 0) unknowns.push({ type: 'aggregator-or-unknown-language', detail: 'Build/manifest exists without local editable source signals.' });
  if (sourceRoots.size === 0 && localSourceFiles.length > 0) unknowns.push({ type: 'source-root-unclassified', detail: 'Source files exist outside recognized roots; inspect representative files.' });

  const id = pkg?.name
    ?? parseProjectArtifactId(pomFile ? await readText(pomFile) : null, 'artifactId')
    ?? (goModFile ? (await readText(goModFile))?.match(/^module\s+(.+)$/m)?.[1] : null)
    ?? (cargoFile ? parseTomlValue(await readText(cargoFile), 'name') : null)
    ?? (modulePath === '.' ? 'root' : path.posix.basename(modulePath));

  const extensionCounts = {};
  for (const file of localSourceFiles) extensionCounts[file.ext] = (extensionCounts[file.ext] ?? 0) + 1;

  const confidence = moduleEvidence.some((item) => item.confidence === 'high') ? 'high' : moduleEvidence.length > 0 ? 'medium' : 'low';
  return {
    id,
    path: modulePath,
    role: languages.size === 0 ? 'aggregator-or-configuration' : 'editable-module',
    languages: sorted(languages),
    adapters: sorted(adapters),
    frameworks: sorted(frameworks),
    runtimes: sorted(runtimes),
    applicationTypes: sorted(applicationTypes),
    buildSystems: sorted(buildSystems),
    packageManagers: sorted(packageManagers),
    testSystems: sorted(testSystems),
    configuredTools: sorted(configuredTools),
    versions: Object.fromEntries(Object.entries(versions).filter(([, value]) => value !== null && value !== undefined).sort(([a], [b]) => a.localeCompare(b, 'en'))),
    sourceRoots: sorted(sourceRoots),
    testRoots: sorted(testRoots),
    publicEntrypoints: sorted(publicEntrypoints),
    generatedPaths: sorted(generatedPaths),
    qualityGates: stableSortObjects(qualityGates, ['name', 'command']),
    sourceFileCounts: Object.fromEntries(Object.entries(extensionCounts).sort(([a], [b]) => a.localeCompare(b, 'en'))),
    representativeFiles: localSourceFiles.map((file) => relativeToModule(file.rel, modulePath)).sort((a, b) => a.localeCompare(b, 'en')).slice(0, 20),
    evidence: stableSortObjects(moduleEvidence, ['path', 'signal']),
    confidence,
    conflicts: stableSortObjects(conflicts, ['type', 'detail']),
    unknowns: stableSortObjects(unknowns, ['type', 'detail']),
  };
}

function findWorkspaceSignals(files, textsByRel) {
  const signals = [];
  const add = (pathValue, signal) => signals.push({ path: pathValue, signal, confidence: 'high' });
  if (files.some((file) => file.rel === 'pnpm-workspace.yaml')) add('pnpm-workspace.yaml', 'pnpm workspace');
  if (files.some((file) => file.rel === 'lerna.json')) add('lerna.json', 'Lerna workspace');
  if (files.some((file) => file.rel === 'nx.json')) add('nx.json', 'Nx workspace');
  if (files.some((file) => file.rel === 'turbo.json')) add('turbo.json', 'Turborepo workspace');
  if (files.some((file) => file.rel === 'go.work')) add('go.work', 'Go workspace');
  const rootPackage = textsByRel.get('package.json');
  if (rootPackage) {
    try {
      const pkg = JSON.parse(rootPackage);
      if (pkg.workspaces) add('package.json', 'package workspaces');
    } catch { /* parse error recorded elsewhere */ }
  }
  const rootCargo = textsByRel.get('Cargo.toml');
  if (rootCargo && /^\s*\[workspace\]/m.test(rootCargo)) add('Cargo.toml', 'Cargo workspace');
  const settings = textsByRel.get('settings.gradle') ?? textsByRel.get('settings.gradle.kts');
  if (settings && /\binclude\s*\(?/.test(settings)) add(textsByRel.has('settings.gradle') ? 'settings.gradle' : 'settings.gradle.kts', 'Gradle multi-project');
  const pom = textsByRel.get('pom.xml');
  if (pom && /<modules>/.test(pom)) add('pom.xml', 'Maven multi-module aggregator');
  return stableSortObjects(signals, ['path', 'signal']);
}

function classifyGateCommand(command) {
  const value = command.toLowerCase();
  if (/\b(?:prettier|biome|gofmt|rustfmt|cargo\s+fmt|spotless|google-java-format)\b/.test(value)) return 'format';
  if (/\b(?:eslint|oxlint|golangci-lint|staticcheck|go\s+vet|cargo\s+clippy|checkstyle|pmd|spotbugs|errorprone|error-prone)\b/.test(value)) return 'lint-or-static-analysis';
  if (/\b(?:tsc|vue-tsc|cargo\s+check|javac)\b/.test(value)) return 'compile-or-typecheck';
  if (/\b(?:vitest|jest|playwright|cypress|go\s+test|cargo\s+test|mvnw?.*\btest\b|gradlew?.*\btest\b|pytest|junit)\b/.test(value)) return 'test';
  if (/\b(?:npm|pnpm|yarn|bun)\s+(?:run\s+)?(?:build|package)\b|\b(?:cargo|go)\s+build\b|\b(?:mvnw?|gradlew?)\b/.test(value)) return 'build-or-package';
  if (/\b(?:govulncheck|cargo\s+(?:audit|deny|vet)|npm\s+audit|pnpm\s+audit|dependency-check)\b/.test(value)) return 'security-or-dependency-audit';
  return null;
}

function cleanCiCommand(raw) {
  return raw.trim()
    .replace(/^[-]\s+/, '')
    .replace(/^(?:run|command|script):\s*/i, '')
    .replace(/^['"]|['"]$/g, '')
    .trim();
}

async function extractCiCommands(ciFileObjects, readText) {
  const commands = [];
  const seen = new Set();
  const push = (file, line, raw) => {
    const command = cleanCiCommand(raw);
    const responsibility = classifyGateCommand(command);
    if (!command || !responsibility) return;
    const key = `${file.rel}\0${command}`;
    if (seen.has(key)) return;
    seen.add(key);
    commands.push({
      command,
      responsibility,
      source: file.rel,
      line,
      status: 'active-in-ci',
      confidence: 'high',
    });
  };
  for (const file of ciFileObjects) {
    const text = await readText(file);
    if (!text) continue;
    const lines = text.split(/\r?\n/);
    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index];
      const run = line.match(/^(\s*)(?:-\s*)?run:\s*(.*)$/);
      if (run) {
        if (['|', '>', '|-', '>-', ''].includes(run[2].trim())) {
          const baseIndent = run[1].length;
          const block = [];
          for (let next = index + 1; next < lines.length; next += 1) {
            const candidate = lines[next];
            if (!candidate.trim()) { block.push(''); continue; }
            const indent = candidate.match(/^\s*/)?.[0].length ?? 0;
            if (indent <= baseIndent) break;
            block.push(candidate.trim());
            index = next;
          }
          for (const command of block.join('\n').split(/\n|&&|;/)) push(file, index + 1, command);
        } else push(file, index + 1, run[2]);
        continue;
      }
      const yamlList = line.match(/^\s*-\s+(.+)$/);
      if (yamlList) push(file, index + 1, yamlList[1]);
      for (const match of line.matchAll(/\bsh\s*\(?\s*['"]([^'"]+)['"]/g)) push(file, index + 1, match[1]);
      const command = line.match(/^\s*command:\s*(.+)$/);
      if (command) push(file, index + 1, command[1]);
    }
  }
  return stableSortObjects(commands, ['source', 'line', 'command']);
}

function classifyTopology(modules, workspaceSignals) {
  if (modules.length <= 1) return 'single-project';
  const adapters = new Set(modules.flatMap((module) => module.adapters));
  if (adapters.size > 1) return 'polyglot-monorepo';
  if (workspaceSignals.length > 0) return 'workspace';
  if (modules.every((module) => module.languages.includes('java'))) return 'multi-module';
  return 'monorepo';
}

async function discover(args) {
  const rootAbs = path.resolve(args.root);
  let rootReal;
  try {
    rootReal = await realpath(rootAbs);
  } catch (error) {
    throw new Error(`cannot resolve --root ${args.root}: ${error.message}`);
  }
  const rootInfo = await stat(rootReal);
  if (!rootInfo.isDirectory()) throw new Error(`--root is not a directory: ${args.root}`);
  const outputAbs = args.output ? await resolveSafeOutput(rootReal, args.output) : null;
  const managedRoots = [
    path.join(rootReal, '.agents', 'skills'),
    path.join(rootReal, '.claude', 'skills'),
    path.join(rootReal, '.codex', 'skills'),
  ];
  if (await pathIsDirectory(path.join(rootReal, 'speculo', '.speculo'))) {
    managedRoots.push(path.join(rootReal, 'speculo', 'skills'));
    managedRoots.push(path.join(rootReal, 'speculo', 'commands'));
    managedRoots.push(path.join(rootReal, 'speculo', 'workflows'));
  }
  const currentSkillRoot = await realpath(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'));
  if (isPathInside(rootReal, currentSkillRoot)) managedRoots.push(currentSkillRoot);
  const excludedRoots = [];
  for (const candidate of managedRoots) {
    if (await pathIsDirectory(candidate) && !excludedRoots.some((root) => root === candidate)) excludedRoots.push(candidate);
  }
  const managedSkillEntrypoints = await collectManagedSkillEntrypoints(rootReal, excludedRoots);
  const walk = await walkFiles(rootReal, args, outputAbs, excludedRoots);
  const readText = await createReader(args.maxBytes, walk.limitations);
  const filesByRel = new Map(walk.files.map((file) => [file.rel, file]));

  const rootTextNames = new Set(['package.json', 'pom.xml', 'settings.gradle', 'settings.gradle.kts', 'Cargo.toml', 'go.work']);
  const textsByRel = new Map();
  for (const name of rootTextNames) {
    const file = filesByRel.get(name);
    if (file) textsByRel.set(name, await readText(file));
  }

  const moduleFiles = findCandidateModulePaths(walk.files);
  const { assigned, unscoped } = assignFilesToModules(walk.files, [...moduleFiles.keys()]);
  const modules = [];
  for (const modulePath of [...moduleFiles.keys()].sort((a, b) => a.localeCompare(b, 'en'))) {
    modules.push(await analyzeModule(modulePath, moduleFiles.get(modulePath), assigned.get(modulePath), readText, filesByRel));
  }

  const workspaceSignals = findWorkspaceSignals(walk.files, textsByRel);
  const rootModule = modules.find((module) => module.path === '.');
  if (rootModule && rootModule.packageManagers.length > 0 && workspaceSignals.some((item) => /package|pnpm|Lerna|Nx|Turborepo/i.test(item.signal))) {
    for (const module of modules) {
      if (module.path === '.' || !module.adapters.includes('typescript') || module.packageManagers.length > 0) continue;
      module.packageManagers = [...rootModule.packageManagers];
      module.evidence.push(evidence('package.json', `Inherited workspace package manager: ${rootModule.packageManagers.join(', ')}`, 'high'));
      stableSortObjects(module.evidence, ['path', 'signal']);
    }
  }
  const allLanguages = new Set(modules.flatMap((module) => module.languages));
  const allAdapters = new Set(modules.flatMap((module) => module.adapters));
  const allFrameworks = new Set(modules.flatMap((module) => module.frameworks));
  const allRuntimes = new Set(modules.flatMap((module) => module.runtimes));
  const allBuildSystems = new Set(modules.flatMap((module) => module.buildSystems));
  const allTestSystems = new Set(modules.flatMap((module) => module.testSystems));

  const existingStandards = sorted(new Set([
    ...managedSkillEntrypoints,
    ...walk.files
      .filter((file) => /(^|\/)(?:AGENTS|CLAUDE|CONTRIBUTING)\.md$/i.test(file.rel)
        || /(^|\/)(?:docs\/)?(?:adr|architecture|standards?)(\/|\.|$)/i.test(file.rel))
      .map((file) => file.rel),
  ]));

  const ciFileObjects = walk.files
    .filter((file) => /(^|\/)(?:\.github\/workflows\/.*\.ya?ml|\.gitlab-ci\.yml|Jenkinsfile|azure-pipelines\.ya?ml|\.circleci\/config\.yml)$/.test(file.rel));
  const ciFiles = ciFileObjects.map((file) => file.rel).sort((a, b) => a.localeCompare(b, 'en'));
  const ciCommands = await extractCiCommands(ciFileObjects, readText);

  const conflicts = stableSortObjects(modules.flatMap((module) => module.conflicts.map((item) => ({ ...item, scope: `module:${module.path}` }))), ['scope', 'type', 'detail']);
  const unknowns = stableSortObjects(modules.flatMap((module) => module.unknowns.map((item) => ({ ...item, scope: `module:${module.path}` }))), ['scope', 'type', 'detail']);
  if (ciFiles.length === 0) unknowns.push({ scope: 'repository', type: 'ci-not-detected', detail: 'No supported CI configuration was detected; inspect custom automation and documentation.' });
  if (unscoped.some((file) => SOURCE_EXTENSIONS.has(file.ext))) unknowns.push({ scope: 'repository', type: 'unscoped-source', detail: 'Editable source exists outside detected module roots.' });

  const inventory = {
    schemaVersion: SCHEMA_VERSION,
    root: rootReal,
    topology: classifyTopology(modules, workspaceSignals),
    summary: {
      modules: modules.length,
      languages: sorted(allLanguages),
      adapters: sorted(allAdapters),
      frameworks: sorted(allFrameworks),
      runtimes: sorted(allRuntimes),
      buildSystems: sorted(allBuildSystems),
      testSystems: sorted(allTestSystems),
    },
    workspaceSignals,
    modules,
    repositoryQualityGates: stableSortObjects([
      ...modules.flatMap((module) => module.qualityGates.map((gate) => ({ ...gate, scope: `module:${module.path}` }))),
      ...ciCommands.map((gate) => ({ ...gate, name: gate.responsibility, scope: 'repository' })),
    ], ['scope', 'name', 'command']),
    ciFiles,
    ciCommands,
    existingStandards,
    conflicts,
    unknowns: stableSortObjects(unknowns, ['scope', 'type', 'detail']),
    scan: {
      visitedFiles: walk.files.length,
      sourceFiles: walk.files.filter((file) => SOURCE_EXTENSIONS.has(file.ext)).length,
      skippedSymlinks: walk.skippedSymlinks,
      limitations: stableSortObjects(walk.limitations, ['type', 'path']),
      truncated: walk.truncated,
      limits: { maxDepth: args.maxDepth, maxFiles: args.maxFiles, maxBytes: args.maxBytes },
      ignoredDirectoryNames: sorted(DEFAULT_IGNORED_DIRECTORIES),
      excludedManagedRoots: excludedRoots.map((item) => normalizeRel(path.relative(rootReal, item))).sort((a, b) => a.localeCompare(b, 'en')),
    },
  };
  return { inventory, outputAbs };
}

async function main() {
  let args;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (error) {
    fail(`${error.message}\n\n${usage()}`, 2);
    return;
  }
  if (args.help) {
    process.stdout.write(usage());
    return;
  }
  try {
    const { inventory, outputAbs } = await discover(args);
    const json = `${JSON.stringify(inventory, null, args.pretty ? 2 : 0)}\n`;
    if (outputAbs) {
      await mkdir(path.dirname(outputAbs), { recursive: true });
      await writeFile(outputAbs, json, { encoding: 'utf8', flag: 'w' });
      process.stderr.write(`discover-project: wrote ${normalizeRel(path.relative(inventory.root, outputAbs))}\n`);
    } else {
      process.stdout.write(json);
    }
  } catch (error) {
    fail(error.stack ?? error.message, 1);
  }
}

await main();
