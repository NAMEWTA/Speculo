/** Node-less Linux SSH bootstrap/enroll contracts. SSH/scp are simulated; no public network. */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { createHash } from "node:crypto";
import * as core from "../tools/opslib/core.mjs";
import * as transport from "../tools/opslib/transport.mjs";
import * as recipes from "../tools/opslib/host_recipes.mjs";
import * as bootstrap from "../tools/opslib/bootstrap.mjs";
import { initialize, main, cliHooks } from "../tools/opslib/cli.mjs";
import * as agent from "../tools/opslib/agent.mjs";
import * as model from "../tools/opslib/model.mjs";

const toolsDir = join(dirname(fileURLToPath(import.meta.url)), "../tools");
const scriptPath = join(toolsDir, "bootstrap-volta.sh");
const ACK = "I-APPROVE-THIS-BOOTSTRAP";

function sha256(p) {
  return createHash("sha256").update(readFileSync(p)).digest("hex");
}

function splitRemote(cmd) {
  return String(cmd).match(/(?:'[^']*'|\S)+/g).map((s) => (s.startsWith("'") ? s.slice(1, -1).replace(/'"'"'/g, "'") : s));
}

function makeArchives(dir, nodeVersion = "24.21.0") {
  const voltaSrc = join(dir, "volta-src");
  mkdirSync(voltaSrc, { recursive: true });
  writeFileSync(join(voltaSrc, "volta"), "#!/bin/sh\necho 2.0.2\n", { mode: 0o755 });
  writeFileSync(join(voltaSrc, "volta-shim"), "#!/bin/sh\nexit 0\n", { mode: 0o755 });
  writeFileSync(join(voltaSrc, "install.sh"), "#!/bin/sh\necho SHOULD-NOT-RUN >&2; echo PROFILE_EDIT >> \"$HOME/.bashrc\"; exit 1\n", { mode: 0o755 });
  const voltaTar = join(dir, "volta-2.0.2-linux.tar.gz");
  const t1 = spawnSync("tar", ["-czf", voltaTar, "-C", voltaSrc, "volta", "volta-shim", "install.sh"], { encoding: "utf8" });
  assert.equal(t1.status, 0, t1.stderr);

  const top = `node-v${nodeVersion}-linux-x64`;
  const nodeRoot = join(dir, top);
  mkdirSync(join(nodeRoot, "bin"), { recursive: true });
  writeFileSync(join(nodeRoot, "bin", "node"), `#!/bin/sh
if [ "$1" = "--version" ]; then echo v${nodeVersion}; exit 0; fi
exec ${JSON.stringify(process.execPath)} "$@"
`, { mode: 0o755 });
  const nodeTar = join(dir, `${top}.tar.gz`);
  const t2 = spawnSync("tar", ["-czf", nodeTar, "-C", dir, top], { encoding: "utf8" });
  assert.equal(t2.status, 0, t2.stderr);
  return { voltaTar, nodeTar, voltaSha: sha256(voltaTar), nodeSha: sha256(nodeTar), nodeVersion };
}

function pinFor(archives, arch = "linux-x64") {
  const base = bootstrap.loadVoltaPin();
  const slot = { ...base.archives[arch] };
  slot.volta = { ...slot.volta, sha256: archives.voltaSha };
  slot.node = { ...slot.node, sha256: archives.nodeSha };
  return { ...base, archives: { ...base.archives, [arch]: slot } };
}

