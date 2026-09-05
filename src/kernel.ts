export type ChangeLifecycle = "draft" | "active" | "blocked" | "awaiting_user" | "completed" | "archived" | "cancelled";
export type RiskClass = "read-only" | "local-reversible" | "local-destructive" | "external-mutation" | "production-critical";
export type ToolEffect = RiskClass;
export type DispatchTransport = "native" | "mounted-workspace" | "mcp" | "sandbox" | "archive";

export type DispatchEnvelope = {
  schema_version: 1;
  change_id: string;
  workflow: string;
  stage: string;
  transport: DispatchTransport;
  required_capabilities: Partial<{ context_window: number; sandbox: boolean; network: boolean; parallel: boolean; programmatic: boolean }>;
  input_artifacts: string[];
  output_artifacts: string[];
  risk: RiskClass;
};

export type ToolInvocation = {
  name: string;
  effect: ToolEffect;
  intent: string;
  parameters_digest: string;
  result: "succeeded" | "failed" | "blocked";
  postcondition: string;
  provenance: string[];
};

export type CapabilityProfile = {
  schema_version: 1;
  model: { id: string; provider?: string; modalities: string[]; context_window: number; max_output: number; reasoning_levels: string[] };
  tools: { classes: string[]; parallel: boolean; programmatic: boolean };
  execution: { sandbox: boolean; network: boolean; filesystem_roots: string[]; data_retention: "none" | "session" | "persistent" };
  memory: { compaction: boolean; persistent: boolean; cache: boolean };
};

export type WorkflowManifest = {
  schema_version: 1;
  id: string;
  version: string;
  stages: Array<{ id: string; after: string[]; inputs: string[]; outputs: string[]; risk: RiskClass; context_budget: number }>;
};

export type ContextCheckpoint = {
  schema_version: 1;
  change_id: string;
  stage: string;
  locked_decisions: string[];
  open_questions: string[];
  next_action: string;
  evidence: string[];
  state_digest: string;
  created_at: string;
};

export type TraceEvent = {
  schema_version: 1;
  sequence: number;
  at: string;
  kind: "capability" | "context" | "tool" | "transition" | "approval" | "evidence";
  payload: Record<string, unknown>;
};

export function assertCapability(profile: CapabilityProfile, requirements: Partial<{ context_window: number; sandbox: boolean; network: boolean; parallel: boolean; programmatic: boolean }>): void {
  if (requirements.context_window !== undefined && profile.model.context_window < requirements.context_window) throw new Error("capability-context-window-insufficient");
  if (requirements.sandbox === true && !profile.execution.sandbox) throw new Error("capability-sandbox-required");
  if (requirements.network === true && !profile.execution.network) throw new Error("capability-network-required");
  if (requirements.parallel === true && !profile.tools.parallel) throw new Error("capability-parallel-tools-required");
  if (requirements.programmatic === true && !profile.tools.programmatic) throw new Error("capability-programmatic-tools-required");
}

export function assertTransition(from: ChangeLifecycle, to: ChangeLifecycle): void {
  const allowed: Record<ChangeLifecycle, ChangeLifecycle[]> = {
    draft: ["active", "cancelled"], active: ["blocked", "awaiting_user", "completed", "cancelled"],
    blocked: ["active", "cancelled"], awaiting_user: ["active", "cancelled"],
    completed: ["archived"], archived: [], cancelled: [],
  };
  if (!allowed[from].includes(to)) throw new Error(`invalid-change-transition:${from}->${to}`);
}

export function riskRequiresApproval(risk: RiskClass): boolean {
  return risk === "local-destructive" || risk === "external-mutation" || risk === "production-critical";
}

export function assertToolEffect(effect: ToolEffect, risk: RiskClass): void {
  if (effect !== risk) throw new Error(`tool-effect-risk-mismatch:${effect}->${risk}`);
}
