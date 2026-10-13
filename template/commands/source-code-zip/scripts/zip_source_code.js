#!/usr/bin/env node
'use strict';

/**
 * 将源码目录打包为 ZIP，并通过正则规则排除依赖、构建产物、秘密文件和非代码文件。
 *
 * 首选运行方式：
 *   node zip_source_code.js /path/to/project
 *
 * 本脚本只使用 Node.js 内置模块，不需要 npm install，也不依赖系统 zip 命令。
 * 建议使用 Node.js 14 或更高版本。
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const zlib = require('zlib');
const { Transform, Writable, pipeline: pipelineCallback } = require('stream');
const { promisify } = require('util');

const pipeline = promisify(pipelineCallback);
const VERSION = '2.0.0';
const MIN_NODE_MAJOR = 14;

// ---------------------------------------------------------------------------
// 可编辑配置
// ---------------------------------------------------------------------------
// IGNORE 是默认忽略字段。每一项都是 JavaScript 正则表达式字符串，匹配对象是：
//   1. 相对于待压缩目录的路径；
//   2. 路径分隔符统一为 "/"；
//   3. 路径开头没有 "/"；
//   4. 正则匹配默认不区分大小写，并使用 RegExp.test。
//
// 示例：
//   String.raw`(^|/)node_modules(?:/|$)` -> 忽略任意层级的 node_modules 目录
//   String.raw`\.zip$`                   -> 忽略所有 .zip 文件
//   String.raw`(^|/)private/`            -> 忽略任意层级名为 private 的目录
const IGNORE = [
  // 版本控制、编辑器和系统元数据
  String.raw`(^|/)\.(?:git|hg|svn)(?:/|$)`,
  String.raw`(^|/)(?:\.idea|\.vscode)(?:/|$)`,
  String.raw`(^|/)(?:\.DS_Store|Thumbs\.db|desktop\.ini)$`,

  // 依赖目录、虚拟环境和缓存
  String.raw`(^|/)(?:node_modules?|bower_components|jspm_packages|vendor|Pods|Carthage)(?:/|$)`,
  String.raw`(^|/)(?:\.venv|venv|env|__pycache__|\.pytest_cache|\.mypy_cache|\.ruff_cache|\.tox|\.nox|\.cache)(?:/|$)`,

  // 构建产物、覆盖率和框架缓存
  String.raw`(^|/)(?:dist|build|target|out|coverage|htmlcov|\.next|\.nuxt|\.svelte-kit|\.parcel-cache|\.turbo|\.gradle)(?:/|$)`,
  String.raw`\.(?:min|bundle)\.(?:js|css)$`,

  // 环境变量、证书、密钥和常见凭据文件
  String.raw`(^|/)\.env(?:\..*)?$`,
  String.raw`(^|/)(?:id_rsa|id_dsa|id_ecdsa|id_ed25519)(?:\.pub)?$`,
  String.raw`\.(?:pem|key|p12|pfx|jks|keystore|crt|cer|der)$`,

  // 用户明确要求排除 YAML
  String.raw`\.ya?ml$`,

  // 压缩包、归档和编译产物
  String.raw`\.(?:zip|7z|rar|tar|tgz|tbz2?|txz|gz|bz2|xz|zst|jar|war|ear|whl|egg)$`,
  String.raw`\.(?:exe|dll|so(?:\.\d+)*|dylib|bin|o|obj|a|lib|class|py[co]|pyd|wasm)$`,

  // 媒体、办公文档、数据库、日志和临时文件
  String.raw`\.(?:png|jpe?g|gif|webp|bmp|tiff?|ico|heic|avif|mp[34]|m4[av]|wav|flac|ogg|mov|avi|mkv|webm)$`,
  String.raw`\.(?:pdf|docx?|xlsx?|pptx?|odt|ods|odp)$`,
  String.raw`\.(?:sqlite3?|db|dump|log|tmp|temp|swp|swo|bak|old)$`,

  // 锁文件通常不是源代码；pnpm-lock.yaml 同时也会被 YAML 规则匹配
  String.raw`(^|/)(?:package-lock\.json|yarn\.lock|pnpm-lock\.ya?ml|poetry\.lock|uv\.lock|Pipfile\.lock|composer\.lock|Gemfile\.lock)$`,
];

// 默认“仅源码”模式允许的扩展名。扩展名统一使用小写并包含前导点。
const CODE_EXTENSIONS = new Set([
  // Python / JavaScript / TypeScript
  '.py', '.pyi', '.pyx', '.pxd', '.pxi',
  '.js', '.jsx', '.mjs', '.cjs', '.ts', '.tsx',

  // Web / UI
  '.html', '.htm', '.css', '.scss', '.sass', '.less',
  '.vue', '.svelte', '.astro', '.mdx',

  // JVM / Android
  '.java', '.kt', '.kts', '.scala', '.groovy', '.gradle',

  // Native / systems
  '.c', '.h', '.cc', '.cpp', '.cxx', '.hpp', '.hxx',
  '.m', '.mm', '.swift', '.rs', '.go', '.zig', '.nim',
  '.asm', '.s', '.v', '.sv', '.svh', '.vhd', '.vhdl',

  // .NET
  '.cs', '.fs', '.fsx', '.fsi', '.vb',

  // 脚本和命令行
  '.sh', '.bash', '.zsh', '.fish', '.ps1', '.bat', '.cmd',
  '.rb', '.php', '.pl', '.pm', '.lua', '.tcl',

  // 函数式语言和其他语言
  '.ex', '.exs', '.erl', '.hrl', '.clj', '.cljs', '.cljc',
  '.hs', '.lhs', '.ml', '.mli', '.r', '.jl', '.cr',
  '.dart', '.sol', '.move',

  // 数据库、接口描述和基础设施即代码
  '.sql', '.proto', '.graphql', '.gql', '.thrift',
  '.tf', '.hcl', '.nix',

  // 构建脚本和模板源码
  '.cmake', '.mk', '.mak', '.mustache', '.hbs', '.ejs',
  '.jinja', '.jinja2', '.j2', '.twig', '.tex',
]);

// 无扩展名或特殊命名的常见源码/构建脚本。比较时不区分大小写。
const CODE_FILENAMES = new Set([
  'dockerfile',
  'containerfile',
  'makefile',
  'gnumakefile',
  'cmakelists.txt',
  'jenkinsfile',
  'vagrantfile',
  'rakefile',
  'gemfile',
  'procfile',
  'justfile',
  'meson.build',
  'meson_options.txt',
  'build',
  'workspace',
  'build.bazel',
  'workspace.bazel',
  'module.bazel',
]);

const MAX_UINT16 = 0xffff;
const MAX_UINT32 = 0xffffffffn;
const ZIP_UTF8_FLAG = 0x0800;
const ZIP_DATA_DESCRIPTOR_FLAG = 0x0008;
const ZIP_FLAGS = ZIP_UTF8_FLAG | ZIP_DATA_DESCRIPTOR_FLAG;

let activeTempPath = null;
let activeFileDescriptor = null;

class ZipSourceError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ZipSourceError';
  }
}

function assertSupportedNode() {
  const major = Number.parseInt(process.versions.node.split('.')[0], 10);
  if (!Number.isInteger(major) || major < MIN_NODE_MAJOR) {
    throw new ZipSourceError(
      `需要 Node.js ${MIN_NODE_MAJOR} 或更高版本；当前版本是 ${process.versions.node}`,
    );
  }
}

function expandUser(inputPath) {
  if (inputPath === '~') {
    return os.homedir();
  }
  if (inputPath.startsWith('~/') || inputPath.startsWith('~\\')) {
    return path.join(os.homedir(), inputPath.slice(2));
  }
  return inputPath;
}

function normalizedRelative(relativePath) {
  return relativePath.split(path.sep).join('/');
}

function compareNames(left, right) {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function samePath(left, right) {
  const leftResolved = path.resolve(left);
  const rightResolved = path.resolve(right);
  if (process.platform === 'win32') {
    return leftResolved.toLowerCase() === rightResolved.toLowerCase();
  }
  return leftResolved === rightResolved;
}

function archiveRootName(source) {
  let name = path.basename(source);
  if (!name) {
    name = path.parse(source).root.replace(/[:/\\]+/g, '');
  }
  name = name.replace(/[/\\]+/g, '_');
  return name || 'root';
}

function defaultOutputPath(source) {
  return path.join(path.dirname(source), `${archiveRootName(source)}.code.zip`);
}

function normalizeOutputPath(outputPath) {
  let resolved = path.resolve(expandUser(outputPath));
  if (path.extname(resolved).toLowerCase() !== '.zip') {
    resolved += '.zip';
  }
  return resolved;
}

function formatHumanSize(size) {
  const units = ['B', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB'];
  let divisor = 1n;
  let unitIndex = 0;
  while (unitIndex < units.length - 1 && size >= divisor * 1024n) {
    divisor *= 1024n;
    unitIndex += 1;
  }

  if (unitIndex === 0) {
    return `${size.toString()} B`;
  }

  const hundredths = (size * 100n + divisor / 2n) / divisor;
  const whole = hundredths / 100n;
  const fraction = (hundredths % 100n).toString().padStart(2, '0');
  return `${whole.toString()}.${fraction} ${units[unitIndex]}`;
}

function compileRules(patterns, label) {
  return patterns.map((pattern) => {
    try {
      return { source: pattern, compiled: new RegExp(pattern, 'i') };
    } catch (error) {
      throw new ZipSourceError(`${label} 中存在无效正则 ${JSON.stringify(pattern)}: ${error.message}`);
    }
  });
}

function firstMatch(rules, relativePath) {
  for (const rule of rules) {
    if (rule.compiled.test(relativePath)) {
      return rule;
    }
  }
  return null;
}

function loadRegexFile(filePath) {
  let text;
  try {
    text = fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    throw new ZipSourceError(`无法读取忽略规则文件 ${filePath}: ${error.message}`);
  }

  const patterns = [];
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/);
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index].trim();
    if (!line || line.startsWith('#')) {
      continue;
    }
    try {
      // 先在这里验证，以便准确报告文件中的行号。
      // eslint-disable-next-line no-new
      new RegExp(line, 'i');
    } catch (error) {
      throw new ZipSourceError(
        `忽略规则文件 ${filePath} 第 ${index + 1} 行正则无效: ${error.message}`,
      );
    }
    patterns.push(line);
  }
  return patterns;
}

function hasShebang(filePath) {
  if (path.extname(filePath)) {
    return false;
  }

  let descriptor;
  try {
    descriptor = fs.openSync(filePath, 'r');
    const buffer = Buffer.alloc(2);
    const bytesRead = fs.readSync(descriptor, buffer, 0, 2, 0);
    return bytesRead === 2 && buffer[0] === 0x23 && buffer[1] === 0x21;
  } catch (_error) {
    return false;
  } finally {
    if (descriptor !== undefined) {
      try {
        fs.closeSync(descriptor);
      } catch (_error) {
        // 忽略关闭阶段错误；真正读取时会报告更明确的信息。
      }
    }
  }
}

function isCodeFile(filePath) {
  const name = path.basename(filePath).toLowerCase();
  if (CODE_FILENAMES.has(name)) {
    return true;
  }
  if (CODE_EXTENSIONS.has(path.extname(filePath).toLowerCase())) {
    return true;
  }
  return hasShebang(filePath);
}

function logSkip(verbose, relativePath, reason) {
  if (verbose) {
    process.stdout.write(`[跳过:${reason}] ${relativePath}\n`);
  }
}

function createStats() {
  return {
    included: 0,
    includedBytes: 0n,
    ignored: 0,
    nonCode: 0,
    symlinks: 0,
    outputFile: 0,
    special: 0,
  };
}

function safeLstat(filePath) {
  try {
    return fs.lstatSync(filePath);
  } catch (error) {
    throw new ZipSourceError(`无法读取文件信息 ${filePath}: ${error.message}`);
  }
}

function scanSource(options) {
  const {
    source,
    output,
    ignoreRules,
    includeRules,
    codeOnly,
    verbose,
  } = options;

  const candidates = [];
  const stats = createStats();
  const stack = [{ absolute: source, relative: '' }];

  while (stack.length > 0) {
    const current = stack.pop();
    let entries;
    try {
      entries = fs.readdirSync(current.absolute, { withFileTypes: true });
    } catch (error) {
      throw new ZipSourceError(`扫描目录失败 ${current.absolute}: ${error.message}`);
    }
    entries.sort((left, right) => compareNames(left.name, right.name));

    const directories = [];
    for (const entry of entries) {
      const absolutePath = path.join(current.absolute, entry.name);
      const relativePath = current.relative
        ? path.join(current.relative, entry.name)
        : entry.name;
      const relativeText = normalizedRelative(relativePath);

      if (entry.isSymbolicLink()) {
        stats.symlinks += 1;
        logSkip(verbose, relativeText, '符号链接');
        continue;
      }

      if (entry.isDirectory()) {
        const matched = firstMatch(ignoreRules, relativeText);
        if (matched !== null) {
          stats.ignored += 1;
          logSkip(verbose, relativeText, `正则 ${matched.source}`);
          continue;
        }
        directories.push({ absolute: absolutePath, relative: relativePath });
        continue;
      }

      if (!entry.isFile()) {
        // 某些文件系统的 Dirent 类型可能未知，再用 lstat 确认一次。
        const stat = safeLstat(absolutePath);
        if (stat.isSymbolicLink()) {
          stats.symlinks += 1;
          logSkip(verbose, relativeText, '符号链接');
          continue;
        }
        if (stat.isDirectory()) {
          const matched = firstMatch(ignoreRules, relativeText);
          if (matched !== null) {
            stats.ignored += 1;
            logSkip(verbose, relativeText, `正则 ${matched.source}`);
            continue;
          }
          directories.push({ absolute: absolutePath, relative: relativePath });
          continue;
        }
        if (!stat.isFile()) {
          stats.special += 1;
          logSkip(verbose, relativeText, '非普通文件');
          continue;
        }
      }

      if (samePath(absolutePath, output)) {
        stats.outputFile += 1;
        logSkip(verbose, relativeText, '输出 ZIP 本身');
        continue;
      }

      const matched = firstMatch(ignoreRules, relativeText);
      if (matched !== null) {
        stats.ignored += 1;
        logSkip(verbose, relativeText, `正则 ${matched.source}`);
        continue;
      }

      const explicitlyIncluded = firstMatch(includeRules, relativeText) !== null;
      if (codeOnly && !explicitlyIncluded && !isCodeFile(absolutePath)) {
        stats.nonCode += 1;
        logSkip(verbose, relativeText, '非源码文件');
        continue;
      }

      const stat = safeLstat(absolutePath);
      if (stat.isSymbolicLink()) {
        stats.symlinks += 1;
        logSkip(verbose, relativeText, '符号链接');
        continue;
      }
      if (!stat.isFile()) {
        stats.special += 1;
        logSkip(verbose, relativeText, '非普通文件');
        continue;
      }
      if (!Number.isSafeInteger(stat.size) || stat.size < 0) {
        throw new ZipSourceError(`文件大小超出 Node.js 可安全处理范围: ${absolutePath}`);
      }

      candidates.push({
        absolutePath,
        relativePath,
        size: BigInt(stat.size),
      });
      stats.included += 1;
      stats.includedBytes += BigInt(stat.size);
    }

    // 栈是后进先出，因此反向压入，保证遍历顺序稳定。
    for (let index = directories.length - 1; index >= 0; index -= 1) {
      stack.push(directories[index]);
    }
  }

  candidates.sort((left, right) => (
    compareNames(normalizedRelative(left.relativePath), normalizedRelative(right.relativePath))
  ));
  return { candidates, stats };
}

// ---------------------------------------------------------------------------
// ZIP 写入实现（仅使用 Node.js 内置模块）
// ---------------------------------------------------------------------------

const CRC32_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let index = 0; index < 256; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) {
      value = (value & 1) !== 0
        ? (0xedb88320 ^ (value >>> 1))
        : (value >>> 1);
    }
    table[index] = value >>> 0;
  }
  return table;
})();

function crc32Update(crc, chunk) {
  let value = crc >>> 0;
  for (let index = 0; index < chunk.length; index += 1) {
    value = CRC32_TABLE[(value ^ chunk[index]) & 0xff] ^ (value >>> 8);
  }
  return value >>> 0;
}

class CrcCounter extends Transform {
  constructor() {
    super();
    this.crc = 0xffffffff;
    this.size = 0n;
  }

  _transform(chunk, encoding, callback) {
    try {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, encoding);
      this.crc = crc32Update(this.crc, buffer);
      this.size += BigInt(buffer.length);
      callback(null, buffer);
    } catch (error) {
      callback(error);
    }
  }

  digest() {
    return (this.crc ^ 0xffffffff) >>> 0;
  }
}

class ArchiveWriter {
  constructor(fileDescriptor) {
    this.fileDescriptor = fileDescriptor;
    this.position = 0n;
  }

  write(buffer) {
    let offset = 0;
    while (offset < buffer.length) {
      const written = fs.writeSync(
        this.fileDescriptor,
        buffer,
        offset,
        buffer.length - offset,
        null,
      );
      if (written <= 0) {
        throw new ZipSourceError('写入 ZIP 时没有取得进展');
      }
      offset += written;
      this.position += BigInt(written);
    }
  }
}

class ArchiveWritable extends Writable {
  constructor(archiveWriter) {
    super();
    this.archiveWriter = archiveWriter;
    this.bytesWritten = 0n;
  }

  _write(chunk, encoding, callback) {
    try {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, encoding);
      this.archiveWriter.write(buffer);
      this.bytesWritten += BigInt(buffer.length);
      callback();
    } catch (error) {
      callback(error);
    }
  }
}

function toDosDateTime(date) {
  let value = date instanceof Date && Number.isFinite(date.getTime()) ? date : new Date();
  const year = value.getFullYear();
  if (year < 1980) {
    value = new Date(1980, 0, 1, 0, 0, 0);
  } else if (year > 2107) {
    value = new Date(2107, 11, 31, 23, 59, 58);
  }

  const dosTime = (
    (value.getHours() << 11)
    | (value.getMinutes() << 5)
    | Math.floor(value.getSeconds() / 2)
  ) & 0xffff;
  const dosDate = (
    ((value.getFullYear() - 1980) << 9)
    | ((value.getMonth() + 1) << 5)
    | value.getDate()
  ) & 0xffff;
  return { dosTime, dosDate };
}

function deflateBound(sourceSize) {
  // 与 zlib 的保守上界公式一致，便于在写本地头之前判断是否需要 ZIP64。
  return sourceSize
    + (sourceSize >> 12n)
    + (sourceSize >> 14n)
    + (sourceSize >> 25n)
    + 13n;
}

function makeZip64Extra(values) {
  const payloadLength = values.length * 8;
  const extra = Buffer.alloc(4 + payloadLength);
  extra.writeUInt16LE(0x0001, 0);
  extra.writeUInt16LE(payloadLength, 2);
  for (let index = 0; index < values.length; index += 1) {
    extra.writeBigUInt64LE(values[index], 4 + index * 8);
  }
  return extra;
}

function makeLocalHeader(entry) {
  const extra = entry.useZip64
    ? makeZip64Extra([0n, 0n])
    : Buffer.alloc(0);
  const header = Buffer.alloc(30 + entry.nameBuffer.length + extra.length);

  header.writeUInt32LE(0x04034b50, 0);
  header.writeUInt16LE(entry.useZip64 ? 45 : 20, 4);
  header.writeUInt16LE(ZIP_FLAGS, 6);
  header.writeUInt16LE(entry.method, 8);
  header.writeUInt16LE(entry.dosTime, 10);
  header.writeUInt16LE(entry.dosDate, 12);
  header.writeUInt32LE(0, 14);
  header.writeUInt32LE(entry.useZip64 ? 0xffffffff : 0, 18);
  header.writeUInt32LE(entry.useZip64 ? 0xffffffff : 0, 22);
  header.writeUInt16LE(entry.nameBuffer.length, 26);
  header.writeUInt16LE(extra.length, 28);
  entry.nameBuffer.copy(header, 30);
  extra.copy(header, 30 + entry.nameBuffer.length);
  return header;
}

function makeDataDescriptor(entry) {
  if (entry.useZip64) {
    const descriptor = Buffer.alloc(24);
    descriptor.writeUInt32LE(0x08074b50, 0);
    descriptor.writeUInt32LE(entry.crc32, 4);
    descriptor.writeBigUInt64LE(entry.compressedSize, 8);
    descriptor.writeBigUInt64LE(entry.uncompressedSize, 16);
    return descriptor;
  }

  if (entry.compressedSize > MAX_UINT32 || entry.uncompressedSize > MAX_UINT32) {
    throw new ZipSourceError(`文件在压缩过程中超过普通 ZIP 的 4 GiB 限制: ${entry.archiveName}`);
  }
  const descriptor = Buffer.alloc(16);
  descriptor.writeUInt32LE(0x08074b50, 0);
  descriptor.writeUInt32LE(entry.crc32, 4);
  descriptor.writeUInt32LE(Number(entry.compressedSize), 8);
  descriptor.writeUInt32LE(Number(entry.uncompressedSize), 12);
  return descriptor;
}

function makeCentralHeader(entry) {
  const needsZip64Sizes = (
    entry.useZip64
    || entry.compressedSize > MAX_UINT32
    || entry.uncompressedSize > MAX_UINT32
  );
  const needsZip64Offset = entry.localHeaderOffset > MAX_UINT32;
  const zip64Values = [];
  if (needsZip64Sizes) {
    zip64Values.push(entry.uncompressedSize, entry.compressedSize);
  }
  if (needsZip64Offset) {
    zip64Values.push(entry.localHeaderOffset);
  }
  const extra = zip64Values.length > 0 ? makeZip64Extra(zip64Values) : Buffer.alloc(0);
  const versionNeeded = zip64Values.length > 0 || entry.useZip64 ? 45 : 20;
  const header = Buffer.alloc(46 + entry.nameBuffer.length + extra.length);

  header.writeUInt32LE(0x02014b50, 0);
  header.writeUInt16LE(versionNeeded >= 45 ? 0x032d : 0x031e, 4); // Unix + ZIP 4.5/3.0
  header.writeUInt16LE(versionNeeded, 6);
  header.writeUInt16LE(ZIP_FLAGS, 8);
  header.writeUInt16LE(entry.method, 10);
  header.writeUInt16LE(entry.dosTime, 12);
  header.writeUInt16LE(entry.dosDate, 14);
  header.writeUInt32LE(entry.crc32, 16);
  header.writeUInt32LE(needsZip64Sizes ? 0xffffffff : Number(entry.compressedSize), 20);
  header.writeUInt32LE(needsZip64Sizes ? 0xffffffff : Number(entry.uncompressedSize), 24);
  header.writeUInt16LE(entry.nameBuffer.length, 28);
  header.writeUInt16LE(extra.length, 30);
  header.writeUInt16LE(0, 32); // file comment length
  header.writeUInt16LE(0, 34); // disk number start
  header.writeUInt16LE(0, 36); // internal attributes
  header.writeUInt32LE(((entry.mode & 0xffff) << 16) >>> 0, 38);
  header.writeUInt32LE(needsZip64Offset ? 0xffffffff : Number(entry.localHeaderOffset), 42);
  entry.nameBuffer.copy(header, 46);
  extra.copy(header, 46 + entry.nameBuffer.length);
  return header;
}

function makeZip64EndOfCentralDirectory(entryCount, centralSize, centralOffset) {
  const record = Buffer.alloc(56);
  record.writeUInt32LE(0x06064b50, 0);
  record.writeBigUInt64LE(44n, 4);
  record.writeUInt16LE(0x032d, 12); // version made by: Unix, ZIP 4.5
  record.writeUInt16LE(45, 14);
  record.writeUInt32LE(0, 16);
  record.writeUInt32LE(0, 20);
  record.writeBigUInt64LE(entryCount, 24);
  record.writeBigUInt64LE(entryCount, 32);
  record.writeBigUInt64LE(centralSize, 40);
  record.writeBigUInt64LE(centralOffset, 48);
  return record;
}

function makeZip64Locator(zip64RecordOffset) {
  const locator = Buffer.alloc(20);
  locator.writeUInt32LE(0x07064b50, 0);
  locator.writeUInt32LE(0, 4);
  locator.writeBigUInt64LE(zip64RecordOffset, 8);
  locator.writeUInt32LE(1, 16);
  return locator;
}

function makeEndOfCentralDirectory(entryCount, centralSize, centralOffset) {
  const record = Buffer.alloc(22);
  record.writeUInt32LE(0x06054b50, 0);
  record.writeUInt16LE(0, 4);
  record.writeUInt16LE(0, 6);
  record.writeUInt16LE(entryCount >= BigInt(MAX_UINT16) ? MAX_UINT16 : Number(entryCount), 8);
  record.writeUInt16LE(entryCount >= BigInt(MAX_UINT16) ? MAX_UINT16 : Number(entryCount), 10);
  record.writeUInt32LE(centralSize > MAX_UINT32 ? 0xffffffff : Number(centralSize), 12);
  record.writeUInt32LE(centralOffset > MAX_UINT32 ? 0xffffffff : Number(centralOffset), 16);
  record.writeUInt16LE(0, 20);
  return record;
}

async function streamFileToArchive(filePath, writer, method, compressionLevel) {
  const counter = new CrcCounter();
  const sink = new ArchiveWritable(writer);
  const noFollowFlag = typeof fs.constants.O_NOFOLLOW === 'number'
    ? fs.constants.O_NOFOLLOW
    : 0;

  let inputDescriptor;
  try {
    inputDescriptor = fs.openSync(filePath, fs.constants.O_RDONLY | noFollowFlag);
  } catch (error) {
    throw new ZipSourceError(`无法打开文件 ${filePath}: ${error.message}`);
  }

  const input = fs.createReadStream(filePath, {
    fd: inputDescriptor,
    autoClose: true,
    highWaterMark: 1024 * 1024,
  });

  try {
    if (method === 8) {
      const deflater = zlib.createDeflateRaw({ level: compressionLevel });
      await pipeline(input, counter, deflater, sink);
    } else {
      await pipeline(input, counter, sink);
    }
  } catch (error) {
    throw new ZipSourceError(`读取或压缩文件失败 ${filePath}: ${error.message}`);
  }

  return {
    crc32: counter.digest(),
    uncompressedSize: counter.size,
    compressedSize: sink.bytesWritten,
  };
}

function createTempOutput(output) {
  const parent = path.dirname(output);
  try {
    fs.mkdirSync(parent, { recursive: true });
  } catch (error) {
    throw new ZipSourceError(`无法创建输出目录 ${parent}: ${error.message}`);
  }

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const token = crypto.randomBytes(8).toString('hex');
    const candidate = path.join(parent, `.${path.basename(output)}.${process.pid}.${token}.tmp`);
    try {
      const descriptor = fs.openSync(candidate, 'wx', 0o600);
      return { tempPath: candidate, descriptor };
    } catch (error) {
      if (error.code !== 'EEXIST') {
        throw new ZipSourceError(`无法创建临时 ZIP ${candidate}: ${error.message}`);
      }
    }
  }
  throw new ZipSourceError(`无法在 ${parent} 创建唯一的临时 ZIP`);
}

function outputPathState(output) {
  try {
    const stat = fs.statSync(output);
    return { exists: true, isDirectory: stat.isDirectory() };
  } catch (error) {
    if (error.code === 'ENOENT') {
      return { exists: false, isDirectory: false };
    }
    throw new ZipSourceError(`无法检查输出路径 ${output}: ${error.message}`);
  }
}

function installTempOutput(tempPath, output, force) {
  if (force) {
    try {
      fs.renameSync(tempPath, output);
      return;
    } catch (error) {
      const replaceCodes = new Set(['EEXIST', 'EPERM', 'EACCES', 'ENOTEMPTY']);
      if (!replaceCodes.has(error.code)) {
        throw new ZipSourceError(`无法写入最终 ZIP ${output}: ${error.message}`);
      }
    }

    try {
      const state = outputPathState(output);
      if (state.isDirectory) {
        throw new ZipSourceError(`输出路径是目录，不是 ZIP 文件: ${output}`);
      }
      if (state.exists) {
        fs.unlinkSync(output);
      }
      fs.renameSync(tempPath, output);
      return;
    } catch (error) {
      if (error instanceof ZipSourceError) {
        throw error;
      }
      throw new ZipSourceError(`无法覆盖最终 ZIP ${output}: ${error.message}`);
    }
  }

  // 使用硬链接实现“目标不存在才安装”，避免普通 rename 在 POSIX 上悄悄覆盖竞态文件。
  try {
    fs.linkSync(tempPath, output);
    fs.unlinkSync(tempPath);
    return;
  } catch (error) {
    if (error.code === 'EEXIST') {
      throw new ZipSourceError(`输出文件已存在: ${output}；使用 --force 覆盖`);
    }
    if (!['EPERM', 'EACCES', 'ENOTSUP', 'EOPNOTSUPP', 'EXDEV'].includes(error.code)) {
      throw new ZipSourceError(`无法写入最终 ZIP ${output}: ${error.message}`);
    }
  }

  // 极少数文件系统不支持硬链接，回退为排他复制。
  try {
    fs.copyFileSync(tempPath, output, fs.constants.COPYFILE_EXCL);
    fs.unlinkSync(tempPath);
  } catch (error) {
    if (error.code === 'EEXIST') {
      throw new ZipSourceError(`输出文件已存在: ${output}；使用 --force 覆盖`);
    }
    throw new ZipSourceError(`无法写入最终 ZIP ${output}: ${error.message}`);
  }
}

function cleanupActiveTemp() {
  if (activeFileDescriptor !== null) {
    try {
      fs.closeSync(activeFileDescriptor);
    } catch (_error) {
      // 忽略清理错误。
    }
    activeFileDescriptor = null;
  }
  if (activeTempPath !== null) {
    try {
      fs.unlinkSync(activeTempPath);
    } catch (_error) {
      // 忽略清理错误。
    }
    activeTempPath = null;
  }
}

async function createArchive(options) {
  const {
    source,
    output,
    candidates,
    compressionLevel,
    contentsOnly,
    force,
  } = options;

  const { tempPath, descriptor } = createTempOutput(output);
  activeTempPath = tempPath;
  activeFileDescriptor = descriptor;
  const writer = new ArchiveWriter(descriptor);
  const centralEntries = [];
  const rootName = archiveRootName(source);

  try {
    for (const candidate of candidates) {
      const stat = safeLstat(candidate.absolutePath);
      if (stat.isSymbolicLink()) {
        throw new ZipSourceError(`文件在扫描后变成了符号链接，已中止: ${candidate.absolutePath}`);
      }
      if (!stat.isFile()) {
        throw new ZipSourceError(`文件在扫描后不再是普通文件，已中止: ${candidate.absolutePath}`);
      }
      if (!Number.isSafeInteger(stat.size) || stat.size < 0) {
        throw new ZipSourceError(`文件大小超出 Node.js 可安全处理范围: ${candidate.absolutePath}`);
      }

      const relativeText = normalizedRelative(candidate.relativePath);
      const archiveName = contentsOnly ? relativeText : `${rootName}/${relativeText}`;
      const nameBuffer = Buffer.from(archiveName, 'utf8');
      if (nameBuffer.length === 0 || nameBuffer.length > MAX_UINT16) {
        throw new ZipSourceError(`ZIP 内部路径过长或为空: ${archiveName}`);
      }

      const sizeHint = BigInt(stat.size);
      const method = compressionLevel === 0 ? 0 : 8;
      const useZip64 = sizeHint > MAX_UINT32
        || (method === 8 && deflateBound(sizeHint) > MAX_UINT32);
      const { dosTime, dosDate } = toDosDateTime(stat.mtime);
      const localHeaderOffset = writer.position;
      const baseEntry = {
        archiveName,
        nameBuffer,
        method,
        dosTime,
        dosDate,
        mode: stat.mode,
        useZip64,
      };

      writer.write(makeLocalHeader(baseEntry));
      const streamed = await streamFileToArchive(
        candidate.absolutePath,
        writer,
        method,
        compressionLevel,
      );

      const completeEntry = {
        ...baseEntry,
        ...streamed,
        localHeaderOffset,
      };
      writer.write(makeDataDescriptor(completeEntry));
      centralEntries.push(completeEntry);
    }

    const centralOffset = writer.position;
    let anyZip64Entry = false;
    for (const entry of centralEntries) {
      if (
        entry.useZip64
        || entry.compressedSize > MAX_UINT32
        || entry.uncompressedSize > MAX_UINT32
        || entry.localHeaderOffset > MAX_UINT32
      ) {
        anyZip64Entry = true;
      }
      writer.write(makeCentralHeader(entry));
    }
    const centralSize = writer.position - centralOffset;
    const entryCount = BigInt(centralEntries.length);
    const needsZip64End = (
      anyZip64Entry
      || entryCount >= BigInt(MAX_UINT16)
      || centralSize > MAX_UINT32
      || centralOffset > MAX_UINT32
    );

    if (needsZip64End) {
      const zip64RecordOffset = writer.position;
      writer.write(makeZip64EndOfCentralDirectory(entryCount, centralSize, centralOffset));
      writer.write(makeZip64Locator(zip64RecordOffset));
    }
    writer.write(makeEndOfCentralDirectory(entryCount, centralSize, centralOffset));

    fs.fsyncSync(descriptor);
    fs.closeSync(descriptor);
    activeFileDescriptor = null;

    installTempOutput(tempPath, output, force);
    activeTempPath = null;
  } catch (error) {
    cleanupActiveTemp();
    if (error instanceof ZipSourceError) {
      throw error;
    }
    throw new ZipSourceError(`创建 ZIP 失败: ${error.message}`);
  }
}

// ---------------------------------------------------------------------------
// 命令行
// ---------------------------------------------------------------------------

function printDefaults() {
  process.stdout.write('默认 IGNORE 正则：\n');
  for (const pattern of IGNORE) {
    process.stdout.write(`  ${pattern}\n`);
  }
  process.stdout.write('\n默认源码扩展名：\n');
  process.stdout.write(`  ${Array.from(CODE_EXTENSIONS).sort(compareNames).join(' ')}\n`);
  process.stdout.write('\n默认特殊源码文件名：\n');
  process.stdout.write(`  ${Array.from(CODE_FILENAMES).sort(compareNames).join(' ')}\n`);
}

function printHelp(programName) {
  const help = `将指定目录压缩为只包含源码的 ZIP。
默认使用正则排除依赖、构建产物、秘密文件、YAML 和压缩包。

用法：
  node ${programName} [选项] <目录>

参数：
  <目录>                         要压缩的源码目录

选项：
  -o, --output <ZIP>             输出 ZIP；默认是 <目录名>.code.zip
  -f, --force                    允许覆盖已存在的输出 ZIP
      --ignore <REGEX>           追加忽略正则；可重复使用
      --ignore-from <FILE>       从 UTF-8 文件读取忽略正则，每行一个
      --include <REGEX>          在仅源码模式下额外纳入匹配文件
      --all-files                纳入所有未被 IGNORE 排除的普通文件
      --no-default-ignore        禁用脚本内置 IGNORE；请谨慎使用
      --contents-only            ZIP 内不创建顶层目录
      --compression-level <0-9>  0 为仅存储，1 最快，9 压缩率最高；默认 9
      --dry-run                  只显示将被纳入的文件，不创建 ZIP
      --allow-empty              允许创建空 ZIP
  -v, --verbose                  显示每个被跳过项目的原因
  -q, --quiet                    成功时仅输出 ZIP 的绝对路径
      --show-defaults            显示内置规则后退出
      --version                  显示版本后退出
  -h, --help                     显示本帮助

示例：
  node ${programName} ./my-project
  node ${programName} ./my-project -o ./backup/project.zip --force
  node ${programName} ./my-project --dry-run --verbose
  node ${programName} ./my-project --ignore '(^|/)fixtures?(/|$)'
  node ${programName} ./my-project --include '(^|/)package\\.json$'

注意：
  --ignore、--include 和 IGNORE 使用 JavaScript 正则表达式，不是 .gitignore glob。
  本脚本只使用 Node.js 内置模块，不需要 npm install，也不调用系统 zip 命令。
`;
  process.stdout.write(help);
}

function parseArguments(argv) {
  const options = {
    directory: null,
    output: null,
    force: false,
    ignore: [],
    ignoreFrom: [],
    include: [],
    allFiles: false,
    noDefaultIgnore: false,
    contentsOnly: false,
    compressionLevel: 9,
    dryRun: false,
    allowEmpty: false,
    verbose: false,
    quiet: false,
    showDefaults: false,
    showVersion: false,
    showHelp: false,
  };
  const positionals = [];
  let endOfOptions = false;

  function requireValue(optionName, inlineValue, indexRef) {
    if (inlineValue !== null) {
      if (inlineValue.length === 0) {
        throw new ZipSourceError(`选项 ${optionName} 缺少值`);
      }
      return { value: inlineValue, nextIndex: indexRef };
    }
    if (indexRef + 1 >= argv.length) {
      throw new ZipSourceError(`选项 ${optionName} 缺少值`);
    }
    return { value: argv[indexRef + 1], nextIndex: indexRef + 1 };
  }

  function rejectInlineValue(optionName, inlineValue) {
    if (inlineValue !== null) {
      throw new ZipSourceError(`选项 ${optionName} 不接受值`);
    }
  }

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (endOfOptions) {
      positionals.push(argument);
      continue;
    }
    if (argument === '--') {
      endOfOptions = true;
      continue;
    }

    if (argument.startsWith('--')) {
      const equalsIndex = argument.indexOf('=');
      const name = equalsIndex === -1 ? argument : argument.slice(0, equalsIndex);
      const inlineValue = equalsIndex === -1 ? null : argument.slice(equalsIndex + 1);

      switch (name) {
        case '--output': {
          const result = requireValue(name, inlineValue, index);
          options.output = result.value;
          index = result.nextIndex;
          break;
        }
        case '--ignore': {
          const result = requireValue(name, inlineValue, index);
          options.ignore.push(result.value);
          index = result.nextIndex;
          break;
        }
        case '--ignore-from': {
          const result = requireValue(name, inlineValue, index);
          options.ignoreFrom.push(result.value);
          index = result.nextIndex;
          break;
        }
        case '--include': {
          const result = requireValue(name, inlineValue, index);
          options.include.push(result.value);
          index = result.nextIndex;
          break;
        }
        case '--compression-level': {
          const result = requireValue(name, inlineValue, index);
          if (!/^[0-9]$/.test(result.value)) {
            throw new ZipSourceError('--compression-level 必须是 0 到 9 的整数');
          }
          options.compressionLevel = Number(result.value);
          index = result.nextIndex;
          break;
        }
        case '--force':
          rejectInlineValue(name, inlineValue);
          options.force = true;
          break;
        case '--all-files':
          rejectInlineValue(name, inlineValue);
          options.allFiles = true;
          break;
        case '--no-default-ignore':
          rejectInlineValue(name, inlineValue);
          options.noDefaultIgnore = true;
          break;
        case '--contents-only':
          rejectInlineValue(name, inlineValue);
          options.contentsOnly = true;
          break;
        case '--dry-run':
          rejectInlineValue(name, inlineValue);
          options.dryRun = true;
          break;
        case '--allow-empty':
          rejectInlineValue(name, inlineValue);
          options.allowEmpty = true;
          break;
        case '--verbose':
          rejectInlineValue(name, inlineValue);
          options.verbose = true;
          break;
        case '--quiet':
          rejectInlineValue(name, inlineValue);
          options.quiet = true;
          break;
        case '--show-defaults':
          rejectInlineValue(name, inlineValue);
          options.showDefaults = true;
          break;
        case '--version':
          rejectInlineValue(name, inlineValue);
          options.showVersion = true;
          break;
        case '--help':
          rejectInlineValue(name, inlineValue);
          options.showHelp = true;
          break;
        default:
          throw new ZipSourceError(`未知选项: ${name}`);
      }
      continue;
    }

    switch (argument) {
      case '-o': {
        const result = requireValue(argument, null, index);
        options.output = result.value;
        index = result.nextIndex;
        break;
      }
      case '-f':
        options.force = true;
        break;
      case '-v':
        options.verbose = true;
        break;
      case '-q':
        options.quiet = true;
        break;
      case '-h':
        options.showHelp = true;
        break;
      default:
        if (argument.startsWith('-')) {
          throw new ZipSourceError(`未知选项: ${argument}；路径以 - 开头时请放在 -- 后面`);
        }
        positionals.push(argument);
        break;
    }
  }

  if (positionals.length > 1) {
    throw new ZipSourceError(`只能指定一个目录，收到: ${positionals.join(', ')}`);
  }
  options.directory = positionals.length === 1 ? positionals[0] : null;

  if (options.verbose && options.quiet) {
    throw new ZipSourceError('--verbose 与 --quiet 不能同时使用');
  }
  return options;
}

async function run(argv) {
  assertSupportedNode();
  const args = parseArguments(argv);
  const programName = path.basename(process.argv[1] || 'zip_source_code.js');

  if (args.showHelp) {
    printHelp(programName);
    return 0;
  }
  if (args.showVersion) {
    process.stdout.write(`${programName} ${VERSION}\n`);
    return 0;
  }
  if (args.showDefaults) {
    printDefaults();
    return 0;
  }
  if (args.directory === null) {
    throw new ZipSourceError(`缺少要压缩的目录；使用 node ${programName} --help 查看帮助`);
  }

  const source = path.resolve(expandUser(args.directory));
  let sourceStat;
  try {
    sourceStat = fs.statSync(source);
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new ZipSourceError(`目录不存在: ${source}`);
    }
    throw new ZipSourceError(`无法访问目录 ${source}: ${error.message}`);
  }
  if (!sourceStat.isDirectory()) {
    throw new ZipSourceError(`参数不是目录: ${source}`);
  }

  const output = args.output
    ? normalizeOutputPath(args.output)
    : path.resolve(defaultOutputPath(source));
  const initialOutputState = outputPathState(output);
  if (initialOutputState.isDirectory) {
    throw new ZipSourceError(`输出路径是目录，不是 ZIP 文件: ${output}`);
  }
  if (initialOutputState.exists && !args.force && !args.dryRun) {
    throw new ZipSourceError(`输出文件已存在: ${output}；使用 --force 覆盖`);
  }

  const ignorePatterns = args.noDefaultIgnore ? [] : IGNORE.slice();
  ignorePatterns.push(...args.ignore);
  for (const regexFileInput of args.ignoreFrom) {
    const regexFile = path.resolve(expandUser(regexFileInput));
    ignorePatterns.push(...loadRegexFile(regexFile));
  }

  const ignoreRules = compileRules(ignorePatterns, '忽略规则');
  const includeRules = compileRules(args.include, '额外纳入规则');
  const { candidates, stats } = scanSource({
    source,
    output,
    ignoreRules,
    includeRules,
    codeOnly: !args.allFiles,
    verbose: args.verbose,
  });

  if (args.dryRun && !args.quiet) {
    for (const candidate of candidates) {
      process.stdout.write(`[包含] ${normalizedRelative(candidate.relativePath)}\n`);
    }
  }

  if (candidates.length === 0 && !args.allowEmpty) {
    throw new ZipSourceError(
      '没有找到可打包文件；可检查 IGNORE/源码扩展名，或使用 --all-files、--include、--allow-empty',
    );
  }

  if (!args.quiet) {
    process.stdout.write(
      `扫描结果: 包含 ${stats.included} 个文件（${formatHumanSize(stats.includedBytes)}）；`
      + `正则忽略 ${stats.ignored} 项；`
      + `非源码 ${stats.nonCode} 项；`
      + `符号链接 ${stats.symlinks} 项；`
      + `非普通文件 ${stats.special} 项。\n`,
    );
  }

  if (args.dryRun) {
    if (!args.quiet) {
      process.stdout.write('预览完成：未创建 ZIP。\n');
    }
    return 0;
  }

  await createArchive({
    source,
    output,
    candidates,
    compressionLevel: args.compressionLevel,
    contentsOnly: args.contentsOnly,
    force: args.force,
  });

  let archiveSize = 0n;
  try {
    const outputStat = fs.statSync(output);
    archiveSize = BigInt(outputStat.size);
  } catch (_error) {
    // ZIP 已成功安装；大小读取失败不影响结果。
  }

  if (args.quiet) {
    process.stdout.write(`${output}\n`);
  } else {
    process.stdout.write(`已创建: ${output}\n`);
    process.stdout.write(`ZIP 大小: ${formatHumanSize(archiveSize)}\n`);
  }
  return 0;
}

function handleSignal(signal) {
  cleanupActiveTemp();
  process.stderr.write(`\n操作已取消（${signal}）。\n`);
  process.exit(130);
}

process.once('SIGINT', () => handleSignal('SIGINT'));
process.once('SIGTERM', () => handleSignal('SIGTERM'));

run(process.argv.slice(2))
  .then((code) => {
    process.exitCode = code;
  })
  .catch((error) => {
    cleanupActiveTemp();
    if (error instanceof ZipSourceError) {
      process.stderr.write(`错误: ${error.message}\n`);
    } else {
      process.stderr.write(`错误: ${error && error.stack ? error.stack : String(error)}\n`);
    }
    process.exitCode = 1;
  });
