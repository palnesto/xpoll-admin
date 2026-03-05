import { z } from "zod";

export const adminCreateCampaignFormZ = z.object({
  externalAccountId: z.string().min(1, "Please select a user"),
  campaignName: z
    .string()
    .min(1, "Campaign name is required")
    .min(3, "Campaign name must be at least 3 characters")
    .max(40, "Campaign name must be at most 40 characters"),
  goal: z
    .string()
    .min(1, "Goal is required")
    .min(10, "Goal must be at least 10 characters")
    .max(150, "Goal must be at most 150 characters"),
  getDataAccess: z.boolean(),
  campaignType: z.enum(["political", "non_political"]),
  duration: z.string().min(1, "Please select a plan"),
  agree: z.boolean().optional(),
});

export type AdminCreateCampaignFormValues = z.infer<
  typeof adminCreateCampaignFormZ
>;
