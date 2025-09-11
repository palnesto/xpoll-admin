import {
  useFieldArray,
  type Control,
  useWatch,
  Controller,
} from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import RewardCurveTable from "@/components/commons/reward-curve-table";

export type AssetOption = { label: string; value: string };

type Props = {
  control: Control<any>;
  name: string; // e.g. "rewards" or "trial.rewards"
  assetOptions: AssetOption[];
  includeRewardType?: boolean; // default true
  showCurvePreview?: boolean; // default false
  totalLevelsForPreview?: number; // default 10
  label?: string;
};

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
  function available(current?: string) {
    return assetOptions.filter(
      (opt) => opt.value === current || !usedAssetIds.has(opt.value)
    );
  }

  const canAdd =
    rewardsArray.fields.length < assetOptions.length &&
    assetOptions.some((o) => !usedAssetIds.has(o.value));

  function addRow() {
    const current = (rewards ?? []) as any[];
    const used = new Set(current.map((r) => r?.assetId));
    const next = assetOptions.find((o) => !used.has(o.value));
    if (!next) return;
    rewardsArray.append({
      assetId: next.value,
      amount: 1,
      rewardAmountCap: 1,
      ...(includeRewardType ? { rewardType: "max" } : {}),
    });
  }

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>

      {rewardsArray.fields.map((f, idx) => {
        const currentAsset = rewards?.[idx]?.assetId;
        const options = available(currentAsset);
        const amount = Number(rewards?.[idx]?.amount ?? 0);
        const cap = Number(rewards?.[idx]?.rewardAmountCap ?? 0);
        const rtype = (rewards?.[idx]?.rewardType ?? "max") as "max" | "min";

        return (
          <div key={f.id} className="grid grid-cols-12 gap-2 items-end">
            {/* Asset */}
            <div className="col-span-3">
              <label className="text-xs">Asset</label>
              <Controller
                control={control}
                name={`${name}.${idx}.assetId`}
                render={({ field, fieldState }) => (
                  <>
                    <select
                      className="w-full h-9 border rounded-md px-2 bg-transparent"
                      {...field}
                    >
                      {options.map((o) => (
                        <option
                          key={o.value}
                          value={o.value}
                          className="bg-gray-900"
                        >
                          {o.label}
                        </option>
                      ))}
                    </select>
                    {fieldState.error?.message && (
                      <p className="mt-1 text-sm text-destructive">
                        {fieldState.error.message}
                      </p>
                    )}
                  </>
                )}
              />
            </div>

            {/* Amount */}
            <div className="col-span-3">
              <label className="text-xs">Amount / person</label>
              <Controller
                control={control}
                name={`${name}.${idx}.amount`}
                render={({ field, fieldState }) => (
                  <>
                    <Input
                      type="number"
                      min={1}
                      step={1}
                      value={field.value ?? ""}
                      onChange={(e) =>
                        field.onChange(
                          e.target.value === "" ? "" : Number(e.target.value)
                        )
                      }
                    />
                    {fieldState.error?.message && (
                      <p className="mt-1 text-sm text-destructive">
                        {fieldState.error.message}
                      </p>
                    )}
                  </>
                )}
              />
            </div>

            {/* Reward Cap */}
            <div className="col-span-3">
              <label className="text-xs">Reward Amount Cap</label>
              <Controller
                control={control}
                name={`${name}.${idx}.rewardAmountCap`}
                render={({ field, fieldState }) => (
                  <>
                    <Input
                      type="number"
                      min={1}
                      step={1}
                      value={field.value ?? ""}
                      onChange={(e) =>
                        field.onChange(
                          e.target.value === "" ? "" : Number(e.target.value)
                        )
                      }
                    />
                    {fieldState.error?.message && (
                      <p className="mt-1 text-sm text-destructive">
                        {fieldState.error.message}
                      </p>
                    )}
                  </>
                )}
              />
            </div>

            {/* Reward Type */}
            {includeRewardType && (
              <div className="col-span-2">
                <label className="text-xs">Reward Type</label>
                <Controller
                  control={control}
                  name={`${name}.${idx}.rewardType`}
                  render={({ field, fieldState }) => (
                    <>
                      <select
                        className="w-full h-9 border rounded-md px-2 bg-transparent"
                        {...field}
                      >
                        <option value="max" className="bg-gray-900">
                          Max
                        </option>
                        <option value="min" className="bg-gray-900">
                          Min
                        </option>
                      </select>
                      {fieldState.error?.message && (
                        <p className="mt-1 text-sm text-destructive">
                          {fieldState.error.message}
                        </p>
                      )}
                    </>
                  )}
                />
              </div>
            )}

            {/* Remove */}
            <div className="col-span-1 flex justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => rewardsArray.remove(idx)}
                disabled={rewardsArray.fields.length <= 1}
              >
                Remove
              </Button>
            </div>

            {/* Curve Preview */}
            {showCurvePreview && amount > 0 && (
              <div className="col-span-12">
                <RewardCurveTable
                  perUserReward={amount}
                  rewardType={(includeRewardType ? rtype : "max") as any}
                  totalLevels={totalLevelsForPreview}
                  rewardAmountCap={cap}
                  label={currentAsset}
                />
              </div>
            )}
          </div>
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
