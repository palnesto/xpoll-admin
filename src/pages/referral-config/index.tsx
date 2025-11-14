// import React, { useEffect, useMemo, useState } from "react";
// import { z } from "zod";
// import { useForm, useFieldArray } from "react-hook-form";
// import { zodResolver } from "@hookform/resolvers/zod";

// import { Button } from "@/components/ui/button";
// import {
//   Form,
//   FormControl,
//   FormField,
//   FormItem,
//   FormLabel,
//   FormMessage,
// } from "@/components/ui/form";
// import { Input } from "@/components/ui/input";
// import { Card } from "@/components/ui/card";

// import { useApiQuery } from "@/hooks/useApiQuery";
// import { useApiMutation } from "@/hooks/useApiMutation";
// import { endpoints } from "@/api/endpoints";
// import { queryClient } from "@/api/queryClient";
// import { appToast } from "@/utils/toast";

// import TwoPane from "@/layouts/TwoPane";
// import RewardsList from "@/components/polling/editors/RewardsList";
// import { ASSET_OPTIONS } from "@/validators/poll-trial-form";

// import { Pencil, Plus, Minus, Loader2 } from "lucide-react";
// import {
//   useReferralConfigStore,
//   ReferralLevel,
//   ReferralReward,
// } from "@/stores/referral-config.store";
// import ReferralRewardPanel from "@/components/polling/editors/ReferralRewardPanel";

// /* ------------------------------------------------------------------ */
// /* Zod Schema                                                         */
// /* ------------------------------------------------------------------ */

// const referralRewardZ = z.object({
//   assetId: z.string().min(1, "Asset is required"),
//   amount: z.number().positive("Amount must be > 0"),
// });

// const referralLevelZ = z.object({
//   totalUniqueVisitsRequired: z
//     .number()
//     .int()
//     .positive("Required uniques must be positive"),
//   rewards: z
//     .array(referralRewardZ)
//     .min(1, "At least 1 reward")
//     .max(4, "Max 4 rewards per level")
//     .superRefine((rewards, ctx) => {
//       // prevent duplicate assets inside a level
//       const ids = rewards.map((r) => r.assetId);
//       const dup = ids.find((a, i) => ids.indexOf(a) !== i);
//       if (dup) {
//         ctx.addIssue({
//           code: z.ZodIssueCode.custom,
//           message: `Duplicate asset ${dup} in this level`,
//         });
//       }
//     }),
// });

// const referralConfigZ = z.object({
//   referral_levels: z
//     .array(referralLevelZ)
//     .max(3, "Max 3 levels allowed")
//     .superRefine((levels, ctx) => {
//       for (let i = 0; i < levels.length; i++) {
//         if (i > 0) {
//           if (
//             levels[i].totalUniqueVisitsRequired <=
//             levels[i - 1].totalUniqueVisitsRequired
//           ) {
//             ctx.addIssue({
//               code: z.ZodIssueCode.custom,
//               path: [i, "totalUniqueVisitsRequired"],
//               message:
//                 "Each level must require more uniques than the previous level.",
//             });
//           }
//         }
//       }
//     }),
// });

// type ReferralConfigForm = z.infer<typeof referralConfigZ>;

// /* ------------------------------------------------------------------ */
// /* API response type                                                  */
// /* ------------------------------------------------------------------ */

// type ApiConfig = {
//   referral_levels: {
//     totalUniqueVisitsRequired: number;
//     rewards: { assetId: string; amount: string }[];
//   }[];
// };

// /* ------------------------------------------------------------------ */
// /* Component                                                          */
// /* ------------------------------------------------------------------ */

// const ReferralConfig: React.FC = () => {
//   const [isEditing, setIsEditing] = useState(false);

//   // Reward panel state (same pattern as PollCreate)
//   const [activeRewardLevel, setActiveRewardLevel] = useState<number | null>(
//     null
//   );
//   const [activeRewardIndex, setActiveRewardIndex] = useState<number | null>(
//     null
//   );

//   // zustand store (persisted)
//   const { referral_levels: storeLevels, setConfig: setStoreConfig } =
//     useReferralConfigStore();

//   // GET config
//   const {
//     data,
//     isLoading,
//     error: loadError,
//   } = useApiQuery(endpoints.referral.getConfig);

//   const apiConfig = data?.data?.data as ApiConfig | undefined;

//   const configFromApi: ReferralConfigForm | undefined = useMemo(() => {
//     if (!apiConfig) return undefined;
//     return {
//       referral_levels:
//         apiConfig.referral_levels?.map((lvl) => ({
//           totalUniqueVisitsRequired: Number(lvl.totalUniqueVisitsRequired ?? 0),
//           rewards: (lvl.rewards ?? []).map((r) => ({
//             assetId: r.assetId,
//             amount: Number(r.amount ?? "0"),
//           })),
//         })) ?? [],
//     };
//   }, [apiConfig]);

