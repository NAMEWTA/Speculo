#!/usr/bin/env node

import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { accessSync, constants, createReadStream } from "node:fs";
import { lstat, readFile, readdir } from "node:fs/promises";
import { homedir } from "node:os";
import { createInterface } from "node:readline";
import { delimiter, isAbsolute, join, relative, sep } from "node:path";

const MAX_SESSION_FILES = 200;
const MAX_SESSION_BYTES = 64 * 1024 * 1024;
const MAX_INCIDENTS = 100;
const COMMAND_TIMEOUT_MS = 20_000;

const SAFE_SETTINGS = new Set([
  "model",
  "model_provider",
  "model_reasoning_effort",
  "model_reasoning_summary",
  "model_verbosity",
  "plan_mode_reasoning_effort",
  "model_auto_compact_token_limit",
  "model_auto_compact_token_limit_scope",
  "model_context_window",
  "approval_policy",
  "approvals_reviewer",
  "sandbox_mode",
  "default_permissions",
  "cli_auth_credentials_store",
  "agents.enabled",
  "agents.max_concurrent_threads_per_session",
  "agents.max_threads",
  "agents.default_subagent_model",
  "agents.default_subagent_reasoning_effort",
  "sandbox_workspace_write.network_access",
  "history.persistence",
  "history.max_bytes",
  "features.remote_compaction_v2",
]);

class UsageError extends Error {}

function usage() {
  return [
    "Usage:",
    "  node audit-codex-config.mjs --codex-home <absolute-directory> [options]",
    "",
    "Options:",
    "  --codex-bin <absolute-path>  Codex executable (default: resolve codex from PATH)",
    "  --since-days <number>        Scan recent rollout files (default: 7, range: 1-365)",
    "  --no-command-probes          Skip Codex CLI and config-writer probes",
    "  --json                       Emit the schema-v1 JSON report",
    "  -h, --help                   Show this help",
    "",
    "The audit is read-only. It never reads auth.json contents or emits rollout prompt/tool content.",
    "",
  ].join("\n");
}

function parseArgs(argv) {
  const options = {
    codex_home: null,
    codex_bin: "codex",
    since_days: 7,
    command_probes: true,
    json: false,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index];
    if (item === "--codex-home" || item === "--codex-bin" || item === "--since-days") {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) throw new UsageError(item + " requires a value");
      const key = item.slice(2).replaceAll("-", "_");
      options[key] = value;
      index += 1;
    } else if (item === "--no-command-probes") {
      options.command_probes = false;
    } else if (item === "--json") {
      options.json = true;
    } else if (item === "--help" || item === "-h") {
      options.help = true;
    } else {
      throw new UsageError("unknown argument: " + item);
    }
  }

  if (options.help) return options;
  if (!options.codex_home) throw new UsageError("--codex-home is required");
  if (!isAbsolute(options.codex_home)) throw new UsageError("--codex-home must be an absolute path");
  if (options.codex_bin !== "codex" && !isAbsolute(options.codex_bin)) {
    throw new UsageError("--codex-bin must be an absolute path");
  }
  const sinceDays = Number(options.since_days);
  if (!Number.isInteger(sinceDays) || sinceDays < 1 || sinceDays > 365) {
    throw new UsageError("--since-days must be an integer from 1 to 365");
  }
  options.since_days = sinceDays;
  return options;
}

async function fileMetadata(path) {
  try {
    const stat = await lstat(path);
    let type = "other";
    if (stat.isSymbolicLink()) type = "symlink";
    else if (stat.isFile()) type = "file";
    else if (stat.isDirectory()) type = "directory";
    return {
      exists: true,
      type,
      ...(stat.isFile() ? { bytes: stat.size } : {}),
      mode: "0" + (stat.mode & 0o777).toString(8).padStart(3, "0"),
      mtime: stat.mtime.toISOString(),
    };
  } catch (error) {
    if (error?.code === "ENOENT") return { exists: false };
    throw error;
  }
}

