import { isDeepStrictEqual } from "node:util";

export type JsonObject = Record<string, unknown>;

export type ConfigMergeStats = {
  added: number;
  updated: number;
  preserved: number;
  removed: number;
};

export type ConfigMergeResult = {
  value: JsonObject;
  stats: ConfigMergeStats;
  removedPaths: string[];
};

export type ConfigMergeOptions = {
  baseline?: JsonObject;
  local: JsonObject;
  incoming: JsonObject;
  allowsUnknown: (parentPath: string[], key: string) => boolean;
};

type Missing = { readonly missing: true };
const MISSING: Missing = { missing: true };

function isObject(value: unknown): value is JsonObject {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isMissing(value: unknown | Missing): value is Missing {
  return value === MISSING;
}

function jsonKind(value: unknown): string {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value === "object" ? "object" : typeof value;
}

function assertCompatible(path: string[], local: unknown, incoming: unknown): void {
  const incomingKind = jsonKind(incoming);
  const localKind = jsonKind(local);
  if (incomingKind === "null" || incomingKind === localKind) return;
  throw new Error(`configuration value ${path.join(".")} has type ${localKind}; expected ${incomingKind}`);
}

export function reconcileConfig(options: ConfigMergeOptions): ConfigMergeResult {
  const stats: ConfigMergeStats = { added: 0, updated: 0, preserved: 0, removed: 0 };
  const removedPaths: string[] = [];

  function merge(
    baseline: unknown | Missing,
    local: unknown | Missing,
    incoming: unknown | Missing,
    path: string[],
  ): unknown | Missing {
    if (isMissing(incoming)) {
      if (!isMissing(baseline)) {
        if (!isMissing(local)) {
          stats.removed += 1;
          removedPaths.push(path.join("."));
        }
        return MISSING;
      }
      if (isMissing(local)) return MISSING;
      const key = path.at(-1) ?? "";
      if (options.allowsUnknown(path.slice(0, -1), key)) {
        stats.preserved += 1;
        return local;
      }
      stats.removed += 1;
      removedPaths.push(path.join("."));
      return MISSING;
    }

    if (isMissing(local)) {
      stats.added += 1;
      return incoming;
    }

    if (isMissing(baseline)) {
      assertCompatible(path, local, incoming);
      if (isObject(local) && isObject(incoming)) {
        return mergeObjects(MISSING, local, incoming, path);
      }
      stats.preserved += 1;
      return local;
    }

    if (isObject(baseline) && isObject(local) && isObject(incoming)) {
      return mergeObjects(baseline, local, incoming, path);
    }

    if (isDeepStrictEqual(local, baseline)) {
      if (!isDeepStrictEqual(incoming, baseline)) stats.updated += 1;
      return incoming;
    }

    assertCompatible(path, local, incoming);
    stats.preserved += 1;
    return local;
  }

  function mergeObjects(
    baseline: JsonObject | Missing,
    local: JsonObject,
    incoming: JsonObject,
    path: string[],
  ): JsonObject {
    const output: JsonObject = {};
    const keys = new Set([
      ...(isMissing(baseline) ? [] : Object.keys(baseline)),
      ...Object.keys(local),
      ...Object.keys(incoming),
    ]);
    for (const key of [...keys].sort()) {
      const value = merge(
        isMissing(baseline) || !(key in baseline) ? MISSING : baseline[key],
        key in local ? local[key] : MISSING,
        key in incoming ? incoming[key] : MISSING,
        [...path, key],
      );
      if (!isMissing(value)) output[key] = value;
    }
    return output;
  }

  return {
    value: mergeObjects(options.baseline ?? MISSING, options.local, options.incoming, []),
    stats,
    removedPaths,
  };
}

export function assertJsonObject(value: unknown, label: string): asserts value is JsonObject {
  if (!isObject(value)) throw new Error(label + " must contain a JSON object");
}
