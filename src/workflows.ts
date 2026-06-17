import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { createInterface } from "node:readline/promises";

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

function flattenCatalog(
  catalog: WorkflowCatalog
): { entry: WorkflowEntry; index: number }[] {
  const flat: { entry: WorkflowEntry; index: number }[] = [];
  const sortedCategories = [...catalog.keys()].sort();

  for (const cat of sortedCategories) {
    const workflows = catalog.get(cat)!;
    for (const wf of workflows) {
      flat.push({ entry: wf, index: flat.length + 1 });
    }
  }

  return flat;
}

function printCatalogMenu(catalog: WorkflowCatalog): number {
  const sortedCategories = [...catalog.keys()].sort();
  let num = 1;

  for (const cat of sortedCategories) {
    console.log(`\n  [${cat}]`);
    const workflows = catalog.get(cat)!;
    for (const wf of workflows) {
      const desc = wf.description ? ` — ${wf.description.slice(0, 60)}${wf.description.length > 60 ? "..." : ""}` : "";
      console.log(`    ${String(num).padStart(2)}. ${wf.displayName}${desc}`);
      num++;
    }
  }

  console.log("");
  return num - 1;
}

function parseSelection(
  input: string,
  maxIndex: number
): number[] | "all" | null {
  const trimmed = input.trim().toLowerCase();
  if (trimmed === "" || trimmed === "all") return "all";

  const numbers: number[] = [];
  const parts = trimmed.split(/[,\s]+/);
  for (const part of parts) {
    if (part === "") continue;
    const n = Number(part);
    if (!Number.isInteger(n) || n < 1 || n > maxIndex) return null;
    numbers.push(n);
  }

  return numbers.length > 0 ? numbers : null;
}

/**
 * Show a numbered menu of available workflows and prompt the user to select.
 * Returns "all" selection when non-interactive or user enters empty/all.
 */
export async function promptWorkflowSelection(
  catalog: WorkflowCatalog,
  options?: { all?: boolean }
): Promise<WorkflowSelection> {
  const flat = flattenCatalog(catalog);
  const maxIndex = flat.length;

  // Non-interactive or explicit --all → select all
  if (!isInteractive() || options?.all) {
    return selectAllFromCatalog(catalog);
  }

  console.log("\nAvailable workflows:");
  printCatalogMenu(catalog);

  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  let attempts = 0;
  const maxAttempts = 3;

  while (attempts < maxAttempts) {
    const answer = await rl.question(
      `Select workflows (1-${maxIndex}, comma/space separated, or "all"): `
    );
    attempts++;

    const result = parseSelection(answer, maxIndex);
    if (result === "all") {
      rl.close();
      return selectAllFromCatalog(catalog);
    }
    if (result !== null) {
      rl.close();
      const workflows = result.map((i) => ({
        category: flat[i - 1].entry.category,
        name: flat[i - 1].entry.name,
      }));
      const categories = new Set(workflows.map((w) => w.category));
      return { workflows, categories };
    }

    console.log(
      `Invalid selection. Enter numbers 1-${maxIndex} (comma/space separated), or "all".`
    );
  }

  rl.close();
  throw new Error(
    `Too many invalid attempts. Please run with --all to install all workflows.`
  );
}

/**
 * Show a menu for update mode: split workflows into installed (refreshable)
 * and new (available to add). Returns the combined selection.
 */
export async function promptUpdateSelection(
  catalog: WorkflowCatalog,
  installed: { category: string; name: string }[],
  options?: { all?: boolean }
): Promise<WorkflowSelection> {
  // Non-interactive or explicit --all → select all
  if (!isInteractive() || options?.all) {
    return selectAllFromCatalog(catalog);
  }

  console.log("\nWorkflow update selection:");

  // Build a set of installed keys for quick lookup
  const installedSet = new Set(
    installed.map((w) => `${w.category}/${w.name}`)
  );

  // Categorize workflows
  const refreshable: WorkflowEntry[] = [];
  const newOnly: WorkflowEntry[] = [];
  const staleWarnings: string[] = [];

  // Find stale (installed but no longer in catalog)
  for (const w of installed) {
    const catWfs = catalog.get(w.category);
    if (!catWfs || !catWfs.some((e) => e.name === w.name)) {
      staleWarnings.push(`${w.category}/${w.name}`);
    }
  }

  // Build flat list: refreshable first, then new
  for (const [cat, wfs] of catalog) {
    for (const wf of wfs) {
      if (installedSet.has(`${wf.category}/${wf.name}`)) {
        refreshable.push(wf);
      } else {
        newOnly.push(wf);
      }
    }
  }

  if (staleWarnings.length > 0) {
    console.log(
      `\n  ⚠ Stale (installed but no longer available): ${staleWarnings.join(", ")}`
    );
  }

  let num = 1;
  const flatWithLabels: { entry: WorkflowEntry; label: string; index: number }[] = [];

  if (refreshable.length > 0) {
    console.log("\n  [Installed — select to refresh]");
    for (const wf of refreshable) {
      const desc = wf.description ? ` — ${wf.description.slice(0, 50)}${wf.description.length > 50 ? "..." : ""}` : "";
      console.log(`    ${String(num).padStart(2)}. ${wf.displayName} (${wf.category})${desc}`);
      flatWithLabels.push({ entry: wf, label: "installed", index: num });
      num++;
    }
  }

  if (newOnly.length > 0) {
    console.log("\n  [NEW — select to add]");
    for (const wf of newOnly) {
      const desc = wf.description ? ` — ${wf.description.slice(0, 50)}${wf.description.length > 50 ? "..." : ""}` : "";
      console.log(`    ${String(num).padStart(2)}. ${wf.displayName} (${wf.category}) [NEW]${desc}`);
      flatWithLabels.push({ entry: wf, label: "new", index: num });
      num++;
    }
  }

  console.log("");

  const maxIndex = num - 1;
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  let attempts = 0;
  const maxAttempts = 3;

  while (attempts < maxAttempts) {
    const answer = await rl.question(
      `Select workflows (1-${maxIndex}, comma/space separated, or "all"): `
    );
    attempts++;

    const result = parseSelection(answer, maxIndex);
    if (result === "all") {
      rl.close();
      return selectAllFromCatalog(catalog);
    }
    if (result !== null) {
      rl.close();
      const workflows = result.map((i) => ({
        category: flatWithLabels[i - 1].entry.category,
        name: flatWithLabels[i - 1].entry.name,
      }));
      const categories = new Set(workflows.map((w) => w.category));
      return { workflows, categories };
    }

    console.log(
      `Invalid selection. Enter numbers 1-${maxIndex} (comma/space separated), or "all".`
    );
  }

  rl.close();
  throw new Error(
    `Too many invalid attempts. Please run with --all to update all workflows.`
  );
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
