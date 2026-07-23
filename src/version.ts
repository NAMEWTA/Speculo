import { readFile } from "node:fs/promises";
import { get } from "node:https";
import { join } from "node:path";

export type VersionInfo = {
  local: string;
  latest: string | null;
  isOutdated: boolean;
};

function parseVersion(version: string): number[] {
  return version.split(".").map((part) => {
    const num = parseInt(part, 10);
    return Number.isNaN(num) ? 0 : num;
  });
}

export function isLocalOutdated(local: string, latest: string): boolean {
  const localParts = parseVersion(local);
  const latestParts = parseVersion(latest);
  const length = Math.max(localParts.length, latestParts.length);

  for (let index = 0; index < length; index += 1) {
    const left = localParts[index] ?? 0;
    const right = latestParts[index] ?? 0;
    if (right > left) return true;
    if (left > right) return false;
  }

  return false;
}

export async function getLocalVersion(packageRoot: string): Promise<string> {
  const packagePath = join(packageRoot, "package.json");
  const raw = await readFile(packagePath, "utf8");
  const packageJson = JSON.parse(raw) as { version: string };
  if (!packageJson.version || typeof packageJson.version !== "string") {
    throw new Error("Missing or invalid version in " + packagePath);
  }
  return packageJson.version;
}

export async function fetchLatestVersion(
  packageName: string
): Promise<string | null> {
  return new Promise((resolve) => {
    const url = `https://registry.npmjs.org/${encodeURIComponent(packageName)}/latest`;
    const request = get(url, { timeout: 5000 }, (response) => {
      if (response.statusCode !== 200) {
        response.resume();
        resolve(null);
        return;
      }

      let data = "";
      response.on("data", (chunk: Buffer) => {
        data += chunk.toString();
      });
      response.on("end", () => {
        try {
          const parsed = JSON.parse(data) as { version?: string };
          resolve(
            parsed.version && typeof parsed.version === "string"
              ? parsed.version
              : null
          );
        } catch {
          resolve(null);
        }
      });
    });

    request.on("error", () => resolve(null));
    request.on("timeout", () => {
      request.destroy();
      resolve(null);
    });
  });
}

export async function checkForUpdate(
  packageRoot: string,
  packageName: string
): Promise<VersionInfo> {
  const local = await getLocalVersion(packageRoot);
  const latest = await fetchLatestVersion(packageName);
  const isOutdated = latest !== null && isLocalOutdated(local, latest);

  return { local, latest, isOutdated };
}

export function formatVersionBanner(info: VersionInfo): string {
  const lines: string[] = [];
  lines.push("");
  lines.push("  Speculo v" + info.local);

  if (info.latest !== null) {
    if (info.isOutdated) {
      lines.push("  最新版本: v" + info.latest + "（已有新版本可用！）");
      lines.push("  升级命令: npm i -g @namewta/speculo@" + info.latest);
    } else {
      lines.push("  已是最新版本 ✓");
    }
  }

  lines.push("");
  return lines.join("\n");
}
