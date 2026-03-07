export type CampaignStatus =
  | "draft"
  | "scheduled"
  | "live"
  | "ended"
  | "archived"
  | string;

export type CampaignListItem = {
  _id: string;
  externalAuthor: string;
  name: string;
  goal?: string | null;
  status: CampaignStatus;
  isPolitical: boolean;
  description?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type CampaignPlan = {
  _id: string;
  id?: string;
  name: string;
  durationDays: number;
  isPolitical: boolean;
  donationSupported: boolean;
  isActive?: boolean;
  archivedAt?: string | null;
  prices?: { amountMinor: number; currency: string }[];
};

export type CampaignDetail = {
  _id: string;
  externalAuthor?: {
    _id: string;
    username?: string | null;
    avatar?: { name?: string; imageUrl?: string } | null;
  } | null;
  name: string;
  goal?: string | null;
  status: CampaignStatus;
  isPolitical?: boolean;
  isPetitionEnabled?: boolean;
  isDonationSupported?: boolean;
  description?: string | null;
  targetGeo?: {
    countries?: string[];
    states?: string[];
    cities?: string[];
  } | null;
  emailLink?: string | null;
  websiteLink?: string | null;
  twitterLink?: string | null;
  instagramLink?: string | null;
  telegramLink?: string | null;
  videoLink?: string | null;
  imageLinks?: string[] | null;
  uploadedVideoLinks?: string[] | null;
  linkedIndustries?: {
    campaignId?: string;
    industryIds?: string[];
    industries?: { _id: string; name?: string }[];
  } | null;
  latestPetition?: unknown;
  shareFeatureField?: {
    isEnabled?: boolean;
    referral_levels?: unknown[];
  } | null;
  currentPlan?: {
    active?: boolean;
    campaignId?: string;
    reason?: string;
  } | null;
  rewardSums?: {
    activeTrials?: {
      computedByAsset?: unknown[];
      rewardAmountByAsset?: unknown[];
      rewardCapByAsset?: unknown[];
    };
  } | null;
  seenAt?: string | null;
  bookmarkAt?: string | null;
};

export function formatCampaignDate(iso?: string | null): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function pickDisplayPrice(
  plan: CampaignPlan | undefined,
  preferredCurrency = "USD"
): { amountMinor: number; currency: string } | null {
  if (!plan?.prices?.length) return null;
  return (
    plan.prices.find((p) => p.currency === preferredCurrency) ?? plan.prices[0]
  );
}
