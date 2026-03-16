/** Shape of GET /internal/inkd-internal-agents/:id response data */
export type InkdAgentScheduleRule = {
  _id?: string;
  weekdays: import("@/constants/inkd").InkdInternalAgentWeekday[];
  timeUtc: string;
};

export type InkdAgentApiDetail = {
  _id: string;
  internalAgentId: string;
  name: string;
  status: "active" | "idle";
  foundationalInformation: string;
  brandLanguage: string;
  minBlogTitleLength: number;
  maxBlogTitleLength: number;
  minBlogDescriptionLength: number;
  maxBlogDescriptionLength: number;
  maxLinkedTrial: number;
  maxLinkedPoll: number;
  prioritySources: string[];
  targetGeo: {
    countries: string[];
    states: string[];
    cities: string[];
  } | null;
  linkedIndustries: { _id: string; name: string; description: string | null }[];
  fallbackImageUrl: string | null;
  rewards: {
    assetId: string;
    amount: string;
    rewardAmountCap: string;
    rewardType: "min" | "max";
  }[];
  scheduleRules?: InkdAgentScheduleRule[];
};

/** PATCH body shape for update agent */
export type InkdAgentPatchBody = {
  foundationalInformation: string;
  brandLanguage: string;
  minBlogTitleLength: number;
  maxBlogTitleLength: number;
  minBlogDescriptionLength: number;
  maxBlogDescriptionLength: number;
  maxLinkedTrial: number;
  maxLinkedPoll: number;
  prioritySources: string[];
  targetGeo: {
    countries: string[];
    states: string[];
    cities: string[];
  } | null;
  industryIds: string[];
  fallbackImageUrl: string | null;
  rewards: {
    assetId: string;
    amount: string;
    rewardAmountCap: string;
    rewardType: "min" | "max";
  }[];
  scheduleRules?: {
    weekdays: import("@/constants/inkd").InkdInternalAgentWeekday[];
    timeUtc: string;
  }[];
};
