// import { useMemo } from "react";
// import { useNavigate } from "react-router-dom";
// import { z } from "zod";
// import { zodResolver } from "@hookform/resolvers/zod";
// import { useForm } from "react-hook-form";

// import { Input } from "@/components/ui/input";
// import { Button } from "@/components/ui/button";
// import {
//   Form,
//   FormControl,
//   FormField,
//   FormItem,
//   FormLabel,
//   FormMessage,
// } from "@/components/ui/form";

// import { useApiMutation } from "@/hooks/useApiMutation";
// import { endpoints } from "@/api/endpoints";
// import { queryClient } from "@/api/queryClient";
// import { appToast } from "@/utils/toast";

// import { Loader2 } from "lucide-react";
// import { useImageUpload } from "@/hooks/upload/useAssetUpload";

// import ExpireRewardAtPicker from "@/components/polling/editors/ExpireRewardAtPicker";
// import ResourceAssetsEditor from "@/components/polling/editors/ResourceAssetsEditor";
// import RewardsEditor, {
//   type AssetOption,
// } from "@/components/polling/editors/RewardsEditor";
// import TargetGeoEditor from "@/components/polling/editors/TargetGeoEditor";
// import OptionsEditor from "@/components/polling/editors/OptionsEditor";
// import { extractYouTubeId } from "@/utils/youtube";

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
//    Zod (mirror server expectations)
//    ========================================================= */
// const optionZ = z.object({ text: z.string().min(3, "Min 3 chars").trim() });
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
// const resourceAssetFormZ = z.union([
//   z.object({ type: z.literal("youtube"), value: z.string().min(11) }),
//   z.object({
//     type: z.literal("image"),
//     value: z.array(z.union([z.instanceof(File), z.string()])).nullable(),
//   }),
// ]);

// const formSchema = z
//   .object({
//     title: z.string().min(3).trim(),
//     description: z.string().min(3).trim(),
//     options: z.array(optionZ).min(2).max(4),
//     rewards: z.array(rewardRowZ).min(1),
//     targetGeo: z.object({
//       countries: z.array(z.string()).default([]),
//       states: z.array(z.string()).default([]),
//       cities: z.array(z.string()).default([]),
//     }),
//     resourceAssets: z.array(resourceAssetFormZ).default([]),
//     expireRewardAt: z
//       .string()
//       .datetime()
//       .optional()
//       .or(z.literal("").optional())
//       .optional(),
//   })
//   .superRefine((v, ctx) => {
//     const ids = v.rewards.map((r) => r.assetId);
//     const dup = ids.find((a, i) => ids.indexOf(a) !== i);
//     if (dup)
//       ctx.addIssue({
//         code: z.ZodIssueCode.custom,
//         path: ["rewards"],
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
// export default function PollCreatePage() {
//   const navigate = useNavigate();

//   const defaultValues: FormValues = useMemo(
//     () => ({
//       title: "",
//       description: "",
//       options: [{ text: "" }, { text: "" }],
//       rewards: [
//         {
//           assetId: ASSET_OPTIONS[0].value as any,
//           amount: 1,
//           rewardAmountCap: 1,
//           rewardType: "max",
//         },
//       ],
//       targetGeo: { countries: [], states: [], cities: [] },
//       resourceAssets: [],
//       expireRewardAt: "",
//     }),
//     []
//   );

//   const form = useForm<FormValues>({
//     resolver: zodResolver(formSchema),
//     defaultValues,
//     mode: "onChange",
//   });
//   const { control, handleSubmit } = form;

//   const { mutate, isPending } = useApiMutation<any, any>({
//     route: endpoints.entities.polls.create,
//     method: "POST",
//     onSuccess: () => {
//       appToast.success("Poll created");
//       queryClient.invalidateQueries({
//         queryKey: [endpoints.entities.polls.create],
//       });
//       navigate("/polls");
//     },
//   });

//   const { uploadImage, loading: imageUploading } = useImageUpload();
//   const isBusy = isPending || imageUploading;

//   const onSubmit = async (v: FormValues) => {
//     const normalizedResources: OutputResourceAsset[] = await Promise.all(
//       (v.resourceAssets ?? []).map(async (a) => {
//         if (a.type === "youtube")
//           return { type: "youtube", value: extractYouTubeId(a.value) };
//         const arr = a.value ?? [];
//         let first = arr[0];
//         if (first instanceof File) {
//           first = await uploadImage(first);
//           console.log("first", first);
//         }
//         return { type: "image", value: typeof first === "string" ? first : "" };
//       })
//     );

