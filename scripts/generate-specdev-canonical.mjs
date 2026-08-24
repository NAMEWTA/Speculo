import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const checkOnly = process.argv.includes("--check");

const workflowRoot = "template/workflows/specdev";
const commonRoot = `${workflowRoot}/common`;

const sharedSources = {
  artifactContract: {
    source: `${commonRoot}/rules/artifact-contract.md`,
    tag: "artifact-contract",
  },
  planningPrinciples: {
    source: `${commonRoot}/rules/planning-principles.md`,
    tag: "planning-principles",
  },
  readinessAndDepth: {
    source: `${commonRoot}/rules/readiness-and-depth.md`,
    tag: "readiness-and-depth",
  },
  pathOwnership: {
    source: `${commonRoot}/rules/path-ownership.md`,
    tag: "path-ownership",
  },
  evidenceAndVerification: {
    source: `${commonRoot}/rules/evidence-and-verification.md`,
    tag: "evidence-and-verification",
  },
  deviationControl: {
    source: `${commonRoot}/rules/deviation-control.md`,
    tag: "deviation-control",
  },
  changeCompletion: {
    source: `${commonRoot}/rules/change-completion.md`,
    tag: "change-completion",
  },
  researchSkill: {
    source: `${commonRoot}/skills/research/SKILL.md`,
    tag: "research",
    discardFrontmatter: true,
  },
  devWorktreeSkill: {
    source: `${commonRoot}/skills/dev-worktree/SKILL.md`,
    tag: "dev-worktree",
    discardFrontmatter: true,
  },
  devWorktreeCreate: {
    source: `${commonRoot}/skills/dev-worktree/references/create.md`,
    tag: "dev-worktree-create",
  },
  devWorktreeFinalize: {
    source: `${commonRoot}/skills/dev-worktree/references/finalize.md`,
    tag: "dev-worktree-finalize",
  },
  mergeConflictProtocol: {
    source: `${workflowRoot}/I-implement/merge-conflict-protocol.md`,
    tag: "merge-conflict-protocol",
  },
  subagentDeliverySkill: {
    source: `${commonRoot}/skills/subagent-delivery/SKILL.md`,
    tag: "subagent-delivery",
    discardFrontmatter: true,
  },
  subagentDeliveryNative: {
    source: `${commonRoot}/skills/subagent-delivery/references/native-subagent.md`,
    tag: "subagent-delivery-native",
  },
  subagentDeliveryExternalWeb: {
    source: `${commonRoot}/skills/subagent-delivery/references/external-web-subagent.md`,
    tag: "subagent-delivery-external-web",
  },
  subagentDeliverySourcePackage: {
    source: `${commonRoot}/skills/subagent-delivery/references/source-package.md`,
    tag: "subagent-delivery-source-package",
  },
  configSchema: {
    source: `${commonRoot}/schemas/config.schema.json`,
    tag: "config-schema",
    format: "json",
  },
  configTemplate: {
    source: `${workflowRoot}/I-init-setup/config-template.json`,
    tag: "config-template",
    format: "json",
  },
  statusSchema: {
    source: `${commonRoot}/schemas/status.schema.json`,
    tag: "status-schema",
    format: "json",
  },
  statusTemplate: {
    source: `${workflowRoot}/I-init-setup/status-template.json`,
    tag: "status-template",
    format: "json",
  },
  changeStatusSchema: {
    source: `${commonRoot}/schemas/change-status.schema.json`,
    tag: "change-status-schema",
    format: "json",
  },
  specSchema: {
    source: `${commonRoot}/schemas/spec.schema.json`,
    tag: "spec-schema",
    format: "json",
  },
  ticketSchema: {
    source: `${commonRoot}/schemas/ticket.schema.json`,
    tag: "ticket-schema",
    format: "json",
  },
  ticketsMapSchema: {
    source: `${commonRoot}/schemas/tickets-map.schema.json`,
    tag: "tickets-map-schema",
    format: "json",
  },
  goalPlanSchema: {
    source: `${commonRoot}/schemas/goal-plan.schema.json`,
    tag: "goal-plan-schema",
    format: "json",
  },
  designTreeSchema: {
    source: `${commonRoot}/schemas/design-tree.schema.json`,
    tag: "design-tree-schema",
    format: "json",
  },
  wayfinderTicketSchema: {
    source: `${commonRoot}/schemas/wayfinder-ticket.schema.json`,
    tag: "wayfinder-ticket-schema",
    format: "json",
  },
  changeStatusTemplate: {
    source: `${workflowRoot}/I-init-setup/change-status-template.json`,
    tag: "change-status-template",
    format: "json",
  },
};

