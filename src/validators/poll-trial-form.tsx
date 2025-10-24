// this file contains zod schemas for the poll create/edit form

import { assets, assetSpecs } from "@/utils/currency-assets/asset";
import z from "zod";

export const __MIN_TITLE_LEN__ = 3;
export const __MAX_TITLE_LEN__ = 1000;

export const __MIN_DESC_LEN__ = 3;
export const __MAX_DESC_LEN__ = 2000;

export const __MIN_OPTIONS_COUNT__ = 2;
export const __MAX_OPTIONS_COUNT__ = 4;

export const _MIN_OPTION_LEN_ = 1;
export const _MAX_OPTION_LEN_ = 500;

export const __MIN_REWARDS_COUNT__ = 1;

export const _MAX_RESOURCE_ASSETS_COUNT_ = 3;

export const REWARD_TYPE = {
  MIN: "min",
  MAX: "max",
} as const;
const rewardTypes = [REWARD_TYPE.MIN, REWARD_TYPE.MAX] as const;
export const rewardTypeEnum = z.enum(rewardTypes);
export type RewardType = z.infer<typeof rewardTypeEnum>;
export const ytVidIdZod = z
  .string()
  .regex(/^[A-Za-z0-9_-]{11}$/, "Invalid YouTube video ID");
export const internetImageUrlZod = z
  .string()
  .url()
  .regex(/\.(jpg|jpeg|png|gif|webp|avif|svg)$/i, "Invalid image URL");

export const RESOURCE_TYPES_STRING = {
  YOUTUBE: "youtube",
  IMAGE: "image",
} as const;
export const resourceTypes = [
  RESOURCE_TYPES_STRING.YOUTUBE,
  RESOURCE_TYPES_STRING.IMAGE,
] as const;
export const resourceTypeEnum = z.enum(resourceTypes);
export type ResourceType = z.infer<typeof resourceTypeEnum>;
export const resourceZod = z.discriminatedUnion("type", [
  z.object({
    type: z.literal(RESOURCE_TYPES_STRING.YOUTUBE),
    value: ytVidIdZod,
  }),
  z.object({
    type: z.literal(RESOURCE_TYPES_STRING.IMAGE),
    value: internetImageUrlZod,
  }),
]);

export const ASSET_OPTIONS: {
  label: string;
  value: string;
}[] = Object.entries(assetSpecs)?.map((entry) => {
  const [key, value] = entry;
  const label = value.parent;
  return { label: label, value: key };
});

export const optionTextZod = z
  .string()
  .min(_MIN_OPTION_LEN_, {
    message: "Option must be at least 1 character(s)",
  })
  .max(_MAX_OPTION_LEN_)
  .trim();

export const optionZ = z.object({
  text: optionTextZod,
});

export const rewardRowZ = z
  .object({
    assetId: z.enum(assets),
    amount: z.coerce.number().int().min(1),
    rewardAmountCap: z.coerce.number().int().min(1),
    rewardType: z.enum(rewardTypeEnum.options).default(REWARD_TYPE.MAX),
  })
  .refine((r) => r.rewardAmountCap >= r.amount, {
    message: "Cap must be ≥ amount",
    path: ["rewardAmountCap"],
  });

export const resourceAssetFormZ = z.union([
  z.object({
    type: z.literal(RESOURCE_TYPES_STRING.YOUTUBE),
    value: z.string().min(1),
  }),
  z.object({
    type: z.literal(RESOURCE_TYPES_STRING.IMAGE),
    value: z.array(z.union([z.instanceof(File), z.string()])).nullable(),
  }),
]);

const locationItemZ = z.object({
  _id: z.string().min(1),
  name: z.string().min(1),
});
export const idArrayFromLocation = z
  .array(locationItemZ)
  .transform((list) => list.map((x) => x._id))
  .pipe(z.array(z.string().min(1)));

export const titleZod = z
  .string()
  .min(__MIN_TITLE_LEN__)
  .max(__MAX_TITLE_LEN__)
  .trim();

export const descriptionZod = z
  .string()
  .min(__MIN_DESC_LEN__)
  .max(__MAX_DESC_LEN__)
  .trim();

export const optionsZod = z
  .array(optionZ)
  .min(__MIN_OPTIONS_COUNT__)
  .max(__MAX_OPTIONS_COUNT__);

export const rewardsZod = z
  .array(rewardRowZ)
  .min(__MIN_REWARDS_COUNT__, "At least one reward is required")
  .refine(
    (rewards) => {
      const ids = rewards.map((r) => r.assetId);
      const unique = new Set(ids);
      return unique.size === ids.length;
    },
    {
      message: "Duplicate reward assetId found",
      path: [],
    }
  );

export const targetGeoZod = z.object({
  countries: idArrayFromLocation.default([]),
  states: idArrayFromLocation.default([]),
  cities: idArrayFromLocation.default([]),
});

export const expireRewardAtZod = z
  .string()
  .datetime()
  .optional()
  .nullable()
  .refine(
    (val) => {
      if (!val || val === "") return true; // allow empty / optional
      const d = new Date(val);
      const now = new Date();
      return d >= now;
    },
    {
      message: "Expiry date must not be in the past",
    }
  );
