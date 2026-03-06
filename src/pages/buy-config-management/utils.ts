import { assetSpecs, type AssetType } from "@/utils/currency-assets/asset";
import { z } from "zod";
import type {
  BuyConfigFormValues,
  BuyConfigPayload,
  BuyConfigUpdateBody,
  Limits,
  ManagedItem,
  SectionKey,
  SectionMap,
} from "./types";

export const itemKey = (item: Pick<ManagedItem, "entityType" | "entityId">) =>
  `${item.entityType}:${item.entityId}`;

export function buildSections(payload: BuyConfigPayload | null): SectionMap {
  return {
    assets: {
      title: "Assets",
      description: "Coin-level buy settings. Only buyConfig fields are editable.",
      items: payload?.assets ?? [],
    },
    campaignPlans: {
      title: "Campaign Plans",
      description: "Plan purchase buyConfig controls.",
      items: payload?.campaignPlans ?? [],
    },
    offlineProducts: {
      title: "Offline Products",
      description: "Offline product purchase buyConfig controls.",
      items: payload?.offlineProducts ?? [],
    },
  };
}

export function sortItemsForDisplay(items: ManagedItem[], section: SectionKey) {
  if (section !== "assets" && section !== "offlineProducts") return items;

  return items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => {
      const aRank = a.item.buyConfig.enable ? 0 : 1;
      const bRank = b.item.buyConfig.enable ? 0 : 1;
      if (aRank !== bRank) return aRank - bRank;

      if (section === "assets") {
        const byTitle = a.item.title.localeCompare(b.item.title, undefined, {
          sensitivity: "base",
        });
        if (byTitle !== 0) return byTitle;
      }

      return a.index - b.index;
    })
    .map((entry) => entry.item);
}

function toMajorInput(rateInMinor: number, scale: number): string {
  if (!Number.isInteger(rateInMinor) || rateInMinor < 0) return "";
  const factor = 10 ** scale;
  const whole = Math.floor(rateInMinor / factor);
  const fraction = rateInMinor % factor;

  if (fraction === 0) return String(whole);
  return `${whole}.${String(fraction).padStart(scale, "0").replace(/0+$/, "")}`;
}

export function parseMajorToMinor(
  input: string,
  scale: number,
): { ok: true; value: number } | { ok: false; error: string } {
  const trimmed = String(input ?? "").trim();
  if (!trimmed) return { ok: false, error: "Value is required." };

  const normalized = trimmed.replace(/,/g, "");
  if (!/^\d+(\.\d+)?$/.test(normalized)) {
    return { ok: false, error: "Use a positive number only." };
  }

  const [wholeRaw, fracRaw = ""] = normalized.split(".");
  if (fracRaw.length > scale) {
    return { ok: false, error: `At most ${scale} decimal places are allowed.` };
  }

  const paddedFraction = fracRaw.padEnd(scale, "0");
  const combined = `${wholeRaw}${paddedFraction}`.replace(/^0+(?=\d)/, "");
  const value = Number(combined || "0");

  if (!Number.isSafeInteger(value) || value <= 0) {
    return { ok: false, error: "Value must be greater than 0." };
  }

  return { ok: true, value };
}

export function toMinorPreview(input: string, scale: number): string | null {
  const parsed = parseMajorToMinor(input, scale);
  if (!parsed.ok) return null;
  return parsed.value.toLocaleString("en-US");
}

export function getErrorMessage(error: unknown): string {
  if (typeof error === "object" && error !== null) {
    const e = error as {
      response?: {
        data?: {
          message?: unknown;
        };
      };
    };
    const candidate = e.response?.data?.message;
    if (typeof candidate === "string" && candidate.trim()) return candidate;
  }
  return "Failed to update buy config.";
}

