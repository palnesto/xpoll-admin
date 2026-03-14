import type { FieldArrayWithId, UseFormReturn } from "react-hook-form";
import { Controller } from "react-hook-form";
import { Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { coinAssets, assetSpecs, type AssetType } from "@/utils/currency-assets/asset";
import type { InkdAgentCreateFormValues } from "@/schema/inkd-agent-create.schema";

const INPUT_CLASS =
  "border-[#DDE2E5] focus:border-[#E8EAED] focus:ring-1 focus:ring-[#E8EAED] focus-visible:outline-none text-[#111] placeholder:text-[#9a9aab]";

type RewardItem = {
  assetId: string;
  amount: string;
  rewardAmountCap: string;
  rewardType: "min" | "max";
};

type Props = {
  form: UseFormReturn<InkdAgentCreateFormValues>;
  rewardFields: FieldArrayWithId<InkdAgentCreateFormValues, "rewards", "id">[];
  appendReward: (value: RewardItem) => void;
  removeReward: (index: number) => void;
};

export function RewardDistributionStep({
  form,
  rewardFields,
  appendReward,
  removeReward,
}: Props) {
  const { control, watch, formState: { errors } } = form;

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-[#5E6366]">Trail Rewards</div>
        <button
          type="button"
          onClick={() =>
            appendReward({
              assetId: coinAssets[0],
              amount: "",
              rewardAmountCap: "",
              rewardType: "max",
            })
          }
          className="rounded-full bg-[#E4F2DF] px-3 py-1 text-sm font-medium text-[#315326] hover:bg-[#d4e8cf]"
        >
          + Add Reward
        </button>
      </div>

      <div className="space-y-4">
        {rewardFields.length ? (
          rewardFields.map((field, index) => {
            const assetId = watch(`rewards.${index}.assetId`) as AssetType;
            const spec = assetId && assetSpecs[assetId as AssetType];

            return (
              <div
                key={field.id}
                className="rounded-lg border border-black/20 bg-white px-3 py-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {spec?.img ? (
                      <img src={spec.img} alt="" className="h-5 w-5" />
                    ) : (
                      <div className="h-5 w-5 rounded-full bg-gray-200" />
                    )}
                    <select
                      className={cn(
                        "rounded border bg-white px-2 py-1 text-sm font-medium text-[#2B2B2B]",
                        INPUT_CLASS,
                      )}
                      {...form.register(`rewards.${index}.assetId` as const)}
                    >
                      {coinAssets.map((a) => (
                        <option key={a} value={a}>
                          {assetSpecs[a].parent}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => removeReward(index)}
                      disabled={rewardFields.length <= 1}
                      className="rounded p-2 text-red-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                      aria-label="Delete reward"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-4 text-[12px] text-[#5E6366]">
                  <div className="flex items-baseline gap-2">
                    <Input
                      type="text"
                      inputMode="numeric"
                      placeholder="0"
                      className={cn(
                        "h-8 w-20 border-0 border-b border-[#DDE2E5] bg-transparent p-0 text-xl font-medium text-[#111] tabular-nums shadow-none focus-visible:ring-0",
                        INPUT_CLASS,
                      )}
                      {...form.register(
                        `rewards.${index}.amount` as const,
                      )}
                    />
                    <span className="text-[#7A7A7A]">Amount Per Person</span>
                  </div>

                  <div className="h-7 w-px bg-black/20" />

                  <div className="flex items-baseline gap-2">
                    <Input
                      type="text"
                      inputMode="numeric"
                      placeholder="0"
                      className={cn(
                        "h-8 w-20 border-0 border-b border-[#DDE2E5] bg-transparent p-0 text-xl font-semibold text-[#111] tabular-nums shadow-none focus-visible:ring-0",
                        INPUT_CLASS,
                      )}
                      {...form.register(
                        `rewards.${index}.rewardAmountCap` as const,
                      )}
                    />
                    <span className="text-[#7A7A7A]">Reward Amount Cap</span>
                  </div>

                  <div className="h-6 w-px bg-black/20" />

                  <Controller
                    control={control}
                    name={`rewards.${index}.rewardType` as const}
                    render={({ field }) => (
                      <div className="flex items-baseline gap-2">
                        <span className="text-xl font-semibold text-[#111]">
                          {field.value === "max" ? "Max" : "Min"}
                        </span>
                        <span className="text-[#7A7A7A]">Reward Type</span>
                        <div className="ml-2 flex gap-1">
                          <button
                            type="button"
                            onClick={() => field.onChange("max")}
                            className={cn(
                              "rounded px-2 py-0.5 text-xs font-medium",
                              field.value === "max"
                                ? "bg-[#1d1d22] text-white"
                                : "bg-[#f3f3f6] text-[#5d5d66] hover:bg-[#e8e8ec]",
                            )}
                          >
                            Max
                          </button>
                          <button
                            type="button"
                            onClick={() => field.onChange("min")}
                            className={cn(
                              "rounded px-2 py-0.5 text-xs font-medium",
                              field.value === "min"
                                ? "bg-[#1d1d22] text-white"
                                : "bg-[#f3f3f6] text-[#5d5d66] hover:bg-[#e8e8ec]",
                            )}
                          >
                            Min
                          </button>
                        </div>
                      </div>
                    )}
                  />
                </div>

                {errors.rewards?.[index] && (
                  <p className="mt-1 text-xs text-red-600">
                    {(errors.rewards[index] as { amount?: { message?: string }; rewardAmountCap?: { message?: string } })?.amount?.message ??
                      (errors.rewards[index] as { rewardAmountCap?: { message?: string } })?.rewardAmountCap?.message ??
                      "Fix errors above"}
                  </p>
                )}
              </div>
            );
          })
        ) : (
          <p className="text-xs text-[#8A8A8A]">No rewards yet</p>
        )}
      </div>

      {typeof (errors.rewards as { message?: string })?.message === "string" && (
        <p className="mt-2 text-xs text-red-600">
          {(errors.rewards as { message: string }).message}
        </p>
      )}
    </section>
  );
}