//   // Default values: prefer store (persisted), else API, else fallback
//   const defaultValues: ReferralConfigForm = useMemo(
//     () => ({
//       referral_levels:
//         (storeLevels?.length ? storeLevels : configFromApi?.referral_levels) ??
//         [],
//     }),
//     [storeLevels, configFromApi]
//   );

//   const form = useForm<ReferralConfigForm>({
//     resolver: zodResolver(referralConfigZ),
//     defaultValues,
//     mode: "onChange",
//   });

//   const {
//     control,
//     handleSubmit,
//     reset,
//     watch,
//     setValue,
//     formState: { errors, isValid, isSubmitting },
//   } = form;

//   // Sync store + form when API config changes
//   useEffect(() => {
//     if (configFromApi) {
//       setStoreConfig({
//         referral_levels: configFromApi.referral_levels as ReferralLevel[],
//       });
//       reset(configFromApi);
//     }
//   }, [configFromApi, reset, setStoreConfig]);

//   // Levels field array (level cards)
//   const {
//     fields: levelFields,
//     append: appendLevel,
//     remove: removeLevel,
//   } = useFieldArray({
//     control,
//     name: "referral_levels",
//   });

//   // UPDATE config
//   const { mutate: saveConfig, isPending: isSaving } = useApiMutation({
//     route: endpoints.referral.updateReferral,
//     method: "PUT",
//     onSuccess: () => {
//       // ✅ Invalidate getConfig query
//       queryClient.invalidateQueries({
//         queryKey: ["GET", endpoints.referral.getConfig],
//       });

//       appToast.success("Referral config updated");
//       setIsEditing(false);
//       setActiveRewardLevel(null);
//       setActiveRewardIndex(null);
//     },
//     onError: (e) => {
//       console.log("err", e);
//       appToast.error("Failed to update referral config");
//     },
//   });

//   const onSubmit = (values: ReferralConfigForm) => {
//     // extra guard: prevent duplicate assets per level
//     for (let i = 0; i < values.referral_levels.length; i++) {
//       const lvl = values.referral_levels[i];
//       const ids = (lvl.rewards ?? []).map((r) => r.assetId);
//       const dup = ids.find((a, idx) => ids.indexOf(a) !== idx);
//       if (dup) {
//         appToast.error(
//           `Duplicate asset ${dup} in Level ${
//             i + 1
//           }. Each level must use each asset only once.`
//         );
//         return;
//       }
//     }

//     const payload = {
//       referral_levels: values.referral_levels.map((lvl) => ({
//         totalUniqueVisitsRequired: lvl.totalUniqueVisitsRequired,
//         rewards: (lvl.rewards ?? []).map((r) => ({
//           assetId: r.assetId,
//           amount: String(r.amount),
//         })),
//       })),
//     };
//     console.log("payload", payload);
//     saveConfig(payload);
//   };

//   const handleAddLevel = () => {
//     const current = watch("referral_levels") ?? [];
//     if (current.length >= 3) return;

//     const prev = current[current.length - 1];
//     const nextRequired = prev ? prev.totalUniqueVisitsRequired + 10 : 10;

//     appendLevel({
//       totalUniqueVisitsRequired: nextRequired,
//       rewards: [
//         {
//           assetId: ASSET_OPTIONS[0]?.value ?? "xPoll",
//           amount: 1,
//         },
//       ],
//     });
//   };

//   const handleRemoveLevel = (index: number) => {
//     const current = watch("referral_levels") ?? [];
//     if (index < 0 || index >= current.length) return;
//     removeLevel(index);
//     // Levels automatically re-index → L3 becomes L2, etc.
//   };

//   const levelsValue = watch("referral_levels") || [];

//   const currentRewards: ReferralReward[] =
//     activeRewardLevel === null
//       ? []
//       : levelsValue[activeRewardLevel]?.rewards ?? [];

//   const isBusySaving = isSaving || isSubmitting;

//   /* ------------------------------------------------------------------ */
//   /* VIEW MODE                                                          */
//   /* ------------------------------------------------------------------ */

//   if (!isEditing) {
//     if (isLoading) {
//       return (
//         <div className="p-6">
//           <p className="text-sm text-muted-foreground">Loading config…</p>
//         </div>
//       );
//     }

//     if (loadError) {
//       return (
//         <div className="p-6">
//           <p className="text-sm text-red-500">
//             Failed to load referral config.
//           </p>
//         </div>
//       );
//     }

