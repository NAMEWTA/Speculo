import { cp, mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { pathExists } from "./utils.js";

const AGENTS_SKILLS = [".agents", "skills"] as const;
const CLAUDE_SKILLS = [".claude", "skills"] as const;
const SKILL_ENTRY = "SKILL.md";

/**
 * Sentinel embedded in the body of every generated pointer. Its presence is the
 * single authoritative signal that a `.claude/skills/<name>/SKILL.md` is a thin
 * pointer rather than a full canonical skill.
 */
export const POINTER_SENTINEL = "<!-- speculo:pointer -->";

export type MirrorActionKind = "mirror" | "relocate" | "skip";

export type MirrorAction = {
  kind: MirrorActionKind;
  name: string;
  detail?: string;
};

export type MirrorSkillsResult = {
  target: string;
  applied: boolean;
  actions: MirrorAction[];
};

export type MirrorSkillsOptions = {
  /** When false the operation is a dry-run: nothing is written to disk. */
  apply?: boolean;
};

/**
 * Extract the frontmatter block (the text between the leading `---` fence and
 * the next `---` line) from a SKILL.md, preserving it verbatim. Returns the
 * inner lines without the fences. Throws when the file has no frontmatter,
 * because the pointer must carry the canonical `name`/`description`/trigger.
 */
function extractFrontmatter(content: string, skillPath: string): string {
  const lines = content.split("\n");
  if (lines[0]?.trim() !== "---") {
    throw new Error(
      "Skill is missing leading frontmatter fence: " + skillPath
    );
  }
  for (let index = 1; index < lines.length; index += 1) {
    if (lines[index]?.trim() === "---") {
      return lines.slice(1, index).join("\n");
    }
  }
  throw new Error("Skill frontmatter is not terminated: " + skillPath);
}

/**
 * Build the deterministic pointer body for a skill. The relative path resolves
 * from `.claude/skills/<name>/SKILL.md` up three levels to the project root and
 * back down into the canonical `.agents/skills/<name>/SKILL.md`.
 */
function buildPointer(name: string, frontmatter: string): string {
  const relativeCanonical = "../../../.agents/skills/" + name + "/" + SKILL_ENTRY;
  return [
    "---",
    frontmatter,
    "---",
    "",
    POINTER_SENTINEL,
    "",
    "> **正本单一事实源**：本文件是指针，判定与执行逻辑都不在此处。",
    "",
    "**立即读取正本 `SKILL.md` 并照其执行**：",
    "[`" + relativeCanonical + "`](" + relativeCanonical + ")",
    "",
  ].join("\n");
}

async function isPointer(skillFile: string): Promise<boolean> {
  const content = await readFile(skillFile, "utf8");
  return content.includes(POINTER_SENTINEL);
}

/** List immediate subdirectories that contain a SKILL.md. */
async function listSkillNames(skillsDir: string): Promise<string[]> {
  if (!(await pathExists(skillsDir))) {
    return [];
  }
  const entries = await readdir(skillsDir, { withFileTypes: true });
  const names: string[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (await pathExists(join(skillsDir, entry.name, SKILL_ENTRY))) {
      names.push(entry.name);
    }
  }
  return names;
}

/**
 * Mirror `.agents/skills/*` canonical skills into `.claude/skills/*` pointers.
 *
 * Behavior (see issue #34):
 * - **mirror**: `.agents` holds the canonical skill; write/refresh the thin
 *   pointer in `.claude`.
 * - **relocate**: `.claude` holds a full (non-pointer) skill and `.agents` has
 *   no canonical for it; copy the full skill to `.agents` as the source of
 *   truth, then turn the `.claude` side into a pointer. No content is lost.
 * - **skip**: the `.claude` pointer already matches the canonical.
 *
 * Idempotent: a second run over unchanged inputs produces only `skip` actions.
 * All paths are resolved absolutely and target directories are created as
 * needed. A pointer whose canonical is missing, or a name that is a full skill
 * on both sides, is a hard error rather than a silent skip.
 */
export async function mirrorSkills(
  targetArg = ".",
  options: MirrorSkillsOptions = {}
): Promise<MirrorSkillsResult> {
  const apply = options.apply ?? true;
  const target = resolve(targetArg);
  const agentsSkillsDir = join(target, ...AGENTS_SKILLS);
  const claudeSkillsDir = join(target, ...CLAUDE_SKILLS);

  const agentNames = new Set(await listSkillNames(agentsSkillsDir));
  const claudeNames = await listSkillNames(claudeSkillsDir);

  const names = new Set<string>([...agentNames, ...claudeNames]);
  const actions: MirrorAction[] = [];

  for (const name of [...names].sort()) {
    const agentSkillDir = join(agentsSkillsDir, name);
    const agentSkillFile = join(agentSkillDir, SKILL_ENTRY);
    const claudeSkillDir = join(claudeSkillsDir, name);
    const claudeSkillFile = join(claudeSkillDir, SKILL_ENTRY);

    const agentHas = agentNames.has(name);
    const claudeHas = claudeNames.includes(name);
    const claudeIsPointer = claudeHas && (await isPointer(claudeSkillFile));

    // Full skill present on both sides: refuse to clobber, force human review.
    if (agentHas && claudeHas && !claudeIsPointer) {
      throw new Error(
        "Conflict for skill '" +
          name +
          "': a full (non-pointer) SKILL.md exists in both .agents/skills and " +
          ".claude/skills. Reconcile the canonical source manually before mirroring."
      );
    }

    // Dangling pointer: .claude points at a canonical that does not exist.
    if (!agentHas && claudeIsPointer) {
      throw new Error(
        "Skill '" +
          name +
          "' is a pointer in .claude/skills but has no canonical in " +
          ".agents/skills/" +
          name +
          "/" +
          SKILL_ENTRY +
          "."
      );
    }

    // Reverse relocation: promote a full .claude skill to canonical in .agents.
    if (!agentHas && claudeHas && !claudeIsPointer) {
      if (apply) {
        await mkdir(agentsSkillsDir, { recursive: true });
        await cp(claudeSkillDir, agentSkillDir, { recursive: true });
      }
      const frontmatter = extractFrontmatter(
        await readFile(claudeSkillFile, "utf8"),
        claudeSkillFile
      );
      if (apply) {
        await writeFile(claudeSkillFile, buildPointer(name, frontmatter), "utf8");
      }
      actions.push({
        kind: "relocate",
        name,
        detail: ".claude → .agents canonical, .claude → pointer",
      });
      continue;
    }

    // Normal mirror: canonical in .agents, write/refresh pointer in .claude.
    if (agentHas) {
      const frontmatter = extractFrontmatter(
        await readFile(agentSkillFile, "utf8"),
        agentSkillFile
      );
      const pointer = buildPointer(name, frontmatter);
      const existing =
        claudeHas && (await pathExists(claudeSkillFile))
          ? await readFile(claudeSkillFile, "utf8")
          : null;
      if (existing === pointer) {
        actions.push({ kind: "skip", name, detail: "pointer up to date" });
        continue;
      }
      if (apply) {
        await mkdir(claudeSkillDir, { recursive: true });
        await writeFile(claudeSkillFile, pointer, "utf8");
      }
      actions.push({ kind: "mirror", name });
    }
  }

  return { target, applied: apply, actions };
}
