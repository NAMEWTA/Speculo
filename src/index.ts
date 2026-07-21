import { cp, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { basename, join, resolve } from "node:path";
import { detectLegacyState } from "./migrate.js";
import { pathExists } from "./utils.js";
import {
  discoverWorkflowCatalog,
  isInteractive,
  promptWorkflowSelection,
  scanInstalledWorkflows,
  selectAllFromCatalog,
  type WorkflowSelection,
} from "./workflows.js";

export type SpeculoCommandResult = {
  target: string;
  mode: "init" | "update";
  copied?: string[];
  updated?: string[];
};

export type SpeculoOptions = {
  packageRoot?: string;
  all?: boolean;
  selection?: WorkflowSelection;
};

const CORE_ASSETS = [".speculo", "commands", "skills"] as const;
const INSTALL_SUBDIR = "speculo";
const WORKFLOW_ENTRY = "INDEX.md";
const STATE_TEMPLATE_DIR = "_state";
const SPECULO_TAG_RE = /<SPECULO>[\s\S]*?<\/SPECULO>/;

function assetRoot(packageRoot: string): string {
  return join(packageRoot, "template");
}

function installRoot(target: string): string {
  return join(target, INSTALL_SUBDIR);
}

async function ensureAssetSource(
  packageRoot: string,
  asset: string
): Promise<string> {
  const source = join(assetRoot(packageRoot), asset);
  if (!(await pathExists(source))) {
    throw new Error("Missing packaged Speculo asset: template/" + asset);
  }
  return source;
}

async function copyCoreAssets(
  packageRoot: string,
  root: string,
  overwrite: boolean
): Promise<string[]> {
  const copied: string[] = [];
  for (const asset of CORE_ASSETS) {
    const source = await ensureAssetSource(packageRoot, asset);
    const destination = join(root, asset);
    if (asset === ".speculo" && overwrite) {
      await copyMissingTree(source, destination);
      copied.push(asset);
      continue;
    }
    if (overwrite && asset !== ".speculo") {
      await rm(destination, { recursive: true, force: true });
    }
    await cp(source, destination, {
      recursive: true,
      force: overwrite,
      errorOnExist: !overwrite,
    });
    copied.push(asset);
  }
  return copied;
}

async function copyMissingTree(
  source: string,
  destination: string
): Promise<void> {
  await mkdir(destination, { recursive: true });
  const entries = await readdir(source, { withFileTypes: true });
  for (const entry of entries) {
    const sourceEntry = join(source, entry.name);
    const destinationEntry = join(destination, entry.name);
    if (entry.isDirectory()) {
      await copyMissingTree(sourceEntry, destinationEntry);
    } else if (!(await pathExists(destinationEntry))) {
      await cp(sourceEntry, destinationEntry, {
        force: false,
        errorOnExist: true,
      });
    }
  }
}

function generateSpeculoContent(selection: WorkflowSelection): string {
  const lines: string[] = [];

  lines.push("## Speculo 运行时配置");
  lines.push("");
  lines.push("### 初始化状态检查");
  lines.push("");
  lines.push("运行时必须读取以下文件以确认 Speculo 初始化状态：");
  lines.push("");
  lines.push("- `./speculo/.speculo/workspace.json` — 工作区根别名配置");
  lines.push("- `./speculo/config.json` — 项目配置文件");
  lines.push("");
  lines.push("若上述文件不存在或内容为空，说明项目尚未完成 Speculo 初始化。");
  lines.push("此时必须提示用户：**请先运行 `speculo init` 完成初始化配置。**");
  lines.push("");

  if (selection.workflowIds.length > 0) {
    lines.push("### 工作流入口（强制读取）");
    lines.push("");
    lines.push("初始化时已选择以下工作流，运行时必须强制读取对应入口文件：");
    lines.push("");
    for (const workflowId of [...selection.workflowIds].sort()) {
      lines.push(`- \`./speculo/workflows/${workflowId}/INDEX.md\``);
    }
    lines.push("");
  }

  return `<SPECULO>\n${lines.join("\n")}</SPECULO>`;
}

async function writeAgentFiles(
  target: string,
  packageRoot: string,
  selection: WorkflowSelection
): Promise<string[]> {
  const written: string[] = [];
  const speculoBlock = generateSpeculoContent(selection);

  const claudePath = join(target, "CLAUDE.md");
  if (!(await pathExists(claudePath))) {
    const claudeTemplate = join(assetRoot(packageRoot), "CLAUDE.md");
    if (await pathExists(claudeTemplate)) {
      await cp(claudeTemplate, claudePath);
    } else {
      await writeFile(
        claudePath,
        "# CLAUDE.md\n\n必须查看 [@AGENTS.md](./AGENTS.md) 文档，按照 Speculo 规范进行开发。\n",
        "utf8"
      );
    }
    written.push("CLAUDE.md");
  }

  const agentsPath = join(target, "AGENTS.md");
  if (await pathExists(agentsPath)) {
    let content = await readFile(agentsPath, "utf8");
    if (SPECULO_TAG_RE.test(content)) {
      content = content.replace(SPECULO_TAG_RE, speculoBlock);
      written.push("AGENTS.md (updated <SPECULO>)");
    } else {
      content = content.trimEnd() + "\n\n" + speculoBlock + "\n";
      written.push("AGENTS.md (appended <SPECULO>)");
    }
    await writeFile(agentsPath, content, "utf8");
  } else {
    const agentsTemplate = join(assetRoot(packageRoot), "AGENTS.md");
    let templateContent: string;
    if (await pathExists(agentsTemplate)) {
      templateContent = await readFile(agentsTemplate, "utf8");
    } else {
      templateContent = "# AGENTS.md\n\n<SPECULO>\n</SPECULO>\n";
    }
    templateContent = templateContent.replace(SPECULO_TAG_RE, speculoBlock);
    await writeFile(agentsPath, templateContent, "utf8");
    written.push("AGENTS.md");
  }

  return written;
}

async function copyVendor(
  packageRoot: string,
  root: string,
  selection: WorkflowSelection,
  mode: "fresh" | "merge" | "overwrite"
): Promise<string[]> {
  const sourceRoot = await ensureAssetSource(packageRoot, "vendor");
  const destinationRoot = join(root, "vendor");
  const copied: string[] = [];

  if (mode === "overwrite") {
    await rm(destinationRoot, { recursive: true, force: true });
  }
  await mkdir(destinationRoot, { recursive: true });

  const entries = await readdir(sourceRoot, { withFileTypes: true });
  for (const entry of entries) {
    const source = join(sourceRoot, entry.name);
    const destination = join(destinationRoot, entry.name);
    if (mode === "merge" && (await pathExists(destination))) continue;

    await cp(source, destination, {
      recursive: entry.isDirectory(),
      force: mode === "overwrite",
      errorOnExist: mode === "fresh",
    });
    copied.push("vendor/" + entry.name);
  }

  return copied;
}

async function copyWorkflowPackages(
  packageRoot: string,
  root: string,
  selection: WorkflowSelection,
  overwrite: boolean
): Promise<string[]> {
  const copied: string[] = [];
  const sourceRoot = join(assetRoot(packageRoot), "workflows");
  const destinationRoot = join(root, "workflows");
  await mkdir(destinationRoot, { recursive: true });

  for (const workflowId of selection.workflowIds) {
    const source = join(sourceRoot, workflowId);
    const entry = join(source, WORKFLOW_ENTRY);
    if (!(await pathExists(entry))) {
      throw new Error("Unknown workflow package: " + workflowId);
    }

    const destination = join(destinationRoot, workflowId);
    if (overwrite) {
      await rm(destination, { recursive: true, force: true });
    }

    await cp(source, destination, {
      recursive: true,
      force: overwrite,
      errorOnExist: !overwrite,
      filter: (path) => basename(path) !== STATE_TEMPLATE_DIR,
    });
    copied.push("workflows/" + workflowId);

    const stateSource = join(source, STATE_TEMPLATE_DIR);
    const stateDestination = join(root, ".speculo", workflowId);
    if (!(await pathExists(stateSource))) {
      throw new Error("Workflow " + workflowId + " is missing _state/");
    }
    if (!(await pathExists(stateDestination))) {
      await cp(stateSource, stateDestination, {
        recursive: true,
        force: false,
        errorOnExist: true,
      });
      copied.push(".speculo/" + workflowId);
    }
  }

  return copied;
}

async function resolveSelection(
  packageRoot: string,
  root: string,
  options: SpeculoOptions,
  mode: "init" | "update"
): Promise<WorkflowSelection> {
  if (options.selection) return options.selection;

  const catalog = await discoverWorkflowCatalog(packageRoot);
  if (options.all || !isInteractive()) return selectAllFromCatalog(catalog);

  if (mode === "update") {
    const installed = await scanInstalledWorkflows(root);
    return promptWorkflowSelection(catalog, {
      preSelectedWorkflowIds: new Set(installed),
    });
  }

  return promptWorkflowSelection(catalog);
}

async function initFresh(
  targetArg: string,
  options: SpeculoOptions
): Promise<SpeculoCommandResult> {
  const target = resolve(targetArg);
  const packageRoot = resolve(options.packageRoot ?? process.cwd());
  const root = installRoot(target);
  const selection = await resolveSelection(packageRoot, root, options, "init");

  await mkdir(root, { recursive: true });
  const copied = await copyCoreAssets(packageRoot, root, false);
  await copyVendor(packageRoot, root, selection, "fresh");
  copied.push("vendor");
  copied.push(
    ...await copyWorkflowPackages(packageRoot, root, selection, false)
  );
  copied.push(...await writeAgentFiles(target, packageRoot, selection));

  return { target, mode: "init", copied };
}

async function initUpdate(
  targetArg: string,
  options: SpeculoOptions
): Promise<SpeculoCommandResult> {
  const target = resolve(targetArg);
  const packageRoot = resolve(options.packageRoot ?? process.cwd());
  const root = installRoot(target);
  const selection = await resolveSelection(packageRoot, root, options, "update");
  const updated = await copyCoreAssets(packageRoot, root, true);

  if (options.all) {
    await copyVendor(packageRoot, root, selection, "overwrite");
    updated.push("vendor");
  } else {
    updated.push(...await copyVendor(packageRoot, root, selection, "merge"));
  }

  updated.push(
    ...await copyWorkflowPackages(packageRoot, root, selection, true)
  );
  updated.push(...await writeAgentFiles(target, packageRoot, selection));

  return { target, mode: "update", updated };
}

export async function initSpeculo(
  targetArg = ".",
  options: SpeculoOptions = {}
): Promise<SpeculoCommandResult> {
  const target = resolve(targetArg);
  const root = installRoot(target);

  if (!(await pathExists(root))) {
    return initFresh(targetArg, options);
  }

  if (await detectLegacyState(target)) {
    throw new Error(
      "Legacy Speculo state detected. Run `speculo migrate " +
      targetArg + "` to preview, then `speculo migrate --apply " +
      targetArg + "` before updating."
    );
  }

  return initUpdate(targetArg, options);
}
