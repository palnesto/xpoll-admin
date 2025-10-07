// import { useMemo } from "react";
// import { useNavigate } from "react-router-dom";
// import { useForm, useFieldArray } from "react-hook-form";
// import { z } from "zod";
// import { zodResolver } from "@hookform/resolvers/zod";

// import { endpoints } from "@/api/endpoints";
// import { useApiMutation } from "@/hooks/useApiMutation";
// import { queryClient } from "@/api/queryClient";
// import { appToast } from "@/utils/toast";

// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
// import { Loader2 } from "lucide-react";

// import ResourceAssetsEditor from "@/components/polling/editors/ResourceAssetsEditor";
// import RewardsEditor, {
//   type AssetOption,
// } from "@/components/polling/editors/RewardsEditor";
// import TargetGeoEditor from "@/components/polling/editors/TargetGeoEditor";
// import ExpireRewardAtPicker from "@/components/polling/editors/ExpireRewardAtPicker";
// import SubPollEditor from "@/components/polling/cards/SubPollEditor";

// import { useImageUpload } from "@/hooks/upload/useAssetUpload";
// import { extractYouTubeId } from "@/utils/youtube";

// // NEW: shadcn form wrappers to show errors
// import {
//   Form, // provider
//   FormField, // field bridge
//   FormItem,
//   FormLabel,
//   FormControl,
//   FormMessage,
// } from "@/components/ui/form";

// /* =========================================================
//    Constants
//    ========================================================= */
// const TOTAL_LEVELS = 10 as const;
// const ASSET_OPTIONS: AssetOption[] = [
//   { label: "OCTA", value: "xOcta" },
//   { label: "MYST", value: "xMYST" },
//   { label: "DROP", value: "xDrop" },
//   { label: "XPOLL", value: "xPoll" },
// ];

// /* =========================================================
//    Zod for form (aligns with your API zods)
//    ========================================================= */
// const optionZ = z.object({ text: z.string().min(3).trim() });
// const resourceAssetZ = z.union([
//   z.object({ type: z.literal("youtube"), value: z.string().min(11) }),
//   z.object({
//     type: z.literal("image"),
//     value: z.array(z.union([z.instanceof(File), z.string()])).nullable(),
//   }),
// ]);
// const rewardRowZ = z
//   .object({
//     assetId: z.enum(["xOcta", "xMYST", "xDrop", "xPoll"]),
//     amount: z.coerce.number().int().min(1),
//     rewardAmountCap: z.coerce.number().int().min(1),
//     rewardType: z.enum(["max", "min"]).default("max"),
//   })
//   .refine((r) => r.rewardAmountCap >= r.amount, {
//     message: "rewardAmountCap must be >= amount",
//     path: ["rewardAmountCap"],
//   });

// // trialZod-like
// const trialFormZ = z
//   .object({
//     title: z.string().min(3).trim(),
//     description: z.string().min(3).trim(),
//     rewards: z.array(rewardRowZ).optional(),
//     expireRewardAt: z
//       .string()
//       .datetime()
//       .optional()
//       .or(z.literal("").optional())
//       .optional(),
//     targetGeo: z
//       .object({
//         countries: z.array(z.string()).default([]),
//         states: z.array(z.string()).default([]),
//         cities: z.array(z.string()).default([]),
//       })
//       .optional(),
//     resourceAssets: z.array(resourceAssetZ).default([]),
//   })
//   .strict();

// // subPollCreateZod-like (no rewards/expire/targetGeo)
// const subPollZ = z
//   .object({
//     title: z.string().min(3).trim(),
//     description: z.string().min(3).trim(),
//     resourceAssets: z.array(resourceAssetZ).default([]),
//     options: z.array(optionZ).min(2).max(4),
//   })
//   .strict();

// const formSchema = z
//   .object({
//     trial: trialFormZ,
//     polls: z.array(subPollZ).min(1), // max handled by server
//   })
//   .superRefine((val, ctx) => {
//     const ids = (val.trial.rewards ?? []).map((r) => r.assetId);
//     const dup = ids.find((a, i) => ids.indexOf(a) !== i);
//     if (dup)
//       ctx.addIssue({
//         code: z.ZodIssueCode.custom,
//         path: ["trial", "rewards"],
//         message: `Duplicate reward assetId: ${dup}`,
//       });
//   });

// type FormValues = z.infer<typeof formSchema>;
// type OutputResourceAsset =
//   | { type: "youtube"; value: string }
//   | { type: "image"; value: string };

