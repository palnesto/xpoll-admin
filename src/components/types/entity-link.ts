import { AssetType } from "@/utils/currency-assets/asset";
import { ResourceAsset, RewardType } from "@/validators/poll-trial-form";

export type PollOption = {
  _id: string;
  text: string;
  archivedAt?: string | null;
};

type RewardRow = {
  assetId: AssetType;
  amount: number;
  rewardAmountCap: number;
  rewardType: RewardType;
};

export type Poll = {
  _id?: string;
  pollId: string;
  title: string;
  description?: string;
  createdAt?: string;
  archivedAt?: string | null;
  resourceAssets?: ResourceAsset[];
  media?: string;
  rewards?: RewardRow[];
  expireRewardAt?: string | null;
  options?: PollOption[];
  targetGeo?: {
    countries?: string[];
    states?: string[];
    cities?: string[];
  };
  trialId?: string;
  trial?: { _id: string; title?: string };
  externalAuthor?: boolean;
  externalAuthorInfo?: {
    username?: string;
    city?: { name?: string };
    state?: { name?: string };
    country?: { name?: string };
  };
};

export type EntityReferralAnalytics = {
  entityId: string;
  uniqueLinks: number;
  totals: {
    views: number;
    uniques: number;
  };
};

export type EntityType = "poll" | "trial" | "campaign" | "blog" | "page";

export type EntityRef = {
  type: EntityType;
  _id: string;
};

export type AddRemoveLinkBody = {
  from: EntityRef;
  to: EntityRef;
};
