import type { FieldArrayWithId, UseFormReturn } from "react-hook-form";
import { Controller } from "react-hook-form";
import { Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { coinAssets, assetSpecs, type AssetType } from "@/utils/currency-assets/asset";
import type { InkdAgentCreateFormValues } from "@/schema/inkd-agent-create.schema";

const INPUT_CLASS =
  "border-[#DDE2E5] bg-white focus:border-[#E8EAED] focus:ring-1 focus:ring-[#E8EAED] focus-visible:outline-none text-[#111] placeholder:text-[#9a9aab]";

const ADD_BUTTON_CLASS =
  "rounded-full bg-[#E4F2DF] px-4 py-1.5 text-[11px] font-semibold text-[#315326] hover:bg-[#d4e8cf] disabled:opacity-60 shrink-0";

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
  const {
    control,
    watch,
    formState: { errors },
  } = form;

  const rewards = watch("rewards") as RewardItem[];

  return (
    <section className="space-y-2">
      <div className="flex items-end justify-end">
     
        <button
          type="button"
          onClick={() => {
            const used = new Set(
              rewards?.map((r) => r.assetId).filter(Boolean) ?? [],
            );
            const nextAsset =
              coinAssets.find((a) => !used.has(a)) ?? coinAssets[0];
            appendReward({
              assetId: nextAsset,
              amount: "",
              rewardAmountCap: "",
              rewardType: "max",
            });
          }}
          className={ADD_BUTTON_CLASS}
        >
          + Add Reward
        </button>
      </div>

      <div className="space-y-4 rounded-2xl bg-[#F5F5F7] p-4">
        {rewardFields.length ? (
          rewardFields.map((field, index) => {
            const assetId = watch(`rewards.${index}.assetId`) as AssetType;
            const spec = assetId && assetSpecs[assetId as AssetType];

            const selectedForOthers = new Set(
              rewards
                ?.map((r, i) => (i === index ? null : r.assetId))
                .filter(Boolean),
            );

            return (
              <div
                key={field.id}
                className="rounded-2xl border border-[#E2E4EA] bg-white px-4 py-4 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {spec?.img ? (
                      <img src={spec.img} alt="" className="h-5 w-5" />
                    ) : (
                      <div className="h-6 w-6 rounded-full bg-gray-200" />
                    )}
                    <select
                      className={cn(
                        "h-9 rounded-full border border-[#DDE2E5] bg-white px-3 text-[13px] font-medium text-[#111]",
                        INPUT_CLASS,
                      )}
                      {...form.register(`rewards.${index}.assetId` as const)}
                    >
                      {coinAssets.map((a) => {
                        const disabled = selectedForOthers.has(a);
                        return (
                          <option key={a} value={a} disabled={disabled}>
                            {assetSpecs[a].parent}
                          </option>
                        );
                      })}
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

                <div className="mt-4 flex flex-wrap items-center gap-6 text-[12px] text-[#5E6366]">
                  <div className="flex items-baseline gap-2">
                    <Input
                      type="text"
                      inputMode="numeric"
                      placeholder="0"
                      className={cn(
                        "h-8 w-16 border-0 border-b border-[#DDE2E5] bg-transparent p-0 text-xl font-medium text-[#111] tabular-nums shadow-none focus-visible:ring-0",
                        INPUT_CLASS,
                      )}
                      {...form.register(
                        `rewards.${index}.amount` as const,
                      )}
                    />
                    <span className="text-[#7A7A7A]">
                      Amount per user
                    </span>
                  </div>

                  <div className="h-7 w-px bg-black/20" />

                  <div className="flex items-baseline gap-2">
                    <Input
                      type="text"
                      inputMode="numeric"
                      placeholder="0"
                      className={cn(
                        "h-8 w-16 border-0 border-b border-[#DDE2E5] bg-transparent p-0 text-xl font-semibold text-[#111] tabular-nums shadow-none focus-visible:ring-0",
                        INPUT_CLASS,
                      )}
                      {...form.register(
                        `rewards.${index}.rewardAmountCap` as const,
                      )}
                    />
                    <span className="text-[#7A7A7A]">
                      Total tokens to distribute
                    </span>
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
                                ? "bg-[#5649FF] text-white hover:bg-[#5649FF90]"
                                : "bg-[#5649FF] text-white hover:bg-[#5649FF90]",
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