// /* =========================================================
//    Component
//    ========================================================= */
// export default function TrialCreatePage() {
//   const navigate = useNavigate();

//   const defaultValues: FormValues = useMemo(
//     () => ({
//       trial: {
//         title: "",
//         description: "",
//         resourceAssets: [],
//         rewards: [
//           {
//             assetId: ASSET_OPTIONS[0].value as any,
//             amount: 1,
//             rewardAmountCap: 1,
//             rewardType: "max",
//           },
//         ],
//         targetGeo: { countries: [], states: [], cities: [] },
//         expireRewardAt: "",
//       },
//       polls: [
//         {
//           title: "",
//           description: "",
//           resourceAssets: [],
//           options: [{ text: "" }, { text: "" }],
//         },
//       ],
//     }),
//     []
//   );

//   const form = useForm<FormValues>({
//     resolver: zodResolver(formSchema),
//     defaultValues,
//     mode: "onChange",
//   });
//   const { control, handleSubmit } = form;
//   const pollsArray = useFieldArray({ control, name: "polls" });
//   console.log("watch", form.watch());
//   console.log("errors", form.formState.errors);
//   const { mutate, isPending } = useApiMutation<any, any>({
//     route: endpoints.entities.trials.create,
//     method: "POST",
//     onSuccess: () => {
//       appToast.success("Trial created");
//       queryClient.invalidateQueries({
//         queryKey: [endpoints.entities.trials.all],
//       });
//       navigate("/trials");
//     },
//   });

//   const { uploadImage, loading: imageUploading } = useImageUpload();
//   const isBusy = isPending || imageUploading;

//   const normalizeAssets = async (
//     arr?: { type: "image" | "youtube"; value: any }[]
//   ): Promise<OutputResourceAsset[]> => {
//     const items = arr ?? [];
//     return Promise.all(
//       items.map(async (a) => {
//         if (a.type === "youtube")
//           return { type: "youtube", value: extractYouTubeId(String(a.value)) };
//         const list = (a.value ?? []) as (File | string)[];
//         let first = list[0];
//         if (first instanceof File) first = await uploadImage(first);
//         return { type: "image", value: typeof first === "string" ? first : "" };
//       })
//     );
//   };

//   const onSubmit = async (v: FormValues) => {
//     const payload = {
//       trial: {
//         title: v.trial.title,
//         description: v.trial.description,
//         resourceAssets: await normalizeAssets(v.trial.resourceAssets),
//         ...(Array.isArray(v.trial.rewards) && v.trial.rewards.length > 0
//           ? {
//               rewards: v.trial.rewards.map((r) => ({
//                 assetId: r.assetId,
//                 amount: r.amount,
//                 rewardAmountCap: r.rewardAmountCap,
//                 rewardType: r.rewardType,
//               })),
//             }
//           : {}),
//         targetGeo: v.trial.targetGeo,
//         expireRewardAt: v.trial.expireRewardAt?.trim()
//           ? v.trial.expireRewardAt
//           : undefined,
//       },
//       polls: await Promise.all(
//         v.polls.map(async (p) => ({
//           title: p.title,
//           description: p.description,
//           resourceAssets: await normalizeAssets(p.resourceAssets),
//           options: p.options.map((o) => ({ text: o.text.trim() })),
//         }))
//       ),
//     };

//     console.log("payload", payload);
//     mutate(payload as any);
//   };

//   return (
//     <Form {...form}>
//       <div className="p-4 space-y-6 max-w-5xl">
//         <h1 className="text-2xl font-bold">Create Trial</h1>

//         {/* TRIAL */}
//         <Card>
//           <CardHeader>
//             <CardTitle>Trial</CardTitle>
//           </CardHeader>
//           <CardContent className="space-y-6">
//             {/* Title with visible error */}
//             <div className="space-y-2">
//               <FormField
//                 control={control}
//                 name="trial.title"
//                 render={({ field }) => (
//                   <FormItem>
//                     <FormLabel className="text-sm font-medium">Title</FormLabel>
//                     <FormControl>
//                       <Input placeholder="Trial title" {...field} />
//                     </FormControl>
//                     <FormMessage />
//                   </FormItem>
//                 )}
//               />
//             </div>

