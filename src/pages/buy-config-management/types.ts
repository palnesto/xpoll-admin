export type EntityType = "asset" | "campaignPlan" | "offlineProduct";

export type EditableBuyConfig = {
  enable: boolean;
  fiat: {
    enable: boolean;
    usd: {
      enable: boolean;
      rateInMinor: number;
    };
  };
  crypto: {
    enable: boolean;
    usdc: {
      enable: boolean;
      rateInMinor: number;
    };
  };
  minParentTokensPerOrder?: number;
};

export type ManagedItem = {
  entityType: EntityType;
  entityId: string;
  title: string;
  subtitle: string;
  chain?: string;
  isActive?: boolean;
  imageUrl?: string | null;
  buyConfig: EditableBuyConfig;
};

export type Limits = {
  maxUsdMajor: number;
  maxUsdcMajor: number;
  usdMinorScale: number;
  usdcMinorScale: number;
  maxUsdRateInMinor: number;
  maxUsdcRateInMinor: number;
  maxParentTokensPerOrder: number;
};

export type BuyConfigPayload = {
  limits: Limits;
  assets: ManagedItem[];
  campaignPlans: ManagedItem[];
  offlineProducts: ManagedItem[];
};

export type SectionKey = "assets" | "campaignPlans" | "offlineProducts";

export type SectionDefinition = {
  title: string;
  description: string;
  items: ManagedItem[];
};

export type SectionMap = Record<SectionKey, SectionDefinition>;

export type BuyConfigUpdateBody = {
  enable: boolean;
  fiat: {
    enable: boolean;
    usd: { enable: boolean; rateInMinor: number };
  };
  crypto: {
    enable: boolean;
    usdc: { enable: boolean; rateInMinor: number };
  };
  minParentTokensPerOrder?: number;
};

export type BuyConfigFormValues = {
  enable: boolean;
  fiatEnable: boolean;
  usdEnable: boolean;
  usdMajor: string;
  cryptoEnable: boolean;
  usdcEnable: boolean;
  usdcMajor: string;
  minParentTokensPerOrder?: number;
};
