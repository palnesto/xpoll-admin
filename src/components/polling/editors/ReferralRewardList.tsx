import { endpoints } from "@/api/endpoints";
import { RewardsAccordion } from "@/components/reward-table/rewards-accordion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useApiQuery } from "@/hooks/useApiQuery";
import { assetSpecs, AssetType } from "@/utils/currency-assets/asset";
import { amount, unwrapString } from "@/utils/currency-assets/base";
import { Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { useLocation } from "react-router";

type Reward = {
  id?: string;
  assetId: string;
  amount: number; // BASE units only
};

type Props = {
  fields: Reward[];
  assetOptions: { label: string; value: string }[];
  onEdit: (idx: number) => void;
  onAdd: () => void;
  remove: (index: number) => void;
  allAssets: string[];
  showDistribution?: boolean;
  hideEditButton?: boolean;
  hideDeleteButton?: boolean;
};

/* BASE → Parent */
function toParentAmount(
  assetId: AssetType,
  baseVal: string | number,
  fixed = 11,
): string {
  return unwrapString(
    amount({
      op: "toParent",
      assetId,
      value: String(baseVal ?? "0"),
      output: "string",
      trim: true,
      fixed,
      group: false,
    }),
    "0",
  );
}

export default function ReferralRewardList({
  fields,
  assetOptions,
  onEdit,
  onAdd,
  remove,
  allAssets,
  showDistribution = false,
  hideEditButton = false,
  hideDeleteButton = false,
}: Props) {
  const takenAssets = fields.map((f) => f.assetId);
  const canAdd = takenAssets.length < allAssets.length;
  const location = useLocation() || {};
  const isNavigationEditing = location?.state?.isNavigationEditing;

  const { data } = useApiQuery(endpoints.adminMe);
  const highestLevel = data?.data?.data?.highestLevel;

  const [isEditing, setIsEditing] = useState(isNavigationEditing ?? false);

  return (
    <>
      <div className="space-y-3">
        {isEditing ? (
          <div className="flex justify-between items-center">
            <label className="text-sm font-medium">
              Rewards ({fields.length})
            </label>
            <Button type="button" size="sm" onClick={onAdd} disabled={!canAdd}>
              + Add Reward
            </Button>
          </div>
        ) : null}

        {/* Rewards List */}
        {fields.map((field, idx) => {
          const assetId = field.assetId as AssetType;
          const rawAmount = field.amount ?? 0; // base
          const amountParent = toParentAmount(assetId, rawAmount);

          return (
            <Card
              key={`${field.id}${idx}`}
              className="p-4 flex justify-between items-center bg-dark-sidebar border-zinc-800"
            >
              <div className="flex flex-col gap-5 text-start w-full">
                {/* Header Row */}
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-5 justify-between w-full">
                    <div className="flex gap-2 items-center">
                      <div className="aspect-square w-7">
                        <img
                          src={assetSpecs[assetId]?.img}
                          className="w-full h-full"
                        />
                      </div>
                      <p>{assetSpecs[assetId]?.parent}</p>
                    </div>

                    <div>
                      {!hideEditButton && (
                        <Button
                          type="button"
                          size="icon"
                          variant="outline"
                          onClick={() => onEdit(idx)}
                        >
                          <Pencil />
                        </Button>
                      )}

                      {!hideDeleteButton && (
                        <Button
                          type="button"
                          size="icon"
                          variant="outline"
                          onClick={() => fields.length && remove(idx)}
                          disabled={!fields.length}
                          className="cursor-pointer disabled:cursor-not-allowed"
                        >
                          <Trash2 className="text-red-600" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Stat Cards */}
                <div className="flex gap-3 justify-center">
                  <div className="flex flex-col gap-1 items-center w-full bg-sidebar py-4 rounded-xl">
                    <p className="text-2xl">{amountParent}</p>

                    {/* 🚀 SHOW CONVERTED VALUE (BASE UNITS) */}
                    <p className="text-xs text-white/50">
                      ≈ {rawAmount} base units
                    </p>

                    <p className="font-thin">Amount</p>
                  </div>
                </div>

                {showDistribution ? (
                  <RewardsAccordion
                    highestLevel={highestLevel ?? 1}
                    rewardType="max"
                    perUserReward={rawAmount}
                    rewardCap={0}
                    asset={assetId}
                    size="sm"
                  />
                ) : (
                  <p
                    className="text-white/50 text-start underline decoration-white/30 underline-offset-4 cursor-pointer hover:text-white hover:decoration-white transition-colors duration-150 text-sm"
                    onClick={() => onEdit(idx)}
                  >
                    {/* Reward Distribution Preview */}
                  </p>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </>
  );
}