const persistenceReferences = [
  sharedSources.configTemplate,
  sharedSources.configSchema,
  sharedSources.statusTemplate,
  sharedSources.statusSchema,
  sharedSources.changeStatusTemplate,
  sharedSources.changeStatusSchema,
];

const canonicalDocuments = [
  {
    output: "template/canonical/canonical-specdev-grill-with-docs.md",
    entry: `${workflowRoot}/G-grill-with-docs/G-grill-with-docs.md`,
    references: [
      reference("G-grill-with-docs/grilling-protocol.md"),
      reference("G-grill-with-docs/design-tree-template.json", {
        format: "json",
      }),
      reference("G-grill-with-docs/domain-modeling-rules.md"),
      reference("G-grill-with-docs/adr-format.md"),
      reference("G-grill-with-docs/context-format.md"),
      reference("G-grill-with-docs/log-format.md"),
      reference("G-grill-with-docs/stakeholder-questionnaire.md"),
      sharedSources.artifactContract,
      sharedSources.planningPrinciples,
      sharedSources.readinessAndDepth,
      sharedSources.deviationControl,
      sharedSources.researchSkill,
      ...persistenceReferences,
      sharedSources.designTreeSchema,
    ],
  },
  {
    output: "template/canonical/canonical-specdev-spec.md",
    entry: `${workflowRoot}/S-spec/S-spec.md`,
    references: [
      reference("S-spec/spec-readiness.md"),
      reference("S-spec/spec-template.md", { preserveArtifactHeader: true }),
      sharedSources.planningPrinciples,
      sharedSources.artifactContract,
      sharedSources.readinessAndDepth,
      sharedSources.evidenceAndVerification,
      sharedSources.deviationControl,
      sharedSources.researchSkill,
      ...persistenceReferences,
      sharedSources.specSchema,
    ],
  },
  {
    output: "template/canonical/canonical-specdev-tickets.md",
    entry: `${workflowRoot}/T-tickets/T-tickets.md`,
    references: [
      reference("T-tickets/decomposition-rules.md"),
      reference("T-tickets/ticket-readiness.md"),
      reference("T-tickets/ticket-template.md", {
        preserveArtifactHeader: true,
      }),
      reference("T-tickets/tickets-map-template.md", {
        preserveArtifactHeader: true,
      }),
      sharedSources.planningPrinciples,
      sharedSources.artifactContract,
      sharedSources.readinessAndDepth,
      sharedSources.pathOwnership,
      sharedSources.evidenceAndVerification,
      sharedSources.deviationControl,
      sharedSources.researchSkill,
      sharedSources.devWorktreeSkill,
      sharedSources.devWorktreeCreate,
      sharedSources.devWorktreeFinalize,
      sharedSources.mergeConflictProtocol,
      ...persistenceReferences,
      sharedSources.ticketSchema,
      sharedSources.ticketsMapSchema,
    ],
  },
  {
    output: "template/canonical/canonical-specdev-goal-plan.md",
    entry: `${workflowRoot}/P-goal-plan/P-goal-plan.md`,
    references: [
      reference("P-goal-plan/planning-modes.md"),
      reference("P-goal-plan/orchestration-protocol.md"),
      reference("P-goal-plan/lead-orchestration.md"),
      reference("P-goal-plan/completion-control.md"),
      reference("P-goal-plan/goal-plan-template.md", {
        preserveArtifactHeader: true,
      }),
      sharedSources.artifactContract,
      sharedSources.pathOwnership,
      sharedSources.evidenceAndVerification,
      sharedSources.deviationControl,
      sharedSources.changeCompletion,
      sharedSources.researchSkill,
      sharedSources.devWorktreeSkill,
      sharedSources.devWorktreeCreate,
      sharedSources.devWorktreeFinalize,
      sharedSources.mergeConflictProtocol,
      sharedSources.subagentDeliverySkill,
      sharedSources.subagentDeliveryNative,
      sharedSources.subagentDeliveryExternalWeb,
      sharedSources.subagentDeliverySourcePackage,
      ...persistenceReferences,
      sharedSources.goalPlanSchema,
    ],
  },
  {
    output: "template/canonical/canonical-specdev-wayfinder.md",
    entry: `${workflowRoot}/W-wayfinder/W-wayfinder.md`,
    references: [
      reference("W-wayfinder/investigation-ticket-template.md", {
        preserveArtifactHeader: true,
      }),
      reference("W-wayfinder/wayfinder-map-template.md", {
        preserveArtifactHeader: true,
      }),
      reference("W-wayfinder/local-tracker-contract.md"),
      reference("W-wayfinder/solution-comment-template.md", {
        preserveArtifactHeader: true,
      }),
      sharedSources.researchSkill,
      ...persistenceReferences,
      sharedSources.wayfinderTicketSchema,
    ],
  },
  {
    output:
      "template/canonical/canonical-specdev-engineering-cognitive-mentor.md",
    entry: `${workflowRoot}/E-engineering-cognitive-mentor/E-engineering-cognitive-mentor.md`,
    references: [
      reference("E-engineering-cognitive-mentor/mode-routing.md"),
      reference("E-engineering-cognitive-mentor/interaction-protocol.md"),
      reference("E-engineering-cognitive-mentor/evidence-and-options.md"),
      reference("E-engineering-cognitive-mentor/bug-guidance.md"),
      reference("E-engineering-cognitive-mentor/codebase-guidance.md"),
      reference("E-engineering-cognitive-mentor/requirements-guidance.md"),
      reference("E-engineering-cognitive-mentor/architecture-guidance.md"),
      reference("E-engineering-cognitive-mentor/domain-learning-guidance.md"),
      reference("E-engineering-cognitive-mentor/comprehension-and-closure.md"),
      reference("E-engineering-cognitive-mentor/persistence-and-resume.md"),
      reference("E-engineering-cognitive-mentor/mentor-report-template.md", {
        preserveArtifactHeader: true,
      }),
      sharedSources.artifactContract,
      sharedSources.deviationControl,
      sharedSources.researchSkill,
      ...persistenceReferences,
    ],
  },
];