function mockTransport({ probeJson = null } = {}) {
  const prev = transport.transportHooks.spawnSync;
  const log = [];
  transport.transportHooks.spawnSync = (cmd, args, kw) => {
    log.push({ cmd, args: [...args], encoding: kw.encoding, inputIsBuffer: Buffer.isBuffer(kw.input) });
    const last = args[args.length - 1];
    if (cmd === "scp") {
      const local = args[args.length - 2];
      const spec = args[args.length - 1];
      const remotePath = spec.slice(spec.indexOf(":") + 1);
      mkdirSync(dirname(remotePath), { recursive: true });
      copyFileSync(local, remotePath);
      return { status: 0, stdout: Buffer.alloc(0), stderr: Buffer.alloc(0) };
    }
    if (cmd === "ssh") {
      assert.ok(args.includes("BatchMode=yes"));
      assert.ok(args.includes("StrictHostKeyChecking=yes"));
      assert.ok(args.some((a) => String(a).startsWith("UserKnownHostsFile=")));
      if (probeJson && String(last).includes("--probe")) {
        return { status: 0, stdout: Buffer.from(JSON.stringify(probeJson) + "\n"), stderr: Buffer.alloc(0) };
      }
      if (String(last).includes("--input-type=module")) {
        const parts = splitRemote(last);
        return spawnSync(parts[0], parts.slice(1), {
          input: kw.input, encoding: "buffer", timeout: kw.timeout, maxBuffer: kw.maxBuffer,
        });
      }
      const parts = splitRemote(last);
      return spawnSync(parts[0], parts.slice(1), {
        input: kw.input, encoding: "buffer", timeout: kw.timeout, maxBuffer: kw.maxBuffer,
        env: { ...process.env, HOME: kw.HOME || process.env.HOME },
      });
    }
    return prev(cmd, args, kw);
  };
  return { log, restore() { transport.transportHooks.spawnSync = prev; } };
}

function captureMain(argv) {
  const out = [];
  const err = [];
  const wo = process.stdout.write;
  const we = process.stderr.write;
  process.stdout.write = (c) => { out.push(String(c)); return true; };
  process.stderr.write = (c) => { err.push(String(c)); return true; };
  try {
    const code = main(argv);
    return { code, stdout: out.join(""), stderr: err.join("") };
  } finally {
    process.stdout.write = wo;
    process.stderr.write = we;
  }
}

function sshHost({ root, kh, node = "/usr/bin/node", identity = "discover" }) {
  return {
    host_id: "wsl-a",
    display_name: "WSL fixture",
    platform: "linux",
    transport: "ssh",
    root,
    identity,
    connection: {
      hostname: "host.invalid",
      username: "ops",
      known_hosts: kh,
      node,
    },
  };
}

function writeConn(dir, host) {
  const p = join(dir, "conn.json");
  writeFileSync(p, JSON.stringify(host, null, 2));
  return p;
}

test("posix ssh uses the same host-key contract", () => {
  const d = mkdtempSync(join(tmpdir(), "ops-posix-"));
  const kh = join(d, "known_hosts");
  writeFileSync(kh, "fixture pinned key\n");
  const captured = {};
  const prev = transport.transportHooks.spawnSync;
  transport.transportHooks.spawnSync = (cmd, args, kw) => {
    captured.argv = [cmd, ...args];
    Object.assign(captured, kw);
    return { status: 0, stdout: '{"status":"probed"}', stderr: "" };
  };
  try {
    transport.posixCall({ hostname: "host.invalid", username: "ops", known_hosts: kh }, "#!/bin/sh\necho ok\n", { args: ["--probe"] });
    assert.equal(captured.argv[0], "ssh");
    assert.ok(captured.argv.includes("BatchMode=yes"));
    assert.ok(captured.argv.includes("StrictHostKeyChecking=yes"));
    assert.ok(captured.argv.includes("UserKnownHostsFile=" + kh));
    assert.ok(captured.argv.includes("/bin/sh -s -- --probe") || captured.argv.at(-1).includes("/bin/sh"));
    assert.ok(!String(captured.argv.at(-1)).includes("--input-type=module"));
    assert.ok(Buffer.isBuffer(captured.input));
  } finally { transport.transportHooks.spawnSync = prev; rmSync(d, { recursive: true, force: true }); }
});

test("scp uses the same host-key contract", () => {
  const d = mkdtempSync(join(tmpdir(), "ops-scp-"));
  const kh = join(d, "known_hosts");
  writeFileSync(kh, "fixture pinned key\n");
  const local = join(d, "a.tar.gz");
  writeFileSync(local, "x");
  const captured = {};
  const prev = transport.transportHooks.spawnSync;
  transport.transportHooks.spawnSync = (cmd, args, kw) => {
    captured.argv = [cmd, ...args];
    Object.assign(captured, kw);
    return { status: 0, stdout: "", stderr: "" };
  };
  try {
    transport.posixSend({ hostname: "host.invalid", username: "ops", known_hosts: kh }, local, "/srv/ops/_host/installers/a.tar.gz");
    assert.equal(captured.argv[0], "scp");
    assert.ok(captured.argv.includes("BatchMode=yes"));
    assert.ok(captured.argv.includes("StrictHostKeyChecking=yes"));
    assert.ok(captured.argv.includes("UserKnownHostsFile=" + kh));
    assert.ok(captured.argv.includes("-P"));
    assert.ok(!captured.argv.includes("-T"));
  } finally { transport.transportHooks.spawnSync = prev; rmSync(d, { recursive: true, force: true }); }
});

