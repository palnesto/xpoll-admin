import { z } from "zod";
import { INKD_INTERNAL_AGENT_WEEKDAYS } from "@/constants/inkd";
import { amount } from "@/utils/currency-assets/base";
import type { AssetType } from "@/utils/currency-assets/asset";

/** URL tab param values for /inkd/create?tab=... */
export const INKD_CREATE_TAB_PARAMS = [
  "foundational-info",
  "brand-language",
  "settings",
  "priority-scraping",
  "reward-distribution",
] as const;

export type InkdCreateTabParam = (typeof INKD_CREATE_TAB_PARAMS)[number];

/** Internal step id used in form state */
export type InkdCreateStepId =
  | "foundational"
  | "brand"
  | "settings"
  | "priority"
  | "rewards";

export const TAB_PARAM_TO_STEP_ID: Record<InkdCreateTabParam, InkdCreateStepId> = {
  "foundational-info": "foundational",
  "brand-language": "brand",
  "settings": "settings",
  "priority-scraping": "priority",
  "reward-distribution": "rewards",
};

export const STEP_ID_TO_TAB_PARAM: Record<InkdCreateStepId, InkdCreateTabParam> = {
  foundational: "foundational-info",
  brand: "brand-language",
  settings: "settings",
  priority: "priority-scraping",
  rewards: "reward-distribution",
};

export const INKD_CREATE_STEPS: { id: InkdCreateStepId; label: string }[] = [
  { id: "foundational", label: "Foundational Info" },
  { id: "brand", label: "Brand Language" },
  { id: "settings", label: "Settings" },
  { id: "priority", label: "Priority Scraping" },
  { id: "rewards", label: "Reward Distribution" },
];

/** Parent (decimal) string for amount fields; validated and compared in base. */
const rewardItemSchema = z
  .object({
    assetId: z.string().min(1, "Select a coin"),
    amount: z
      .string()
      .min(1, "Required")
      .regex(/^\d+(\.\d+)?$/, "Enter a valid amount (e.g. 1 or 1.5)"),
    rewardAmountCap: z
      .string()
      .min(1, "Required")
      .regex(/^\d+(\.\d+)?$/, "Enter a valid amount (e.g. 100 or 100.25)"),
    rewardType: z.enum(["min", "max"]).default("max"),
  })
  .superRefine((val, ctx) => {
    const assetId = val.assetId as AssetType;
    const amtR = amount({
      op: "toBase",
      assetId,
      value: val.amount || "0",
      output: "bigint",
    });
    const capR = amount({
      op: "toBase",
      assetId,
      value: val.rewardAmountCap || "0",
      output: "bigint",
    });
    if (!amtR.ok || !capR.ok) return;
    if (capR.value < amtR.value) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["rewardAmountCap"],
        message: "Cap must be ≥ per-user amount",
      });
    }
  });

const scheduleRuleSchema = z.object({
  weekdays: z
    .array(z.enum(INKD_INTERNAL_AGENT_WEEKDAYS))
    .min(1, "Select at least one day"),
  timeUtc: z
    .string()
    .regex(/^\d{2}:\d{2}$/, "Use HH:MM (24h)")
    .superRefine((val, ctx) => {
      const [hh, mm] = val.split(":").map((v) => Number(v));
      if (
        Number.isNaN(hh) ||
        Number.isNaN(mm) ||
        hh < 0 ||
        hh > 23 ||
        mm < 0 ||
        mm > 59
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Enter a valid time (00:00–23:59)",
        });
      }
    }),
});

export const inkdAgentCreateFormSchema = z
  .object({
    name: z.string().min(3, "Name must be at least 3 characters").max(64),
    foundationalInformation: z
      .string()
      .min(100, "Minimum 100 characters")
      .max(15000),
    brandLanguage: z
      .string()
      .min(100, "Minimum 100 characters")
      .max(15000),
    maxBlogDescriptionLength: z
      .number({ invalid_type_error: "Required" })
      .int()
      .min(2000, "Minimum 2000 characters")
      .max(15000, "Maximum 15000 characters"),
    maxLinkedTrial: z
      .number({ invalid_type_error: "Required" })
      .int()
      .min(1)
      .max(10),
    maxLinkedPoll: z
      .number({ invalid_type_error: "Required" })
      .int()
      .min(1)
      .max(10),
    prioritySources: z
      .array(
        z
          .string()
          .min(1, "URL is required")
          .refine(
            (s) => {
              const t = s.trim();
              if (!t) return false;
              try {
                const url = new URL(
                  /^https?:\/\//i.test(t) ? t : `https://${t}`,
                );
                const host = url.hostname;
                return (
                  host === "localhost" ||
                  (host.length > 0 && host.includes("."))
                );
              } catch {
                return false;
              }
            },
            "Enter a valid URL (e.g. https://x.com/xpollplatform or app.xpoll.io)",
          )
      )
      .max(5),
    fallbackImageUrl: z
      .string()
      .trim()
      .url("Must be a valid image URL")
      .max(2048)
      .optional()
      .or(z.literal("")),
    scheduleRules: z
      .array(scheduleRuleSchema)
      .max(3, "Max 3 schedule rules")
      .optional()
      .default([]),
    rewards: z
      .array(rewardItemSchema)
      .min(1, "Add at least one reward")
      .superRefine((arr, ctx) => {
        const seen = new Set<string>();
        for (let i = 0; i < arr.length; i++) {
          const id = arr[i].assetId;
          if (seen.has(id)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: [i, "assetId"],
              message: "Each coin can be used only once",
            });
          }
          seen.add(id);
        }
      }),
  })
  .superRefine((val, ctx) => {
    if (val.maxLinkedTrial > 10) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["maxLinkedTrial"],
        message: "Max 10 trials per blog",
      });
    }
    if (val.maxLinkedPoll > 10) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["maxLinkedPoll"],
        message: "Max 10 polls per blog",
      });
    }
  });

export type InkdAgentCreateFormValues = z.infer<typeof inkdAgentCreateFormSchema>;
