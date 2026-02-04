import z from "zod";
import xpoll from "@/assets/xpoll.png";
import aptos from "@/assets/aptos.png";
import sui from "@/assets/sui.png";
import xrp from "@/assets/xrp.png";
import strain from "@/assets/strain.png";
import cmpn from "@/assets/cmpn.png";
import amy from "@/assets/amy.png";
import shelly from "@/assets/shelly.png";
import snitch from "@/assets/snitch.png";
import bc from "@/assets/bubble.png";

export const ASSETS = {
  X_POLL: "xPoll", // xPoll
  X_OCTA: "xOcta", // Aptos
  X_MYST: "xMYST", // SUI
  X_DROP: "xDrop", // XRP
  X_HIGH: "xHigh", // xStrain
  X_GIVE: "xGive", // xCampaign
  // new coins
  X_AMBIT: "xAmbit", // xAmy
  X_SHELL: "xShell", // xShelly
  X_TIP: "xTip", // xSnitch
  X_BCBUBBLE: "xBcbc", // XBCBUBBLE
} as const;
export type AssetType = (typeof ASSETS)[keyof typeof ASSETS];

const _assets = [
  ASSETS.X_POLL,
  ASSETS.X_OCTA,
  ASSETS.X_MYST,
  ASSETS.X_DROP,
  ASSETS.X_HIGH,
  ASSETS.X_GIVE,
  ASSETS.X_AMBIT,
  ASSETS.X_SHELL,
  ASSETS.X_TIP,
  ASSETS.X_BCBUBBLE,
] as const;
export const coinAssets = [
  ASSETS.X_POLL,
  ASSETS.X_OCTA,
  ASSETS.X_MYST,
  ASSETS.X_DROP,
  ASSETS.X_HIGH,
  ASSETS.X_GIVE,
  ASSETS.X_AMBIT,
  ASSETS.X_SHELL,
  ASSETS.X_TIP,
  ASSETS.X_BCBUBBLE,
] as const;
export const assetEnum = z.enum(_assets);
export const sellableAssetEnum = z.enum([
  ASSETS.X_OCTA,
  ASSETS.X_MYST,
  ASSETS.X_DROP,
]);
export const coinAssetEnum = z.enum(coinAssets);
export const assets = assetEnum.options;

const CHAINS = {
  APTOS: "APTOS",
  SUI: "SUI",
  XRP: "XRP",
  STRAIN: "BASE",
} as const;
const chains = [CHAINS.APTOS, CHAINS.SUI, CHAINS.XRP, CHAINS.STRAIN] as const;
export const chainEnumZ = z.enum(chains);
export type Chain = z.infer<typeof chainEnumZ>;

export const canSellZ = z
  .object({
    standardOrderAmount: z.number().min(1).default(1),
    conversionFeesInXpoll: z.number().min(0).default(1),
  })
  .strict();

export type CanSellSpec = z.infer<typeof canSellZ>;

export const assetSpecs: Record<
  AssetType,
  {
    decimal: number;
    name: string;
    symbol: string;
    parent: string;
    parentSymbol: string;
    img: string;
    canSell: CanSellSpec | null;
    chain: string;
  }
> = {
  [ASSETS.X_POLL]: {
    decimal: 0,
    name: "XPOLL",
    symbol: "XPL",
    parent: "XPOLL",
    parentSymbol: "XPL",
    img: xpoll,
    canSell: null, // NOT sellable
    chain: "xChain",
  },
  [ASSETS.X_OCTA]: {
    decimal: 8,
    name: "xOCTA",
    symbol: "XOT",
    parent: "xAptos",
    parentSymbol: "XAPT",
    img: aptos,
    canSell: { standardOrderAmount: 100, conversionFeesInXpoll: 100 },
    chain: CHAINS.APTOS,
  },
  [ASSETS.X_MYST]: {
    decimal: 9,
    name: "XMYST",
    symbol: "XMT",
    parent: "xSUI",
    parentSymbol: "XSUI",
    img: sui,
    canSell: { standardOrderAmount: 100, conversionFeesInXpoll: 100 },
    chain: CHAINS.SUI,
  },
  [ASSETS.X_DROP]: {
    decimal: 6,
    name: "XDROP",
    symbol: "XDP",
    parent: "xXRP",
    parentSymbol: "XXRP",
    img: xrp,
    canSell: { standardOrderAmount: 100, conversionFeesInXpoll: 100 },
    chain: CHAINS.XRP,
  },
  [ASSETS.X_HIGH]: {
    decimal: 6,
    name: "XHIGH",
    symbol: "XHG",
    parent: "xStrain",
    parentSymbol: "XSTR",
    img: strain,
    canSell: {
      standardOrderAmount: 100000000,
      conversionFeesInXpoll: 100000000,
    },
    chain: CHAINS.STRAIN,
  },
  [ASSETS.X_GIVE]: {
    decimal: 2,
    name: "XGIVE",
    symbol: "XGV",
    parent: "xCampaign",
    parentSymbol: "XCMPN",
    img: cmpn,
    canSell: null,
    chain: CHAINS.STRAIN,
  },
  [ASSETS.X_AMBIT]: {
    decimal: 8,
    name: "XAMBIT",
    symbol: "XAMB",
    parent: "xAmy",
    parentSymbol: "XAMY",
    img: amy,
    canSell: null,
    chain: CHAINS.STRAIN,
  },
  [ASSETS.X_SHELL]: {
    decimal: 6,
    name: "XSHELL",
    symbol: "XSHL",
    parent: "xShelly",
    parentSymbol: "XSHLY",
    img: shelly,
    canSell: null,
    chain: CHAINS.STRAIN,
  },
  [ASSETS.X_TIP]: {
    decimal: 7,
    name: "XTIP",
    symbol: "XTP",
    parent: "xSnitch",
    parentSymbol: "XSNI",
    img: snitch,
    canSell: null,
    chain: CHAINS.STRAIN,
  },
  [ASSETS.X_BCBUBBLE]: {
    decimal: 6,
    name: "XBCBUBBLE",
    symbol: "XBC",
    parent: "xBubbleCoin",
    parentSymbol: "XBCBC",
    img: bc,
    canSell: null,
    chain: CHAINS.STRAIN,
  },
};
