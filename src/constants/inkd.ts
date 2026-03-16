export const INKD_INTERNAL_AGENT_WEEKDAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

export type InkdInternalAgentWeekday =
  (typeof INKD_INTERNAL_AGENT_WEEKDAYS)[number];