test("bootstrap-volta apply installs wrapper and does not touch profile", () => {
  const d = mkdtempSync(join(tmpdir(), "ops-vol-"));
  const home = join(d, "home");
  mkdirSync(home);
  const bashrc = join(home, ".bashrc");
  writeFileSync(bashrc, "keep-me\n");
  const archives = makeArchives(d);
  const voltaHome = join(d, "srv", "ops", "_host", "toolchains", "ops", "volta");
  const p = spawnSync("/bin/sh", [scriptPath, "--apply", archives.voltaTar, archives.voltaSha, archives.nodeTar, archives.nodeSha, voltaHome, archives.nodeVersion, ACK], {
    encoding: "utf8", env: { ...process.env, HOME: home },
  });
  try {
    assert.equal(p.status, 0, p.stderr + p.stdout);
    const result = JSON.parse(p.stdout.trim().split("\n").at(-1));
    assert.equal(result.profile_unchanged, true);
    assert.ok(result.connection_node.endsWith("/volta/bin/ops-node"));
    assert.equal(readFileSync(bashrc, "utf8"), "keep-me\n");
    const ver = spawnSync(result.connection_node, ["--version"], { encoding: "utf8", env: { ...process.env, HOME: home } });
    assert.equal(ver.stdout.trim(), "v24.21.0");
    assert.ok(!existsSync(join(voltaHome, "install.sh")) || readFileSync(join(home, ".bashrc"), "utf8") === "keep-me\n");
  } finally { rmSync(d, { recursive: true, force: true }); }
});

test("bootstrap-volta apply without ack blocked", () => {
  const d = mkdtempSync(join(tmpdir(), "ops-ack-"));
  const archives = makeArchives(d);
  const p = spawnSync("/bin/sh", [scriptPath, "--apply", archives.voltaTar, archives.voltaSha, archives.nodeTar, archives.nodeSha, join(d, "volta"), "24.21.0", "nope"], { encoding: "utf8" });
  assert.notEqual(p.status, 0);
  rmSync(d, { recursive: true, force: true });
});

test("bootstrap-volta sha mismatch blocked", () => {
  const d = mkdtempSync(join(tmpdir(), "ops-sha-"));
  const archives = makeArchives(d);
  const p = spawnSync("/bin/sh", [scriptPath, "--apply", archives.voltaTar, "0".repeat(64), archives.nodeTar, archives.nodeSha, join(d, "volta"), "24.21.0", ACK], { encoding: "utf8" });
  assert.notEqual(p.status, 0);
  assert.ok(!existsSync(join(d, "volta", "bin", "ops-node")));
  rmSync(d, { recursive: true, force: true });
});

function cliFixture() {
  const tmp = mkdtempSync(join(tmpdir(), "ops-bootcli-"));
  const state = join(tmp, "controller");
  const target = join(tmp, "server");
  mkdirSync(target, { recursive: true });
  const kh = join(tmp, "known_hosts");
  writeFileSync(kh, "fixture pinned key\n");
  const prevProbe = cliHooks.probeLocal;
  cliHooks.probeLocal = () => ({ identity: agent.fingerprint(), scope: "mock" });
  initialize(state, "control-a");
  cliHooks.probeLocal = prevProbe;
  const archives = makeArchives(tmp);
  const prevPin = bootstrap.bootstrapHooks.loadPin;
  bootstrap.bootstrapHooks.loadPin = () => pinFor(archives);
  return {
    tmp, state, target, kh, archives,
    cleanup() {
      bootstrap.bootstrapHooks.loadPin = prevPin;
      rmSync(tmp, { recursive: true, force: true });
    },
  };
}

const missingProbe = {
  status: "probed", uname: "Linux x86_64", arch: "linux-x64",
  tools: { node: "missing", volta: "missing", tar: "/bin/tar", sha256sum: "/usr/bin/sha256sum" },
  node_path: null, node_version: null, node_usable: false, profile_has_volta: false,
};

