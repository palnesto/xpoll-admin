import z from "zod";

export const QUERY_STATUSES_MAP = {
  PENDING: "pending",
  IN_PREPROCESSING: "in-preprocessing",
  IN_RETRIEVAL: "in-retrieval",
  IN_AGGREGATION: "in-aggregation",
  IN_SYNTHESIS: "in-synthesis",
  IN_CONVERSATION: "in-conversation",
  COMPLETE: "complete",
  FAILED: "failed",
} as const;

export const QUERY_STATUSES = [
  QUERY_STATUSES_MAP.PENDING,
  QUERY_STATUSES_MAP.IN_PREPROCESSING,
  QUERY_STATUSES_MAP.IN_RETRIEVAL,
  QUERY_STATUSES_MAP.IN_AGGREGATION,
  QUERY_STATUSES_MAP.IN_SYNTHESIS,
  QUERY_STATUSES_MAP.IN_CONVERSATION,
  QUERY_STATUSES_MAP.COMPLETE,
  QUERY_STATUSES_MAP.FAILED,
] as const;

export const queryStatusEnumZ = z.enum(QUERY_STATUSES);
export type QueryStatus = z.infer<typeof queryStatusEnumZ>;

export const QUERY_STRATEGIES_MAP = {
  DEMOGRAPHIC: "demographic",
} as const;

export const QUERY_STRATEGIES = [QUERY_STRATEGIES_MAP.DEMOGRAPHIC] as const;

export const queryStrategyEnumZ = z.enum(QUERY_STRATEGIES);
export type QueryStrategy = z.infer<typeof queryStrategyEnumZ>;

export const LLM_ROLES_MAP = {
  SYSTEM: "system",
  USER: "user",
  ASSISTANT: "assistant",
  TOOL: "tool",
  EVENT: "event",
} as const;

export const LLM_ROLES = [
  LLM_ROLES_MAP.SYSTEM,
  LLM_ROLES_MAP.USER,
  LLM_ROLES_MAP.ASSISTANT,
  LLM_ROLES_MAP.TOOL,
  LLM_ROLES_MAP.EVENT,
] as const;

export const llmRoleEnumZ = z.enum(LLM_ROLES);
export type LLMRole = z.infer<typeof llmRoleEnumZ>;

export const LLM_REQUESTER_MAP = {
  INTERNAL: "internal",
  BUSINESS: "business",
} as const;

export const LLM_REQUESTER = [
  LLM_REQUESTER_MAP.INTERNAL,
  LLM_REQUESTER_MAP.BUSINESS,
] as const;

export const llmRequesterEnumZ = z.enum(LLM_REQUESTER);
export type LLMRequester = z.infer<typeof llmRequesterEnumZ>;