//     return (
//       <div className="p-6 space-y-6 w-full">
//         {/* Header */}
//         <div className="flex items-center justify-between">
//           <div>
//             <h1 className="text-2xl font-semibold tracking-tight">
//               Referral Config
//             </h1>
//             <p className="text-sm text-muted-foreground">
//               View how many unique visits are required per level and the
//               associated rewards.
//             </p>
//           </div>
//           <Button
//             variant="outline"
//             size="icon"
//             onClick={() => {
//               if (configFromApi) reset(configFromApi);
//               setIsEditing(true);
//             }}
//           >
//             <Pencil className="h-4 w-4" />
//           </Button>
//         </div>

//         {/* Levels */}
//         <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
//           {configFromApi?.referral_levels?.length ? (
//             configFromApi.referral_levels.map((lvl, idx) => (
//               <Card
//                 key={idx}
//                 className="rounded-2xl border bg-primary/5 flex flex-col gap-3 p-4"
//               >
//                 <div className="flex items-center justify-between">
//                   <span className="text-xs uppercase text-muted-foreground">
//                     Level
//                   </span>
//                   <span className="px-2 py-0.5 rounded-full text-[11px] border bg-background">
//                     L{idx + 1}
//                   </span>
//                 </div>

//                 <div>
//                   <p className="text-xs text-muted-foreground mb-1">
//                     Total Unique Visits Required
//                   </p>
//                   <p className="text-lg font-semibold">
//                     {lvl.totalUniqueVisitsRequired}
//                   </p>
//                 </div>

//                 <div>
//                   <p className="text-xs text-muted-foreground mb-1">Rewards</p>
//                   <div className="flex flex-wrap gap-2">
//                     {(lvl.rewards ?? []).map((r, rIdx) => (
//                       <span
//                         key={`${r.assetId}-${rIdx}`}
//                         className="px-2 py-0.5 rounded-full border bg-background text-[11px]"
//                       >
//                         {/* amount shown is already "converted" by your RewardDetailPanel logic when entered */}
//                         {r.assetId}: {r.amount}
//                       </span>
//                     ))}
//                   </div>
//                 </div>
//               </Card>
//             ))
//           ) : (
//             <p className="text-sm text-muted-foreground col-span-full">
//               No referral levels configured yet.
//             </p>
//           )}
//         </div>
//       </div>
//     );
//   }

//   /* ------------------------------------------------------------------ */
//   /* EDIT MODE                                                          */
//   /* ------------------------------------------------------------------ */

//   return (
//     <div className="p-6 space-y-6 w-full">
//       {/* Header with Save + Add Level */}
//       <div className="flex items-center justify-between">
//         <div>
//           <h1 className="text-2xl font-semibold tracking-tight">
//             Edit Referral Config
//           </h1>
//           <p className="text-sm text-muted-foreground">
//             Configure levels, required uniques, and rewards. Min 0, max 3
//             levels. Rewards are configured per level.
//           </p>
//         </div>
//         <div className="flex items-center gap-2">
//           <Button
//             type="button"
//             variant="outline"
//             size="icon"
//             onClick={handleAddLevel}
//             disabled={levelFields.length >= 3}
//           >
//             <Plus className="h-4 w-4" />
//           </Button>
//           <Button
//             type="button"
//             variant="outline"
//             onClick={() => {
//               if (configFromApi) reset(configFromApi);
//               setIsEditing(false);
//               setActiveRewardLevel(null);
//               setActiveRewardIndex(null);
//             }}
//           >
//             Cancel
//           </Button>
//           <Button
//             type="button"
//             onClick={handleSubmit(onSubmit)}
//             disabled={!isValid || isBusySaving}
//           >
//             {isBusySaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
//             Save
//           </Button>
//         </div>
//       </div>

//       <Form {...form}>
//         <form
//           onSubmit={handleSubmit(onSubmit)}
//           className="space-y-6"
//           autoComplete="off"
//         >
//           <TwoPane
//             isRightOpen={activeRewardLevel !== null}
//             right={
//               activeRewardLevel !== null && activeRewardIndex !== null ? (
//                 <ReferralRewardPanel
//                   index={activeRewardIndex}
//                   assetOptions={ASSET_OPTIONS as any}
//                   onClose={() => {
//                     setActiveRewardLevel(null);
//                     setActiveRewardIndex(null);
//                   }}
//                   rewards={currentRewards as any}
//                   append={(reward) => {
//                     if (activeRewardLevel === null) return;
//                     const levels = watch("referral_levels") || [];
//                     const level = levels[activeRewardLevel];
//                     const existing = level.rewards ?? [];
//                     if (existing.length >= 4) return;

