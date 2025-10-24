import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { assetSpecs, AssetType } from "@/utils/currency-assets/asset";
import { amount, unwrapString } from "@/utils/currency-assets/base";
import { RewardsAccordion } from "@/components/reward-table/rewards-accordion";
import { useApiQuery } from "@/hooks/useApiQuery";
import { endpoints } from "@/api/endpoints";

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
  onClose,
  rewards,
  append,
  update,
}: Props) {
  const isAddMode = index === -1;
  const { data } = useApiQuery(endpoints.adminMe);
  const highestLevel = data?.data?.data?.highestLevel;

  const takenAssets = rewards.map((r) => r.assetId);

  const availableAssetOptions = useMemo(() => {
    return assetOptions.filter(
      (a) =>
        !takenAssets.includes(a.value) ||
        (!isAddMode && rewards[index]?.assetId === a.value)
    );
  }, [assetOptions, takenAssets, isAddMode, index, rewards]);

  // Helper to construct a fresh draft from props
  const makeDraft = (): DraftReward => {
    if (!isAddMode) {
      const curr = rewards[index];
      return {
        assetId: curr?.assetId ?? availableAssetOptions[0]?.value ?? "",
        amount: curr?.amount != null ? String(curr.amount) : "",
        rewardAmountCap:
          curr?.rewardAmountCap != null ? String(curr.rewardAmountCap) : "",
        rewardType: (curr?.rewardType as RewardType) ?? "max",
      };
    }
    // Add mode
    return {
      assetId: availableAssetOptions[0]?.value ?? "",
      amount: "",
      rewardAmountCap: "",
      rewardType: "max",
    };
  };

  const [draft, setDraft] = useState<DraftReward>(makeDraft);

  // 🔁 Re-sync draft whenever the selection / list / options change
  useEffect(() => {
    setDraft(makeDraft());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, rewards, availableAssetOptions.length]);

  // Controllers (no cross-field clamping here—just store what the user types)
  const amountField = useClampedParentInput({
    assetId: (draft.assetId ||
      availableAssetOptions[0]?.value ||
      "xOcta") as AssetType,
    baseValue: draft.amount,
    onBaseChange: (nextBase) => setDraft((d) => ({ ...d, amount: nextBase })),
  });

  const capField = useClampedParentInput({
    assetId: (draft.assetId ||
      availableAssetOptions[0]?.value ||
      "xOcta") as AssetType,
    baseValue: draft.rewardAmountCap,
    onBaseChange: (nextBase) =>
      setDraft((d) => ({ ...d, rewardAmountCap: nextBase })),
  });

  const amountNum = Number(draft.amount || 0);
  const capNum = Number(draft.rewardAmountCap || 0);
  const crossInvalid = capNum > 0 && amountNum > capNum;

  const noAssetSelectable =
    !draft.assetId && availableAssetOptions.length === 0;

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
        disabled={noAssetSelectable}
      >
        {availableAssetOptions.map((a) => (
          <option key={a.value} value={a.value}>
            {assetSpecs[a.value as AssetType]?.parent ?? a.value}
          </option>
        ))}
      </select>

      {/* Amount */}
      <div>
        <div className="flex flex-col gap-2 text-zinc-400">
          <p className="text-xs">Amount Per Person</p>
          <Input
            type="text"
            inputMode="decimal"
            className="placeholder:text-xs"
            value={amountField.value}
            placeholder={amountField.placeholder}
            onChange={(e) => amountField.onChange(e.target.value)}
            onBlur={amountField.onBlur}
            disabled={!draft.assetId}
          />
        </div>
        <div className="mt-1 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {amountField.value ? (
              <>
                ≈{" "}
                {toParentAmount(
                  (draft.assetId ||
                    availableAssetOptions[0]?.value) as AssetType,
                  draft.amount || 0
                )}{" "}
                {
                  assetSpecs[
                    (draft.assetId ||
                      availableAssetOptions[0]?.value) as AssetType
                  ]?.parent
                }
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

      {/* Cap */}
      <div>
        <div className="flex flex-col gap-2 text-zinc-400">
          <p className="text-xs">Reward Cap</p>
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
            disabled={!draft.assetId}
          />
        </div>
        <div className="mt-1 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {capField.value ? (
              <>
                ≈{" "}
                {toParentAmount(
                  (draft.assetId ||
                    availableAssetOptions[0]?.value) as AssetType,
                  draft.rewardAmountCap || 0
                )}{" "}
                {
                  assetSpecs[
                    (draft.assetId ||
                      availableAssetOptions[0]?.value) as AssetType
                  ]?.parent
                }
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

      {/* Cross-field error */}
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
        disabled={!draft.assetId}
      >
        <option value="max">Max</option>
        <option value="min">Min</option>
      </select>

      {/* Preview */}
      <RewardsAccordion
        highestLevel={highestLevel ?? 1}
        rewardType={draft.rewardType}
        perUserReward={draft.amount}
        rewardCap={draft.rewardAmountCap}
        asset={
          (draft.assetId ||
            availableAssetOptions[0]?.value ||
            "xOcta") as AssetType
        }
        size="sm"
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
