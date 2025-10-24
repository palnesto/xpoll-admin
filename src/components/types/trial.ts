import z from "zod";
import {
  descriptionZod,
  expireRewardAtZod,
  ResourceAsset,
  rewardsZod,
  targetGeoZod,
  titleZod,
  trialResourceAssetFormZ,
} from "@/validators/poll-trial-form";

export const arrEqUnorderedById = (a?: GeoItem[], b?: GeoItem[]) => {
  const A = (a ?? [])
    .map((x) => x?._id)
    .filter(Boolean)
    .sort();
  const B = (b ?? [])
    .map((x) => x?._id)
    .filter(Boolean)
    .sort();
  if (A.length !== B.length) return false;
  return A.every((v, i) => v === B[i]);
};

export function cmpTrialRewards(
  a: { assetId: string; amount: number; rewardAmountCap?: number }[] = [],
  b: { assetId: string; amount: number; rewardAmountCap?: number }[] = []
) {
  const norm = (arr: typeof a) =>
    [...arr]
      .sort((x, y) => x.assetId.localeCompare(y.assetId))
      .map((r) => `${r.assetId}:${r.amount}:${r.rewardAmountCap ?? r.amount}`)
      .join("|");
  return norm(a) === norm(b);
}

/* =========================
   API result types
   ========================= */
export type TrialReward = {
  assetId: string;
  amount: number;
  rewardAmountCap?: number;
};
export type GeoItem = { _id: string; name: string } | string;
export type Trial = {
  _id: string;
  title: string;
  description?: string;
  // modern preferred
  resourceAssets?: ResourceAsset[];
  // legacy single url
  media?: string;
  rewards?: TrialReward[];
  createdAt?: string;
  archivedAt?: string | null;
  expireRewardAt?: string | null;
  targetGeo?: {
    countries?: GeoItem[];
    states?: GeoItem[];
    cities?: GeoItem[];
  };
};

export const editSchema = z.object({
  title: titleZod,
  description: descriptionZod,
  resourceAssets: trialResourceAssetFormZ,
  rewards: rewardsZod,
  targetGeo: targetGeoZod,
  expireRewardAt: expireRewardAtZod,
});

export type EditValues = z.infer<typeof editSchema>;