function toAbsoluteImageUrl(input: string): string {
  if (/^https?:\/\//i.test(input)) return input;
  if (!input.startsWith("/")) return input;

  const base = String(import.meta.env.VITE_BACKEND_URL || "")
    .trim()
    .replace(/\/+$/, "");

  return base ? `${base}${input}` : input;
}

export function resolveAssetImage(item: ManagedItem): string | null {
  if (item.entityType !== "asset") return null;

  const local = assetSpecs[item.entityId as AssetType]?.img;
  if (local) return local;

  const remote = String(item.imageUrl ?? "").trim();
  if (!remote) return null;
  return toAbsoluteImageUrl(remote);
}

export function toFormDefaults(
  item: ManagedItem,
  limits: Limits,
): BuyConfigFormValues {
  return {
    enable: item.buyConfig.enable === true,
    fiatEnable: item.buyConfig.fiat.enable === true,
    usdEnable: item.buyConfig.fiat.usd.enable === true,
    usdMajor: toMajorInput(
      item.buyConfig.fiat.usd.rateInMinor,
      limits.usdMinorScale,
    ),
    cryptoEnable: item.buyConfig.crypto.enable === true,
    usdcEnable: item.buyConfig.crypto.usdc.enable === true,
    usdcMajor: toMajorInput(
      item.buyConfig.crypto.usdc.rateInMinor,
      limits.usdcMinorScale,
    ),
    minParentTokensPerOrder:
      item.entityType === "asset"
        ? (item.buyConfig.minParentTokensPerOrder ?? 1)
        : undefined,
  };
}

function createRateSchema(params: {
  label: string;
  scale: number;
  maxMajor: number;
  maxMinor: number;
}) {
  const { label, scale, maxMajor, maxMinor } = params;

  return z
    .string()
    .trim()
    .min(1, `${label} is required.`)
    .superRefine((value, ctx) => {
      const parsed = parseMajorToMinor(value, scale);
      if (!parsed.ok) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: parsed.error,
        });
        return;
      }

      if (parsed.value > maxMinor) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `${label} cannot exceed ${maxMajor}.`,
        });
      }
    });
}

export function createItemSchema(limits: Limits, isAsset: boolean) {
  return z.object({
    enable: z.boolean(),
    fiatEnable: z.boolean(),
    usdEnable: z.boolean(),
    usdMajor: createRateSchema({
      label: "USD price",
      scale: limits.usdMinorScale,
      maxMajor: limits.maxUsdMajor,
      maxMinor: limits.maxUsdRateInMinor,
    }),
    cryptoEnable: z.boolean(),
    usdcEnable: z.boolean(),
    usdcMajor: createRateSchema({
      label: "USDC price",
      scale: limits.usdcMinorScale,
      maxMajor: limits.maxUsdcMajor,
      maxMinor: limits.maxUsdcRateInMinor,
    }),
    minParentTokensPerOrder: isAsset
      ? z
          .number({
            required_error: "Min parent tokens is required.",
            invalid_type_error: "Enter a whole number.",
          })
          .int("Enter a whole number.")
          .min(1, "Minimum is 1.")
          .max(
            limits.maxParentTokensPerOrder,
            `Maximum is ${limits.maxParentTokensPerOrder}.`,
          )
      : z.number().optional(),
  });
}

export function toUpdateBody(
  item: ManagedItem,
  values: BuyConfigFormValues,
  limits: Limits,
): BuyConfigUpdateBody {
  const usdMinorParsed = parseMajorToMinor(values.usdMajor, limits.usdMinorScale);
  const usdcMinorParsed = parseMajorToMinor(
    values.usdcMajor,
    limits.usdcMinorScale,
  );

  if (!usdMinorParsed.ok || !usdcMinorParsed.ok) {
    throw new Error("Validation failed.");
  }

  const body: BuyConfigUpdateBody = {
    enable: values.enable,
    fiat: {
      enable: values.fiatEnable,
      usd: {
        enable: values.usdEnable,
        rateInMinor: usdMinorParsed.value,
      },
    },
    crypto: {
      enable: values.cryptoEnable,
      usdc: {
        enable: values.usdcEnable,
        rateInMinor: usdcMinorParsed.value,
      },
    },
  };

  if (item.entityType === "asset") {
    body.minParentTokensPerOrder = values.minParentTokensPerOrder ?? 1;
  }

  return body;
}