//                     // prevent duplicate asset within level
//                     if (
//                       existing.some((r: any) => r.assetId === reward.assetId)
//                     ) {
//                       appToast.error(
//                         `Asset ${reward.assetId} already used in this level`
//                       );
//                       return;
//                     }

//                     const nextRewards = [...existing, reward];
//                     const nextLevels = [...levels];
//                     nextLevels[activeRewardLevel] = {
//                       ...level,
//                       rewards: nextRewards,
//                     };
//                     setValue("referral_levels", nextLevels as any, {
//                       shouldDirty: true,
//                       shouldValidate: true,
//                     });
//                   }}
//                   update={(idx, reward) => {
//                     if (activeRewardLevel === null) return;
//                     const levels = watch("referral_levels") || [];
//                     const level = levels[activeRewardLevel];
//                     const existing = level.rewards ?? [];

//                     // prevent duplicate asset on update
//                     const ids = existing.map((r: any, i: number) =>
//                       i === idx ? reward.assetId : r.assetId
//                     );
//                     const dup = ids.find((a, i) => ids.indexOf(a) !== i);
//                     if (dup) {
//                       appToast.error(`Asset ${dup} already used in this level`);
//                       return;
//                     }

//                     const nextRewards = [...existing];
//                     nextRewards[idx] = reward;
//                     const nextLevels = [...levels];
//                     nextLevels[activeRewardLevel] = {
//                       ...level,
//                       rewards: nextRewards,
//                     };
//                     setValue("referral_levels", nextLevels as any, {
//                       shouldDirty: true,
//                       shouldValidate: true,
//                     });
//                   }}
//                 />
//               ) : null
//             }
//             left={
//               <div className="flex flex-col gap-6">
//                 {/* Levels */}
//                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
//                   {levelFields.length === 0 && (
//                     <p className="text-sm text-muted-foreground col-span-full">
//                       No levels configured. Click + to add a level.
//                     </p>
//                   )}

//                   {levelFields.map((levelField, index) => {
//                     const levels = watch("referral_levels") || [];
//                     const prevRequired =
//                       index > 0
//                         ? levels[index - 1]?.totalUniqueVisitsRequired ?? 1
//                         : 1;
//                     const rewardsForLevel = levels[index]?.rewards ?? [];

//                     return (
//                       <Card
//                         key={levelField.id ?? index}
//                         className="rounded-2xl border bg-primary/5 p-4 space-y-3"
//                       >
//                         <div className="flex items-center justify-between">
//                           <span className="text-xs uppercase text-muted-foreground">
//                             Level {index + 1}
//                           </span>
//                           <Button
//                             type="button"
//                             variant="outline"
//                             size="icon"
//                             onClick={() => handleRemoveLevel(index)}
//                           >
//                             <Minus className="h-3 w-3" />
//                           </Button>
//                         </div>

//                         {/* totalUniqueVisitsRequired */}
//                         <FormField
//                           control={control}
//                           name={`referral_levels.${index}.totalUniqueVisitsRequired`}
//                           render={({ field }) => (
//                             <FormItem>
//                               <FormLabel className="text-xs text-muted-foreground">
//                                 Total Unique Visits Required
//                               </FormLabel>
//                               <FormControl>
//                                 <Input
//                                   type="number"
//                                   min={prevRequired + (index > 0 ? 1 : 0)}
//                                   {...field}
//                                   value={field.value ?? ""}
//                                   onChange={(e) =>
//                                     field.onChange(
//                                       e.target.value === ""
//                                         ? ""
//                                         : Number(e.target.value)
//                                     )
//                                   }
//                                 />
//                               </FormControl>
//                               <FormMessage />
//                             </FormItem>
//                           )}
//                         />

//                         {/* Rewards block – same Add Reward UX block as PollCreate */}
//                         <div className="space-y-2">
//                           <div className="flex justify-between items-center">
//                             <span className="text-xs text-muted-foreground">
//                               Rewards (min 1, max 4)
//                             </span>
//                             <Button
//                               type="button"
//                               size="icon"
//                               onClick={() => {
//                                 setActiveRewardLevel(index);
//                                 setActiveRewardIndex(-1);
//                               }}
//                               className="w-fit p-2"
//                               disabled={rewardsForLevel.length >= 4}
//                             >
//                               {/* when clicking +, RewardDetailPanel shows converted values only (same as PollCreate) */}
//                               <Plus className="h-4 w-4" />
//                             </Button>
//                           </div>