test("discover probe without node returns node-missing", () => {
  const fx = cliFixture();
  const mock = mockTransport({ probeJson: missingProbe });
  try {
    const host = sshHost({ root: fx.target, kh: fx.kh, node: "node" });
    const conn = writeConn(fx.tmp, host);
    const r = captureMain(["probe", "--connection-file", conn]);
    assert.equal(r.code, 2);
    const payload = JSON.parse(r.stderr);
    assert.equal(payload.status, "blocked");
    assert.equal(payload.error, "node-missing");
    assert.ok(String(payload.next).includes("bootstrap-node"));
    assert.ok(!existsSync(join(fx.state, "hosts", "wsl-a")));
  } finally { mock.restore(); fx.cleanup(); }
});

test("bootstrap-node probe is read-only", () => {
  const fx = cliFixture();
  const mock = mockTransport({ probeJson: missingProbe });
  try {
    const host = sshHost({ root: fx.target, kh: fx.kh, node: "node" });
    const conn = writeConn(fx.tmp, host);
    const r = captureMain(["bootstrap-node", "--connection-file", conn, "--probe"]);
    assert.equal(r.code, 0, r.stderr);
    const payload = JSON.parse(r.stdout);
    assert.equal(payload.status, "probed");
    assert.equal(payload.posix.tools.node, "missing");
    assert.ok(!mock.log.some((e) => e.cmd === "scp"));
    assert.ok(!mock.log.some((e) => String(e.args.at(-1) || "").includes("--apply")));
  } finally { mock.restore(); fx.cleanup(); }
});

test("bootstrap-node apply without ack blocked", () => {
  const fx = cliFixture();
  const mock = mockTransport({ probeJson: missingProbe });
  try {
    const host = sshHost({ root: fx.target, kh: fx.kh, node: "node" });
    const conn = writeConn(fx.tmp, host);
    const r = captureMain([
      "bootstrap-node", "--connection-file", conn, "--apply",
      "--account", "ops", "--host-root", fx.target,
      "--volta-archive", fx.archives.voltaTar, "--volta-sha256", fx.archives.voltaSha,
      "--node-archive", fx.archives.nodeTar, "--node-sha256", fx.archives.nodeSha,
    ]);
    assert.equal(r.code, 2);
    assert.ok(r.stderr.includes("I-APPROVE-THIS-BOOTSTRAP"));
  } finally { mock.restore(); fx.cleanup(); }
});

test("bootstrap-node sha mismatch blocked", () => {
  const fx = cliFixture();
  const mock = mockTransport({ probeJson: missingProbe });
  try {
    const host = sshHost({ root: fx.target, kh: fx.kh, node: "node" });
    const conn = writeConn(fx.tmp, host);
    const r = captureMain([
      "bootstrap-node", "--connection-file", conn, "--apply",
      "--account", "ops", "--host-root", fx.target, "--ack", ACK,
      "--volta-archive", fx.archives.voltaTar, "--volta-sha256", "0".repeat(64),
      "--node-archive", fx.archives.nodeTar, "--node-sha256", fx.archives.nodeSha,
    ]);
    assert.equal(r.code, 2);
    assert.ok(!mock.log.some((e) => String(e.args.at(-1) || "").includes("--apply")));
  } finally { mock.restore(); fx.cleanup(); }
});

test("latest and curl-pipe names rejected", () => {
  const fx = cliFixture();
  const mock = mockTransport({ probeJson: missingProbe });
  try {
    const host = sshHost({ root: fx.target, kh: fx.kh, node: "node" });
    const conn = writeConn(fx.tmp, host);
    const r = captureMain([
      "bootstrap-node", "--connection-file", conn, "--apply",
      "--account", "ops", "--host-root", fx.target, "--ack", ACK,
      "--node-version", "latest",
      "--volta-archive", fx.archives.voltaTar, "--volta-sha256", fx.archives.voltaSha,
      "--node-archive", fx.archives.nodeTar, "--node-sha256", fx.archives.nodeSha,
    ]);
    assert.equal(r.code, 2);
    assert.match(r.stderr, /latest/i);
  } finally { mock.restore(); fx.cleanup(); }
});

