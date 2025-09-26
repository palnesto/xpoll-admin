import z from "zod";
import xpoll from "@/assets/xpoll.png";
import aptos from "@/assets/aptos.png";
import sui from "@/assets/sui.png";
import xrp from "@/assets/xrp.png";
export const ASSETS = {
  X_POLL: "xPoll", // xPoll
  X_OCTA: "xOcta", // Aptos
  X_MYST: "xMYST", // SUI
  X_DROP: "xDrop", // XRP
} as const;
export type AssetType = (typeof ASSETS)[keyof typeof ASSETS];

const _assets = [
  ASSETS.X_POLL,
  ASSETS.X_OCTA,
  ASSETS.X_MYST,
  ASSETS.X_DROP,
] as const;
export const coinAssets = [
  ASSETS.X_POLL,
  ASSETS.X_OCTA,
  ASSETS.X_MYST,
  ASSETS.X_DROP,
] as const;
export const assetEnum = z.enum(_assets);
export const sellableAssetEnum = z.enum([
  ASSETS.X_OCTA,
  ASSETS.X_MYST,
  ASSETS.X_DROP,
]);
export const coinAssetEnum = z.enum(coinAssets);
export const assets = assetEnum.options;

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
    chain: "APTOS",
  },
  [ASSETS.X_MYST]: {
    decimal: 9,
    name: "XMYST",
    symbol: "XMT",
    parent: "xSUI",
    parentSymbol: "XSUI",
    img: sui,
    canSell: { standardOrderAmount: 100, conversionFeesInXpoll: 100 },
    chain: "SUI",
  },
  [ASSETS.X_DROP]: {
    decimal: 6,
    name: "XDROP",
    symbol: "XDP",
    parent: "xXRP",
    parentSymbol: "XXRP",
    img: xrp,
    canSell: { standardOrderAmount: 100, conversionFeesInXpoll: 100 },
    chain: "XRP",
  },
};
