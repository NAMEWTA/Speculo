import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const checkOnly = process.argv.includes("--check");

const workflowRoot = "template/workflows/specdev";
const commonRoot = `${workflowRoot}/common`;

function normalizeLineEndings(content) {
  return content.replace(/\r\n?/g, "\n");
}

const sharedSources = {
  designContract: {
    source: `${commonRoot}/rules/design-contract.md`,
    tag: "design-contract",
  },
  designPortability: {
    source: `${commonRoot}/rules/design-portability.md`,
    tag: "design-portability",
  },
  projectDesignSchema: {
    source: `${commonRoot}/schemas/project-design.schema.json`,
    tag: "project-design-schema",
    format: "json",
  },
  changeDesignSchema: {
    source: `${commonRoot}/schemas/change-design.schema.json`,
    tag: "change-design-schema",
    format: "json",
  },
  designPackageSchema: {
    source: `${workflowRoot}/specdev-p-prototype/assets/design-package.schema.json`,
    tag: "design-package-schema",
    format: "json",
  },
  browserEvidenceSchema: {
    source: `${commonRoot}/schemas/prototype-browser-evidence.schema.json`,
    tag: "prototype-browser-evidence-schema",
    format: "json",
  },
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
  codebaseDesign: {
    source: `${commonRoot}/rules/codebase-design.md`,
    tag: "codebase-design",
  },
  codeCommenting: {
    source: `${commonRoot}/rules/code-commenting-rule.md`,
    tag: "code-commenting-rule",
  },
  parentImplementationOrchestration: {
    source: `${commonRoot}/rules/parent-implementation-orchestration.md`,
    tag: "parent-implementation-orchestration",
  },
  researchSkill: {
    source: `${commonRoot}/skills/research/SKILL.md`,
    tag: "research",
    discardFrontmatter: true,
  },
  codeReviewSkill: {
    source: `${commonRoot}/skills/code-review/SKILL.md`,
    tag: "code-review",
    discardFrontmatter: true,
  },
  codeReviewSourceDiscovery: {
    source: `${commonRoot}/skills/code-review/references/source-discovery.md`,
    tag: "code-review-source-discovery",
  },
  codeReviewFowlerSmells: {
    source: `${commonRoot}/skills/code-review/references/fowler-smells.md`,
    tag: "code-review-fowler-smells",
  },
  codeReviewContracts: {
    source: `${commonRoot}/skills/code-review/references/reviewer-contracts.md`,
    tag: "code-review-contracts",
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
    source: `${workflowRoot}/specdev-i-implement/references/merge-conflict-protocol.md`,
    tag: "merge-conflict-protocol",
  },
  subagentDeliverySkill: {
    source: `template/references/coordination/coordination-contract.md`,
    tag: "subagent-delivery",
  },
  subagentDeliveryNative: {
    source: `template/references/coordination/result-and-recovery.md`,
    tag: "subagent-delivery-native",
  },
  subagentDeliveryExternalWeb: {
    source: `template/references/coordination/exchange/external-web.md`,
    tag: "subagent-delivery-external-web",
  },
  subagentDeliverySourcePackage: {
    source: `template/references/coordination/exchange/source-package.md`,
    tag: "subagent-delivery-source-package",
  },
  configSchema: {
    source: `${commonRoot}/schemas/config.schema.json`,
    tag: "config-schema",
    format: "json",
  },
  configTemplate: {
    source: `${workflowRoot}/specdev-i-init-setup/assets/config-template.json`,
    tag: "config-template",
    format: "json",
  },
  statusSchema: {
    source: `${commonRoot}/schemas/status.schema.json`,
    tag: "status-schema",
    format: "json",
  },
  statusTemplate: {
    source: `${workflowRoot}/specdev-i-init-setup/assets/status-template.json`,
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
  implementationMapSchema: {
    source: `${commonRoot}/schemas/implementation-map.schema.json`,
    tag: "implementation-map-schema",
    format: "json",
  },
  implementationPlanSchema: {
    source: `${commonRoot}/schemas/implementation-plan.schema.json`,
    tag: "implementation-plan-schema",
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
    source: `${workflowRoot}/specdev-i-init-setup/assets/change-status-template.json`,
    tag: "change-status-template",
    format: "json",
  },
};

const persistenceReferences = [
  sharedSources.configTemplate,
  sharedSources.configSchema,
  reference("common/rules/workflow-state-and-lifecycle.md"),
  reference("common/rules/domain-runtime.md"),
];

const canonicalDocuments = [
  {
    output: "template/canonical/canonical-specdev-grill-with-docs.md",
    entry: `${workflowRoot}/specdev-g-grill-with-docs/SKILL.md`,
    references: [
      reference("specdev-g-grill-with-docs/references/grilling-protocol.md"),
      reference("specdev-g-grill-with-docs/assets/design-tree-template.json", {
        format: "json",
      }),
      reference("common/rules/domain-modeling.md"),
      reference("common/rules/adr-format.md"),
      reference("common/rules/context-format.md"),
      reference("specdev-g-grill-with-docs/references/log-format.md"),
      reference("specdev-g-grill-with-docs/references/stakeholder-questionnaire.md"),
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
    entry: `${workflowRoot}/specdev-s-spec/SKILL.md`,
    references: [
      reference("specdev-s-spec/references/spec-readiness.md"),
      reference("specdev-s-spec/assets/spec-template.md", { preserveArtifactHeader: true }),
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
    entry: `${workflowRoot}/specdev-t-tickets/SKILL.md`,
    references: [
      reference("specdev-t-tickets/references/decomposition-rules.md"),
      reference("specdev-t-tickets/references/ticket-readiness.md"),
      reference("specdev-t-tickets/assets/ticket-template.md", {
        preserveArtifactHeader: true,
      }),
      reference("specdev-t-tickets/assets/tickets-map-template.md", {
        preserveArtifactHeader: true,
      }),
      sharedSources.planningPrinciples,
      sharedSources.artifactContract,
      sharedSources.readinessAndDepth,
      sharedSources.pathOwnership,
      sharedSources.evidenceAndVerification,
      sharedSources.deviationControl,
      sharedSources.parentImplementationOrchestration,
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
    entry: `${workflowRoot}/specdev-p-goal-plan/SKILL.md`,
    references: [
      reference("specdev-p-goal-plan/references/planning-modes.md"),
      reference("specdev-p-goal-plan/references/orchestration-protocol.md"),
      reference("specdev-p-goal-plan/references/lead-orchestration.md"),
      reference("specdev-p-goal-plan/references/completion-control.md"),
      reference("specdev-i-implement/SKILL.md", { discardFrontmatter: true }),
      sharedSources.codeReviewSkill,
      reference("specdev-p-goal-plan/assets/goal-plan-template.md", {
        preserveArtifactHeader: true,
      }),
      sharedSources.artifactContract,
      sharedSources.pathOwnership,
      sharedSources.evidenceAndVerification,
      sharedSources.deviationControl,
      sharedSources.changeCompletion,
      sharedSources.parentImplementationOrchestration,
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
    entry: `${workflowRoot}/specdev-w-wayfinder/SKILL.md`,
    references: [
      reference("specdev-w-wayfinder/assets/investigation-ticket-template.md", {
        preserveArtifactHeader: true,
      }),
      reference("specdev-w-wayfinder/assets/wayfinder-map-template.md", {
        preserveArtifactHeader: true,
      }),
      reference("specdev-w-wayfinder/references/local-tracker-contract.md"),
      reference("specdev-w-wayfinder/assets/solution-comment-template.md", {
        preserveArtifactHeader: true,
      }),
      sharedSources.researchSkill,
      ...persistenceReferences,
      sharedSources.wayfinderTicketSchema,
    ],
  },
];

// Canonical files are intentionally self-contained snapshots.
for (const doc of canonicalDocuments) {
  doc.references.push(reference("common/rules/activation-and-memory.md"));
  doc.references.push(
    sharedSources.designContract,
    sharedSources.designPortability,
    sharedSources.projectDesignSchema,
    sharedSources.changeDesignSchema,
    sharedSources.designPackageSchema,
    sharedSources.browserEvidenceSchema,
  );
}

// Preserve the gateway's behavior in isolated hosts without pulling the local
// archive implementation and executable-only dependencies into every consumer.
// The replacement is a full runtime/owner/recovery contract, not a tool alias.
const portableDesignReferences = new Set([
  "common/tools/design-artifacts.mjs",
  "common/tools/publish-design.mjs",
  "specdev-p-prototype/scripts/validate-design-package.mjs",
  "specdev-p-prototype/scripts/materialize-prototype.mjs",
  "specdev-a-archive-and-consolidate/references/design-knowledge-gateway.md",
]);

const capabilityNames = new Map([
  ["specdev-a-archive-and-consolidate/SKILL.md", "归档与沉淀阶段"],
  ["specdev-c-code-review/SKILL.md", "独立代码审查阶段"],
  ["specdev-d-diagnose-bugs/SKILL.md", "Bug 诊断阶段"],
  ["specdev-g-grill-with-docs/SKILL.md", "设计访谈能力"],
  ["specdev-i-implement/SKILL.md", "实现阶段"],
  ["specdev-i-init-setup/SKILL.md", "初始化设置阶段"],
  ["specdev-l-learn/SKILL.md", "学习与图解阶段"],
  ["specdev-p-goal-plan/SKILL.md", "目标规划阶段"],
  ["specdev-p-prototype/SKILL.md", "原型阶段"],
  [
    "specdev-p-goal-plan/references/orchestration-protocol.md",
    "目标规划阶段的核心编排规则",
  ],
  ["specdev-r-review-architecture/SKILL.md", "架构审查阶段"],
  ["specdev-s-spec/SKILL.md", "编写 Spec 阶段"],
  ["specdev-t-tickets/SKILL.md", "拆分 Tickets 阶段"],
  ["specdev-t-triage/SKILL.md", "请求分诊阶段"],
  ["specdev-g-grill-with-docs/references/log-format.md", "设计访谈阶段的全局 LOG 条目格式"],
  [
    "specdev-t-tickets/references/ticket-readiness.md",
    "拆分 Tickets 阶段的 Ticket Ready 检查",
  ],
  ["specdev-w-wayfinder/SKILL.md", "寻路阶段"],
]);

const webRuntimeConvention = `## 网页平台运行约定

本文是可独立上传的单文件能力快照，不依赖 Speculo CLI 的根别名或源目录。执行时统一采用以下逻辑布局：

- 项目根下的 \`specdev/\` 是业务工件区。普通 Work 的直接使用不要求安装元数据；先明确项目、可读方法资源和获批写入根，不按 cwd 猜测另一个项目。
- 当前 change 位于 \`specdev/changes/{change}/\`，其中 \`{change}\` 使用真实日期 \`YYYY-MM-DD-<kebab-topic>\`。新归档位于 \`specdev/changes/archive/{change}/\`；旧月份归档原位只读，同名跨位置冲突必须先解决。
- 当前 change 的设计、规划和证据工件都写入该目录；永久 ADR、领域上下文和研究分别写入 \`specdev/adr/\`、\`specdev/context/\` 和 \`specdev/research/\`。永久设计位于 \`specdev/design/\`，消费、确认、离线导出和原 owner 恢复遵守下方 \`<design-portability>\` 标签。
- 整体结论只在 \`specdev/changes/{change}/README.md\` 的唯一正文行 \`Outcome: active|completed|cancelled\` 中表达。新 change 不创建重复业务状态 JSON，也不默认创建 config；实际工具配置只在使用该分支时读取。正文、真实验收与 owner 证据共同决定能否完成或取消，Outcome 本身不授权。任务进度由 README、Goal 或 Ticket 择一负责。
- 轻量 README 保留 scope、acceptance、verification 明确锚点、真实 AC 和证据；复杂 Goal/Ticket、并行隔离、Git 集成与 UI 专用合同仍按内联规则执行。当前工程 docs 位于 \`docs/\` 或引用项目原有负责文档；只在明确请求时建立基线。
- 项目代码与测试始终使用项目根相对路径；不写机器绝对路径。工件之间使用上述逻辑路径，不使用 Speculo 的运行时路径标签。
- 如果网页平台不能直接写项目文件，则以 \`### FILE: specdev/changes/{change}/README.md\` 等完整路径输出所有本次修改文件的完整内容，标明需要保存，随后列实际所需的 Spec/Goal/Ticket、源码资源、确认/浏览器证据与 pending 网关请求；不输出重复旧业务状态。下一会话先读用户保存后重新提供的完整工件；不得把无法写文件伪装成已经持久化。
- 若本地项目提供 Speculo Node 校验器，可运行它补充结构校验；纯网页环境按本文内联的 schema、Ready 清单和完成标准逐项核对，并明确记录未运行的自动校验。
- 本地只读 Goal 控制器和 Plan 合同校验库不随网页快照提供，不能把其名称当作可执行命令。网页执行者按内联 map-control/调用合同逐项计算依赖与门禁；缺少真实项目 Skill 源或执行能力时阻塞对应任务，不声称自动验证通过。
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
    /```(?:bash|sh|text)\n(?:(?!```)[\s\S])*?<Path>\{roots\.workflows\}\/specdev\/(?:common\/tools\/(?:design-artifacts|publish-design)\.mjs|specdev-p-prototype\/scripts\/(?:validate-design-package|materialize-prototype)\.mjs)<\/Path>(?:(?!```)[\s\S])*?```/g,
    "> **设计门与发布：** 按下方 `<design-portability>` 标签执行摘要、预览与 approved 检查；不能调用原 owner 网关时输出完整 pending 文件包，保留确认与恢复证据，不宣称发布成功。",
  ).replace(
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
    .replace(/^\{roots\.state\}\//, "")
    .replaceAll("{ticket-id}", "T-NN")
    .replaceAll("{ticket-file}", "NN-<ticket-name>");
}

function workflowPathToCanonical(value, tagsBySource) {
  const relative = value.replace(/^\{roots\.workflows\}\/specdev\//, "");
  if (portableDesignReferences.has(relative)) {
    return "下方 `<design-portability>` 标签的设计检查、发布与恢复协议";
  }
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

  if (relative === "common/tools/ticket-control.mjs") return "本地只读 Goal 控制器（不含于网页快照）";
  if (relative === "common/tools/plan-contract.mjs") return "本地 Plan 合同校验库（不含于网页快照）";
  if (relative === "common/tools/change-artifacts.mjs") return "本地只读工件与完成证据检查（缺工具时按内联合同核对并明确未执行自动检查）";

  if (relative === "common/tools/README.md") {
    return "Speculo Node 校验器说明";
  }

  if (relative === "common/rules/path-reference-contract.md") {
    return "本文的网页平台运行约定";
  }

  if (relative === "common/rules/domain-runtime.md") {
    return "SpecDev 的激活合同";
  }

  if (relative === "common/rules/activation-and-memory.md") {
    return "SpecDev 的按需读取与记忆写入协议";
  }

  if (relative.endsWith("/")) {
    return `SpecDev 的 ${path.basename(relative.slice(0, -1))} 能力集合`;
  }

  throw new Error(`Unmapped workflow reference: ${relative}`);
}

function replacePaths(content, tagsBySource) {
  const withoutCommands = replaceValidatorCommands(content).replaceAll('`{roots.commands}/handoff/COMMAND.md`', '交接能力（提供完整工件、已完成/未完成及下一 owner；不可用时输出完整交接包）');

  return withoutCommands.replace(
    /(`?)<Path>(.*?)<\/Path>\1/g,
    (_match, codeDelimiter, value) => {
      if (value.startsWith("{roots.state}/")) {
        const canonicalPath = statePathToCanonical(value);
        return codeDelimiter ? `\`${canonicalPath}\`` : canonicalPath;
      }

      if (value.startsWith("{roots.workflows}/specdev/")) {
        return workflowPathToCanonical(value, tagsBySource);
      }
      if (value.startsWith("{roots.references}/")) {
        const tag=tagsBySource.get(value.replace("{roots.references}","template/references"));
        if(!tag)throw new Error(`Unmapped shared reference: ${value}`);
        return `下方 \`<${tag}>\` 标签`;
      }

      if (value.startsWith("{roots.skills}/")) {
        const relative = value.replace(/^\{roots\.skills\}\//, "skills/");
        return codeDelimiter ? `\`${relative}\`` : `\`${relative}\``;
      }

      if(value.startsWith("{roots.commands}/source-code-zip/"))return "用户所选源码 ZIP 工具（本网页快照不内置脚本；不可执行时报告阻塞）";
      if(value === "{roots.commands}/handoff/COMMAND.md")return "交接能力（完整保存原工件、检查点、余项与下一 owner；不可用时输出完整交接包）";
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

function transformContent(content, tagsBySource, source) {
  const hostSkill = /^template\/references\/coordination\/modes\/(herdr|orca)\.md$/.exec(source ?? '')?.[1];
  if (hostSkill) {
    const title = hostSkill === 'herdr' ? 'Herdr' : 'Orca';
    // These are optional host integrations, not static capability dependencies.
    // Preserve its exact upstream identity and install checks without an external
    // Markdown dependency or a hard-coded native installation root in the web copy.
    content = content.replace(
      `[${title} SKILL.md](https://github.com/NAMEWTA/wta-skills-hub/blob/main/skills/automation/${hostSkill}/SKILL.md)`,
      `GitHub 的 NAMEWTA/wta-skills-hub 仓库 main 分支、skills/automation/${hostSkill} 目录中的完整 ${title} Skill`,
    ).replaceAll(`项目 \x60.agents/skills/${hostSkill}/SKILL.md\x60`, `宿主确认的项目 ${title} Skill 入口`)
      .replaceAll('项目 `.agents/skills/`', '宿主确认的项目 Skill 安装目录');
  }
  if (source) content = content.replace(/\[([^\]\n]+)\]\(([^)\n]+\.(?:md|json))(#[^)]*)?\)/g, (match, label, target, anchor) => {
    if (/^(?:https?:|#|\/)/.test(target)) return match;
    const resolved = path.posix.normalize(path.posix.join(path.posix.dirname(source), target));
    const tag = tagsBySource.get(resolved);
    if (tag) return `${label.trim()}（下方 \`<${tag}>\` 标签${anchor ? '对应章节' : ''}）`;
    return match;
  });
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
  let content = normalizeLineEndings(await readFile(sourcePath, "utf8"));

  if (referenceDefinition.format === "json") {
    content = adaptSchema(content.trim(), referenceDefinition.tag);
    content = transformContent(content, tagsBySource, referenceDefinition.source);
    JSON.parse(content);
    content = `\`\`\`json\n${content}\n\`\`\``;
  } else {
    const { frontmatter, body } = splitFrontmatter(content);
    const transformedBody = transformContent(body, tagsBySource, referenceDefinition.source);

    if (frontmatter && referenceDefinition.preserveArtifactHeader) {
      const transformedHeader = transformContent(frontmatter, tagsBySource, referenceDefinition.source);
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
  if (content.includes("{roots.")) failures.push("contains unresolved root alias: "+content.split("\n").filter(line=>line.includes("{roots.")).join(" | "));
  if (/^---\n(?:id|type|schema_version|artifact):/m.test(content)) {
    failures.push("contains YAML frontmatter");
  }
  if (/\]\([^)\n]+\.md(?:#[^)]*)?\)/.test(content)) {
    failures.push("contains an external Markdown file link: " + content.split('\n').filter(line => /\]\([^)\n]+\.md(?:#[^)]*)?\)/.test(line)).join(' | '));
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

async function expandNamedReferences(documentDefinition) {
  const bySource = new Map(documentDefinition.references.map(item => [item.source,item]));
  const visited = new Set();
  const queue = [documentDefinition.entry, ...bySource.keys()];
  while (queue.length) {
    const source = queue.shift();
    if (visited.has(source)) continue;
    visited.add(source);
    const content = await readFile(path.join(repositoryRoot, source), "utf8");
    for (const match of content.matchAll(/\[[^\]\n]+\]\(([^)\n]+\.(?:md|json))(?:#[^)]*)?\)/g)) {
      if (/^(?:https?:|#|\/)/.test(match[1])) continue;
      const target = path.posix.normalize(path.posix.join(path.posix.dirname(source), match[1]));
      if (!target.startsWith('template/') || !existsSync(path.join(repositoryRoot, target))) continue;
      if (!bySource.has(target)) {
        const item = {source: target, tag: `local-${target.replace(/^template\//,'').replace(/\.(md|json)$/,'').replace(/[^a-zA-Z0-9]+/g,'-').toLowerCase()}`, format: target.endsWith('.json') ? 'json' : undefined};
        bySource.set(target,item); queue.push(target);
      }
    }
    for(const match of content.matchAll(/<Path>\{roots\.references\}\/([^<>]+)<\/Path>/g)) {
      const target=`template/references/${match[1]}`;
      if(!/\.(md|json)$/.test(target)||target.includes('{'))continue;
      if(!bySource.has(target)) {const item={source:target,tag:`shared-${match[1].replace(/\.(md|json)$/,'').replace(/[^a-zA-Z0-9]+/g,'-').toLowerCase()}`,format:target.endsWith('.json')?'json':undefined};bySource.set(target,item);queue.push(target);}
    }
    for (const match of content.matchAll(/<Path>\{roots\.workflows\}\/specdev\/([^<>]+)<\/Path>/g)) {
      const relative = match[1];
      const target = `${workflowRoot}/${relative}`;
      if (portableDesignReferences.has(relative)) continue;
      if (target === documentDefinition.entry || relative === "common/rules/domain-runtime.md" || relative === "common/tools/README.md" || relative === "common/rules/path-reference-contract.md") continue;
      if (!/\.(md|json)$/.test(relative) || relative.includes("{")) continue;
      // A routed next Work is a different capability; explicitly included Work entries remain inlined.
      if (capabilityNames.has(relative) && !bySource.has(target)) continue;
      if (!bySource.has(target)) {
        const tag = `ref-${relative.replace(/\.(md|json)$/, "").replace(/[^a-zA-Z0-9]+/g,"-").toLowerCase()}`;
        const item = reference(relative,{tag,format:relative.endsWith(".json") ? "json" : undefined,preserveArtifactHeader: /template\.md$/.test(relative)});
        bySource.set(target,item);queue.push(target);
      }
    }
  }
  documentDefinition.references = [...bySource.values()];
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
  await expandNamedReferences(documentDefinition);
  await assertLocalReferenceCoverage(documentDefinition);
  const tagsBySource = new Map(
    documentDefinition.references.map(({ source, tag }) => [source, tag]),
  );

  const entryContent = normalizeLineEndings(await readFile(
    path.join(repositoryRoot, documentDefinition.entry),
    "utf8",
  ));
  const { body } = splitFrontmatter(entryContent);
  const transformedEntry = insertRuntimeConvention(
    transformContent(body, tagsBySource, documentDefinition.entry),
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
    const currentContent = normalizeLineEndings(await readFile(outputPath, "utf8"));
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