test("bootstrap-node skips when node exists", () => {
  const fx = cliFixture();
  const mock = mockTransport({
    probeJson: {
      ...missingProbe,
      tools: { ...missingProbe.tools, node: "/usr/bin/node" },
      node_path: "/usr/bin/node",
      node_usable: true,
      node_version: "v22.22.3",
    },
  });
  try {
    const host = sshHost({ root: fx.target, kh: fx.kh, node: "/usr/bin/node" });
    const conn = writeConn(fx.tmp, host);
    const r = captureMain([
      "bootstrap-node", "--connection-file", conn, "--apply",
      "--account", "ops", "--host-root", fx.target, "--ack", ACK,
      "--volta-archive", fx.archives.voltaTar, "--volta-sha256", fx.archives.voltaSha,
      "--node-archive", fx.archives.nodeTar, "--node-sha256", fx.archives.nodeSha,
    ]);
    assert.equal(r.code, 0, r.stderr);
    const payload = JSON.parse(r.stdout);
    assert.equal(payload.status, "skipped-existing-node");
    assert.ok(!mock.log.some((e) => e.cmd === "scp"));
  } finally { mock.restore(); fx.cleanup(); }
});

test("bootstrap-node apply then enroll writes inventory and status", () => {
  const fx = cliFixture();
  const home = join(fx.tmp, "home");
  mkdirSync(home);
  writeFileSync(join(home, ".bashrc"), "keep-me\n");
  const prevHome = process.env.HOME;
  process.env.HOME = home;
  const mock = mockTransport({ probeJson: missingProbe });
  try {
    const host = sshHost({ root: fx.target, kh: fx.kh, node: "node" });
    const conn = writeConn(fx.tmp, host);
    const applied = captureMain([
      "bootstrap-node", "--state", fx.state, "--host-id", "wsl-a",
      "--connection-file", conn, "--apply",
      "--account", "ops", "--host-root", fx.target, "--ack", ACK,
      "--volta-archive", fx.archives.voltaTar, "--volta-sha256", fx.archives.voltaSha,
      "--node-archive", fx.archives.nodeTar, "--node-sha256", fx.archives.nodeSha,
    ]);
    assert.equal(applied.code, 0, applied.stderr);
    const boot = JSON.parse(applied.stdout);
    assert.equal(boot.status, "installed");
    assert.ok(boot.connection_node.endsWith("/ops-node"));
    assert.equal(readFileSync(join(home, ".bashrc"), "utf8"), "keep-me\n");
    assert.ok(existsSync(join(fx.state, "hosts", "wsl-a", "bootstrap")));
    const statusBefore = model.load(fx.state);
    assert.ok(!statusBefore.hosts["wsl-a"]);

    host.connection.node = boot.connection_node;
    host.identity = "discover";
    const enrollFile = join(fx.tmp, "register.json");
    writeFileSync(enrollFile, JSON.stringify({ hosts: [host], projects: [] }));
    mock.restore();
    const enrollMock = mockTransport({
      probeJson: { ...missingProbe, tools: { ...missingProbe.tools, node: boot.connection_node }, node_path: boot.connection_node, node_usable: true },
    });
    try {
      const enrolled = captureMain(["--state", fx.state, "enroll", "--file", enrollFile]);
      assert.equal(enrolled.code, 0, enrolled.stderr + enrolled.stdout);
      const result = JSON.parse(enrolled.stdout);
      assert.equal(result.status, "enrolled");
      assert.match(result.identity, /^[a-f0-9]{64}$/);
      const snaps = readdirSync(join(fx.state, "hosts", "wsl-a", "inventory"));
      assert.ok(snaps.some((n) => n.startsWith("snapshot-")));
      const status = model.load(fx.state);
      assert.ok(status.hosts["wsl-a"]);
      assert.equal(status.hosts["wsl-a"].connection.node, boot.connection_node);
    } finally { enrollMock.restore(); }
  } finally {
    process.env.HOME = prevHome;
    mock.restore();
    fx.cleanup();
  }
});