//             {/* Description with visible error */}
//             <div className="space-y-2">
//               <FormField
//                 control={control}
//                 name="trial.description"
//                 render={({ field }) => (
//                   <FormItem>
//                     <FormLabel className="text-sm font-medium">
//                       Description
//                     </FormLabel>
//                     <FormControl>
//                       <Input placeholder="Short description" {...field} />
//                     </FormControl>
//                     <FormMessage />
//                   </FormItem>
//                 )}
//               />
//             </div>

//             <ResourceAssetsEditor
//               control={control}
//               name="trial.resourceAssets"
//               label="Media (Images / YouTube)"
//             />

//             {/* Multiple asset rewards at Trial level */}
//             <RewardsEditor
//               control={control}
//               name="trial.rewards"
//               assetOptions={ASSET_OPTIONS}
//               includeRewardType
//               showCurvePreview
//               totalLevelsForPreview={TOTAL_LEVELS}
//               label="Rewards (optional)"
//             />

//             <ExpireRewardAtPicker
//               control={control}
//               name="trial.expireRewardAt"
//             />

//             <TargetGeoEditor
//               control={control}
//               watch={form.watch}
//               setValue={form.setValue}
//               basePath="trial.targetGeo"
//             />
//           </CardContent>
//         </Card>

//         {/* POLLS */}
//         <Card>
//           <CardHeader className="flex items-center justify-between">
//             <CardTitle>Polls</CardTitle>
//             <Button
//               type="button"
//               variant="secondary"
//               onClick={() =>
//                 pollsArray.append({
//                   title: "",
//                   description: "",
//                   resourceAssets: [],
//                   options: [{ text: "" }, { text: "" }],
//                 })
//               }
//             >
//               + Add Poll
//             </Button>
//           </CardHeader>

//           <CardContent className="space-y-8">
//             {pollsArray.fields.map((pf, pIdx) => (
//               <SubPollEditor
//                 key={pf.id}
//                 control={control}
//                 index={pIdx}
//                 onRemove={() => pollsArray.remove(pIdx)}
//                 disableRemove={pollsArray.fields.length <= 1}
//                 title="Poll"
//               />
//             ))}
//           </CardContent>
//         </Card>

//         <div className="flex justify-end gap-2">
//           <Button onClick={handleSubmit(onSubmit)} disabled={isBusy}>
//             {isBusy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
//             Create Trial
//           </Button>
//         </div>
//       </div>
//     </Form>
//   );
// }
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm, useFieldArray } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import { endpoints } from "@/api/endpoints";
import { useApiMutation } from "@/hooks/useApiMutation";
import { queryClient } from "@/api/queryClient";
import { appToast } from "@/utils/toast";

import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

import ResourceAssetsEditor from "@/components/polling/editors/ResourceAssetsEditor";
import { type AssetOption } from "@/components/polling/editors/RewardsEditor";
import TargetGeoEditor from "@/components/polling/editors/TargetGeoEditor";
import ExpireRewardAtPicker from "@/components/polling/editors/ExpireRewardAtPicker";
import SubPollEditor from "@/components/polling/cards/SubPollEditor";

import { useImageUpload } from "@/hooks/upload/useAssetUpload";
import { extractYouTubeId } from "@/utils/youtube";

// shadcn form wrappers
import { Form, FormField } from "@/components/ui/form";

// ⬅️ Match Create Poll layout pieces
import { FormCard } from "@/components/form/form-card";
import TwoPane from "@/layouts/TwoPane";
import { FormInput } from "@/components/form/input";
import { FormTextarea } from "@/components/form/textarea";
import RewardsList from "@/components/polling/editors/RewardsList";
import RewardDetailPanel from "@/components/polling/editors/RewardDetailPanel";

/* =========================================================
   Constants
   ========================================================= */
const TOTAL_LEVELS = 10 as const;
const ASSET_OPTIONS: AssetOption[] = [
  { label: "OCTA", value: "xOcta" },
  { label: "MYST", value: "xMYST" },
  { label: "DROP", value: "xDrop" },
  { label: "XPOLL", value: "xPoll" },
];

/* =========================================================
   Zod (unchanged)
   ========================================================= */
const optionZ = z.object({ text: z.string().min(3).trim() });
const resourceAssetZ = z.union([
  z.object({ type: z.literal("youtube"), value: z.string().min(11) }),
  z.object({
    type: z.literal("image"),
    value: z.array(z.union([z.instanceof(File), z.string()])).nullable(),
  }),
]);
const rewardRowZ = z
  .object({
    assetId: z.enum(["xOcta", "xMYST", "xDrop", "xPoll"]),
    amount: z.coerce.number().int().min(1),
    rewardAmountCap: z.coerce.number().int().min(1),
    rewardType: z.enum(["max", "min"]).default("max"),
  })
  .refine((r) => r.rewardAmountCap >= r.amount, {
    message: "rewardAmountCap must be >= amount",
    path: ["rewardAmountCap"],
  });

