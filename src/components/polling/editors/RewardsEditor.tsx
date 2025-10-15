import {
  useFieldArray,
  type Control,
  useWatch,
  useController,
} from "react-hook-form";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import RewardCurveTable from "@/components/commons/reward-curve-table";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

import { assetSpecs, type AssetType } from "@/utils/currency-assets/asset";
import { amount, unwrapString } from "@/utils/currency-assets/base";

export type AssetOption = { label: string; value: AssetType };

type Props = {
  control: Control<any>;
  name: string;
  assetOptions: AssetOption[];
  includeRewardType?: boolean;
  showCurvePreview?: boolean;
  totalLevelsForPreview?: number;
  label?: string;
};

/* ---------------- helpers: base/parent + clamping (no balance checks) ---------------- */
function baseToParent(
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

function parentToBaseNumber(assetId: AssetType, parentStr: string) {
  const n = amount({
    op: "toBase",
    assetId,
    value: parentStr,
    output: "number",
    allowUnsafeNumber: true,
  });
  return n.ok ? n.value : NaN;
}

/** Clamp to max 9 integer digits & max(min(5, asset.decimal)) fractional digits */
function clampParentInput(
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

function limitsHint(assetId: AssetType): {
  maxInt: number;
  maxFrac: number;
  minStep: string;
} {
  const maxInt = 9;
  const maxFrac = Math.min(assetSpecs[assetId].decimal, 5);
  const minStep = maxFrac === 0 ? "1" : `0.${"0".repeat(maxFrac - 1)}1`;
  return { maxInt, maxFrac, minStep };
}

/* ------------------------------------------------------------------------------------ */

export default function RewardsEditor({
  control,
  name,
  assetOptions,
  includeRewardType = true,
  showCurvePreview = false,
  totalLevelsForPreview = 10,
  label = "Rewards",
}: Props) {
  const rewardsArray = useFieldArray({ control, name });
  const rewards = useWatch({ control, name }) as any[] | undefined;

  const usedAssetIds = new Set((rewards ?? []).map((r) => r?.assetId));
  const available = (current?: AssetType) =>
    assetOptions.filter(
      (opt) => opt.value === current || !usedAssetIds.has(opt.value)
    );

  const canAdd =
    rewardsArray.fields.length < assetOptions.length &&
    assetOptions.some((o) => !usedAssetIds.has(o.value));

  function addRow() {
    const current = (rewards ?? []) as any[];
    const used = new Set(current.map((r) => r?.assetId));
    const next = assetOptions.find((o) => !used.has(o.value));
    if (!next) return;
    // Store strings now (parent units)
    rewardsArray.append({
      assetId: next.value,
      amount: "", // string in parent units
      rewardAmountCap: "", // string in parent units
      ...(includeRewardType ? { rewardType: "max" } : {}),
    });
  }

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>

      {rewardsArray.fields.map((f, idx) => {
        const currentAsset = (rewards?.[idx]?.assetId ??
          assetOptions[0]?.value) as AssetType;
        return (
          <RewardRow
            key={f.id}
            idx={idx}
            control={control}
            name={name}
            asset={currentAsset}
            options={available(currentAsset)}
            includeRewardType={includeRewardType}
            showCurvePreview={showCurvePreview}
            totalLevelsForPreview={totalLevelsForPreview}
            onRemove={() => rewardsArray.remove(idx)}
            canRemove={rewardsArray.fields.length > 1}
          />
        );
      })}

      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="secondary"
          onClick={addRow}
          disabled={!canAdd}
        >
          Add Reward
        </Button>
      </div>
    </div>
  );
}

/* ------------------------- Row component (stores strings) ------------------------- */
function RewardRow({
  idx,
  control,
  name,
  asset,
  options,
  includeRewardType,
  showCurvePreview,
  totalLevelsForPreview,
  onRemove,
  canRemove,
}: {
  idx: number;
  control: Control<any>;
  name: string;
  asset: AssetType;
  options: AssetOption[];
  includeRewardType: boolean;
  showCurvePreview: boolean;
  totalLevelsForPreview: number;
  onRemove: () => void;
  canRemove: boolean;
}) {
  const spec = assetSpecs[asset];

  // Controllers – these fields are STRINGS now (parent units)
  const capCtl = useController({
    control,
    name: `${name}.${idx}.rewardAmountCap`,
  });
  const amtCtl = useController({ control, name: `${name}.${idx}.amount` });
  const rtypeCtl = useController({
    control,
    name: `${name}.${idx}.rewardType`,
  });
  const assetCtl = useController({ control, name: `${name}.${idx}.assetId` });

  // Local state mirrors the string values for tight control + UI errors
  const [capStr, setCapStr] = useState<string>("");
  const [amtStr, setAmtStr] = useState<string>("");
  const [capUiErr, setCapUiErr] = useState<string>("");
  const [amtUiErr, setAmtUiErr] = useState<string>("");

  const limits = limitsHint(asset);

  // Sync local strings when form values or asset change
  useEffect(() => {
    const capIn = String(capCtl.field.value ?? "");
    const amtIn = String(amtCtl.field.value ?? "");
    const capClamped = clampParentInput(asset, capIn);
    const amtClamped = clampParentInput(asset, amtIn);
    setCapStr(capClamped.text);
    setAmtStr(amtClamped.text);
    setCapUiErr("");
    setAmtUiErr("");
  }, [asset, capCtl.field.value, amtCtl.field.value]);

  // For curve preview only: convert current strings → BASE numbers
  const amountBaseNum = parentToBaseNumber(asset, amtStr || "0");
  const capBaseNum = parentToBaseNumber(asset, capStr || "0");

  return (
    <div className="space-y-2 rounded-xl border bg-card p-3 shadow-sm">
      <div className="grid grid-cols-12 gap-2 items-end">
        {/* Asset */}
        <div className="col-span-3">
          <label className="text-xs">Asset</label>
          <select
            className="w-full h-9 border rounded-md px-2 bg-transparent"
            value={assetCtl.field.value}
            onChange={(e) =>
              assetCtl.field.onChange(e.target.value as AssetType)
            }
          >
            {options.map((o) => (
              <option key={o.value} value={o.value} className="bg-gray-900">
                {o.label}
              </option>
            ))}
          </select>
        </div>

        {/* Amount / person (parent string) */}
        <div className="col-span-3">
          <label className="text-xs">Amount / person</label>
          <Input
            type="text"
            inputMode="decimal"
            value={amtStr}
            placeholder={spec.decimal > 0 ? "e.g. 1.0" : "e.g. 1"}
            onChange={(e) => {
              const cl = clampParentInput(asset, e.target.value);
              setAmtStr(cl.text);
              setAmtUiErr(cl.err);
              // Store STRING in form (parent units)
              amtCtl.field.onChange(cl.text);
            }}
            onBlur={(e) => {
              const cl = clampParentInput(asset, (e.target.value ?? "").trim());
              // Normalize by reformatting via base→parent where possible
              const base = parentToBaseNumber(asset, cl.text);
              if (Number.isFinite(base) && base > 0) {
                const pretty = baseToParent(asset, base);
                const final = clampParentInput(asset, pretty);
                setAmtStr(final.text);
                setAmtUiErr("");
                amtCtl.field.onChange(final.text); // keep STRING
              } else {
                // keep clamped string (may be empty)
                setAmtStr(cl.text);
                setAmtUiErr(cl.err);
                amtCtl.field.onChange(cl.text);
              }
            }}
          />
          {amtUiErr && (
            <p className="mt-1 text-xs text-destructive">{amtUiErr}</p>
          )}
        </div>

        {/* Reward Cap (parent string) */}
        <div className="col-span-3">
          <label className="text-xs">Reward Amount Cap</label>
          <p className="text-[10px] text-muted-foreground mt-1">
            Max {limits.maxInt} int • Max {limits.maxFrac} dec • Min step{" "}
            {limits.minStep} {spec.parentSymbol}
          </p>
          <Input
            type="text"
            inputMode="decimal"
            value={capStr}
            placeholder={spec.decimal > 0 ? "e.g. 100.0" : "e.g. 100"}
            onChange={(e) => {
              const cl = clampParentInput(asset, e.target.value);
              setCapStr(cl.text);
              setCapUiErr(cl.err);
              capCtl.field.onChange(cl.text); // Store STRING
            }}
            onBlur={(e) => {
              const cl = clampParentInput(asset, (e.target.value ?? "").trim());
              const base = parentToBaseNumber(asset, cl.text);
              if (Number.isFinite(base) && base > 0) {
                const pretty = baseToParent(asset, base);
                const final = clampParentInput(asset, pretty);
                setCapStr(final.text);
                setCapUiErr("");
                capCtl.field.onChange(final.text); // keep STRING
              } else {
                setCapStr(cl.text);
                setCapUiErr(cl.err);
                capCtl.field.onChange(cl.text);
              }
            }}
          />
          {capUiErr && (
            <p className="mt-1 text-xs text-destructive">{capUiErr}</p>
          )}

          {/* Simple client-side check to guide users; remove if schema handles it */}
          {Number.isFinite(amountBaseNum) &&
            Number.isFinite(capBaseNum) &&
            capBaseNum > 0 &&
            amountBaseNum > capBaseNum && (
              <p className="mt-1 text-xs text-destructive">
                Cap must be ≥ amount / person
              </p>
            )}
        </div>

        {/* Reward Type */}
        {includeRewardType && (
          <div className="col-span-2">
            <label className="text-xs">Reward Type</label>
            <RadioGroup
              value={rtypeCtl.field.value ?? "max"}
              onValueChange={rtypeCtl.field.onChange}
              className="flex gap-4"
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="max" id={`max-${idx}`} />
                <Label htmlFor={`max-${idx}`}>MAX</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="min" id={`min-${idx}`} />
                <Label htmlFor={`min-${idx}`}>MIN</Label>
              </div>
            </RadioGroup>
          </div>
        )}

        {/* Remove */}
        <div className="col-span-1 flex justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={onRemove}
            disabled={!canRemove}
          >
            Remove
          </Button>
        </div>

        {/* Curve Preview (convert strings → BASE number for preview math) */}
        {showCurvePreview && Number(amountBaseNum) > 0 && (
          <div className="col-span-12">
            <RewardCurveTable
              perUserReward={amountBaseNum}
              rewardType={
                (includeRewardType
                  ? rtypeCtl.field.value ?? "max"
                  : "max") as any
              }
              totalLevels={totalLevelsForPreview}
              rewardAmountCap={capBaseNum}
              label={asset}
            />
          </div>
        )}
      </div>
    </div>
  );
}
