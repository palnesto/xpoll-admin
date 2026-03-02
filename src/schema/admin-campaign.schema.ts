import { z } from "zod";

export const adminCreateCampaignFormZ = z.object({
  externalAccountId: z.string().min(1, "Please select a user"),
  campaignName: z.string().min(1, "Campaign name is required").max(300),
  goal: z.string().min(1, "Goal is required").max(500),
  getDataAccess: z.boolean(),
  campaignType: z.enum(["political", "non_political"]),
  duration: z.string().min(1, "Please select a plan"),
  agree: z.boolean().optional(),
});

export type AdminCreateCampaignFormValues = z.infer<
  typeof adminCreateCampaignFormZ
>;
