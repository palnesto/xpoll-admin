import dayjs from "dayjs";
import { amount, unwrapString } from "@/utils/currency-assets/base";
import { assetSpecs, type AssetType } from "@/utils/currency-assets/asset";

/** iso <-> Date helpers kept if you need them elsewhere */
export function isoToDate(iso?: string | null): Date | undefined {
  if (!iso) return undefined;
  const d = new Date(iso);
  return isNaN(d.getTime()) ? undefined : d;
}
export function dateToLocalIso(d?: Date): string | "" {
  if (!d || isNaN(d.getTime())) return "";
  return dayjs(d).format("YYYY-MM-DDTHH:mm:ss");
}

/** BASE → PARENT (trimmed unless fixed provided) */
export function baseToParent(
  assetId: AssetType,
  baseVal: string | number,
  fixed?: number
) {
  const useFixed = typeof fixed === "number";
  return unwrapString(
    amount({
      op: "toParent",
      assetId,
      value: String(baseVal),
      output: "string",
      trim: useFixed ? false : true,
      fixed: useFixed ? Math.max(0, fixed) : undefined,
      group: false,
    }),
    "0"
  );
}

/** BASE → PARENT (grouped, for badges/labels) */
export function baseToParentGrouped(
  assetId: AssetType,
  baseVal: string | number,
  fixed?: number
) {
  const useFixed = typeof fixed === "number";
  return unwrapString(
    amount({
      op: "toParent",
      assetId,
      value: String(baseVal),
      output: "string",
      trim: useFixed ? false : true,
      fixed: useFixed ? Math.max(0, fixed) : undefined,
      // group: true,
    }),
    "0"
  );
}

/** PARENT string → BASE number (unsafe allowed for UI) */
export function parentToBaseNumber(assetId: AssetType, parentStr: string) {
  const n = amount({
    op: "toBase",
    assetId,
    value: parentStr,
    output: "number",
    allowUnsafeNumber: true,
  });
  return n.ok ? n.value : NaN;
}

/** Clamp input to 9 int + up to min(5, asset.decimal) frac */
export function clampParentInput(
  assetId: AssetType,
  raw: string
): { text: string; err: string } {
  const decimalsAllowed = Math.min(assetSpecs[assetId].decimal, 5);
  const MAX_INT = 9;

  const s = (raw ?? "").replace(/[^\d.]/g, "");
  if (s === "") return { text: "", err: "" };

  const parts = s.split(".");
  const iRaw = parts[0] ?? "";
  const fRawCombined = parts.slice(1).join("");
  const hasDotInRaw = s.includes(".");
  const trailingDot = hasDotInRaw && raw[raw.length - 1] === ".";

  let i = iRaw;
  let uiErr = "";
  if (i.length > MAX_INT) {
    i = i.slice(0, MAX_INT);
    uiErr = `Max ${MAX_INT} integer digits`;
  }

  let f = fRawCombined;
  if (decimalsAllowed === 0) {
    f = "";
  } else if (f.length > decimalsAllowed) {
    f = f.slice(0, decimalsAllowed);
    uiErr = uiErr
      ? `${uiErr}; max ${decimalsAllowed} decimal places`
      : `Max ${decimalsAllowed} decimal places`;
  }

  if (i === "" && (hasDotInRaw || trailingDot)) i = "0";

  let display = i;
  if (decimalsAllowed > 0) {
    if (trailingDot && f.length === 0) display = `${i}.`;
    else if (f.length > 0) display = `${i}.${f}`;
  }

  return { text: display, err: uiErr };
}

export function limitsHint(assetId: AssetType) {
  const maxInt = 9;
  const maxFrac = Math.min(assetSpecs[assetId].decimal, 5);
  const minStep = maxFrac === 0 ? "1" : `0.${"0".repeat(maxFrac - 1)}1`;
  return { maxInt, maxFrac, minStep };
}
