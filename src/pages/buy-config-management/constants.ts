import type { Limits, SectionKey } from "./types";

export const FALLBACK_LIMITS: Limits = {
  maxUsdMajor: 5000,
  maxUsdcMajor: 5000,
  usdMinorScale: 2,
  usdcMinorScale: 6,
  maxUsdRateInMinor: 500000,
  maxUsdcRateInMinor: 5000000000,
  maxParentTokensPerOrder: 5000,
};

export const TAB_ORDER: Array<{ key: SectionKey; label: string }> = [
  { key: "assets", label: "Assets" },
  { key: "campaignPlans", label: "Campaign Plans" },
  { key: "offlineProducts", label: "Offline Products" },
];
