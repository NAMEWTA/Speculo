import { readAssetCatalog } from "./assets.js";
import { cp, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { bytes, image, type ExternalEdit, type ExternalName, type FileImage } from "./external-files.js";

function replaceBlock(content: string, name: string, body: string): string {
  const start = `<!-- ${name}:START -->`, end = `<!-- ${name}:END -->`;
  const starts = content.split(start).length - 1, ends = content.split(end).length - 1;
  if (starts !== ends || starts > 1 || (starts && content.indexOf(end) < content.indexOf(start))) {
    throw new Error(`invalid-agent-markers: ${name}; repair the owned block explicitly`);
  }
  const newline = content.includes("\r\n") ? "\r\n" : "\n";
  const block = body ? `${start}\n${body}\n${end}`.replaceAll("\n", newline) : "";
  if (starts) return content.slice(0, content.indexOf(start)) + block + content.slice(content.indexOf(end) + end.length);
  if (!block) return content;
  return content + (content.endsWith(newline + newline) || !content ? "" : content.endsWith(newline) ? newline : newline + newline) + block + newline;
}

export function updateAgentsContent(content: string): string {
  const next = replaceBlock(content, "SPECULO-BOOTSTRAP", [
    "## Speculo", "",
    "按当前任务查看 [已安装能力](./.agents/speculo/catalog.json)，只读取需要的 Skill 或 Command。",
    "项目记录位于 `.agents/speculo/.speculo/`；先复用现有代码与文档。若 `.agents/speculo/.speculo/knowledge/` 已存在，按任务检索；持久化约定见 [memory](./.agents/speculo/references/memory.md)。",
    "用户指令与已有授权决定执行范围；安装或读取能力本身不授予额外权限。",
  ].join("\n"));
  // Remove the obsolete per-domain index without touching the user's handbook.
  return replaceBlock(next, "SPECULO-PERSISTENT-KNOWLEDGE", "");
}

export async function writeDiscoveryAssets(packageRoot: string, stagedRoot: string): Promise<void> {
  const catalog=await readAssetCatalog(stagedRoot);
  await writeFile(join(stagedRoot,"catalog.json"),JSON.stringify(catalog,null,2)+"\n");
  await cp(join(packageRoot,"template","AGENTS.md"),join(stagedRoot,".speculo","AGENTS.md"));
}

/** Retire only our old evidence policy; project-specific ignore rules stay intact. */
function removeEvidenceIgnore(content: string): string {
  const start = "# SPECULO-EVIDENCE:START", end = "# SPECULO-EVIDENCE:END";
  const starts = content.split(start).length - 1, ends = content.split(end).length - 1;
  if (starts !== ends || starts > 1 || (starts && content.indexOf(end) < content.indexOf(start))) throw new Error("invalid-evidence-ignore-markers: repair the Speculo-owned block explicitly");
  return starts ? content.slice(0, content.indexOf(start)) + content.slice(content.indexOf(end) + end.length) : content;
}

export function planExternalEdits(snapshots: Map<ExternalName, FileImage>): ExternalEdit[] {
  const edits: ExternalEdit[] = [];
  for (const [name, before] of snapshots) {
    let text = bytes(before).toString("utf8");
    if (before && !bytes(before).equals(Buffer.from(text))) throw new Error(`external-encoding: ${name} must be UTF-8`);
    if (name === "AGENTS.md") text = updateAgentsContent(before ? text : "# AGENTS.md\n");
    if (name === "CLAUDE.md" && !before) text = "# CLAUDE.md\n\n@AGENTS.md\n";
    if (name === ".gitignore") {
      const newline = text.includes("\r\n") ? "\r\n" : "\n";
      const patterns = [".agents/speculo/.speculo/back/", ".agents/.speculo-install.lock/", ".agents/.speculo-transactions/", ".speculo-file-*.tmp"];
      const existing = text.split(/\r?\n/).map((line) => line.trim().replace(/^\//, "").replace(/\/$/, ""));
      const missing = patterns.filter((pattern) => !existing.includes(pattern.replace(/\/$/, "")));
      if (missing.length) text += (text && !text.endsWith("\n") ? newline : "") + missing.join(newline) + newline;
      text = removeEvidenceIgnore(text);
    }
    if (before && (before.mode & 0o222) === 0 && !bytes(before).equals(Buffer.from(text))) {
      throw new Error(`read-only-external-file: ${name}; preserve permissions and obtain source-owner approval`);
    }
    edits.push({ name, before, after: image(text, before?.mode ?? 0o644) });
  }
  return edits;
}
