import { useMemo, useState } from "react";
import type { FieldArrayWithId, UseFormReturn } from "react-hook-form";
import { Controller } from "react-hook-form";
import * as AccordionPrimitive from "@radix-ui/react-accordion";
import { ChevronDown, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { coinAssets, assetSpecs, type AssetType } from "@/utils/currency-assets/asset";
import { amount } from "@/utils/currency-assets/base";
import type { InkdAgentCreateFormValues } from "@/schema/inkd-agent-create.schema";
import { RewardsAccordion } from "@/components/reward-table/rewards-accordion";

/** Convert parent (decimal) string to base string for RewardsTable. */
function parentToBaseStr(assetId: AssetType, parentStr: string): string {
  const r = amount({
    op: "toBase",
    assetId,
    value: parentStr || "0",
    output: "string",
  });
  return r.ok ? r.value : "0";
}

const INPUT_CLASS =
  "border-[#DDE2E5] bg-white focus:border-[#E8EAED] focus:ring-1 focus:ring-[#E8EAED] focus-visible:outline-none text-[#111] placeholder:text-[#9a9aab]";

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
  highestLevel?: number;
};

export function RewardDistributionStep({
  form,
  rewardFields,
  appendReward,
  removeReward,
  highestLevel = 1,
}: Props) {
  const {
    control,
    watch,
    formState: { errors },
  } = form;

  const rewards = watch("rewards") as RewardItem[];
  const [openItem, setOpenItem] = useState<string>("");
  const [coinPickerOpen, setCoinPickerOpen] = useState(false);

  const usedAssets = useMemo(() => {
    return new Set(rewards?.map((r) => r.assetId).filter(Boolean) ?? []);
  }, [rewards]);

  const availableAssets = useMemo(() => {
    return coinAssets.filter((a) => !usedAssets.has(a));
  }, [usedAssets]);

  return (
    <section className="space-y-2 bg-[#F0F4F9] p-7 rounded-3xl">
      <div className="space-y-3">
      <div className="flex w-full items-center justify-between rounded-3xl border border-[#E6E7EB] bg-white px-5 py-4">
          <span className="text-base  text-[#111]">Add coin</span>

          <DropdownMenu open={coinPickerOpen} onOpenChange={setCoinPickerOpen}>
            <DropdownMenuTrigger asChild>
              <Button
                type="button" 
                size="sm"
                disabled={availableAssets.length === 0}
                className="h-9 w-9 rounded-xl p-0 bg-[#8A38F5] text-white hover:bg-[#8A38F5] hover:translate-y-[-3px] transition-all duration-200"
                aria-label="Add coin"
              >
                +
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="min-w-56 max-h-72 overflow-y-auto"
            >
              {availableAssets.length === 0 ? (
                <div className="px-3 py-2 text-sm text-muted-foreground">
                  All coins added
                </div>
              ) : (
                availableAssets.map((asset) => {
                  const spec = assetSpecs[asset];
                  return (
                    <DropdownMenuItem
                      key={asset}
                      onClick={() => {
                        appendReward({
                          assetId: asset,
                          amount: "0",
                          rewardAmountCap: "0",
                          rewardType: "max",
                        });
                        setCoinPickerOpen(false);
                      }}
                      className="flex items-center gap-2"
                    >
                      {spec?.img ? (
                        <img
                          src={spec.img}
                          alt=""
                          className="h-4 w-4 shrink-0"
                        />
                      ) : (
                        <div className="h-4 w-4 shrink-0 rounded-full bg-gray-200" />
                      )}
                      <span className="text-sm">{spec?.parent ?? asset}</span>
                    </DropdownMenuItem>
                  );
                })
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <AccordionPrimitive.Root
          type="single"
          collapsible
          value={openItem}
          onValueChange={(v) => setOpenItem(v ?? "")}
          className="space-y-3"
        >
          {rewardFields.map((field, index) => {
            const itemValue = `reward-${field.id}`;
            const isOpen = openItem === itemValue;
            const assetId = watch(`rewards.${index}.assetId`) as AssetType;
            const spec = assetId ? assetSpecs[assetId] : undefined;

            const selectedForOthers = new Set(
              rewards
                ?.map((r, i) => (i === index ? null : r.assetId))
                .filter(Boolean),
            );

            return (
              <AccordionPrimitive.Item
                key={field.id}
                value={itemValue}
                className="rounded-3xl bg-white p-4"
              >
                <AccordionPrimitive.Header className="flex">
                  <AccordionPrimitive.Trigger
                    className={cn(
                      "w-full rounded-3xl border border-[#E6E7EB] bg-white px-4 py-4 text-left",
                      "flex items-center justify-between gap-3",
                    )}
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      {spec?.img ? (
                        <img
                          src={spec.img}
                          alt=""
                          className="h-5 w-5 shrink-0 object-contain"
                        />
                      ) : (
                        <div className="h-5 w-5 shrink-0 rounded-full bg-gray-200" />
                      )}
                      <span className="truncate text-base font-medium text-[#111]">
                        {spec?.parent ?? "Coin"}
                      </span>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      {isOpen ? (
                        <Button
                          type="button" 
                          size="sm"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            removeReward(index);
                          }}
                          disabled={rewardFields.length <= 1}
                          className="text-xs"
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      ) : null}

                      <span className="inline-flex h-8 w-12 items-center justify-center rounded-full border border-[#E6E7EB] bg-white">
                        <ChevronDown
                          className={cn(
                            "h-4 w-4 text-[#111] transition-transform duration-200",
                            isOpen ? "rotate-180" : "rotate-0",
                          )}
                        />
                      </span>
                    </div>
                  </AccordionPrimitive.Trigger>
                </AccordionPrimitive.Header>

                <AccordionPrimitive.Content className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
                  <div className="px-4 pb-5 pt-4">
                    {/* Asset selector (kept; hidden under the accordion to match UI) */}
                    <div className="mb-4">
                      <select
                        className={cn(
                          "h-10 w-full rounded-2xl border border-[#DDE2E5] bg-white px-3 text-[13px] font-medium text-[#111]",
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

                    <div className="space-y-5">
                      <div className="space-y-1.5">
                       
                          <p className="text-sm font-medium text-gray-700">
                            Total tokens to be distributed
                          </p>
                        <Input
                          type="text"
                          inputMode="numeric"
                          placeholder="0"
                          className={cn(
                            "h-12 rounded-2xl border border-[#E6E7EB] bg-white text-base",
                            INPUT_CLASS,
                          )}
                          {...form.register(
                            `rewards.${index}.rewardAmountCap` as const,
                          )}
                        />
                      </div>

                      <div className="space-y-2">
                        <p className="text-sm font-medium text-gray-700">
                          Set token reward per user
                        </p>
                        <Input
                          type="text"
                          inputMode="numeric"
                          placeholder="0"
                          className={cn(
                            "h-12 rounded-2xl border border-[#E6E7EB] bg-white text-base",
                            INPUT_CLASS,
                          )}
                          {...form.register(`rewards.${index}.amount` as const)}
                        />
                        <Controller
                          control={control}
                          name={`rewards.${index}.rewardType` as const}
                          render={({ field }) => (
                            <div className="flex items-center gap-8">
                              <button
                                type="button"
                                onClick={() => field.onChange("max")}
                                className="inline-flex items-center gap-3"
                              >
                                <span
                                  className={cn(
                                    "h-5 w-5 rounded-full border-2",
                                    field.value === "max"
                                      ? "border-[#8A38F5]"
                                      : "border-[#D1D5DB]",
                                  )}
                                >
                                  {field.value === "max" ? (
                                    <span className="m-1 block h-2 w-2 rounded-full bg-[#8A38F5]" />
                                  ) : null}
                                </span>
                                <span className="text-base font-semibold text-gray-700">
                                  MAX. Value
                                </span>
                              </button>

                              <button
                                type="button"
                                onClick={() => field.onChange("min")}
                                className="inline-flex items-center gap-3"
                              >
                                <span
                                  className={cn(
                                    "h-5 w-5 rounded-full border-2",
                                    field.value === "min"
                                      ? "border-[#8A38F5]"
                                      : "border-[#D1D5DB]",
                                  )}
                                >
                                  {field.value === "min" ? (
                                    <span className="m-1 block h-2 w-2 rounded-full bg-[#8A38F5]" />
                                  ) : null}
                                </span>
                                <span className="text-base font-semibold text-gray-700">
                                  MIN. Value
                                </span>
                              </button>
                            </div>
                          )}
                        />
                      </div>
 
                      {assetId && (
                        <div className="mt-4 border border-[#E6E7EB] p-4 rounded-3xl">
                          <RewardsAccordion
                            highestLevel={highestLevel}
                            rewardType={watch(`rewards.${index}.rewardType`) === "min" ? "min" : "max"}
                            perUserReward={parentToBaseStr(assetId, watch(`rewards.${index}.amount`) || "0")}
                            rewardCap={parentToBaseStr(assetId, watch(`rewards.${index}.rewardAmountCap`) || "0")}
                            asset={assetId}
                            size="sm"  className="text-gray-700"
                          />
                        </div>
                      )}
                    </div>

                    {errors.rewards?.[index] && (
                      <p className="mt-3 text-xs text-red-600">
                        {(errors.rewards[index] as { amount?: { message?: string }; rewardAmountCap?: { message?: string } })?.rewardAmountCap?.message ??
                          (errors.rewards[index] as { amount?: { message?: string } })?.amount?.message ??
                          "Fix errors above"}
                      </p>
                    )}
                  </div>
                </AccordionPrimitive.Content>
              </AccordionPrimitive.Item>
            );
          })}
        </AccordionPrimitive.Root>

         
      </div>

      {typeof (errors.rewards as { message?: string })?.message === "string" && (
        <p className="mt-2 text-xs text-red-600">
          {(errors.rewards as { message: string }).message}
        </p>
      )}
    </section>
  );
}