const capabilityNames = new Map([
  ["A-archive-and-consolidate/A-archive-and-consolidate.md", "归档与沉淀阶段"],
  ["C-code-review/C-code-review.md", "独立代码审查阶段"],
  ["D-diagnose-bugs/D-diagnose-bugs.md", "Bug 诊断阶段"],
  ["G-grill-with-docs/G-grill-with-docs.md", "设计访谈能力"],
  ["I-implement/I-implement.md", "实现阶段"],
  ["I-init-setup/I-init-setup.md", "初始化设置阶段"],
  ["P-goal-plan/P-goal-plan.md", "目标规划阶段"],
  ["P-prototype/P-prototype.md", "原型阶段"],
  [
    "P-goal-plan/orchestration-protocol.md",
    "目标规划阶段的核心编排规则",
  ],
  ["R-review-architecture/R-review-architecture.md", "架构审查阶段"],
  ["S-spec/S-spec.md", "编写 Spec 阶段"],
  ["T-tickets/T-tickets.md", "拆分 Tickets 阶段"],
  ["T-triage/T-triage.md", "请求分诊阶段"],
  ["G-grill-with-docs/log-format.md", "设计访谈阶段的全局 LOG 条目格式"],
  [
    "T-tickets/ticket-readiness.md",
    "拆分 Tickets 阶段的 Ticket Ready 检查",
  ],
  ["W-wayfinder/W-wayfinder.md", "寻路阶段"],
]);

const webRuntimeConvention = `## 网页平台运行约定

本文是可独立上传的单文件能力快照，不依赖 Speculo CLI 的根别名或源目录。执行时统一采用以下逻辑布局：

- 项目根下的 \`specdev/\` 是状态区；全局配置与状态分别为 \`specdev/config.json\` 和 \`specdev/status.json\`。
- 当前 change 位于 \`specdev/changes/{change}/\`，其中 \`{change}\` 使用 \`YYYY-MM-DD-<kebab-topic>\`。
- 当前 change 的设计、规划和证据工件都写入该目录；永久 ADR、领域上下文和研究分别写入 \`specdev/adr/\`、\`specdev/context/\` 和 \`specdev/research/\`。
- \`specdev/config.json\` 或 \`specdev/status.json\` 不存在时，分别按下方 \`<config-template>\` 和 \`<status-template>\` 标签创建；新建 change 时按下方 \`<change-status-template>\` 标签创建 \`.status.json\`。对应 schema 用于结构核对。
- 项目代码与测试始终使用项目根相对路径；不写机器绝对路径。工件之间使用上述逻辑路径，不使用 Speculo 的运行时路径标签。
- 如果网页平台不能直接写项目文件，则按目标文件名输出完整内容，并在答复中明确应保存的位置；不得把“无法写文件”伪装成已经持久化。
- 若本地项目提供 Speculo Node 校验器，可运行它补充结构校验；纯网页环境按本文内联的 schema、Ready 清单和完成标准逐项核对，并明确记录未运行的自动校验。
- 提交、推送、合并、部署、发布、归档移动和不可逆迁移仍需用户明确授权。`;