test("enroll without node blocked", () => {
  const fx = cliFixture();
  const mock = mockTransport({ probeJson: missingProbe });
  try {
    const host = sshHost({ root: fx.target, kh: fx.kh, node: "/no/such/node" });
    const enrollFile = join(fx.tmp, "register.json");
    writeFileSync(enrollFile, JSON.stringify({ hosts: [host], projects: [] }));
    const r = captureMain(["--state", fx.state, "enroll", "--file", enrollFile]);
    assert.equal(r.code, 2);
    const payload = JSON.parse(r.stderr);
    assert.equal(payload.error, "node-missing");
    const status = model.load(fx.state);
    assert.deepEqual(Object.keys(status.hosts), []);
  } finally { mock.restore(); fx.cleanup(); }
});

test("probe --connection-file still does not imply register", () => {
  const fx = cliFixture();
  const mock = mockTransport({
    probeJson: { ...missingProbe, tools: { ...missingProbe.tools, node: process.execPath }, node_path: process.execPath, node_usable: true },
  });
  try {
    const host = sshHost({ root: fx.target, kh: fx.kh, node: process.execPath, identity: "discover" });
    const conn = writeConn(fx.tmp, host);
    const r = captureMain(["probe", "--connection-file", conn]);
    assert.equal(r.code, 0, r.stderr);
    const payload = JSON.parse(r.stdout);
    assert.ok(payload.next.includes("enroll"));
    const status = model.load(fx.state);
    assert.deepEqual(Object.keys(status.hosts), []);
  } finally { mock.restore(); fx.cleanup(); }
});

test("environmentSpec uses managed volta path", () => {
  const tmp = mkdtempSync(join(tmpdir(), "ops-env-"));
  const state = join(tmp, "controller");
  const target = join(tmp, "server");
  const prevProbe = cliHooks.probeLocal;
  cliHooks.probeLocal = () => ({ identity: agent.fingerprint(), scope: "mock" });
  initialize(state, "control-a");
  cliHooks.probeLocal = prevProbe;
  const host = {
    host_id: "node-a", display_name: "Node A", platform: process.platform === "win32" ? "windows" : "linux",
    transport: "local", root: target, identity: agent.fingerprint(), connection: {},
  };
  model.register(state, { hosts: [host], projects: [] });
  const prev = recipes.hostRecipesHooks.call;
  const voltaBin = core.targetJoin(host, "_host/toolchains/ops/volta/bin/volta");
  recipes.hostRecipesHooks.call = (_h, req) => {
    if (req.action === "snapshot") return { paths: { [req.paths[0]]: { kind: "file" } } };
    return {
      identity: host.identity,
      tools: {
        node: { status: "observed", version: "v24.21.0", path: process.execPath },
        volta: { status: "missing", path: null },
      },
      defaults: { VOLTA_HOME: core.targetJoin(host, "_host/toolchains/ops/volta") },
    };
  };
  try {
    const spec = recipes.environmentSpec(state, "node-a", { account: "ops", node_version: "24.21.0" });
    const install = spec.host_actions.find((a) => a.kind === "install-toolchain");
    assert.equal(install.argv[0], voltaBin);
  } finally {
    recipes.hostRecipesHooks.call = prev;
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("environmentSpec still throws when volta truly absent", () => {
  const tmp = mkdtempSync(join(tmpdir(), "ops-envmiss-"));
  const state = join(tmp, "controller");
  const target = join(tmp, "server");
  const prevProbe = cliHooks.probeLocal;
  cliHooks.probeLocal = () => ({ identity: agent.fingerprint(), scope: "mock" });
  initialize(state, "control-a");
  cliHooks.probeLocal = prevProbe;
  const host = {
    host_id: "node-a", display_name: "Node A", platform: process.platform === "win32" ? "windows" : "linux",
    transport: "local", root: target, identity: agent.fingerprint(), connection: {},
  };
  model.register(state, { hosts: [host], projects: [] });
  const prev = recipes.hostRecipesHooks.call;
  recipes.hostRecipesHooks.call = (_h, req) => {
    if (req.action === "snapshot") return { paths: { [req.paths[0]]: { kind: "absent" } } };
    return {
      identity: host.identity,
      tools: {
        node: { status: "observed", version: "v24.21.0", path: process.execPath },
        volta: { status: "missing", path: null },
      },
      defaults: {},
    };
  };
  try {
    assert.throws(
      () => recipes.environmentSpec(state, "node-a", { account: "ops", node_version: "24.21.0" }),
      /bootstrap-node/,
    );
  } finally {
    recipes.hostRecipesHooks.call = prev;
    rmSync(tmp, { recursive: true, force: true });
  }
});