const trialFormZ = z
  .object({
    title: z.string().min(3).trim(),
    description: z.string().min(3).trim(),
    rewards: z.array(rewardRowZ).optional(),
    expireRewardAt: z
      .string()
      .datetime()
      .optional()
      .or(z.literal("").optional())
      .optional(),
    targetGeo: z
      .object({
        countries: z.array(z.string()).default([]),
        states: z.array(z.string()).default([]),
        cities: z.array(z.string()).default([]),
      })
      .optional(),
    resourceAssets: z.array(resourceAssetZ).default([]),
  })
  .strict();

const subPollZ = z
  .object({
    title: z.string().min(3).trim(),
    description: z.string().min(3).trim(),
    resourceAssets: z.array(resourceAssetZ).default([]),
    options: z.array(optionZ).min(2).max(4),
  })
  .strict();

const formSchema = z
  .object({
    trial: trialFormZ,
    polls: z.array(subPollZ).min(1),
  })
  .superRefine((val, ctx) => {
    const ids = (val.trial.rewards ?? []).map((r) => r.assetId);
    const dup = ids.find((a, i) => ids.indexOf(a) !== i);
    if (dup)
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["trial", "rewards"],
        message: `Duplicate reward assetId: ${dup}`,
      });
  });

type FormValues = z.infer<typeof formSchema>;
type OutputResourceAsset =
  | { type: "youtube"; value: string }
  | { type: "image"; value: string };

/* =========================================================
   Component
   ========================================================= */
