import { endpoints } from "@/api/endpoints";
import RewardCurveTable from "@/components/commons/reward-curve-table";
import { RewardsAccordion } from "@/components/reward-table/rewards-accordion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useApiQuery } from "@/hooks/useApiQuery";
import { assetSpecs } from "@/utils/asset";
import { AssetType } from "@/utils/currency-assets/asset";
import { amount, unwrapString } from "@/utils/currency-assets/base";
import { capitalize } from "lodash";
import { Pencil, Trash, Trash2 } from "lucide-react";
import { useState } from "react";
import { useLocation } from "react-router";

type Reward = {
  id?: string;
  assetId: string;
  amount: number;
  rewardAmountCap: number;
  rewardType: "max" | "min";
};

type Props = {
  fields: Reward[];
  assetOptions: { label: string; value: string }[];
  onEdit: (idx: number) => void;
  onAdd: () => void;
  remove: (index: number) => void;
  allAssets: string[];
  showDistribution?: boolean;
};
function toParentAmount(
  assetId: AssetType,
  baseVal: string | number,
  fixed = 11
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
    "0"
  );
}

export default function RewardsList({
  fields,
  assetOptions,
  onEdit,
  onAdd,
  remove,
  allAssets,
  showDistribution = false,
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
        ) : (
          <></>
        )}
        {/* List */}
        {fields.map((field, idx) => {
          const assetLabel =
            assetOptions.find((a) => a.value === field?.assetId)?.label ??
            field?.assetId;
          const assetId = field?.assetId ?? "xOcta";
          const rawAmount = field?.amount ?? 0;
          const rawRewardCap = field?.rewardAmountCap ?? 0;
          const amount = toParentAmount(assetId, rawAmount);
          const rewardAmountCap = toParentAmount(assetId, rawRewardCap);

          const rewardType = field?.rewardType ?? "max";
          return (
            <Card
              key={field.id || idx}
              className="p-4 flex justify-between items-center bg-dark-sidebar border-zinc-800"
            >
              {/* new */}
              <div className="flex flex-col gap-5 text-start w-full">
                <div className="flex justify-between items-center">
                  {/* left heading */}
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
                  </div>
                  {isEditing ? (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        type="button"
                        size="sm"
                        onClick={() => onEdit(idx)}
                      >
                        <Pencil />
                      </Button>
                      <Button
                        variant="ghost"
                        type="button"
                        size="sm"
                        onClick={() => remove(idx)}
                      >
                        <Trash className="text-red-500" />
                      </Button>
                    </div>
                  ) : (
                    <></>
                  )}
                </div>
                {/* cards */}
                <div className="flex gap-3 justify-center">
                  {[
                    { label: "Amount Per Person", value: amount },
                    {
                      label: "Reward Amount Cap",
                      value: rewardAmountCap,
                    },
                    {
                      label: "Reward Type",
                      value: capitalize(rewardType),
                    },
                  ]?.map((item) => {
                    return (
                      <div className="flex flex-col gap-2 items-center w-full bg-sidebar py-4 rounded-xl">
                        <p className="text-2xl">{item?.value}</p>
                        <p className="font-thin">{item?.label}</p>
                      </div>
                    );
                  })}
                </div>

                {showDistribution ? (
                  <>
                    {/* <RewardCurveTable
                      asset={assetId as AssetType}
                      perUserReward={Number(
                        toParentAmount(assetId as AssetType, rawAmount)
                      )}
                      rewardAmountCap={Number(
                        toParentAmount(assetId as AssetType, rawRewardCap)
                      )}
                      rewardType={"min"}
                      totalLevels={10}
                      label="Reward"
                    /> */}
                    {console.log("expected", {
                      highestLevel,
                      rewardType,
                      rawAmount,
                      assetId,
                    })}
                    <RewardsAccordion
                      highestLevel={highestLevel ?? 1}
                      rewardType={rewardType}
                      perUserReward={rawAmount}
                      // asset="xDrop" // or whichever AssetType
                      asset={assetId as AssetType}
                      size="sm"
                    />
                  </>
                ) : (
                  <p
                    className="underline decoration-white/50 text-white/50 text-start underline-offset-4 cursor-pointer hover:decoration-white hover:text-white transition-colors duration-150"
                    onClick={() => {
                      onEdit(idx);
                    }}
                  >
                    Reward Distribution Preview
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