//                           {rewardsForLevel.length > 0 && (
//                             <RewardsList
//                               fields={rewardsForLevel as any}
//                               assetOptions={ASSET_OPTIONS as any}
//                               onEdit={(rewardIdx) => {
//                                 setActiveRewardLevel(index);
//                                 setActiveRewardIndex(rewardIdx);
//                               }}
//                               onAdd={() => {
//                                 setActiveRewardLevel(index);
//                                 setActiveRewardIndex(-1);
//                               }}
//                               remove={(rewardIdx) => {
//                                 const allLevels =
//                                   watch("referral_levels") || [];
//                                 const lvl = allLevels[index];
//                                 const nextRewards = [
//                                   ...(lvl.rewards ?? []),
//                                 ] as ReferralReward[];
//                                 if (nextRewards.length <= 1) return;
//                                 nextRewards.splice(rewardIdx, 1);
//                                 const nextLevels = [...allLevels];
//                                 nextLevels[index] = {
//                                   ...lvl,
//                                   rewards: nextRewards,
//                                 };
//                                 setValue("referral_levels", nextLevels as any, {
//                                   shouldDirty: true,
//                                   shouldValidate: true,
//                                 });
//                               }}
//                               allAssets={ASSET_OPTIONS.map((a) => a.value)}
//                             />
//                           )}

//                           {errors.referral_levels?.[index]?.rewards && (
//                             <p className="text-xs text-destructive">
//                               {(errors.referral_levels?.[index]?.rewards as any)
//                                 ?.message ??
//                                 "Each level must have 1–4 rewards."}
//                             </p>
//                           )}
//                         </div>
//                       </Card>
//                     );
//                   })}
//                 </div>

//                 {typeof errors.referral_levels?.message === "string" && (
//                   <p className="text-sm text-destructive">
//                     {errors.referral_levels.message}
//                   </p>
//                 )}
//               </div>
//             }
//           />
//         </form>
//       </Form>
//     </div>
//   );
// };

