/** Exact-path exceptions for system control files. Not a generic /etc write grant. */
import { OpsError } from "./core.mjs";

const FORBIDDEN_UNITS = new Set([
  "sshd.service", "docker.service", "containerd.service",
  "systemd-networkd.service", "systemd-resolved.service", "systemd-logind.service",
]);

export function isBuiltinControlPath(path) {
  return path === "/etc/docker/daemon.json" || /^\/etc\/systemd\/system\/ops-[a-z0-9-]+\.service$/.test(path);
}

export function isDeclaredControlPath(path) {
  if (path === "/etc/nginx/nginx.conf") return true;
  if (/^\/etc\/nginx\/conf\.d\/[A-Za-z0-9._-]+\.conf$/.test(path)) return true;
  if (/^\/etc\/wireguard\/[A-Za-z0-9_-]+\.conf$/.test(path)) return true;
  if (/^\/etc\/systemd\/system\/[A-Za-z0-9@_.-]+\.service$/.test(path)) return true;
  return false;
}

export function assertSafeControlPath(path, { reason = "", rollback = "" } = {}) {
  if (typeof path !== "string" || !path.startsWith("/") || path.includes("\0") || path.includes("//") || path.split("/").includes("..")) {
    throw new OpsError("control file must be a normalized absolute path");
  }
  if (isBuiltinControlPath(path)) return "builtin";
  if (!isDeclaredControlPath(path)) {
    throw new OpsError("unrecognized external control file; persistent data cannot be an exception");
  }
  const unit = path.split("/").pop();
  if (path.startsWith("/etc/systemd/system/") && FORBIDDEN_UNITS.has(unit)) {
    throw new OpsError("core systemd unit is not an OPS control-file exception: " + unit);
  }
  if (typeof reason !== "string" || reason.trim().length < 8) {
    throw new OpsError("declared control files need a review reason");
  }
  if (typeof rollback !== "string" || rollback.trim().length < 8) {
    throw new OpsError("declared control files need an explicit rollback instruction");
  }
  return "declared";
}

export function reservedHostDocumentPaths(host, targetJoin) {
  return [
    targetJoin(host, "README.md"),
    targetJoin(host, "DEPLOYMENTS.md"),
    targetJoin(host, "docs/standards/DEPLOYMENT-STANDARD.md"),
    targetJoin(host, "knowledge/INDEX.md"),
    targetJoin(host, "knowledge/host-services.json"),
    targetJoin(host, "knowledge/public-ingress.json"),
  ];
}

export function defaultFileMode(path) {
  const n = String(path).replaceAll("\\", "/");
  if (/(?:^|\/)(?:config|service)\//.test(n) || /\.(?:conf|acl)$/.test(n)) return 0o644;
  return 0o600;
}