//     const payload = {
//       title: v.title.trim(),
//       description: v.description.trim(),
//       resourceAssets: normalizedResources,
//       options: v.options.map((o) => ({
//         text: o.text.trim(),
//         archivedAt: null,
//       })),
//       rewards: v.rewards.map((r) => ({
//         assetId: r.assetId,
//         amount: r.amount,
//         rewardAmountCap: r.rewardAmountCap,
//         currentDistribution: 0,
//         rewardType: r.rewardType,
//       })),
//       targetGeo: v.targetGeo,
//       expireRewardAt: v.expireRewardAt?.trim() ? v.expireRewardAt : undefined,
//     };

//     console.log("payload", payload);

//     mutate(payload as any);
//   };

//   return (
//     <div className="p-4 space-y-6 max-w-3xl">
//       <h1 className="text-2xl font-bold">Create Poll</h1>

//       <Form {...form}>
//         <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
//           <FormField
//             control={control}
//             name="title"
//             render={({ field }) => (
//               <FormItem>
//                 <FormLabel>Title</FormLabel>
//                 <FormControl>
//                   <Input placeholder="Poll title" {...field} />
//                 </FormControl>
//                 <FormMessage />
//               </FormItem>
//             )}
//           />

//           <FormField
//             control={control}
//             name="description"
//             render={({ field }) => (
//               <FormItem>
//                 <FormLabel>Description</FormLabel>
//                 <FormControl>
//                   <Input placeholder="Short description" {...field} />
//                 </FormControl>
//                 <FormMessage />
//               </FormItem>
//             )}
//           />

//           <ResourceAssetsEditor control={control} name="resourceAssets" />

//           <OptionsEditor
//             control={control}
//             name="options"
//             label="Options (2–4)"
//             min={2}
//             max={4}
//           />

//           <RewardsEditor
//             control={control}
//             name="rewards"
//             assetOptions={ASSET_OPTIONS}
//             includeRewardType
//             showCurvePreview
//             totalLevelsForPreview={TOTAL_LEVELS}
//             label="Rewards"
//           />

//           <ExpireRewardAtPicker control={control} name="expireRewardAt" />

//           <TargetGeoEditor
//             control={control}
//             watch={form.watch}
//             setValue={form.setValue}
//             basePath="targetGeo"
//           />

//           <div className="flex justify-end gap-2">
//             <Button type="submit" disabled={isBusy}>
//               {isBusy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
//               Create
//             </Button>
//           </div>
//         </form>
//       </Form>
//     </div>
//   );
// }
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

import { useApiMutation } from "@/hooks/useApiMutation";
import { endpoints } from "@/api/endpoints";
import { queryClient } from "@/api/queryClient";
import { appToast } from "@/utils/toast";

import { Loader2 } from "lucide-react";
import { useImageUpload } from "@/hooks/upload/useAssetUpload";

import ExpireRewardAtPicker from "@/components/polling/editors/ExpireRewardAtPicker";
import ResourceAssetsEditor from "@/components/polling/editors/ResourceAssetsEditor";
import RewardsEditor, {
  type AssetOption,
} from "@/components/polling/editors/RewardsEditor";
import TargetGeoEditor from "@/components/polling/editors/TargetGeoEditor";
import OptionsEditor from "@/components/polling/editors/OptionsEditor";
import { extractYouTubeId } from "@/utils/youtube";

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
   Zod (mirror server expectations)
   ========================================================= */
const optionZ = z.object({ text: z.string().min(3, "Min 3 chars").trim() });
const rewardRowZ = z
  .object({
    assetId: z.enum(["xOcta", "xMYST", "xDrop", "xPoll"]),
    amount: z.coerce.number().int().min(1), // BASE integer
    rewardAmountCap: z.coerce.number().int().min(1), // BASE integer
    rewardType: z.enum(["max", "min"]).default("max"),
  })
  .refine((r) => r.rewardAmountCap >= r.amount, {
    message: "rewardAmountCap must be >= amount",
    path: ["rewardAmountCap"],
  });

const resourceAssetFormZ = z.union([
  z.object({ type: z.literal("youtube"), value: z.string().min(11) }),
  z.object({
    type: z.literal("image"),
    value: z.array(z.union([z.instanceof(File), z.string()])).nullable(),
  }),
]);