function reference(relativeSource, options = {}) {
  const source = `${workflowRoot}/${relativeSource}`;
  const fileName = path.basename(relativeSource, path.extname(relativeSource));
  return {
    source,
    tag: fileName.toLowerCase(),
    ...options,
  };
}

function splitFrontmatter(content) {
  if (!content.startsWith("---\n")) {
    return { frontmatter: null, body: content.trim() };
  }

  const closingIndex = content.indexOf("\n---\n", 4);
  if (closingIndex === -1) {
    throw new Error("Unclosed YAML frontmatter");
  }

  return {
    frontmatter: content.slice(4, closingIndex).trim(),
    body: content.slice(closingIndex + 5).trim(),
  };
}

function insertRuntimeConvention(body) {
  const firstLineEnd = body.indexOf("\n");
  if (firstLineEnd === -1 || !body.startsWith("# ")) {
    throw new Error("Canonical entry must start with an H1");
  }

  return `${body.slice(0, firstLineEnd)}\n\n${webRuntimeConvention}\n\n${body
    .slice(firstLineEnd + 1)
    .trimStart()}`;
}

function replaceValidatorCommands(content) {
  return content.replace(
    /```bash\nnode `?<Path>\{roots\.workflows\}\/specdev\/common\/tools\/validate-specdev\.mjs<\/Path>`? \\\n\s*`?<Path>\{roots\.state\}\/specdev\/changes\/\{change\}<\/Path>`?\n```/g,
    [
      "> **结构校验：** 本地项目若已安装 Speculo，使用其 Node 校验器检查当前 change；",
      "> 纯网页环境逐项核对本文内联的 schema、Ready 清单和完成标准，并记录自动校验未运行。",
    ].join("\n"),
  );
}

