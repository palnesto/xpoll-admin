import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { assetSpecs } from "@/utils/asset";
import { capitalize } from "lodash";
import { Pencil, Trash } from "lucide-react";

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
};

export default function RewardsList({
  fields,
  assetOptions,
  onEdit,
  onAdd,
  remove,
  allAssets,
}: Props) {
  const takenAssets = fields.map((f) => f.assetId);
  const canAdd = takenAssets.length < allAssets.length;

  return (
    <>
      <div className="space-y-3">
        {/* Header */}
        <div className="flex justify-between items-center">
          <label className="text-sm font-medium">
            Rewards ({fields.length})
          </label>
          <Button type="button" size="sm" onClick={onAdd} disabled={!canAdd}>
            + Add Reward
          </Button>
        </div>

        {/* List */}
        {fields.map((field, idx) => {
          const assetLabel =
            assetOptions.find((a) => a.value === field?.assetId)?.label ??
            field?.assetId;
          const assetId = field?.assetId ?? "xOcta";
          const amount = field?.amount ?? 0;
          const rewardAmountCap = field?.rewardAmountCap ?? 0;
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
                  <div className="flex items-center gap-2">
                    <div className="aspect-square w-7">
                      <img
                        src={assetSpecs[assetId]?.img}
                        className="w-full h-full"
                      />
                    </div>
                    <p>{assetSpecs[assetId]?.parentSymbol}</p>
                  </div>
                  {/* right edit, trash button */}
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
                </div>
                {/* cards */}
                <div className="flex gap-3 justify-center">
                  {[
                    { label: capitalize("Amount Per Person"), value: amount },
                    {
                      label: capitalize("Reward Amount Cap"),
                      value: rewardAmountCap,
                    },
                    {
                      label: capitalize("Reward Type"),
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
                <p
                  className="underline decoration-white/50 text-white/50 text-start underline-offset-4 cursor-pointer hover:decoration-white hover:text-white transition-colors duration-150"
                  onClick={() => onEdit(idx)}
                >
                  Reward Distribution Preview
                </p>
              </div>
            </Card>
          );
        })}
      </div>
    </>
  );
}
