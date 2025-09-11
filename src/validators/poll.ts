import z from "zod";

/** Keep these in-sync with backend enums */
export const resourceTypeEnum = z.enum(["image", "youtube"]);
export const rewardTypeEnum = z.enum(["min", "max"]);
export const coinAssetEnum = z.enum(["xOcta", "xMYST", "xDrop"]);

// mimic mongoIdZod
export const mongoIdZod = z
  .string()
  .regex(/^[a-f\d]{24}$/i, "Invalid Mongo ObjectId");

// helpers to match backend validators
const httpUrlZ = z
  .string()
  .url()
  .refine((v) => /^https?:\/\//i.test(v), "Must be an http(s) URL");

const ytVidIdZ = z.string().regex(/^[\w-]{11}$/, "Invalid YouTube video id");

// resourceZod (discriminated)
export const resourceZod = z.discriminatedUnion("type", [
  z.object({ type: z.literal("image"), value: httpUrlZ }),
  z.object({ type: z.literal("youtube"), value: ytVidIdZ }),
]);

// optionZod
export const optionZod = z.object({
  // _id optional on backend; we don’t send it from create page
  text: z.string().min(3).trim(),
  // archivedAt optional on backend; default handled server-side
});

// rewards
export const rewardZod = z
  .object({
    assetId: coinAssetEnum,
    amount: z.number().int().positive().min(1),
    rewardAmountCap: z.number().int().positive().min(1),
    currentDistribution: z.number().int().nonnegative().default(0),
    rewardType: rewardTypeEnum.default("max"),
  })
  .refine((r) => r.rewardAmountCap >= r.amount, {
    path: ["rewardAmountCap"],
    message: "rewardAmountCap must be >= amount",
  })
  .refine((r) => r.currentDistribution <= r.rewardAmountCap, {
    path: ["currentDistribution"],
    message: "currentDistribution must be <= rewardAmountCap",
  });

// array of rewards with uniqueness by assetId
export const rewardsZod = z
  .array(rewardZod)
  .min(1)
  .superRefine((rewards, ctx) => {
    const seen = new Set<string>();
    for (let i = 0; i < rewards.length; i++) {
      const r = rewards[i];
      if (seen.has(r.assetId)) {
        ctx.addIssue({
          code: "custom",
          path: [i, "assetId"],
          message: `Duplicate reward assetId: ${r.assetId}`,
        });
      }
      seen.add(r.assetId);
    }
  });

// target geo (must match backend)
export const targetGeoZod = z
  .object({
    countries: z.array(z.string().length(2)).default([]), // ISO2
    states: z.array(z.string().min(3)).default([]), // e.g. "IN-KL"
    cities: z.array(mongoIdZod).default([]), // City._id
  })
  .strict();

// date schema (keep lightweight; backend accepts Date)
export const expireRewardAtZod = z.date();

// ---- standalonePollZod (mirror backend) ----
export const standalonePollZod = z.object({
  resourceAssets: z.array(resourceZod),
  title: z.string().min(3).trim(),
  description: z.string().min(3).trim(),
  options: z.array(optionZod).min(2).max(4),
  rewards: rewardsZod, // required
  expireRewardAt: expireRewardAtZod.optional(),
  targetGeo: targetGeoZod.optional(),
  trialId: z.undefined().optional(), // explicitly not allowed here
});

export type StandalonePoll = z.infer<typeof standalonePollZod>;