const formSchema = z
  .object({
    title: z.string().min(3).trim(),
    description: z.string().min(3).trim(),
    options: z.array(optionZ).min(2).max(4),
    rewards: z.array(rewardRowZ).min(1),
    targetGeo: z.object({
      countries: z.array(z.string()).default([]),
      states: z.array(z.string()).default([]),
      cities: z.array(z.string()).default([]),
    }),
    resourceAssets: z.array(resourceAssetFormZ).default([]),
    expireRewardAt: z
      .string()
      .datetime()
      .optional()
      .or(z.literal("").optional())
      .optional(),
  })
  .superRefine((v, ctx) => {
    const ids = v.rewards.map((r) => r.assetId);
    const dup = ids.find((a, i) => ids.indexOf(a) !== i);
    if (dup)
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["rewards"],
        message: `Duplicate reward assetId: ${dup}`,
      });
  });

type FormValues = z.infer<typeof formSchema>;
type OutputResourceAsset =
  | { type: "youtube"; value: string }
  | { type: "image"; value: string };

export default function PollCreatePage() {
  const navigate = useNavigate();

  const defaultValues: FormValues = useMemo(
    () => ({
      title: "",
      description: "",
      options: [{ text: "" }, { text: "" }],
      rewards: [
        {
          assetId: ASSET_OPTIONS[0].value as any,
          amount: 0 as any, // store BASE; 0 → blank parent input
          rewardAmountCap: 0 as any, // store BASE; 0 → blank parent input
          rewardType: "max",
        },
      ],
      targetGeo: { countries: [], states: [], cities: [] },
      resourceAssets: [],
      expireRewardAt: "",
    }),
    []
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
    mode: "onChange",
  });
  const { control, handleSubmit } = form;

  const { mutate, isPending } = useApiMutation<any, any>({
    route: endpoints.entities.polls.create,
    method: "POST",
    onSuccess: () => {
      appToast.success("Poll created");
      queryClient.invalidateQueries({
        queryKey: [endpoints.entities.polls.create],
      });
      navigate("/polls");
    },
  });

  const { uploadImage, loading: imageUploading } = useImageUpload();
  const isBusy = isPending || imageUploading;

  const onSubmit = async (v: FormValues) => {
    const normalizedResources: OutputResourceAsset[] = await Promise.all(
      (v.resourceAssets ?? []).map(async (a) => {
        if (a.type === "youtube")
          return { type: "youtube", value: extractYouTubeId(a.value) };
        const arr = a.value ?? [];
        let first = arr[0];
        if (first instanceof File) {
          first = await uploadImage(first);
        }
        return { type: "image", value: typeof first === "string" ? first : "" };
      })
    );

    const payload = {
      title: v.title.trim(),
      description: v.description.trim(),
      resourceAssets: normalizedResources,
      options: v.options.map((o) => ({
        text: o.text.trim(),
        archivedAt: null,
      })),
      rewards: v.rewards.map((r) => ({
        assetId: r.assetId,
        amount: r.amount, // BASE integer
        rewardAmountCap: r.rewardAmountCap, // BASE integer
        currentDistribution: 0,
        rewardType: r.rewardType,
      })),
      targetGeo: v.targetGeo,
      expireRewardAt: v.expireRewardAt?.trim() ? v.expireRewardAt : undefined,
    };

    mutate(payload as any);
  };

  return (
    <div className="p-4 space-y-6 max-w-3xl">
      <h1 className="text-2xl font-bold">Create Poll</h1>

      <Form {...form}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          <FormField
            control={control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Title</FormLabel>
                <FormControl>
                  <Input placeholder="Poll title" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Input placeholder="Short description" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <ResourceAssetsEditor control={control} name="resourceAssets" />

          <OptionsEditor
            control={control}
            name="options"
            label="Options"
            min={2}
            max={4}
          />

          <RewardsEditor
            control={control}
            name="rewards"
            assetOptions={ASSET_OPTIONS}
            includeRewardType
            showCurvePreview
            totalLevelsForPreview={TOTAL_LEVELS}
            label="Rewards"
          />

          <ExpireRewardAtPicker control={control} name="expireRewardAt" />

          <TargetGeoEditor
            control={control}
            watch={form.watch}
            setValue={form.setValue}
            basePath="targetGeo"
          />

          <div className="flex justify-end gap-2">
            <Button type="submit" disabled={isBusy}>
              {isBusy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
