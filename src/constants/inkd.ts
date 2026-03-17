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



export const MAX_IMAGE_BYTES = 20 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 40 * 1024 * 1024;
export const BLOG_MAX_IMAGE_MB = MAX_IMAGE_BYTES / (1024 * 1024);
export const BLOG_MAX_VIDEO_MB = MAX_VIDEO_BYTES / (1024 * 1024);
export const CROP_VIEW_W = 600;
export const CROP_VIEW_H = 300;
export const ACCEPT_IMAGE = "image/jpeg,image/jpg,image/png,image/webp,image/gif";
export const MAX_TARGETED_INDUSTRIES = 5;
export const MIN_TARGETED_INDUSTRIES = 0;
export const INPUT_CLASS = "border-[#DDE2E5] bg-white text-[#111]";
