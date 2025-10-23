import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import RewardCurveTable from "@/components/commons/reward-curve-table";
import { assetSpecs, AssetType } from "@/utils/currency-assets/asset";
import { amount, unwrapString } from "@/utils/currency-assets/base";

type RewardType = "max" | "min";

type Reward = {
  id?: string;
  assetId: string;
  amount: number;
  rewardAmountCap: number;
  rewardType: RewardType;
};

type DraftReward = {
  assetId: string;
  amount: string; // BASE (string for UI-step safety)
  rewardAmountCap: string; // BASE (string for UI-step safety)
  rewardType: RewardType;
};

type Props = {
  index: number; // -1 = add mode
  assetOptions: { label: string; value: string }[];
  totalLevels: number;
  onClose: () => void;
  rewards: Reward[];
  append: (reward: Omit<Reward, "id">) => void;
  update: (index: number, reward: Omit<Reward, "id">) => void;
};

/* -----------------------------------------------------------------------------------------------
 * Core helpers (shared)
 * ---------------------------------------------------------------------------------------------*/
function toParentAmount(assetId: AssetType, baseVal: string | number): string {
  return unwrapString(
    amount({
      op: "toParent",
      assetId,
      value: String(baseVal ?? "0"),
      output: "string",
      trim: true,
      group: false,
    }),
    "0"
  );
}

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

/** Clamp input to ≤9 integer digits and ≤min(5, asset.decimal) fraction digits */
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

/* -----------------------------------------------------------------------------------------------
 * Reusable hook: parent-facing input with clamping, BASE storage up-stream
 * ---------------------------------------------------------------------------------------------*/
function useClampedParentInput(params: {
  assetId: AssetType;
  baseValue: string | number | ""; // upstream BASE
  onBaseChange: (nextBase: string) => void; // set upstream BASE
}) {
  const { assetId, baseValue, onBaseChange } = params;

  const [text, setText] = useState<string>(() =>
    Number(baseValue || 0) > 0 ? baseToParent(assetId, baseValue) : ""
  );
  const [uiErr, setUiErr] = useState<string>("");

  useEffect(() => {
    const baseNum = Number(baseValue || 0);
    const pretty = baseNum > 0 ? baseToParent(assetId, baseNum) : "";
    const clamped = clampParentInput(assetId, pretty);
    setText(clamped.text);
    setUiErr(clamped.err);
  }, [assetId, baseValue]);

  const onChange = (raw: string) => {
    const clamped = clampParentInput(assetId, raw);
    setText(clamped.text);
    setUiErr(clamped.err);

    const base = parentToBaseNumber(assetId, clamped.text);
    if (Number.isFinite(base)) {
      onBaseChange(String(base)); // store BASE upstream
    }
  };

  const onBlur = () => {
    const s = (text ?? "").trim();
    if (s === "") {
      setText("");
      setUiErr("");
      onBaseChange(""); // empty
      return;
    }
    const clamped = clampParentInput(assetId, s);
    const base = parentToBaseNumber(assetId, clamped.text);

    if (Number.isFinite(base) && base > 0) {
      const pretty = baseToParent(assetId, base); // trimmed zeros
      const final = clampParentInput(assetId, pretty);
      setText(final.text);
      setUiErr("");
      onBaseChange(String(base));
    } else {
      const currentBaseNum = Number(baseValue || 0);
      const pretty =
        currentBaseNum > 0 ? baseToParent(assetId, currentBaseNum) : "";
      const final = clampParentInput(assetId, pretty);
      setText(final.text);
      setUiErr(final.err);
    }
  };

  const placeholder =
    assetSpecs[assetId]?.decimal > 0
      ? `e.g. 100.${"0".repeat(
          Math.min(1, Math.min(assetSpecs[assetId].decimal, 5))
        )}`
      : "e.g. 100";

  const hint =
    uiErr ||
    (() => {
      const { maxInt, maxFrac } = limitsHint(assetId);
      return `Up to ${maxInt} int / ${maxFrac} decimals`;
    })();

  return {
    value: text,
    uiErr,
    placeholder,
    hint,
    onChange,
    onBlur,
  };
}

/* -----------------------------------------------------------------------------------------------
 * Component
 * ---------------------------------------------------------------------------------------------*/
