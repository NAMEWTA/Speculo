/** Pinned environment-management recipes. No latest-version guessing or implicit profile edits. */
import { identifier, exact, newId, now, OpsError, targetJoin, within } from "./core.mjs";
import { load } from "./model.mjs";
import { call } from "./transport.mjs";

function shlexQuote(s) {
  if (s === "") return "''";
  if (/[^\w@%+=:,./-]/.test(s)) return "'" + s.replaceAll("'", "'\"'\"'") + "'";
  return s;
}

function reEscape(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function environmentSpec(state, hid, request) {
  exact(request, new Set(["account", "python_versions", "uv_path", "node_version", "npm_version", "volta_path", "java_version", "original_java_candidate", "sdkman_init"]), new Set(["account"]), "environment request");
  identifier(request.account, "toolchain account");
  const status = load(state);
  const host = status.hosts[hid];
  const inventory = call(host, { action: "probe", disk_roots: [host.root] }, { timeout: 180 });
  const base = targetJoin(host, "_host/toolchains/" + request.account);
  const defaults = Object.fromEntries(Object.entries(inventory.tools).filter(([k, v]) => ["java", "python", "python3", "node", "npm"].includes(k) && v.status === "observed"));
  const actions = [];
  const mkdir = (rel) => actions.push({ host_id: hid, kind: "mkdir", reason: "统一工具链与缓存根", path: rel });
  const command = (argv, env, writes, verify, reason) => {
    actions.push({
      host_id: hid, kind: "install-toolchain", reason, argv, cwd: host.root, env, writes,
      timeout: 3600, expected_defaults: defaults, verification: [{ ...verify, env }],
    });
  };
  const pinned = (value, label) => {
    if (typeof value !== "string" || !/^[0-9][A-Za-z0-9.+_-]*$/.test(value)) {
      throw new OpsError(label + " must be a concrete version/candidate, not latest or a range");
    }
    return value;
  };
  if (request.python_versions) {
    const uv = request.uv_path || inventory.tools.uv?.path;
    if (!uv) throw new OpsError("uv is missing: first stage a checksum-verified installer in a separate host/bootstrap plan");
    const install = base + (host.platform === "windows" ? "\\uv-python" : "/uv-python");
    const cache = targetJoin(host, "_host/cache/" + request.account + "/uv");
    mkdir("_host/toolchains/" + request.account + "/uv-python");
    mkdir("_host/cache/" + request.account + "/uv");
    for (const version of request.python_versions) {
      pinned(version, "Python");
      command(
        [uv, "python", "install", version],
        { UV_PYTHON_INSTALL_DIR: install, UV_CACHE_DIR: cache },
        [install, cache],
        { type: "command", argv: [uv, "python", "find", version], stdout_pattern: reEscape(install) },
        "Install explicitly pinned Python; never replace OS Python or change the old PATH/default.",
      );
    }
  }
  if (request.node_version) {
    const v = pinned(request.node_version, "Node");
    const volta = request.volta_path || inventory.tools.volta?.path;
    if (!volta) throw new OpsError("Volta missing: install a reviewed pinned release before the managed environment recipe");
    const home = base + (host.platform === "windows" ? "\\volta" : "/volta");
    mkdir("_host/toolchains/" + request.account + "/volta");
    let old = (inventory.tools.node?.version ?? "").trim();
    if (old.startsWith("v")) old = old.slice(1);
    if (old && !/^\d+\.\d+\.\d+$/.test(old)) throw new OpsError("cannot confidently identify original Node default");
    command([volta, "fetch", "node@" + v], { VOLTA_HOME: home }, [home], { type: "command", argv: [volta, "list", "all"] }, "Populate the managed Volta store without changing the user's default Node.");
    if (old) {
      command([volta, "install", "node@" + old], { VOLTA_HOME: home }, [home], { type: "command", argv: [volta, "list", "all"] }, "Set the managed Volta default back to the exact observed Node version; no shell profile modification.");
    }
    if (request.npm_version) {
      const npm = pinned(request.npm_version, "npm");
      command([volta, "fetch", "npm@" + npm], { VOLTA_HOME: home }, [home], { type: "command", argv: [volta, "list", "all"] }, "Fetch explicit npm version without changing user default.");
      const oldnpm = (inventory.tools.npm?.version ?? "").trim();
      if (/^\d+\.\d+\.\d+$/.test(oldnpm)) {
        command([volta, "install", "npm@" + oldnpm], { VOLTA_HOME: home }, [home], { type: "command", argv: [volta, "list", "all"] }, "Restore the observed npm default inside the managed Volta home.");
      }
    }
  }
  if (request.java_version) {
    if (host.platform === "windows") throw new OpsError("SDKMAN is not a native Windows adapter; register WSL as a distinct Linux execution host or retain native JDK");
    const version = pinned(request.java_version, "JDK candidate");
    const old = pinned(request.original_java_candidate, "original SDKMAN JDK candidate");
    const init = request.sdkman_init;
    const sdkroot = base + "/sdkman";
    if (!init || !within(init, sdkroot, host.platform)) {
      throw new OpsError("SDKMAN initialization must be staged in the managed SDKMAN root; never silently migrate an existing ~/.sdkman");
    }
    const q = shlexQuote;
    const script = "set -euo pipefail\nexport SDKMAN_DIR=" + q(sdkroot) + "\nsource " + q(init) + "\nsdkman_auto_answer=true\nsdkman_selfupdate_enable=false\nsdk current java | grep -F -- " + q(old) + "\nsdk install java " + q(version) + "\nsdk default java " + q(old) + "\nsdk use java " + q(old) + "\njava -version\n";
    const rel = "_host/scripts/" + newId("sdkman") + ".sh";
    actions.push({ host_id: hid, kind: "write-file", reason: "Version-pinned SDKMAN script with original-default restoration", path: rel, content: script, mode: 0o700 });
    command(["bash", targetJoin(host, rel)], {}, [sdkroot], { type: "command", argv: ["java", "-version"] }, "Install approved JDK, then restore and verify original candidate. Old JDK is never deleted.");
  }
  if (!actions.length) throw new OpsError("no explicit toolchain versions requested");
  const consumers = new Set(Object.values(status.deployments).filter((d) => d.host_id === hid && d.status !== "retired").map((d) => d.deployment_id));
  for (const b of Object.values(status.bindings)) {
    if (consumers.has(b.provider_deployment_id) && b.status === "active") consumers.add(b.consumer_deployment_id);
  }
  return {
    schema_version: 1,
    worker: "H",
    operation: "prepare",
    reason: "Managed toolchain preparation with observed-default preservation",
    hosts: [hid],
    host_actions: actions,
    acknowledged_consumers: [...consumers].sort(),
    rollback_note: "Do not remove old toolchains. A failed default check stops the run. The plan does not modify user shell profiles; adoption of the managed activation environment is a separate explicit change.",
    risk: "external-mutation",
  };
}