function statePathToCanonical(value) {
  return value
    .replace(/^\{roots\.state\}\/specdev\//, "specdev/")
    .replaceAll("{ticket-id}", "T-NN")
    .replaceAll("{ticket-file}", "NN-<ticket-name>");
}

function workflowPathToCanonical(value, tagsBySource) {
  const relative = value.replace(/^\{roots\.workflows\}\/specdev\//, "");
  const source = `${workflowRoot}/${relative}`;
  const tag = tagsBySource.get(source);
  if (tag) {
    return `下方 \`<${tag}>\` 标签`;
  }

  const capability = capabilityNames.get(relative);
  if (capability) {
    return `“${capability}”`;
  }

  if (relative === "common/tools/validate-specdev.mjs") {
    return "Speculo Node 校验器";
  }

  if (relative === "common/tools/README.md") {
    return "Speculo Node 校验器说明";
  }

  if (relative === "common/rules/path-reference-contract.md") {
    return "本文的网页平台运行约定";
  }

  if (relative.endsWith("/")) {
    return `SpecDev 的 ${path.basename(relative.slice(0, -1))} 能力集合`;
  }

  throw new Error(`Unmapped workflow reference: ${relative}`);
}

function replacePaths(content, tagsBySource) {
  const withoutCommands = replaceValidatorCommands(content);

  return withoutCommands.replace(
    /(`?)<Path>(.*?)<\/Path>\1/g,
    (_match, codeDelimiter, value) => {
      if (value.startsWith("{roots.state}/specdev/")) {
        const canonicalPath = statePathToCanonical(value);
        return codeDelimiter ? `\`${canonicalPath}\`` : canonicalPath;
      }

      if (value.startsWith("{roots.workflows}/specdev/")) {
        return workflowPathToCanonical(value, tagsBySource);
      }

      if (value.startsWith("{roots.skills}/")) {
        const relative = value.replace(/^\{roots\.skills\}\//, "skills/");
        return codeDelimiter ? `\`${relative}\`` : `\`${relative}\``;
      }

      return codeDelimiter ? `\`${value}\`` : value;
    },
  );
}

function adaptCanonicalLanguage(content) {
  return content
    .replaceAll("项目相对 Path 标签", "项目根相对路径")
    .replaceAll("完整根变量 Path 标签", "本文约定的逻辑路径")
    .replaceAll("完整 Path 标签 所指位置", "本文约定的位置")
    .replaceAll("完整 Path 标签形式", "本文约定的逻辑路径形式")
    .replaceAll("完整 Path 标签 形式", "本文约定的逻辑路径形式")
    .replaceAll("Path 标签", "项目根相对路径")
    .replaceAll("Path标签", "项目根相对路径")
    .replaceAll(
      "内部工件不得使用相对 Markdown 链接",
      "内部工件使用本文约定的逻辑路径，不用 Markdown 链接充当状态引用",
    )
    .replaceAll(
      "重新运行 Speculo Node 校验器",
      "重新执行结构校验；纯网页环境按本文的内联规则人工核对",
    )
    .replaceAll(
      "Speculo Node 校验器 无 error",
      "结构校验无 error；纯网页环境的人工核对结果已记录",
    );
}

function adaptSchema(content, tag) {
  if (tag === "ticket-schema") {
    return content.replaceAll(
      "<Path>[^<]+</Path>",
      "(?!/)(?![A-Za-z]:).+",
    );
  }

  if (tag === "status-schema") {
    return content.replaceAll(
      '"pattern": "^<Path>\\\\{roots\\\\.state\\\\}/specdev/archive/[^<]+</Path>$"',
      '"pattern": "^specdev/archive/[0-9]{4}-[0-9]{2}/.+/$"',
    );
  }

  if (tag === "change-status-schema") {
    return content.replaceAll(
      '"pattern": "^<Path>\\\\{roots\\\\.state\\\\}/specdev/archive/[^<]+</Path>$"',
      '"pattern": "^specdev/archive/[0-9]{4}-[0-9]{2}/.+/$"',
    );
  }

  return content;
}

function transformContent(content, tagsBySource) {
  const withoutLocalActivationContract = content.replace(
    /^> 激活本 Work 后，先读取 `<Path>\{roots\.workflows\}\/specdev\/README\.md<\/Path>`，再执行本入口。\r?\n\r?\n/m,
    "",
  );
  return adaptCanonicalLanguage(
    replacePaths(withoutLocalActivationContract, tagsBySource),
  ).trim();
}

async function renderReference(referenceDefinition, tagsBySource) {
  const sourcePath = path.join(repositoryRoot, referenceDefinition.source);
  let content = await readFile(sourcePath, "utf8");

  if (referenceDefinition.format === "json") {
    content = adaptSchema(content.trim(), referenceDefinition.tag);
    content = transformContent(content, tagsBySource);
    JSON.parse(content);
    content = `\`\`\`json\n${content}\n\`\`\``;
  } else {
    const { frontmatter, body } = splitFrontmatter(content);
    const transformedBody = transformContent(body, tagsBySource);

    if (frontmatter && referenceDefinition.preserveArtifactHeader) {
      const transformedHeader = transformContent(frontmatter, tagsBySource);
      content = [
        "## 产物 YAML 头部",
        "",
        "生成该工件时，将以下字段写在文档开头的 YAML frontmatter 中：",
        "",
        "```yaml",
        transformedHeader,
        "```",
        "",
        transformedBody,
      ].join("\n");
    } else {
      content = transformedBody;
    }
  }

  return [
    `<${referenceDefinition.tag}>`,
    "",
    content,
    "",
    `</${referenceDefinition.tag}>`,
  ].join("\n");
}

function assertCanonical(content, documentDefinition) {
  const failures = [];
  const definedTags = new Set(
    documentDefinition.references.map(({ tag }) => tag),
  );

  if (content.includes("<Path")) failures.push("contains <Path>");
  if (content.includes("{roots.")) failures.push("contains unresolved root alias");
  if (/^---\n(?:id|type|schema_version|artifact):/m.test(content)) {
    failures.push("contains YAML frontmatter");
  }
  if (/\]\([^)\n]+\.md(?:#[^)]*)?\)/.test(content)) {
    failures.push("contains an external Markdown file link");
  }
  if (content.includes("<canonical") || content.includes("<source-file")) {
    failures.push("contains a forbidden wrapper");
  }
  if (content.includes("template/workflows/")) {
    failures.push("contains a source-tree path");
  }
  const fenceCount = content
    .split("\n")
    .filter((line) => line.startsWith("```")).length;
  if (fenceCount % 2 !== 0) {
    failures.push("contains an unclosed fenced code block");
  }
  for (const match of content.matchAll(/下方 `<([a-z0-9-]+)>` 标签/g)) {
    if (!definedTags.has(match[1])) {
      failures.push(`references missing inline tag <${match[1]}>`);
    }
  }

  for (const referenceDefinition of documentDefinition.references) {
    const openTag = `<${referenceDefinition.tag}>`;
    const closeTag = `</${referenceDefinition.tag}>`;
    const openTagCount = content
      .split("\n")
      .filter((line) => line === openTag).length;
    const closeTagCount = content
      .split("\n")
      .filter((line) => line === closeTag).length;
    if (openTagCount !== 1) {
      failures.push(`expected one ${openTag}`);
    }
    if (closeTagCount !== 1) {
      failures.push(`expected one ${closeTag}`);
    }
  }

  if (failures.length > 0) {
    throw new Error(
      `${documentDefinition.output} failed canonical validation: ${failures.join(
        "; ",
      )}`,
    );
  }
}

async function assertLocalReferenceCoverage(documentDefinition) {
  const entryDirectory = path.dirname(documentDefinition.entry);
  const entryFileName = path.basename(documentDefinition.entry);
  const directoryEntries = await readdir(
    path.join(repositoryRoot, entryDirectory),
    { withFileTypes: true },
  );
  const expectedSources = new Set(
    documentDefinition.references.map(({ source }) => source),
  );
  const expectedTags = new Set(
    documentDefinition.references.map(({ tag }) => tag),
  );
  if (
    expectedSources.size !== documentDefinition.references.length ||
    expectedTags.size !== documentDefinition.references.length
  ) {
    throw new Error(
      `${documentDefinition.output} contains duplicate reference sources or tags`,
    );
  }
  const missingSources = directoryEntries
    .filter(
      (entry) =>
        entry.isFile() &&
        entry.name.endsWith(".md") &&
        entry.name !== entryFileName,
    )
    .map((entry) => `${entryDirectory}/${entry.name}`)
    .filter((source) => !expectedSources.has(source));

  if (missingSources.length > 0) {
    throw new Error(
      `${documentDefinition.output} omits local source files: ${missingSources.join(
        ", ",
      )}`,
    );
  }
}

async function generateCanonical(documentDefinition) {
  await assertLocalReferenceCoverage(documentDefinition);
  const tagsBySource = new Map(
    documentDefinition.references.map(({ source, tag }) => [source, tag]),
  );

  const entryContent = await readFile(
    path.join(repositoryRoot, documentDefinition.entry),
    "utf8",
  );
  const { body } = splitFrontmatter(entryContent);
  const transformedEntry = insertRuntimeConvention(
    transformContent(body, tagsBySource),
  );
  const renderedReferences = [];

  for (const referenceDefinition of documentDefinition.references) {
    renderedReferences.push(
      await renderReference(referenceDefinition, tagsBySource),
    );
  }

  const output = [
    transformedEntry,
    "",
    "---",
    "",
    "## 参考内容",
    "",
    "以下内容均已内联。主流程提到标签时，直接使用对应标签中的完整规则、模板或 schema。",
    "",
    renderedReferences.join("\n\n"),
    "",
  ].join("\n");

  assertCanonical(output, documentDefinition);
  const outputPath = path.join(repositoryRoot, documentDefinition.output);
  if (checkOnly) {
    const currentContent = await readFile(outputPath, "utf8");
    if (currentContent !== output) {
      throw new Error(
        `${documentDefinition.output} is stale; run pnpm generate-canonical`,
      );
    }
  } else {
    await writeFile(outputPath, output);
  }
  return documentDefinition.output;
}

const generatedFiles = [];
for (const documentDefinition of canonicalDocuments) {
  generatedFiles.push(await generateCanonical(documentDefinition));
}

for (const generatedFile of generatedFiles) {
  process.stdout.write(
    `${checkOnly ? "checked" : "generated"} ${generatedFile}\n`,
  );
}