// export default ReferralConfig;
import React, { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

import { useApiQuery } from "@/hooks/useApiQuery";
import { useApiMutation } from "@/hooks/useApiMutation";
import { endpoints } from "@/api/endpoints";
import { queryClient } from "@/api/queryClient";
import { appToast } from "@/utils/toast";

import TwoPane from "@/layouts/TwoPane";
import { ASSET_OPTIONS } from "@/validators/poll-trial-form";
import { amount as convertAmount } from "@/utils/currency-assets/base";
import { AssetType } from "@/utils/currency-assets/asset";

import { Pencil, Plus, Minus, Loader2 } from "lucide-react";
import {
  useReferralConfigStore,
  ReferralLevel,
  ReferralReward,
} from "@/stores/referral-config.store";
import ReferralRewardPanel from "@/components/polling/editors/ReferralRewardPanel";
import ReferralRewardList from "@/components/polling/editors/ReferralRewardList";

/* ------------------------------------------------------------------ */
/* Zod Schema                                                         */
/* ------------------------------------------------------------------ */

const referralRewardZ = z.object({
  assetId: z.string().min(1, "Asset is required"),
  amount: z.number().positive("Amount must be > 0"), // BASE units in form/store
});

const referralLevelZ = z.object({
  totalUniqueVisitsRequired: z
    .number()
    .int()
    .positive("Required uniques must be positive"),
  rewards: z
    .array(referralRewardZ)
    .min(1, "At least 1 reward")
    .max(4, "Max 4 rewards per level")
    .superRefine((rewards, ctx) => {
      const ids = rewards.map((r) => r.assetId);
      const dup = ids.find((a, i) => ids.indexOf(a) !== i);
      if (dup) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Duplicate asset ${dup} in this level`,
        });
      }
    }),
});

const referralConfigZ = z.object({
  referral_levels: z
    .array(referralLevelZ)
    .max(3, "Max 3 levels allowed")
    .superRefine((levels, ctx) => {
      for (let i = 0; i < levels.length; i++) {
        if (i > 0) {
          if (
            levels[i].totalUniqueVisitsRequired <=
            levels[i - 1].totalUniqueVisitsRequired
          ) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: [i, "totalUniqueVisitsRequired"],
              message:
                "Each level must require more uniques than the previous level.",
            });
          }
        }
      }
    }),
});

type ReferralConfigForm = z.infer<typeof referralConfigZ>;

/* ------------------------------------------------------------------ */
/* API response type                                                  */
/* ------------------------------------------------------------------ */

type ApiConfig = {
  referral_levels: {
    totalUniqueVisitsRequired: number;
    rewards: { assetId: string; amount: string }[]; // amount in PARENT from API
  }[];
};

/* ------------------------------------------------------------------ */
/* Helpers – convert parent → BASE                                    */
/* ------------------------------------------------------------------ */

const toBaseAmount = (assetId: string, parentStr: string): number => {
  const res = convertAmount({
    op: "toBase",
    assetId: assetId as AssetType,
    value: parentStr,
    output: "number",
    allowUnsafeNumber: true,
  });

  if (!res.ok) return 0;
  return Number(res.value || 0);
};

/* ------------------------------------------------------------------ */
/* Component                                                          */
/* ------------------------------------------------------------------ */

const ReferralConfig: React.FC = () => {
  const [isEditing, setIsEditing] = useState(false);

  // Reward panel state (same pattern as PollCreate)
  const [activeRewardLevel, setActiveRewardLevel] = useState<number | null>(
    null
  );
  const [activeRewardIndex, setActiveRewardIndex] = useState<number | null>(
    null
  );

  // zustand store (persisted)
  const { referral_levels: storeLevels, setConfig: setStoreConfig } =
    useReferralConfigStore();

  // GET config
  const {
    data,
    isLoading,
    error: loadError,
  } = useApiQuery(endpoints.referral.getConfig);

  const apiConfig = data?.data?.data as ApiConfig | undefined;

  const configFromApi: ReferralConfigForm | undefined = useMemo(() => {
    if (!apiConfig) return undefined;
    return {
      referral_levels:
        apiConfig.referral_levels?.map((lvl) => ({
          totalUniqueVisitsRequired: Number(lvl.totalUniqueVisitsRequired ?? 0),
          rewards: (lvl.rewards ?? []).map((r) => ({
            assetId: r.assetId,
            // convert PARENT → BASE for internal storage
            amount: toBaseAmount(r.assetId, r.amount ?? "0"),
          })),
        })) ?? [],
    };
  }, [apiConfig]);

  // Default values: prefer store (persisted), else API, else fallback
  const defaultValues: ReferralConfigForm = useMemo(
    () => ({
      referral_levels:
        (storeLevels?.length ? storeLevels : configFromApi?.referral_levels) ??
        [],
    }),
    [storeLevels, configFromApi]
  );

  const form = useForm<ReferralConfigForm>({
    resolver: zodResolver(referralConfigZ),
    defaultValues,
    mode: "onChange",
  });

  const {
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isValid, isSubmitting },
  } = form;

  // Sync store + form when API config changes
  useEffect(() => {
    if (configFromApi) {
      setStoreConfig({
        referral_levels: configFromApi.referral_levels as ReferralLevel[],
      });
      reset(configFromApi);
    }
  }, [configFromApi, reset, setStoreConfig]);

  // Levels field array (level cards)
  const {
    fields: levelFields,
    append: appendLevel,
    remove: removeLevel,
  } = useFieldArray({
    control,
    name: "referral_levels",
  });

  // UPDATE config
  const { mutate: saveConfig, isPending: isSaving } = useApiMutation({
    route: endpoints.referral.updateReferral,
    method: "PUT",
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["GET", endpoints.referral.getConfig],
      });

      appToast.success("Referral config updated");
      setIsEditing(false);
      setActiveRewardLevel(null);
      setActiveRewardIndex(null);
    },
    onError: (e) => {
      console.log("err", e);
      appToast.error("Failed to update referral config");
    },
  });

  const onSubmit = (values: ReferralConfigForm) => {
    // extra guard: prevent duplicate assets per level
    for (let i = 0; i < values.referral_levels.length; i++) {
      const lvl = values.referral_levels[i];
      const ids = (lvl.rewards ?? []).map((r) => r.assetId);
      const dup = ids.find((a, idx) => ids.indexOf(a) !== idx);
      if (dup) {
        appToast.error(
          `Duplicate asset ${dup} in Level ${
            i + 1
          }. Each level must use each asset only once.`
        );
        return;
      }
    }

    const payload = {
      referral_levels: values.referral_levels.map((lvl) => ({
        totalUniqueVisitsRequired: lvl.totalUniqueVisitsRequired,
        rewards: (lvl.rewards ?? []).map((r) => ({
          assetId: r.assetId,
          // send BASE as string, same as poll payload
          amount: String(r.amount),
        })),
      })),
    };
    console.log("payload", payload);
    saveConfig(payload);
  };

  const handleAddLevel = () => {
    const current = watch("referral_levels") ?? [];
    if (current.length >= 3) return;

    const prev = current[current.length - 1];
    const nextRequired = prev ? prev.totalUniqueVisitsRequired + 10 : 10;

    appendLevel({
      totalUniqueVisitsRequired: nextRequired,
      rewards: [
        {
          assetId: ASSET_OPTIONS[0]?.value ?? "xPoll",
          amount: 1, // BASE units
        },
      ],
    });
  };

  const handleRemoveLevel = (index: number) => {
    const current = watch("referral_levels") ?? [];
    if (index < 0 || index >= current.length) return;
    removeLevel(index);
    // Levels automatically re-index → L3 becomes L2, etc.
  };

  const levelsValue = watch("referral_levels") || [];

  const currentRewards: ReferralReward[] =
    activeRewardLevel === null
      ? []
      : levelsValue[activeRewardLevel]?.rewards ?? [];

  const isBusySaving = isSaving || isSubmitting;

  /* ------------------------------------------------------------------ */
  /* VIEW MODE                                                          */
  /* ------------------------------------------------------------------ */

  if (!isEditing) {
    if (isLoading) {
      return (
        <div className="p-6">
          <p className="text-sm text-muted-foreground">Loading config…</p>
        </div>
      );
    }

    if (loadError) {
      return (
        <div className="p-6">
          <p className="text-sm text-red-500">
            Failed to load referral config.
          </p>
        </div>
      );
    }

    return (
      <div className="p-6 space-y-6 w-full">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Referral Config
            </h1>
            <p className="text-sm text-muted-foreground">
              View how many unique visits are required per level and the
              associated rewards.
            </p>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => {
              if (configFromApi) reset(configFromApi);
              setIsEditing(true);
            }}
          >
            <Pencil className="h-4 w-4" />
          </Button>
        </div>

        {/* Levels */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {configFromApi?.referral_levels?.length ? (
            configFromApi.referral_levels.map((lvl, idx) => (
              <Card
                key={idx}
                className="rounded-2xl border bg-primary/5 flex flex-col gap-3 p-4"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase text-muted-foreground">
                    Level
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[11px] border bg-background">
                    L{idx + 1}
                  </span>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground mb-1">
                    Total Unique Visits Required
                  </p>
                  <p className="text-lg font-semibold">
                    {lvl.totalUniqueVisitsRequired}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground mb-1">Rewards</p>
                  <div className="flex flex-wrap gap-2">
                    {(lvl.rewards ?? []).map((r, rIdx) => (
                      <span
                        key={`${r.assetId}-${rIdx}`}
                        className="px-2 py-0.5 rounded-full border bg-background text-[11px]"
                      >
                        {/* r.amount is BASE; that's fine for admin view.
                            If you want parent display, you can convert here. */}
                        {r.assetId}: {r.amount}
                      </span>
                    ))}
                  </div>
                </div>
              </Card>
            ))
          ) : (
            <p className="text-sm text-muted-foreground col-span-full">
              No referral levels configured yet.
            </p>
          )}
        </div>
      </div>
    );
  }

  /* ------------------------------------------------------------------ */
  /* EDIT MODE                                                          */
  /* ------------------------------------------------------------------ */

  return (
    <div className="p-6 space-y-6 w-full">
      {/* Header with Save + Add Level */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Edit Referral Config
          </h1>
          <p className="text-sm text-muted-foreground">
            Configure levels, required uniques, and rewards. Min 0, max 3
            levels. Rewards are configured per level.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={handleAddLevel}
            disabled={levelFields.length >= 3}
          >
            <Plus className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              if (configFromApi) reset(configFromApi);
              setIsEditing(false);
              setActiveRewardLevel(null);
              setActiveRewardIndex(null);
            }}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit(onSubmit)}
            disabled={!isValid || isBusySaving}
          >
            {isBusySaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save
          </Button>
        </div>
      </div>

      <Form {...form}>
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-6"
          autoComplete="off"
        >
          <TwoPane
            isRightOpen={activeRewardLevel !== null}
            right={
              activeRewardLevel !== null && activeRewardIndex !== null ? (
                <ReferralRewardPanel
                  index={activeRewardIndex}
                  assetOptions={ASSET_OPTIONS as any}
                  onClose={() => {
                    setActiveRewardLevel(null);
                    setActiveRewardIndex(null);
                  }}
                  rewards={currentRewards as any}
                  append={(reward) => {
                    if (activeRewardLevel === null) return;
                    const levels = watch("referral_levels") || [];
                    const level = levels[activeRewardLevel];
                    const existing = level.rewards ?? [];
                    if (existing.length >= 4) return;

                    // prevent duplicate asset within level
                    if (
                      existing.some((r: any) => r.assetId === reward.assetId)
                    ) {
                      appToast.error(
                        `Asset ${reward.assetId} already used in this level`
                      );
                      return;
                    }

                    const nextRewards = [...existing, reward];
                    const nextLevels = [...levels];
                    nextLevels[activeRewardLevel] = {
                      ...level,
                      rewards: nextRewards,
                    };
                    setValue("referral_levels", nextLevels as any, {
                      shouldDirty: true,
                      shouldValidate: true,
                    });
                  }}
                  update={(idx, reward) => {
                    if (activeRewardLevel === null) return;
                    const levels = watch("referral_levels") || [];
                    const level = levels[activeRewardLevel];
                    const existing = level.rewards ?? [];

                    // prevent duplicate asset on update
                    const ids = existing.map((r: any, i: number) =>
                      i == idx ? reward.assetId : r.assetId
                    );
                    const dup = ids.find((a, i) => ids.indexOf(a) !== i);
                    if (dup) {
                      appToast.error(`Asset ${dup} already used in this level`);
                      return;
                    }

                    const nextRewards = [...existing];
                    nextRewards[idx] = reward;
                    const nextLevels = [...levels];
                    nextLevels[activeRewardLevel] = {
                      ...level,
                      rewards: nextRewards,
                    };
                    setValue("referral_levels", nextLevels as any, {
                      shouldDirty: true,
                      shouldValidate: true,
                    });
                  }}
                />
              ) : null
            }
            left={
              <div className="flex flex-col gap-6">
                {/* Levels */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {levelFields.length === 0 && (
                    <p className="text-sm text-muted-foreground col-span-full">
                      No levels configured. Click + to add a level.
                    </p>
                  )}

                  {levelFields.map((levelField, index) => {
                    const levels = watch("referral_levels") || [];
                    const prevRequired =
                      index > 0
                        ? levels[index - 1]?.totalUniqueVisitsRequired ?? 1
                        : 1;
                    const rewardsForLevel = levels[index]?.rewards ?? [];

                    return (
                      <Card
                        key={levelField.id ?? index}
                        className="rounded-2xl border bg-primary/5 p-4 space-y-3"
                      >
                        <div className="flex items-center justify_between">
                          <span className="text-xs uppercase text-muted-foreground">
                            Level {index + 1}
                          </span>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => handleRemoveLevel(index)}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                        </div>

                        {/* totalUniqueVisitsRequired */}
                        <FormField
                          control={control}
                          name={`referral_levels.${index}.totalUniqueVisitsRequired`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs text-muted-foreground">
                                Total Unique Visits Required
                              </FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min={prevRequired + (index > 0 ? 1 : 0)}
                                  {...field}
                                  value={field.value ?? ""}
                                  onChange={(e) =>
                                    field.onChange(
                                      e.target.value === ""
                                        ? ""
                                        : Number(e.target.value)
                                    )
                                  }
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {/* Rewards block – same Add Reward UX block as PollCreate */}
                        <div className="space-y-2">
                          <div className="flex justify_between items_center">
                            <span className="text-xs text-muted-foreground">
                              Rewards (min 1, max 4)
                            </span>
                            <Button
                              type="button"
                              size="icon"
                              onClick={() => {
                                setActiveRewardLevel(index);
                                setActiveRewardIndex(-1);
                              }}
                              className="w-fit p-2"
                              disabled={rewardsForLevel.length >= 4}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>

                          {rewardsForLevel.length > 0 && (
                            <ReferralRewardList
                              fields={rewardsForLevel as any}
                              assetOptions={ASSET_OPTIONS as any}
                              onEdit={(rewardIdx) => {
                                setActiveRewardLevel(index);
                                setActiveRewardIndex(rewardIdx);
                              }}
                              onAdd={() => {
                                setActiveRewardLevel(index);
                                setActiveRewardIndex(-1);
                              }}
                              remove={(rewardIdx) => {
                                const allLevels =
                                  watch("referral_levels") || [];
                                const lvl = allLevels[index];
                                const nextRewards = [
                                  ...(lvl.rewards ?? []),
                                ] as ReferralReward[];
                                if (nextRewards.length <= 1) return;
                                nextRewards.splice(rewardIdx, 1);
                                const nextLevels = [...allLevels];
                                nextLevels[index] = {
                                  ...lvl,
                                  rewards: nextRewards,
                                };
                                setValue("referral_levels", nextLevels as any, {
                                  shouldDirty: true,
                                  shouldValidate: true,
                                });
                              }}
                              allAssets={ASSET_OPTIONS.map((a) => a.value)}
                            />
                          )}

                          {errors.referral_levels?.[index]?.rewards && (
                            <p className="text-xs text-destructive">
                              {(errors.referral_levels?.[index]?.rewards as any)
                                ?.message ??
                                "Each level must have 1–4 rewards."}
                            </p>
                          )}
                        </div>
                      </Card>
                    );
                  })}
                </div>

                {typeof errors.referral_levels?.message === "string" && (
                  <p className="text-sm text-destructive">
                    {errors.referral_levels.message}
                  </p>
                )}
              </div>
            }
          />
        </form>
      </Form>
    </div>
  );
};

export default ReferralConfig;
