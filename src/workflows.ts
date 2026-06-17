import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { checkbox } from "@inquirer/prompts";

// ---- Types ----

export type WorkflowEntry = {
  category: string;
  name: string;
  displayName: string;
  description: string;
};

/** Map from category name (dev/doc/person) to its workflows. */
export type WorkflowCatalog = Map<string, WorkflowEntry[]>;

export type WorkflowSelection = {
  workflows: { category: string; name: string }[];
  categories: Set<string>;
};

// ---- Discovery ----

const FRONTMATTER_RE = /^---\s*\n([\s\S]*?)\n---/;
const FIELD_RE = /^(\w+):\s*(.+)$/;

function parseFrontmatter(content: string): Record<string, string> {
  const match = content.match(FRONTMATTER_RE);
  if (!match) return {};
  const fields: Record<string, string> = {};
  for (const line of match[1].split("\n")) {
    const fm = line.match(FIELD_RE);
    if (fm) fields[fm[1]] = fm[2].trim();
  }
  return fields;
}

/**
 * Scan template/workflows/ to discover all available workflows grouped by category.
 * Skips non-directory entries and the _templates/ directory within each category.
 */
export async function discoverWorkflowCatalog(packageRoot: string): Promise<WorkflowCatalog> {
  const catalog: WorkflowCatalog = new Map();
  const workflowsRoot = join(packageRoot, "template", "workflows");

  const categoryEntries = await readdir(workflowsRoot, { withFileTypes: true });
  for (const catDir of categoryEntries) {
    if (!catDir.isDirectory() || catDir.name.startsWith("_")) continue;

    const catPath = join(workflowsRoot, catDir.name);
    const wfEntries = await readdir(catPath, { withFileTypes: true });
    const workflows: WorkflowEntry[] = [];

    for (const wfDir of wfEntries) {
      if (!wfDir.isDirectory() || wfDir.name.startsWith("_")) continue;

      // The workflow entry file is <name>/<name>.md (e.g., H-diagnose/H-diagnose.md)
      const entryFile = join(catPath, wfDir.name, `${wfDir.name}.md`);
      let displayName = wfDir.name;
      let description = "";

      try {
        const content = await readFile(entryFile, "utf-8");
        const fm = parseFrontmatter(content);
        displayName = fm.name ?? wfDir.name;
        description = fm.description ?? "";
      } catch {
        // Entry file missing or unreadable — use directory name as fallback
      }

      workflows.push({
        category: catDir.name,
        name: wfDir.name,
        displayName,
        description,
      });
    }

    if (workflows.length > 0) {
      catalog.set(catDir.name, workflows);
    }
  }

  return catalog;
}

/**
 * Scan a target speculo/workflows/ directory to discover which workflows
 * are already installed.
 */
export async function scanInstalledWorkflows(
  installRoot: string
): Promise<{ category: string; name: string }[]> {
  const installed: { category: string; name: string }[] = [];
  const workflowsRoot = join(installRoot, "workflows");

  try {
    const catEntries = await readdir(workflowsRoot, { withFileTypes: true });
    for (const catDir of catEntries) {
      if (!catDir.isDirectory() || catDir.name.startsWith("_")) continue;

      const catPath = join(workflowsRoot, catDir.name);
      try {
        const wfEntries = await readdir(catPath, { withFileTypes: true });
        for (const wfDir of wfEntries) {
          if (!wfDir.isDirectory() || wfDir.name.startsWith("_")) continue;
          // Verify it's a workflow by checking for the entry .md file
          const entryFile = join(catPath, wfDir.name, `${wfDir.name}.md`);
          try {
            await readFile(entryFile, "utf-8");
            installed.push({ category: catDir.name, name: wfDir.name });
          } catch {
            // No entry file → skip
          }
        }
      } catch {
        // Category dir unreadable → skip
      }
    }
  } catch {
    // workflows/ doesn't exist yet → empty
  }

  return installed;
}

// ---- Interaction ----

/** Returns true when stdin is a TTY (interactive terminal). */
export function isInteractive(): boolean {
  return process.stdin.isTTY === true;
}

/**
 * Build the choices array for the @inquirer/checkbox prompt.
 * Each category becomes one checkbox option showing its name and workflow count.
 */
function buildCategoryChoices(
  catalog: WorkflowCatalog,
  preSelected?: Set<string>
): { name: string; value: string; description: string; checked: boolean }[] {
  const sortedCategories = [...catalog.keys()].sort();
  return sortedCategories.map((cat) => {
    const wfs = catalog.get(cat)!;
    const count = wfs.length;
    const description = `${count} workflow${count > 1 ? "s" : ""}`;
    return {
      name: cat,
      value: cat,
      description,
      checked: preSelected?.has(cat) ?? false,
    };
  });
}

/**
 * Interactive category-level workflow selection using @inquirer checkbox.
 *
 * In init mode, no categories are pre-selected — the user picks what they want.
 * In update mode, categories already installed are pre-selected (checked by default).
 *
 * Returns a WorkflowSelection containing every workflow in the selected categories.
 * If no categories are selected, returns an empty selection (only .speculo, commands,
 * and skills are installed).
 *
 * When stdin is not a TTY (pipe, redirect), falls back to selecting all categories.
 */
export async function promptCategorySelection(
  catalog: WorkflowCatalog,
  options?: { preSelectedCategories?: Set<string> }
): Promise<WorkflowSelection> {
  // Non-interactive → select all
  if (!isInteractive()) {
    return selectAllFromCatalog(catalog);
  }

  const choices = buildCategoryChoices(catalog, options?.preSelectedCategories);

  const selectedCategories: string[] = await checkbox({
    message: "Select workflow categories to install (space to toggle, enter to confirm):",
    choices,
    pageSize: 10,
  });

  if (selectedCategories.length === 0) {
    console.log("No categories selected. No workflows will be installed.\n");
  }

  // Build WorkflowSelection from selected categories
  const workflows: { category: string; name: string }[] = [];
  const categories = new Set<string>();

  for (const cat of selectedCategories) {
    categories.add(cat);
    const wfs = catalog.get(cat) ?? [];
    for (const wf of wfs) {
      workflows.push({ category: wf.category, name: wf.name });
    }
  }

  return { workflows, categories };
}

/** Build a WorkflowSelection that selects every workflow in the catalog. */
export function selectAllFromCatalog(
  catalog: WorkflowCatalog
): WorkflowSelection {
  const workflows: { category: string; name: string }[] = [];
  const categories = new Set<string>();

  for (const [cat, wfs] of catalog) {
    categories.add(cat);
    for (const wf of wfs) {
      workflows.push({ category: wf.category, name: wf.name });
    }
  }

  return { workflows, categories };
}