export default function RewardDetailPanel({
  index,
  assetOptions,
  totalLevels,
  onClose,
  rewards,
  append,
  update,
}: Props) {
  const isAddMode = index === -1;

  const takenAssets = rewards.map((r) => r.assetId);

  const availableAssetOptions = useMemo(() => {
    return assetOptions.filter(
      (a) =>
        !takenAssets.includes(a.value) ||
        (!isAddMode && rewards[index]?.assetId === a.value)
    );
  }, [assetOptions, takenAssets, isAddMode, index, rewards]);

  const [draft, setDraft] = useState<DraftReward>({
    assetId: isAddMode
      ? availableAssetOptions[0]?.value ?? ""
      : rewards[index]?.assetId ?? assetOptions[0].value,
    amount: !isAddMode ? String(rewards[index]?.amount ?? "") : "",
    rewardAmountCap: !isAddMode
      ? String(rewards[index]?.rewardAmountCap ?? "")
      : "",
    rewardType: !isAddMode ? rewards[index]?.rewardType ?? "max" : "max",
  });

  // Controllers (no cross-field clamping here—just store what the user types)
  const amountField = useClampedParentInput({
    assetId: draft.assetId as AssetType,
    baseValue: draft.amount,
    onBaseChange: (nextBase) => setDraft((d) => ({ ...d, amount: nextBase })),
  });

  const capField = useClampedParentInput({
    assetId: draft.assetId as AssetType,
    baseValue: draft.rewardAmountCap,
    onBaseChange: (nextBase) =>
      setDraft((d) => ({ ...d, rewardAmountCap: nextBase })),
  });

  // Cross-field validation (no mutation)
  const amountNum = Number(draft.amount || 0);
  const capNum = Number(draft.rewardAmountCap || 0);
  const crossInvalid = capNum > 0 && amountNum > capNum;

  const handleAdd = () => {
    if (
      !draft.assetId ||
      !draft.amount ||
      !draft.rewardAmountCap ||
      crossInvalid
    )
      return;
    append({
      assetId: draft.assetId,
      amount: Number(draft.amount),
      rewardAmountCap: Number(draft.rewardAmountCap),
      rewardType: draft.rewardType,
    });
    onClose();
  };

  const handleSave = () => {
    if (
      !draft.assetId ||
      !draft.amount ||
      !draft.rewardAmountCap ||
      crossInvalid
    )
      return;
    update(index, {
      assetId: draft.assetId,
      amount: Number(draft.amount),
      rewardAmountCap: Number(draft.rewardAmountCap),
      rewardType: draft.rewardType,
    });
    onClose();
  };

  return (
    <div className="p-4 h-full bg-zinc-900 rounded-none md:rounded-l-lg flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">
          {isAddMode ? "Add Reward" : `Edit Reward #${index + 1}`}
        </h2>
        <Button variant="ghost" size="sm" onClick={onClose}>
          Close
        </Button>
      </div>

      {/* Asset */}
      <select
        value={draft.assetId}
        onChange={(e) => setDraft((d) => ({ ...d, assetId: e.target.value }))}
        className="w-full rounded-md bg-zinc-800 p-2"
      >
        {availableAssetOptions.map((a) => (
          <option key={a.value} value={a.value}>
            {assetSpecs[a.value as AssetType]?.parent ?? a.value}
          </option>
        ))}
      </select>

      {/* Amount (PARENT-facing; stores BASE in draft.amount) */}
      <div>
        <Input
          type="text"
          inputMode="decimal"
          className="placeholder:text-xs"
          value={amountField.value}
          placeholder={amountField.placeholder}
          onChange={(e) => amountField.onChange(e.target.value)}
          onBlur={amountField.onBlur}
        />
        <div className="mt-1 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {amountField.value ? (
              <>
                ≈{" "}
                {toParentAmount(draft.assetId as AssetType, draft.amount || 0)}{" "}
                {assetSpecs[draft.assetId as AssetType]?.parent}
              </>
            ) : (
              "\u00A0"
            )}
          </p>
          <p
            className={`text-xs ${
              amountField.uiErr ? "text-red-400" : "text-muted-foreground"
            }`}
          >
            {amountField.hint}
          </p>
        </div>
      </div>

      {/* Reward Cap (PARENT-facing; stores BASE in draft.rewardAmountCap) */}
      <div>
        <Input
          type="text"
          inputMode="decimal"
          className="placeholder:text-xs"
          value={capField.value}
          placeholder={capField.placeholder
            .replace("100.", "1000.")
            .replace("100", "1000")}
          onChange={(e) => capField.onChange(e.target.value)}
          onBlur={capField.onBlur}
        />
        <div className="mt-1 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {capField.value ? (
              <>
                ≈{" "}
                {toParentAmount(
                  draft.assetId as AssetType,
                  draft.rewardAmountCap || 0
                )}{" "}
                {assetSpecs[draft.assetId as AssetType]?.parent}
              </>
            ) : (
              "\u00A0"
            )}
          </p>
          <p
            className={`text-xs ${
              capField.uiErr ? "text-red-400" : "text-muted-foreground"
            }`}
          >
            {capField.hint}
          </p>
        </div>
      </div>

      {/* Cross-field error (Amount must not exceed Cap) */}
      {crossInvalid && (
        <p className="text-sm text-red-400">
          Amount per user cannot exceed the Reward cap.
        </p>
      )}

      {/* Type */}
      <select
        value={draft.rewardType}
        onChange={(e) =>
          setDraft((d) => ({ ...d, rewardType: e.target.value as RewardType }))
        }
        className="w-full rounded-md bg-zinc-800 p-2"
      >
        <option value="max">Max</option>
        <option value="min">Min</option>
      </select>

      {/* Preview */}
      <RewardCurveTable
        perUserReward={Number(
          toParentAmount(draft.assetId as AssetType, draft.amount || 0)
        )}
        rewardAmountCap={Number(
          toParentAmount(draft.assetId as AssetType, draft.rewardAmountCap || 0)
        )}
        rewardType={draft.rewardType}
        totalLevels={totalLevels}
        label="Preview"
      />

      {isAddMode ? (
        <Button
          type="button"
          onClick={handleAdd}
          disabled={
            !draft.assetId ||
            !draft.amount ||
            !draft.rewardAmountCap ||
            crossInvalid ||
            availableAssetOptions.length === 0
          }
        >
          Add Reward
        </Button>
      ) : (
        <Button
          type="button"
          onClick={handleSave}
          disabled={
            !draft.assetId ||
            !draft.amount ||
            !draft.rewardAmountCap ||
            crossInvalid
          }
        >
          Save Changes
        </Button>
      )}
    </div>
  );
}
