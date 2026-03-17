/** Max industries that can be selected for targeted industries (create/edit agent, blog). */
export const MAX_TARGETED_INDUSTRIES = 5;

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

