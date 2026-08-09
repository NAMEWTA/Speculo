import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmod, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";

const packageRoot = process.cwd();
const skillRoot = join(packageRoot, "template", "skills", "optimize-codex-config");
const auditor = join(skillRoot, "scripts", "audit-codex-config.mjs");

function runAuditor(args: string[], env: NodeJS.ProcessEnv = process.env) {
  return spawnSync(process.execPath, [auditor, ...args], {
    cwd: packageRoot,
    encoding: "utf8",
    env,
  });
}

async function fixture(): Promise<string> {
  return mkdtemp(join(tmpdir(), "codex-config-audit-"));
}

describe("optimize-codex-config skill", () => {
  it("ships focused model-invoked metadata and explicit mutation gates", async () => {
    const skill = await readFile(join(skillRoot, "SKILL.md"), "utf8");
    const frontmatter = skill.match(/^---\n([\s\S]*?)\n---/);
    assert.ok(frontmatter);
    const keys = frontmatter[1]
      .split("\n")
      .filter(Boolean)
      .map((line) => line.slice(0, line.indexOf(":")));
    assert.deepEqual(keys, ["name", "description"]);
    assert.match(frontmatter[1], /name: optimize-codex-config/);
    assert.match(frontmatter[1], /config\.toml/);
    assert.match(frontmatter[1], /Codex.*413/);
    assert.doesNotMatch(frontmatter[1], /Nginx|CC Switch/);
    assert.doesNotMatch(skill, /disable-model-invocation/);
    assert.match(skill, /明确确认/);
    assert.match(skill, /pre-optimize/);
    assert.match(skill, /原子/);
    assert.match(skill, /恢复备份/);

    for (const path of [
      "references/configuration-contract.md",
      "references/troubleshooting.md",
      "scripts/audit-codex-config.mjs",
    ]) {
      assert.match(skill, new RegExp(path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    }
  });

  it("audits a 413 compaction fixture without exposing config, auth, URL, or rollout secrets", async () => {
    const root = await fixture();
    const configSecret = "config-secret-must-not-leak";
    const authSecret = "sk-auth-secret-must-not-leak";
    const promptSecret = "prompt-secret-must-not-leak";
    const relayHost = "relay.secret.example";
    const config = [
      'model = "gpt-5.6-sol"',
      'model_provider = "relay-private"',
      'model_reasoning_effort = "high"',
      'plan_mode_reasoning_effort = "xhigh"',
      'cli_auth_credentials_store = "file"',
      'sandbox_mode = "workspace-write"',
      'approval_policy = "on-request"',
      '',
      '[model_providers.relay-private]',
      'base_url = "http://' + relayHost + ':18080"',
      'wire_api = "responses"',
      'experimental_bearer_token = "' + configSecret + '"',
      '',
      '[agents]',
      'enabled = true',
      'max_concurrent_threads_per_session = 4',
      '',
    ].join("\n");
    const auth = JSON.stringify({ OPENAI_API_KEY: authSecret }) + "\n";
    const sessionDir = join(root, "sessions", "2026", "08", "09");
    const rollout = join(sessionDir, "rollout-fixture.jsonl");
    const events = [
      {
        timestamp: "2026-08-09T04:12:00.000Z",
        type: "event_msg",
        payload: { type: "user_message", message: promptSecret },
      },
      {
        timestamp: "2026-08-09T04:12:30.000Z",
        type: "event_msg",
        payload: {
          type: "token_count",
          info: {
            last_token_usage: {
              input_tokens: 242025,
              cached_input_tokens: 230000,
              output_tokens: 1013,
              total_tokens: 243038,
            },
            model_context_window: 258400,
          },
        },
      },
      {
        timestamp: "2026-08-09T04:13:07.804Z",
        type: "event_msg",
        payload: {
          type: "task_complete",
          error: {
            message:
              "Error running remote compact task: unexpected status 413 Payload Too Large: " +
              "<html><center>nginx/1.24.0</center></html>, url: http://" +
              relayHost +
              ":18080/responses",
          },
        },
      },
    ];

    try {
      await mkdir(sessionDir, { recursive: true });
      await writeFile(join(root, "config.toml"), config);
      await writeFile(join(root, "auth.json"), auth);
      await chmod(join(root, "auth.json"), 0o600);
      await writeFile(rollout, events.map((event) => JSON.stringify(event)).join("\n") + "\n");

      const result = runAuditor([
        "--codex-home",
        root,
        "--since-days",
        "30",
        "--no-command-probes",
        "--json",
      ]);
      assert.equal(result.status, 0, result.stdout + result.stderr);
      const report = JSON.parse(result.stdout);
      assert.equal(report.schema_version, 1);
      assert.equal(report.scope, "local_codex_only");
      assert.equal(report.codex_home, "<codex-home>");
      assert.equal(report.files.auth.mode, "0600");
      assert.equal(report.config.safe_settings.model, "gpt-5.6-sol");
      assert.equal(report.config.safe_settings.model_provider, "<custom-provider>");
      assert.equal(report.config.custom_providers[0].base_url_scheme, "http");
      assert.equal(report.config.contains_inline_secret_material, true);
      assert.equal(report.commands.enabled, false);
      assert.equal(report.sessions.incidents.length, 1);
      assert.equal(report.sessions.incidents[0].category, "external_proxy_body_limit");
      assert.equal(report.sessions.incidents[0].operation, "remote_compaction");
      assert.equal(report.sessions.incidents[0].status, 413);
      assert.equal(report.sessions.incidents[0].proxy_signature, "nginx");
      assert.equal(report.sessions.incidents[0].token_state.input_tokens, 242025);
      assert.equal(report.sessions.incidents[0].token_state.model_context_window, 258400);
      assert.equal(report.findings.some((item: { code: string }) => item.code === "external_proxy_body_limit"), true);
      assert.equal(report.findings.some((item: { code: string }) => item.code === "provider_transport_is_plain_http"), true);

      for (const secret of [configSecret, authSecret, promptSecret, relayHost, root]) {
        assert.doesNotMatch(result.stdout, new RegExp(secret.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
      }
      assert.equal(await readFile(join(root, "config.toml"), "utf8"), config);
      assert.equal(await readFile(join(root, "auth.json"), "utf8"), auth);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("parses redacted command probes even when doctor reports an unhealthy exit", async () => {
    const root = await fixture();
    const fakeCodex = join(root, "codex-fixture");
    const providerHost = "doctor.secret.example";
    const doctorSecret = "sk-doctor-secret-must-not-leak";
    const fakeProgram = [
      "#!/usr/bin/env node",
      "const args = process.argv.slice(2).join(' ');",
      "if (args === '--version') console.log('codex-cli 9.9.9');",
      "else if (args === 'doctor --json') {",
      "  console.log(JSON.stringify({ overallStatus: 'unhealthy', base_url: 'https://" + providerHost + "/v1', api_key: '" + doctorSecret + "' }));",
      "  process.exitCode = 1;",
      "} else if (args === 'features list') console.log('remote_compaction_v2  stable  true');",
      "else if (args === 'debug models --bundled') console.log(JSON.stringify({ models: [{ slug: 'fixture-model', context_window: 1234, supported_reasoning_levels: [{ effort: 'high' }] }] }));",
      "else process.exitCode = 2;",
      "",
    ].join("\n");

    try {
      await writeFile(join(root, "config.toml"), 'model = "fixture-model"\n');
      await writeFile(join(root, "auth.json"), "{}\n");
      await chmod(join(root, "auth.json"), 0o600);
      await writeFile(fakeCodex, fakeProgram);
      await chmod(fakeCodex, 0o700);

      const result = runAuditor([
        "--codex-home",
        root,
        "--codex-bin",
        fakeCodex,
        "--since-days",
        "1",
        "--json",
      ]);
      assert.equal(result.status, 0, result.stdout + result.stderr);
      const report = JSON.parse(result.stdout);
      assert.equal(report.commands.version.value, "codex-cli 9.9.9");
      assert.equal(report.commands.doctor.status, 1);
      assert.equal(report.commands.doctor.parsed, true);
      assert.equal(report.commands.doctor.report.base_url, "<redacted-url:https>");
      assert.equal(report.commands.doctor.report.api_key, "<redacted>");
      assert.deepEqual(report.commands.features.entries, [
        { name: "remote_compaction_v2", maturity: "stable", enabled: true },
      ]);
      assert.equal(report.commands.models.entries[0].slug, "fixture-model");
      assert.equal(report.commands.models.entries[0].context_window, 1234);
      assert.deepEqual(report.commands.models.entries[0].reasoning_efforts, ["high"]);
      assert.doesNotMatch(result.stdout, new RegExp(providerHost.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
      assert.doesNotMatch(result.stdout, new RegExp(doctorSecret.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("does not classify non-writing Codex processes as active config writers", async () => {
    const root = await fixture();
    const fakeBin = join(root, "bin");
    const fakeLsof = join(fakeBin, "lsof");
    const fakeCodex = join(fakeBin, "codex");
    const fakeProgram = [
      "#!/usr/bin/env node",
      "console.log(['p101', 'ccodex', 'f9', 'ar', 'p202', 'cCodex Helper', 'f11', 'ar'].join('\\n'));",
      "",
    ].join("\n");

    try {
      await mkdir(fakeBin, { recursive: true });
      await writeFile(join(root, "config.toml"), 'model = "fixture-model"\n');
      await writeFile(fakeLsof, fakeProgram);
      await chmod(fakeLsof, 0o700);
      await writeFile(fakeCodex, "#!/usr/bin/env node\n");
      await chmod(fakeCodex, 0o700);

      const result = runAuditor(
        ["--codex-home", root, "--codex-bin", fakeCodex, "--json"],
        { ...process.env, PATH: `${fakeBin}:${process.env.PATH ?? ""}` },
      );
      assert.equal(result.status, 0, result.stdout + result.stderr);
      const report = JSON.parse(result.stdout);
      assert.equal(report.runtime.active_writers.available, true);
      assert.equal(report.runtime.active_writers.detected, false);
      assert.equal(report.runtime.active_writers.count, 0);
      assert.equal(
        report.findings.some((item: { code: string }) => item.code === "active_codex_writer_detected"),
        false,
      );

      await writeFile(
        fakeLsof,
        [
          "#!/usr/bin/env node",
          "console.log(['p303', 'ccodex', 'f12', 'aw'].join('\\n'));",
          "",
        ].join("\n"),
      );
      const writerResult = runAuditor(
        ["--codex-home", root, "--codex-bin", fakeCodex, "--json"],
        { ...process.env, PATH: `${fakeBin}:${process.env.PATH ?? ""}` },
      );
      assert.equal(writerResult.status, 0, writerResult.stdout + writerResult.stderr);
      const writerReport = JSON.parse(writerResult.stdout);
      assert.equal(writerReport.runtime.active_writers.detected, true);
      assert.equal(writerReport.runtime.active_writers.count, 1);
      assert.deepEqual(writerReport.runtime.active_writers.pids, [303]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("keeps JSON 413 responses unattributed without proxy evidence", async () => {
    const root = await fixture();
    const sessionDir = join(root, "sessions", "2026", "08", "09");
    const events = [
      {
        timestamp: "2026-08-09T04:13:07.804Z",
        type: "event_msg",
        payload: {
          type: "task_complete",
          error: {
            message: 'unexpected HTTP status 413: {"error":{"type":"request_too_large"}}',
          },
        },
      },
    ];

    try {
      await mkdir(sessionDir, { recursive: true });
      await writeFile(join(root, "config.toml"), 'model = "fixture-model"\n');
      await writeFile(
        join(sessionDir, "rollout-json-413.jsonl"),
        events.map((event) => JSON.stringify(event)).join("\n") + "\n",
      );

      const result = runAuditor([
        "--codex-home",
        root,
        "--since-days",
        "30",
        "--no-command-probes",
        "--json",
      ]);
      assert.equal(result.status, 0, result.stdout + result.stderr);
      const report = JSON.parse(result.stdout);
      assert.equal(report.sessions.incidents[0].category, "request_body_limit_unattributed");
      assert.equal(report.sessions.incidents[0].scope, "provider_or_proxy");
      assert.equal(report.sessions.incidents[0].proxy_signature, null);
      assert.equal(
        report.findings.some((item: { code: string }) => item.code === "external_proxy_body_limit"),
        false,
      );
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("returns exit 2 for invalid paths and exit 0 for help", () => {
    const invalid = runAuditor(["--codex-home", "relative", "--json"]);
    assert.equal(invalid.status, 2);
    assert.match(invalid.stderr, /--codex-home must be an absolute path/);
    assert.equal(invalid.stdout, "");

    const help = runAuditor(["--help"]);
    assert.equal(help.status, 0);
    assert.match(help.stdout, /The audit is read-only/);
    assert.equal(help.stderr, "");
  });
});
