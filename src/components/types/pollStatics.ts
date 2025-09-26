export const PALETTE = [
  "#EC6B56",
  "#3B82F6",
  "#FBBF24",
  "#10B981",
  "#F43F5E",
  "#A855F7",
  "#F97316",
  "#06B6D4",
  "#84CC16",
  "#EAB308",
];

export type OptionSeriesPoint = {
  bucket: string; // ISO string
  count: number;
  cumulative: number;
};

export type OptionDistributionOption = {
  _id: string;
  text: string;
  archivedAt: string | null;
  series: OptionSeriesPoint[];
  totalCumulative: number;
};

export type PollDetailsResponse = {
  optionDistribution?: {
    pollId: string;
    createdAt: string;
    granularity: "hour" | "day" | "week" | string;
    includeArchivedVotes: boolean;
    countryFilter: "ALL" | string;
    options: OptionDistributionOption[];
    summary: {
      totalVotes: number;
      optionBreakdown: Array<{
        optionId: string;
        text: string;
        archivedAt: string | null;
        totalCumulative: number;
      }>;
    };
  };
  levelDistribution?: {
    pollId: string;
    includeArchivedVotes: boolean;
    distribution: Array<{ level: number; count: number }>;
  };
  stats?: {
    pollId: string;
    title: string;
    filtersApplied: { cities: string; states: string; countries: string };
    stats: {
      totalViews: number;
      totalRewardsClaimed: number;
      totalVoters: number;
      totalShares: number;
    };
    rewards?: {
      pledge?: Array<{
        assetId: string;
        rewardType: string; // "min" | ...
        amount: string;
        rewardAmountCap: string;
        currentDistribution: string;
      }>;
      distribution?: Array<{
        docs: number;
        assetId: string;
        totalAmount: string;
      }>;
    };
  };
};

export const PIE_COLORS = [
  "#EC6B56",
  "#3B82F6",
  "#FBBF24",
  "#10B981",
  "#A855F7",
];

export const sanitizeKey = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export type ApiOption = {
  _id: string;
  text: string;
  totalCumulative?: number;
};