export default function TrialCreatePage() {
  const navigate = useNavigate();
  const [activeRewardIndex, setActiveRewardIndex] = useState<number | null>(
    null
  );
  const defaultValues: FormValues = useMemo(
    () => ({
      trial: {
        title: "",
        description: "",
        resourceAssets: [],
        rewards: [
          {
            assetId: ASSET_OPTIONS[0].value as any,
            amount: 1,
            rewardAmountCap: 1,
            rewardType: "max",
          },
        ],
        targetGeo: { countries: [], states: [], cities: [] },
        expireRewardAt: "",
      },
      polls: [
        {
          title: "",
          description: "",
          resourceAssets: [],
          options: [{ text: "" }, { text: "" }],
        },
      ],
    }),
    []
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
    mode: "onChange",
  });

  const { control, handleSubmit, watch, setValue } = form;
  const pollsArray = useFieldArray({ control, name: "polls" });
  const { fields, append, remove, update } = useFieldArray({
    control,
    name: "trial.rewards",
  });
  const { mutate, isPending } = useApiMutation<any, any>({
    route: endpoints.entities.trials.create,
    method: "POST",
    onSuccess: () => {
      appToast.success("Trial created");
      queryClient.invalidateQueries({
        queryKey: [endpoints.entities.trials.all],
      });
      navigate("/trials");
    },
  });

  const { uploadImage, loading: imageUploading } = useImageUpload();
  const isBusy = isPending || imageUploading;

  const normalizeAssets = async (
    arr?: { type: "image" | "youtube"; value: any }[]
  ): Promise<OutputResourceAsset[]> => {
    const items = arr ?? [];
    return Promise.all(
      items.map(async (a) => {
        if (a.type === "youtube")
          return { type: "youtube", value: extractYouTubeId(String(a.value)) };
        const list = (a.value ?? []) as (File | string)[];
        let first = list[0];
        if (first instanceof File) first = await uploadImage(first);
        return { type: "image", value: typeof first === "string" ? first : "" };
      })
    );
  };

  const onSubmit = async (v: FormValues) => {
    const payload = {
      trial: {
        title: v.trial.title,
        description: v.trial.description,
        resourceAssets: await normalizeAssets(v.trial.resourceAssets),
        ...(Array.isArray(v.trial.rewards) && v.trial.rewards.length > 0
          ? {
              rewards: v.trial.rewards.map((r) => ({
                assetId: r.assetId,
                amount: r.amount,
                rewardAmountCap: r.rewardAmountCap,
                rewardType: r.rewardType,
              })),
            }
          : {}),
        targetGeo: v.trial.targetGeo,
        expireRewardAt: v.trial.expireRewardAt?.trim()
          ? v.trial.expireRewardAt
          : undefined,
      },
      polls: await Promise.all(
        v.polls.map(async (p) => ({
          title: p.title,
          description: p.description,
          resourceAssets: await normalizeAssets(p.resourceAssets),
          options: p.options.map((o) => ({ text: o.text.trim() })),
        }))
      ),
    };

    console.log("payload", payload);
    mutate(payload as any);
  };

  return (
    <Form {...form}>
      <div className="p-6 space-y-8 w-full">
        {/* Header (matches Create Poll) */}
        <div className="flex justify-between items-center w-full">
          <h1 className="text-2xl tracking-wider">Create Trial</h1>
          <Button
            type="submit"
            form="trial-form"
            disabled={isBusy}
            className="text-base font-light tracking-wide"
          >
            {isBusy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Trial
          </Button>
        </div>

        {/* Body (matches Create Poll structure) */}
        <form
          id="trial-form"
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-10"
        >
          <TwoPane
            isRightOpen={activeRewardIndex !== null}
            right={
              activeRewardIndex !== null && (
                <RewardDetailPanel
                  index={activeRewardIndex}
                  assetOptions={ASSET_OPTIONS as any}
                  totalLevels={TOTAL_LEVELS}
                  onClose={() => setActiveRewardIndex(null)}
                  rewards={fields}
                  append={append}
                  update={update}
                />
              )
            }
            left={
              <div className="flex flex-col gap-6">
                {/* Grid: Basic Info + Assets */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormCard title="Basic Info">
                    <FormField
                      control={control}
                      name="trial.title"
                      render={({ field }) => (
                        <FormInput
                          label="Trial Title"
                          placeholder="Enter trial title"
                          {...field}
                        />
                      )}
                    />
                    <FormField
                      control={control}
                      name="trial.description"
                      render={({ field }) => (
                        <FormTextarea
                          label="Description"
                          placeholder="Write description"
                          {...field}
                        />
                      )}
                    />
                  </FormCard>

                  <FormCard title="Resource Assets" subtitle="Max.: 3">
                    <ResourceAssetsEditor
                      control={control}
                      name="trial.resourceAssets"
                      label="Media (Images / YouTube)"
                    />
                  </FormCard>
                </div>

                {/* Rewards (optional) */}
                <FormCard title="Rewards">
                  <RewardsList
                    fields={fields}
                    assetOptions={ASSET_OPTIONS as any}
                    onEdit={(i) => {
                      setActiveRewardIndex(i);
                    }}
                    onAdd={() => {
                      setActiveRewardIndex(-1);
                    }}
                    remove={(i) => {
                      remove(i);
                    }}
                    allAssets={ASSET_OPTIONS.map((a) => a.value)}
                  />
                </FormCard>
                {/* <FormCard title="Rewards">
                  <RewardsEditor
                    control={control}
                    name="trial.rewards"
                    assetOptions={ASSET_OPTIONS}
                    includeRewardType
                    showCurvePreview
                    totalLevelsForPreview={TOTAL_LEVELS}
                    label="Rewards"
                  />
                </FormCard> */}

                {/* Expiry */}
                <ExpireRewardAtPicker
                  control={control}
                  name="trial.expireRewardAt"
                />

                {/* Target Geo */}
                <TargetGeoEditor
                  control={control}
                  watch={watch}
                  setValue={setValue}
                  basePath="trial.targetGeo"
                />

                <section className="border rounded-lg p-4 space-y-6">
                  <div className="flex justify-between items-center w-full">
                    <h1 className="text-2xl tracking-wider">Polls</h1>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() =>
                        pollsArray.append({
                          title: "",
                          description: "",
                          resourceAssets: [],
                          options: [{ text: "" }, { text: "" }],
                        })
                      }
                    >
                      + Add Poll
                    </Button>
                  </div>
                  <div className="space-y-8">
                    {pollsArray.fields.map((pf, pIdx) => (
                      <SubPollEditor
                        key={pf.id}
                        control={control}
                        index={pIdx}
                        onRemove={() => pollsArray.remove(pIdx)}
                        disableRemove={pollsArray.fields.length <= 1}
                        title={`Poll ${pIdx + 1}`}
                      />
                    ))}
                  </div>
                </section>
              </div>
            }
          />
        </form>
      </div>
    </Form>
  );
}
