import { extractYouTubeId } from "@/utils/youtube";
import z from "zod";
import { AssetOption } from "../polling/editors/RewardsEditor";

export const TOTAL_LEVELS = 10 as const;
export const ASSET_OPTIONS: AssetOption[] = [
  { label: "OCTA", value: "xOcta" },
  { label: "MYST", value: "xMYST" },
  { label: "DROP", value: "xDrop" },
  { label: "XPOLL", value: "xPoll" },
];

export type OutputResourceAsset = { type: "image" | "youtube"; value: string };
export type ResourceAsset = { type: "image" | "youtube"; value: string };
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

export function toComparableAssets(arr?: OutputResourceAsset[]) {
  return (arr ?? []).map((a) =>
    a.type === "youtube" ? `yt:${extractYouTubeId(a.value)}` : `img:${a.value}`
  );
}

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

export const resourceAssetZ = z.union([
  z.object({ type: z.literal("youtube"), value: z.string().min(11) }),
  z.object({
    type: z.literal("image"),
    value: z.array(z.union([z.instanceof(File), z.string()])).nullable(),
  }),
]);

const rewardRowZ = z
  .object({
    assetId: z.enum(["xOcta", "xMYST", "xDrop", "xPoll"]),
    amount: z.coerce.number().int().min(1),
    rewardAmountCap: z.coerce.number().int().min(1),
    // UI parity only; server payload for Trial omits rewardType
    rewardType: z.enum(["max", "min"]).default("max"),
  })
  .refine((r) => r.rewardAmountCap >= r.amount, {
    message: "rewardAmountCap must be >= amount",
    path: ["rewardAmountCap"],
  });

const geoItemZ = z.object({
  _id: z.string().min(1),
  name: z.string().min(1),
});

export const editSchema = z
  .object({
    title: z.string().min(3, "Min 3 chars").trim(),
    description: z.string().min(3, "Min 3 chars").trim(),
    resourceAssets: z.array(resourceAssetZ).min(1, "Add at least 1 media"),
    rewards: z.array(rewardRowZ).default([]),
    targetGeo: z.object({
      countries: z.array(geoItemZ).default([]),
      states: z.array(geoItemZ).default([]),
      cities: z.array(geoItemZ).default([]),
    }),
    expireRewardAt: z
      .string()
      .datetime()
      .optional()
      .or(z.literal("").optional())
      .optional(),
  })
  .superRefine((v, ctx) => {
    const ids = (v.rewards ?? []).map((r) => r.assetId);
    const dup = ids.find((a, i) => ids.indexOf(a) !== i);
    if (dup)
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["rewards"],
        message: `Duplicate reward assetId: ${dup}`,
      });
  });

export type EditValues = z.infer<typeof editSchema>;
export function renderGeoList(
  list?: Array<{ _id: string; name: string } | string>
) {
  if (!Array.isArray(list) || list.length === 0) return "-";
  const names = list
    .map((item) => {
      if (typeof item === "string") {
        // TODO: if you have a code->label map, use it here.
        return item; // fallback to the code itself, e.g. "AF"
      }
      return item?.name || item?._id || "";
    })
    .filter(Boolean);
  return names.length ? names.join(", ") : "-";
}
