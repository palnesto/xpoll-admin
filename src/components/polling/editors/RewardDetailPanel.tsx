import { useState, useMemo } from "react";
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
  amount: string;
  rewardAmountCap: string;
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

  // All taken assets
  const takenAssets = rewards.map((r) => r.assetId);

  // Only show unused assets OR the one we're currently editing
  const availableAssetOptions = useMemo(() => {
    return assetOptions.filter(
      (a) =>
        !takenAssets.includes(a.value) ||
        (!isAddMode && rewards[index]?.assetId === a.value)
    );
  }, [assetOptions, takenAssets, isAddMode, index, rewards]);

  // Initial draft
  const [draft, setDraft] = useState<DraftReward>({
    assetId: isAddMode
      ? availableAssetOptions[0]?.value ?? "" // first available asset in Add mode
      : rewards[index]?.assetId ?? assetOptions[0].value,
    amount: !isAddMode ? rewards[index]?.amount.toString() ?? "" : "",
    rewardAmountCap: !isAddMode
      ? rewards[index]?.rewardAmountCap.toString() ?? ""
      : "",
    rewardType: !isAddMode ? rewards[index]?.rewardType ?? "max" : "max",
  });

  const handleAdd = () => {
    if (!draft.assetId || !draft.amount || !draft.rewardAmountCap) return;
    append({
      assetId: draft.assetId,
      amount: Number(draft.amount),
      rewardAmountCap: Number(draft.rewardAmountCap),
      rewardType: draft.rewardType,
    });
    onClose();
  };

  const handleSave = () => {
    if (!draft.assetId || !draft.amount || !draft.rewardAmountCap) return;
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

      {/* Amount */}
      <div>
        <Input
          type="number"
          min={1}
          value={draft.amount}
          onChange={(e) => setDraft((d) => ({ ...d, amount: e.target.value }))}
          placeholder="Amount per user"
        />
        {draft.amount && (
          <p className="text-xs text-muted-foreground mt-1">
            ≈ {toParentAmount(draft.assetId as AssetType, draft.amount)}{" "}
            {assetSpecs[draft.assetId as AssetType]?.parent}
          </p>
        )}
      </div>

      {/* Cap */}
      <div>
        <Input
          type="number"
          min={1}
          value={draft.rewardAmountCap}
          onChange={(e) =>
            setDraft((d) => ({ ...d, rewardAmountCap: e.target.value }))
          }
          placeholder="Reward cap"
        />
        {draft.rewardAmountCap && (
          <p className="text-xs text-muted-foreground mt-1">
            ≈{" "}
            {toParentAmount(draft.assetId as AssetType, draft.rewardAmountCap)}{" "}
            {assetSpecs[draft.assetId as AssetType]?.parent}
          </p>
        )}
      </div>

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
            availableAssetOptions.length === 0
          }
        >
          Add Reward
        </Button>
      ) : (
        <Button
          type="button"
          onClick={handleSave}
          disabled={!draft.assetId || !draft.amount || !draft.rewardAmountCap}
        >
          Save Changes
        </Button>
      )}
    </div>
  );
}