async function hashFile(path) {
  return createHash("sha256").update(await readFile(path)).digest("hex");
}

function parsePrimitive(raw) {
  const value = raw.trim();
  const doubleQuoted = value.match(/^("(?:[^"\\]|\\.)*")\s*(?:#.*)?$/);
  if (doubleQuoted) {
    try {
      return JSON.parse(doubleQuoted[1]);
    } catch {
      return null;
    }
  }
  const singleQuoted = value.match(/^'([^']*)'\s*(?:#.*)?$/);
  if (singleQuoted) return singleQuoted[1];
  const boolean = value.match(/^(true|false)\s*(?:#.*)?$/);
  if (boolean) return boolean[1] === "true";
  const number = value.match(/^(-?\d+)\s*(?:#.*)?$/);
  if (number) return Number(number[1]);
  return null;
}

function redactConfigPath(path) {
  const parts = path.split(".");
  const dynamicParents = new Set(["model_providers", "mcp_servers", "profiles", "plugins", "skills"]);
  if (dynamicParents.has(parts[0]) && parts.length > 1) parts[1] = "<id>";
  if (parts[0] === "agents" && parts.length > 2) parts[1] = "<role>";
  return parts.join(".");
}

function endpointScheme(value) {
  if (typeof value !== "string") return "unknown";
  const match = value.match(/^([a-z][a-z0-9+.-]*):\/\//i);
  return match ? match[1].toLowerCase() : "unknown";
}

function scanConfig(text) {
  const safeSettings = {};
  const declaredSections = new Set();
  const declaredKeys = new Set();
  const providers = new Map();
  let table = "";
  let containsInlineSecretMaterial = false;

  for (const line of text.split(/\r?\n/)) {
    const tableMatch = line.match(/^\s*\[\[?\s*([A-Za-z0-9_.-]+)\s*\]\]?\s*(?:#.*)?$/);
    if (tableMatch) {
      table = tableMatch[1];
      declaredSections.add(redactConfigPath(table));
      continue;
    }
    const keyMatch = line.match(/^\s*([A-Za-z0-9_.-]+)\s*=\s*(.*)$/);
    if (!keyMatch) continue;
    const localKey = keyMatch[1];
    const fullKey = table ? table + "." + localKey : localKey;
    const redactedKey = redactConfigPath(fullKey);
    const value = parsePrimitive(keyMatch[2]);
    declaredKeys.add(redactedKey);

    const lowerKey = fullKey.toLowerCase();
    if (
      lowerKey.includes("experimental_bearer_token") ||
      lowerKey.includes("authorization") ||
      lowerKey.includes("api_key") ||
      lowerKey.includes("password") ||
      lowerKey.includes("secret") ||
      (lowerKey.includes("http_headers") && /bearer|basic|token/i.test(keyMatch[2]))
    ) {
      containsInlineSecretMaterial = true;
    }

    if (SAFE_SETTINGS.has(fullKey) && value !== null) safeSettings[fullKey] = value;

    const providerMatch = fullKey.match(/^model_providers\.([A-Za-z0-9_-]+)\.(.+)$/);
    if (!providerMatch) continue;
    const providerId = providerMatch[1];
    const providerKey = providerMatch[2];
    if (!providers.has(providerId)) providers.set(providerId, {});
    const provider = providers.get(providerId);
    if (providerKey === "base_url") provider.base_url_scheme = endpointScheme(value);
    else if (providerKey === "wire_api" && typeof value === "string") provider.wire_api = value;
    else if (providerKey === "requires_openai_auth" && typeof value === "boolean") provider.requires_openai_auth = value;
    else if (providerKey === "env_key") provider.has_env_key = true;
    else if (providerKey === "experimental_bearer_token") provider.has_inline_bearer_token = true;
    else if (providerKey === "auth.command") provider.has_auth_command = true;
    else if (providerKey === "request_max_retries" && typeof value === "number") provider.request_max_retries = value;
    else if (providerKey === "stream_max_retries" && typeof value === "number") provider.stream_max_retries = value;
    else if (providerKey === "stream_idle_timeout_ms" && typeof value === "number") provider.stream_idle_timeout_ms = value;
  }

  if (typeof safeSettings.model_provider === "string" && providers.has(safeSettings.model_provider)) {
    safeSettings.model_provider = "<custom-provider>";
  }

  return {
    line_count: text.split(/\r?\n/).length,
    declared_sections: [...declaredSections].sort(),
    declared_keys: [...declaredKeys].sort(),
    safe_settings: safeSettings,
    custom_providers: [...providers.values()].map((provider, index) => ({
      id: "provider-" + (index + 1),
      ...provider,
    })),
    contains_inline_secret_material: containsInlineSecretMaterial,
  };
}

function redactString(value) {
  let output = value;
  output = output.replace(/https?:\/\/[^\s"'<>),]+/gi, (url) => {
    const scheme = url.slice(0, url.indexOf(":"));
    return "<redacted-url:" + scheme.toLowerCase() + ">";
  });
  output = output.replace(/\bsk-[A-Za-z0-9_-]{6,}\b/g, "<redacted-secret>");
  output = output.replace(
    /(authorization|api[_-]?key|bearer|password|secret)\s*[:=]\s*[^\s,;]+/gi,
    "$1=<redacted>",
  );
  if (/^(?:\/|[A-Za-z]:[\\/])/.test(output)) return "<absolute-path>";
  return output.length > 1_000 ? output.slice(0, 1_000) + "<truncated>" : output;
}

function sanitizeValue(value, key = "", depth = 0) {
  if (depth > 12) return "<depth-limit>";
  if (value === null || typeof value === "number" || typeof value === "boolean") return value;
  if (typeof value === "string") {
    if (/(password|secret|bearer|api[_-]?key|authorization|credential|headers?)/i.test(key)) {
      return "<redacted>";
    }
    return redactString(value);
  }
  if (Array.isArray(value)) return value.slice(0, 200).map((item) => sanitizeValue(item, key, depth + 1));
  if (typeof value === "object") {
    const result = {};
    for (const [childKey, childValue] of Object.entries(value).slice(0, 300)) {
      result[childKey] = sanitizeValue(childValue, childKey, depth + 1);
    }
    return result;
  }
  return String(value);
}

function runCommand(command, args, codexHome) {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    timeout: COMMAND_TIMEOUT_MS,
    maxBuffer: 8 * 1024 * 1024,
    env: { ...process.env, CODEX_HOME: codexHome, NO_COLOR: "1" },
  });
  return {
    status: result.status,
    stdout: result.stdout ?? "",
    error_code: result.error?.code ?? null,
    timed_out: result.error?.code === "ETIMEDOUT",
  };
}

function resolveExecutable(command) {
  if (isAbsolute(command)) return command;
  const extensions = process.platform === "win32"
    ? (process.env.PATHEXT ?? ".EXE;.CMD;.BAT").split(";")
    : [""];
  const directories = [
    ...(process.env.PATH ?? "").split(delimiter).filter(Boolean),
    join(homedir(), ".volta", "bin"),
    join(homedir(), ".local", "bin"),
    "/opt/homebrew/bin",
    "/usr/local/bin",
  ];
  for (const directory of [...new Set(directories)]) {
    for (const extension of extensions) {
      const candidate = join(directory, command + extension.toLowerCase());
      try {
        accessSync(candidate, process.platform === "win32" ? constants.F_OK : constants.X_OK);
        return candidate;
      } catch {
        // Try the next deterministic candidate.
      }
    }
  }
  return command;
}

function parseFeatures(text) {
  const features = [];
  for (const line of text.split(/\r?\n/)) {
    const match = line.trim().match(/^(\S+)\s+(.+?)\s+(true|false)$/);
    if (!match) continue;
    features.push({ name: match[1], maturity: match[2].trim(), enabled: match[3] === "true" });
  }
  return features;
}

function collectModels(value, output = [], seen = new Set()) {
  if (output.length >= 100 || value === null || typeof value !== "object") return output;
  if (Array.isArray(value)) {
    for (const item of value) collectModels(item, output, seen);
    return output;
  }
  const slug = typeof value.slug === "string" ? value.slug : typeof value.model === "string" ? value.model : null;
  if (slug && !seen.has(slug)) {
    seen.add(slug);
    const levels = Array.isArray(value.supported_reasoning_levels)
      ? value.supported_reasoning_levels
        .map((item) => typeof item === "string" ? item : item?.effort ?? item?.reasoning_effort)
        .filter((item) => typeof item === "string")
      : [];
    output.push({
      slug,
      ...(Number.isFinite(value.context_window) ? { context_window: value.context_window } : {}),
      ...(Number.isFinite(value.max_context_window) ? { max_context_window: value.max_context_window } : {}),
      ...(Number.isFinite(value.effective_context_window_percent)
        ? { effective_context_window_percent: value.effective_context_window_percent }
        : {}),
      ...(levels.length ? { reasoning_efforts: levels } : {}),
    });
  }
  for (const child of Object.values(value)) collectModels(child, output, seen);
  return output;
}

function commandProbes(codexBin, codexHome) {
  const executable = resolveExecutable(codexBin);
  const versionRun = runCommand(executable, ["--version"], codexHome);
  const doctorRun = runCommand(executable, ["doctor", "--json"], codexHome);
  const featuresRun = runCommand(executable, ["features", "list"], codexHome);
  const modelsRun = runCommand(executable, ["debug", "models", "--bundled"], codexHome);

  let doctor = null;
  let doctorParsed = false;
  if (doctorRun.stdout.trim()) {
    try {
      doctor = sanitizeValue(JSON.parse(doctorRun.stdout));
      doctorParsed = true;
    } catch {
      doctor = null;
    }
  }

  let models = [];
  let modelsParsed = false;
  if (modelsRun.stdout.trim()) {
    try {
      models = collectModels(JSON.parse(modelsRun.stdout));
      modelsParsed = true;
    } catch {
      models = [];
    }
  }

  return {
    version: {
      status: versionRun.status,
      available: versionRun.error_code !== "ENOENT",
      value: versionRun.status === 0 ? redactString(versionRun.stdout.trim()) : null,
    },
    doctor: {
      status: doctorRun.status,
      parsed: doctorParsed,
      report: doctor,
      timed_out: doctorRun.timed_out,
    },
    features: {
      status: featuresRun.status,
      entries: featuresRun.status === 0 ? parseFeatures(featuresRun.stdout) : [],
      timed_out: featuresRun.timed_out,
    },
    models: {
      status: modelsRun.status,
      parsed: modelsParsed,
      entries: models,
      timed_out: modelsRun.timed_out,
    },
  };
}

function parseWritableLsofHandles(text) {
  const writers = new Set();
  let pid = null;
  for (const line of text.split(/\r?\n/)) {
    const field = line[0];
    const value = line.slice(1);
    if (field === "p") {
      pid = /^\d+$/.test(value) ? Number(value) : null;
    } else if (field === "a" && pid !== null && (value === "w" || value === "u")) {
      writers.add(pid);
    }
  }
  return [...writers].sort((left, right) => left - right);
}

function activeConfigWriters(configPath) {
  if (process.platform === "win32") {
    return { available: false, detected: false, count: 0, probe: "unsupported" };
  }
  const run = spawnSync("lsof", ["-F", "pca", "--", configPath], {
    encoding: "utf8",
    timeout: 5_000,
    maxBuffer: 2 * 1024 * 1024,
  });
  if (run.error?.code === "ENOENT") {
    return { available: false, detected: false, count: 0, probe: "lsof-unavailable" };
  }
  if (run.status !== 0 && !(run.status === 1 && !(run.stderr ?? "").trim())) {
    return { available: false, detected: false, count: 0, probe: "lsof-failed" };
  }
  const pids = parseWritableLsofHandles(run.stdout ?? "");
  return {
    available: true,
    detected: pids.length > 0,
    count: pids.length,
    probe: "config-writable-handle",
    pids,
  };
}

async function collectSessionFiles(root, cutoff, output = []) {
  let entries;
  try {
    entries = await readdir(root, { withFileTypes: true });
  } catch (error) {
    if (error?.code === "ENOENT") return output;
    throw error;
  }
  for (const entry of entries) {
    if (entry.isSymbolicLink()) continue;
    const path = join(root, entry.name);
    if (entry.isDirectory()) {
      await collectSessionFiles(path, cutoff, output);
    } else if (entry.isFile() && entry.name.endsWith(".jsonl")) {
      const stat = await lstat(path);
      if (stat.mtimeMs >= cutoff) output.push({ path, bytes: stat.size, mtime_ms: stat.mtimeMs });
    }
  }
  return output;
}

function finiteNumber(value) {
  return Number.isFinite(value) ? value : null;
}

function classifyError(message) {
  if (typeof message !== "string") return null;
  const statusMatch = message.match(/(?:status|HTTP(?: status)?)\s*[:=]?\s*(401|403|404|413|429)\b/i)
    ?? message.match(/\b(401|403|404|413|429)\s+(?:Unauthorized|Forbidden|Not Found|Payload Too Large|Request Entity Too Large|Too Many Requests)\b/i);
  const status = statusMatch ? Number(statusMatch[1]) : null;
  const remoteCompaction = /remote compact|compaction/i.test(message);
  const proxySignatures = [
    ["nginx", /\bnginx(?:\/|\b)/i],
    ["envoy", /\benvoy(?:\/|\b)/i],
    ["haproxy", /\bhaproxy(?:\/|\b)/i],
    ["cloudflare", /\bcloudflare(?:\/|\b)/i],
    ["varnish", /\bvarnish(?:\/|\b)/i],
  ];
  const proxy_signature = proxySignatures.find(([, pattern]) => pattern.test(message))?.[0] ?? null;
  const schemeMatch = message.match(/\b(https?):\/\//i);
  const endpoint_scheme = schemeMatch ? schemeMatch[1].toLowerCase() : "unknown";

  let category = null;
  let scope = null;
  if (status === 413) {
    category = proxy_signature ? "external_proxy_body_limit" : "request_body_limit_unattributed";
    scope = proxy_signature ? "external_proxy" : "provider_or_proxy";
  } else if (status === 401) {
    category = "authentication_rejected";
    scope = "authentication";
  } else if (status === 403) {
    category = "authorization_rejected";
    scope = "authentication_or_policy";
  } else if (status === 404) {
    category = "endpoint_or_wire_mismatch";
    scope = "provider_contract";
  } else if (status === 429) {
    category = "provider_rate_limited";
    scope = "upstream_service";
  } else if (/SSE|event-stream|stream (?:closed|disconnect|interruption)/i.test(message)) {
    category = "stream_interruption";
    scope = "provider_or_proxy";
  } else if (/timed? out|timeout/i.test(message)) {
    category = "provider_timeout";
    scope = "provider_or_proxy";
  } else if (remoteCompaction) {
    category = "remote_compaction_failed";
    scope = "provider_or_proxy";
  }
  if (!category) return null;

  return {
    category,
    scope,
    status,
    operation: remoteCompaction ? "remote_compaction" : "responses_request",
    proxy_signature,
    endpoint_scheme,
    evidence: [
      ...(status ? ["http_status_" + status] : []),
      ...(remoteCompaction ? ["remote_compaction"] : []),
      ...(proxy_signature ? ["proxy_generated_response"] : []),
    ],
  };
}

async function scanSessionFile(file, codexHome, incidents, counters) {
  let lastTokenUsage = null;
  const input = createReadStream(file.path, { encoding: "utf8" });
  const lines = createInterface({ input, crlfDelay: Infinity });
  for await (const line of lines) {
    counters.lines_scanned += 1;
    let event;
    try {
      event = JSON.parse(line);
    } catch {
      counters.invalid_json_lines += 1;
      continue;
    }
    if (event?.type !== "event_msg") continue;
    if (event?.payload?.type === "token_count") {
      lastTokenUsage = {
        input_tokens: finiteNumber(event.payload?.info?.last_token_usage?.input_tokens),
        cached_input_tokens: finiteNumber(event.payload?.info?.last_token_usage?.cached_input_tokens),
        output_tokens: finiteNumber(event.payload?.info?.last_token_usage?.output_tokens),
        total_tokens: finiteNumber(event.payload?.info?.last_token_usage?.total_tokens),
        model_context_window: finiteNumber(event.payload?.info?.model_context_window),
      };
      continue;
    }
    const classified = classifyError(event?.payload?.error?.message);
    if (!classified) continue;
    if (incidents.length >= MAX_INCIDENTS) {
      counters.incidents_truncated = true;
      continue;
    }
    incidents.push({
      timestamp: typeof event.timestamp === "string" ? event.timestamp : null,
      source: relative(codexHome, file.path).split(sep).join("/"),
      ...classified,
      token_state: lastTokenUsage,
    });
  }
}

async function scanSessions(codexHome, sinceDays) {
  const cutoff = Date.now() - sinceDays * 24 * 60 * 60 * 1_000;
  const allFiles = await collectSessionFiles(join(codexHome, "sessions"), cutoff);
  allFiles.sort((left, right) => right.mtime_ms - left.mtime_ms);
  const selected = allFiles.slice(0, MAX_SESSION_FILES);
  const incidents = [];
  const counters = {
    files_found: allFiles.length,
    files_scanned: 0,
    files_skipped_oversize: 0,
    files_truncated: allFiles.length > MAX_SESSION_FILES,
    lines_scanned: 0,
    invalid_json_lines: 0,
    incidents_truncated: false,
  };
  for (const file of selected) {
    if (file.bytes > MAX_SESSION_BYTES) {
      counters.files_skipped_oversize += 1;
      continue;
    }
    try {
      await scanSessionFile(file, codexHome, incidents, counters);
      counters.files_scanned += 1;
    } catch {
      counters.invalid_json_lines += 1;
    }
  }
  incidents.sort((left, right) => String(right.timestamp).localeCompare(String(left.timestamp)));
  return { since_days: sinceDays, ...counters, incidents };
}

function sameFingerprint(left, right, leftHash, rightHash) {
  return left.exists === right.exists
    && left.type === right.type
    && left.bytes === right.bytes
    && left.mtime === right.mtime
    && leftHash === rightHash;
}

function buildFindings(report) {
  const findings = [];
  const add = (code, severity, scope) => {
    if (!findings.some((item) => item.code === code)) findings.push({ code, severity, scope });
  };

  if (!report.files.config.exists) add("config_missing", "warning", "local_config");
  if (report.files.config.type === "symlink") add("config_is_symlink", "error", "local_config");
  if (report.files.auth.type === "symlink") add("auth_is_symlink", "error", "authentication");
  if (process.platform !== "win32" && report.files.auth.exists && report.files.auth.mode !== "0600") {
    add("auth_permissions_not_0600", "error", "authentication");
  }
  if (report.config?.contains_inline_secret_material) add("config_contains_inline_secret_material", "error", "local_config");
  if (report.config?.custom_providers.some((provider) => provider.base_url_scheme === "http")) {
    add("provider_transport_is_plain_http", "warning", "provider_contract");
  }
  if (report.runtime.config_drift_detected) add("config_changed_during_audit", "error", "local_config");
  if (report.runtime.active_writers?.detected) add("active_codex_writer_detected", "warning", "local_config");
  for (const incident of report.sessions.incidents) {
    const severity = incident.status && incident.status >= 400 ? "error" : "warning";
    add(incident.category, severity, incident.scope);
  }
  if (report.commands.enabled) {
    for (const key of ["version", "doctor", "features", "models"]) {
      if (report.commands[key].status !== 0) add("codex_" + key + "_probe_failed", "warning", "local_runtime");
    }
  }
  return findings;
}

function humanReport(report) {
  const counts = report.findings.reduce((result, finding) => {
    result[finding.severity] = (result[finding.severity] ?? 0) + 1;
    return result;
  }, {});
  const lines = [
    "Codex configuration audit",
    "config.toml: " + (report.files.config.exists ? report.files.config.type : "missing"),
    "auth.json: " + (report.files.auth.exists ? report.files.auth.type + " mode=" + report.files.auth.mode : "missing"),
    "rollout incidents: " + report.sessions.incidents.length,
    "findings: " + (counts.error ?? 0) + " error, " + (counts.warning ?? 0) + " warning",
  ];
  for (const finding of report.findings) lines.push("[" + finding.severity + "] " + finding.code + " (" + finding.scope + ")");
  return lines.join("\n") + "\n";
}

async function audit(options) {
  const homeMetadata = await fileMetadata(options.codex_home);
  if (!homeMetadata.exists) throw new UsageError("--codex-home does not exist");
  if (homeMetadata.type !== "directory") throw new UsageError("--codex-home must name a directory, not " + homeMetadata.type);

  const configPath = join(options.codex_home, "config.toml");
  const authPath = join(options.codex_home, "auth.json");
  const configBefore = await fileMetadata(configPath);
  const auth = await fileMetadata(authPath);
  let config = null;
  let configHashBefore = null;
  let configReadError = false;
  if (configBefore.type === "file") {
    try {
      const text = await readFile(configPath, "utf8");
      config = scanConfig(text);
      configHashBefore = createHash("sha256").update(text).digest("hex");
    } catch {
      configReadError = true;
    }
  }

  const sessions = await scanSessions(options.codex_home, options.since_days);
  const commands = options.command_probes
    ? { enabled: true, ...commandProbes(options.codex_bin, options.codex_home) }
    : { enabled: false };
  const activeWriters = options.command_probes
    ? activeConfigWriters(configPath)
    : { available: false, detected: false, count: 0, probe: "disabled" };

  const configAfter = await fileMetadata(configPath);
  let configHashAfter = null;
  if (configAfter.type === "file") {
    try {
      configHashAfter = await hashFile(configPath);
    } catch {
      configHashAfter = null;
    }
  }

  const report = {
    schema_version: 1,
    generated_at: new Date().toISOString(),
    scope: "local_codex_only",
    codex_home: "<codex-home>",
    files: {
      config: { ...configBefore, sha256: configHashBefore },
      auth,
    },
    config,
    sessions,
    runtime: {
      active_writers: activeWriters,
      config_drift_detected: !sameFingerprint(configBefore, configAfter, configHashBefore, configHashAfter),
      config_read_error: configReadError,
    },
    commands,
    findings: [],
  };
  report.findings = buildFindings(report);
  if (configReadError) report.findings.push({ code: "config_read_failed", severity: "error", scope: "local_config" });
  return report;
}

async function main() {
  let options;
  try {
    options = parseArgs(process.argv.slice(2));
  } catch (error) {
    if (error instanceof UsageError) {
      process.stderr.write("audit-codex-config: " + error.message + "\n");
      process.exitCode = 2;
      return;
    }
    throw error;
  }

  if (options.help) {
    process.stdout.write(usage());
    return;
  }

  try {
    const report = await audit(options);
    process.stdout.write(options.json ? JSON.stringify(report, null, 2) + "\n" : humanReport(report));
  } catch (error) {
    if (error instanceof UsageError) {
      process.stderr.write("audit-codex-config: " + error.message + "\n");
      process.exitCode = 2;
      return;
    }
    process.stderr.write("audit-codex-config: audit failed\n");
    process.exitCode = 1;
  }
}

await main();
