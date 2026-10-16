// Full grammar parsing; range edits, not a handwritten TOML/JSON parser.
import { isDeepStrictEqual } from 'node:util';
import { parseTOML, getStaticTOMLValue, parseTree, modify, applyEdits } from '../vendor/parsers.mjs';

const forbidden = new Set(['__proto__', 'prototype', 'constructor']);
export class ConfigError extends Error {
  constructor(code) { super(code); this.code = code; }
}
const keys = node => node.keys.map(key => key.type === 'TOMLBare' ? key.name : key.value);
const prefix = (a, b) => a.length <= b.length && a.every((v, i) => v === b[i]);
const same = (a, b) => a.length === b.length && prefix(a, b);
const keyText = path => path.map(key => JSON.stringify(key)).join('.');
export function at(value, path) {
  for (const key of path) {
    if (value === null || typeof value !== 'object' || !Object.hasOwn(value, key)) return undefined;
    value = value[key];
  }
  return value;
}
function checkedPath(path) {
  if (!Array.isArray(path) || !path.length || path.some(k => typeof k !== 'string' || forbidden.has(k))) {
    throw new ConfigError('unsafe_key');
  }
}
function set(value, path, replacement) {
  let cursor = value;
  for (const key of path.slice(0, -1)) {
    if (!Object.hasOwn(cursor, key)) cursor[key] = {};
    if (!cursor[key] || typeof cursor[key] !== 'object' || Array.isArray(cursor[key]) || cursor[key] instanceof Date) {
      throw new ConfigError('parent_type_conflict');
    }
    cursor = cursor[key];
  }
  cursor[path.at(-1)] = replacement;
}
function tomlNodes(ast) {
  const entries = [], tables = [], inline = [];
  function walk(nodes, base = []) {
    for (const node of nodes) {
      if (node.type === 'TOMLTable') {
        const path = node.resolvedKey;
        if (path.some(k => forbidden.has(k))) throw new ConfigError('unsafe_key');
        tables.push({ node, path }); walk(node.body, path);
      } else if (node.type === 'TOMLKeyValue') {
        const path = [...base, ...keys(node.key)];
        if (path.some(k => forbidden.has(k))) throw new ConfigError('unsafe_key');
        entries.push({ node, path });
        walkValue(node.value, path);
      }
    }
  }
  function walkValue(node, path) {
    if (node.type === 'TOMLInlineTable') { inline.push({ node, path }); walk(node.body, path); }
    if (node.type === 'TOMLArray') node.elements.forEach((child, i) => walkValue(child, [...path, i]));
  }
  walk(ast.body[0].body);
  return { entries, tables, inline };
}
function checkJSONTree(node, depth = 0) {
  if (depth > 64) throw new ConfigError('nesting_limit');
  if (node.type === 'object') {
    const seen = new Set();
    for (const property of node.children ?? []) {
      const name = property.children[0].value;
      if (forbidden.has(name)) throw new ConfigError('unsafe_key');
      if (seen.has(name)) throw new ConfigError('duplicate_json_key');
      seen.add(name);
    }
  }
  for (const child of node.children ?? []) checkJSONTree(child, depth + 1);
}
export function parseDocument(text, format) {
  if (typeof text !== 'string' || Buffer.byteLength(text) > 1024 * 1024) throw new ConfigError('document_size_limit');
  try {
    if (format === 'toml') {
      const ast = parseTOML(text, { tomlVersion: '1.0.0' });
      const nodes = tomlNodes(ast); // Reject dangerous object keys before static evaluation.
      return { text, format, ast, ...nodes, value: getStaticTOMLValue(ast) };
    }
    if (format !== 'json') throw new ConfigError('unsupported_format');
    const value = JSON.parse(text); // Deliberately reject JSONC/trailing commas.
    const errors = [];
    const ast = parseTree(text, errors, { allowTrailingComma: false, disallowComments: true });
    if (errors.length || !ast || ast.type !== 'object') throw new ConfigError('invalid_json_object');
    checkJSONTree(ast);
    return { text, format, ast, value };
  } catch (error) {
    // Parser errors can quote secrets: expose a code, never the original message.
    if (error instanceof ConfigError) throw error;
    throw new ConfigError(format === 'toml' ? 'invalid_toml' : 'invalid_json');
  }
}
function literal(value) {
  if (typeof value === 'string' || typeof value === 'boolean') return JSON.stringify(value);
  if (typeof value === 'number' && Number.isSafeInteger(value)) return String(value);
  if (Array.isArray(value)) return '[' + value.map(literal).join(', ') + ']';
  throw new ConfigError('unsupported_replacement_type');
}
function lineEnd(text, offset) {
  const end = text.indexOf('\n', offset);
  return end < 0 ? text.length : end + 1;
}
function replaceRanges(text, changes) {
  const sorted = changes.sort((a, b) => b.start - a.start);
  let last = text.length + 1;
  for (const edit of sorted) {
    if (edit.end > last) throw new ConfigError('overlapping_edits');
    text = text.slice(0, edit.start) + edit.text + text.slice(edit.end);
    last = edit.start;
  }
  return text;
}
function tomlPatch(doc, path, value) {
  const { text, entries, tables, inline } = doc;
  const serialized = literal(value);
  const exact = entries.find(entry => same(entry.path, path));
  if (exact) return text.slice(0, exact.node.value.range[0]) + serialized + text.slice(exact.node.value.range[1]);

  // A table-valued exporter may be replaced only within its own subtree. The
  // semantic postcondition below proves that unrelated tables were preserved.
  const subtree = tables.filter(table => prefix(path, table.path));
  if (subtree.length) {
    if (subtree.some(table => table.node.kind === 'array')) throw new ConfigError('array_table_replacement_blocked');
    const edits = [];
    for (const table of subtree) {
      edits.push({ start: table.node.range[0], end: table.node.key.range[1] + 1, text: '' });
      for (const child of table.node.body) edits.push({ start: child.range[0], end: child.range[1], text: '' });
    }
    const without = parseDocument(replaceRanges(text, edits), 'toml');
    return tomlPatch(without, path, value);
  }
  // Object represented by dotted keys without an explicit table header.
  const dotted = entries.filter(entry => prefix(path, entry.path));
  if (dotted.length) {
    const outer = dotted.filter(entry => !dotted.some(other => other !== entry && prefix(other.path, entry.path)));
    if (outer.some(entry => entry.node.parent.type === 'TOMLInlineTable')) throw new ConfigError('inline_subtree_replacement_blocked');
    return tomlPatch(parseDocument(replaceRanges(text, outer.map(entry => ({ start: entry.node.range[0], end: entry.node.range[1], text: '' }))), 'toml'), path, value);
  }
  const inlined = inline.filter(entry => prefix(entry.path, path)).sort((a, b) => b.path.length - a.path.length)[0];
  if (inlined) {
    const pos = inlined.node.range[1] - 1;
    const insertion = (inlined.node.body.length ? ', ' : ' ') + keyText(path.slice(inlined.path.length)) + ' = ' + serialized + ' ';
    return text.slice(0, pos) + insertion + text.slice(pos);
  }
  const parent = tables.filter(entry => entry.node.kind === 'standard' && prefix(entry.path, path)).sort((a, b) => b.path.length - a.path.length)[0];
  const eol = text.includes('\r\n') ? '\r\n' : '\n';
  const pos = parent ? lineEnd(text, parent.node.key.range[1] + 1) : 0;
  const relative = parent ? path.slice(parent.path.length) : path;
  return text.slice(0, pos) + (pos && !text.slice(0, pos).endsWith('\n') ? eol : '') + keyText(relative) + ' = ' + serialized + eol + text.slice(pos);
}
export function patchDocument(text, format, operations) {
  let doc = parseDocument(text, format);
  for (const { path, value } of operations) {
    checkedPath(path);
    if (isDeepStrictEqual(at(doc.value, path), value)) continue;
    const expected = structuredClone(doc.value);
    set(expected, path, structuredClone(value));
    const changed = format === 'toml' ? tomlPatch(doc, path, value) : applyEdits(doc.text, modify(doc.text, path, value, {
      formattingOptions: { insertSpaces: true, tabSize: 2, eol: doc.text.includes('\r\n') ? '\r\n' : '\n' },
    }));
    const next = parseDocument(changed, format);
    if (!isDeepStrictEqual(next.value, expected)) throw new ConfigError('semantic_postcondition_failed');
    doc = next;
  }
  return doc.text;
}
