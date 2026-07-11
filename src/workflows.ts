import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { checkbox } from "@inquirer/prompts";

export type WorkflowPackage = {
  id: string;
  name: string;
  displayName: string;
  description: string;
};

export type WorkflowCatalog = Map<string, WorkflowPackage>;

export type WorkflowSelection = {
  workflowIds: string[];
};

const FRONTMATTER_RE = /^---\s*\n([\s\S]*?)\n---/;
const FIELD_RE = /^(\w+):\s*(.+)$/;
const WORKFLOW_ENTRY = "WORKFLOW.md";

function parseFrontmatter(content: string): Record<string, string> {
  const match = content.match(FRONTMATTER_RE);
  if (!match) return {};

  const fields: Record<string, string> = {};
  for (const line of match[1].split("\n")) {
    const field = line.match(FIELD_RE);
    if (field) fields[field[1]] = field[2].trim();
  }
  return fields;
}

export async function discoverWorkflowCatalog(
  packageRoot: string
): Promise<WorkflowCatalog> {
  const catalog: WorkflowCatalog = new Map();
  const workflowsRoot = join(packageRoot, "template", "workflows");
  const entries = await readdir(workflowsRoot, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name.startsWith("_")) continue;

    const entryPath = join(workflowsRoot, entry.name, WORKFLOW_ENTRY);
    try {
      const content = await readFile(entryPath, "utf8");
      const frontmatter = parseFrontmatter(content);
      const id = frontmatter.workflow ?? frontmatter.id ?? entry.name;
      if (id !== entry.name) {
        throw new Error(
          "Workflow directory " + entry.name + " declares workflow id " + id +
          "; ids must match directory names"
        );
      }

      catalog.set(id, {
        id,
        name: entry.name,
        displayName: frontmatter.name ?? entry.name,
        description: frontmatter.description ?? "",
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes("ids must match")) {
        throw error;
      }
      // A directory without WORKFLOW.md is not an installable workflow package.
    }
  }

  return catalog;
}

export async function scanInstalledWorkflows(
  installRoot: string
): Promise<string[]> {
  const installed: string[] = [];
  const workflowsRoot = join(installRoot, "workflows");

  try {
    const entries = await readdir(workflowsRoot, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory() || entry.name.startsWith("_")) continue;
      try {
        await readFile(join(workflowsRoot, entry.name, WORKFLOW_ENTRY), "utf8");
        installed.push(entry.name);
      } catch {
        // Ignore legacy or local directories that are not v3 workflow packages.
      }
    }
  } catch {
    return [];
  }

  return installed.sort();
}

export function isInteractive(): boolean {
  return process.stdin.isTTY === true;
}

export async function promptWorkflowSelection(
  catalog: WorkflowCatalog,
  options?: { preSelectedWorkflowIds?: Set<string> }
): Promise<WorkflowSelection> {
  if (!isInteractive()) return selectAllFromCatalog(catalog);

  const choices = [...catalog.values()]
    .sort((left, right) => left.id.localeCompare(right.id))
    .map((workflow) => ({
      name: workflow.displayName,
      value: workflow.id,
      description: workflow.description,
      checked: options?.preSelectedWorkflowIds?.has(workflow.id) ?? false,
    }));

  const workflowIds = await checkbox({
    message: "Select workflow packages to install (space to toggle, enter to confirm):",
    choices,
    pageSize: 10,
  });

  if (workflowIds.length === 0) {
    console.log("No workflows selected. Only core commands and skills will be installed.\n");
  }

  return { workflowIds };
}

export function selectAllFromCatalog(
  catalog: WorkflowCatalog
): WorkflowSelection {
  return { workflowIds: [...catalog.keys()].sort() };
}
