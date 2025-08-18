// import { z } from "zod";
// import { zodResolver } from "@hookform/resolvers/zod";
// import { useFieldArray, useForm } from "react-hook-form";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import {
//   Form,
//   FormControl,
//   FormField,
//   FormItem,
//   FormLabel,
//   FormMessage,
// } from "@/components/ui/form";
// import { useEffect, useMemo, useState } from "react";

// // Client-side helpers closely matching server validators
// const mongoId = z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid ID");
// const youtubeId = z
//   .string()
//   .regex(/^[A-Za-z0-9_-]{11}$/, "Invalid YouTube video ID");
// const imageUrl = z
//   .string()
//   .url("Invalid URL")
//   .regex(/\.(jpg|jpeg|png|gif|webp|avif|svg)$/i, "URL must be an image");

// const resourceZ = z.discriminatedUnion("type", [
//   z.object({ type: z.literal("youtube"), value: youtubeId }),
//   z.object({ type: z.literal("image"), value: imageUrl }),
// ]);

// // "archived" is a UI flag we convert to archivedAt Date|null on submit
// const optionClientZ = z.object({
//   _id: z.string().optional(),
//   text: z.string().min(3, "Min 3 chars").trim(),
//   archived: z.boolean().optional().default(false),
// });

// const rewardClientZ = z
//   .object({
//     assetId: z.string().min(1, "Required"), // server expects enum; keep loose here
//     amount: z.coerce.number().int().positive().min(1),
//     rewardAmountCap: z.coerce.number().int().positive().min(1),
//     currentDistribution: z.coerce
//       .number()
//       .int()
//       .nonnegative()
//       .optional()
//       .default(0),
//   })
//   .refine((r) => r.rewardAmountCap >= r.amount, {
//     path: ["rewardAmountCap"],
//     message: "Cap must be >= amount",
//   });

// const baseZ = {
//   assets: z.array(resourceZ).min(1, "At least 1 asset"),
//   title: z.string().min(3, "Min 3 chars").trim(),
//   description: z.string().min(3, "Min 3 chars").trim(),
//   options: z
//     .array(optionClientZ)
//     .min(2, "Need 2-4 options")
//     .max(4, "Need 2-4 options")
//     .refine(
//       (arr) => {
//         const active = arr.filter((o) => !o.archived).length;
//         return active >= 2 && active <= 4;
//       },
//       { message: "Active options must be 2–4" }
//     ),
// };

// const standaloneZ = z.object({
//   ...baseZ,
//   rewards: z.array(rewardClientZ).min(1, "At least 1 reward"),
//   expireRewardAt: z
//     .preprocess(
//       (v) => (v ? new Date(String(v)) : null),
//       z.date().nullable().optional()
//     )
//     .optional(),
//   targetLocations: z
//     .array(mongoId)
//     .optional()
//     .default([])
//     .transform((a) => (a && a.length ? a : undefined)),
//   trialId: z.undefined().optional(),
// });

// const trialZ = z.object({
//   ...baseZ,
//   trialId: z.string().min(1, "Trial ID is required"),
//   // These must not exist on trial polls
//   rewards: z.undefined().optional(),
//   expireRewardAt: z.undefined().optional(),
//   targetLocations: z.undefined().optional(),
// });

// export type PollFormValuesStandalone = z.infer<typeof standaloneZ>;
// export type PollFormValuesTrial = z.infer<typeof trialZ>;
// export type PollFormValues = PollFormValuesStandalone | PollFormValuesTrial;

// export type PollServerShape =
//   | {
//       // standalone
//       title: string;
//       description: string;
//       assets: { type: "youtube" | "image"; value: string }[];
//       options: { _id?: string; text: string; archivedAt?: Date | null }[];
//       rewards: {
//         assetId: string;
//         amount: number;
//         rewardAmountCap: number;
//         currentDistribution?: number;
//       }[];
//       expireRewardAt?: Date | null;
//       targetLocations?: string[];
//       trialId?: undefined;
//     }
//   | {
//       // trial
//       title: string;
//       description: string;
//       assets: { type: "youtube" | "image"; value: string }[];
//       options: { _id?: string; text: string; archivedAt?: Date | null }[];
//       trialId: string;
//       rewards?: undefined;
//       expireRewardAt?: undefined;
//       targetLocations?: undefined;
//     };

// export function PollForm({
//   mode,
//   initialData,
//   onSubmit,
// }: {
//   mode: "create" | "edit";
//   initialData?: any; // API payload for edit
//   onSubmit: (payload: PollServerShape) => void | Promise<void>;
// }) {
//   const inferredIsTrial = !!initialData?.trialId;
//   const [isTrial, setIsTrial] = useState<boolean>(inferredIsTrial);

//   const defaultValues: any = useMemo(() => {
//     if (mode === "edit" && initialData) {
//       // normalize options -> add "archived" flag from archivedAt
//       const options = (initialData.options ?? []).map((o: any) => ({
//         _id: o._id,
//         text: o.text ?? "",
//         archived: !!o.archivedAt,
//       }));

//       const base = {
//         title: initialData.title ?? "",
//         description: initialData.description ?? "",
//         assets: initialData.assets ?? [],
//         options: options.length ? options : [{ text: "", archived: false }],
//       };

//       if (inferredIsTrial) {
//         return {
//           ...base,
//           trialId: initialData.trialId ?? "",
//         };
//       }
//       return {
//         ...base,
//         rewards:
//           initialData.rewards?.length > 0
//             ? initialData.rewards
//             : [
//                 {
//                   assetId: "",
//                   amount: 1,
//                   rewardAmountCap: 1,
//                   currentDistribution: 0,
//                 },
//               ],
//         expireRewardAt: initialData.expireRewardAt
//           ? new Date(initialData.expireRewardAt).toISOString().slice(0, 16) // yyyy-MM-ddTHH:mm for input[type=datetime-local]
//           : "",
//         targetLocations: initialData.targetLocations ?? [],
//       };
//     }

//     // CREATE defaults
//     if (isTrial) {
//       return {
//         title: "",
//         description: "",
//         assets: [{ type: "image", value: "" }],
//         options: [{ text: "" }, { text: "" }],
//         trialId: "",
//       };
//     }
//     return {
//       title: "",
//       description: "",
//       assets: [{ type: "image", value: "" }],
//       options: [{ text: "" }, { text: "" }],
//       rewards: [
//         { assetId: "", amount: 1, rewardAmountCap: 1, currentDistribution: 0 },
//       ],
//       expireRewardAt: "",
//       targetLocations: [],
//     };
//   }, [mode, initialData, inferredIsTrial, isTrial]);

//   const schema = useMemo(() => (isTrial ? trialZ : standaloneZ), [isTrial]);

//   const form = useForm<PollFormValues>({
//     resolver: zodResolver(schema as any),
//     defaultValues,
//     mode: "onChange",
//   });

//   // Reset when toggling trial/standalone on CREATE (disabled on EDIT)
//   useEffect(() => {
//     if (mode === "create") {
//       form.reset(defaultValues);
//     }
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [isTrial]);

//   const {
//     control,
//     handleSubmit,
//     formState: { isSubmitting },
//     register,
//     watch,
//     setValue,
//   } = form;

//   // Arrays
//   const assetsArray = useFieldArray({ control, name: "assets" as any });
//   const optionsArray = useFieldArray({ control, name: "options" as any });
//   const rewardsArray = useFieldArray({
//     control,
//     name: "rewards" as any, // only used for standalone
//   });

//   // Helpers
//   const makeServerPayload = (values: any): PollServerShape => {
//     const base = {
//       title: values.title,
//       description: values.description,
//       assets: values.assets,
//       options: values.options.map((o: any) => ({
//         _id: o._id || undefined,
//         text: o.text,
//         archivedAt: o.archived ? new Date() : null,
//       })),
//     };

//     if (isTrial) {
//       return {
//         ...(base as any),
//         trialId: values.trialId,
//       };
//     }

//     // standalone
//     return {
//       ...(base as any),
//       rewards: values.rewards.map((r: any) => ({
//         assetId: r.assetId,
//         amount: Number(r.amount),
//         rewardAmountCap: Number(r.rewardAmountCap),
//         ...(r.currentDistribution !== undefined
//           ? { currentDistribution: Number(r.currentDistribution) }
//           : {}),
//       })),
//       expireRewardAt: values.expireRewardAt
//         ? new Date(values.expireRewardAt)
//         : null,
//       ...(values.targetLocations && values.targetLocations.length
//         ? { targetLocations: values.targetLocations }
//         : {}),
//     };
//   };

//   const submit = (v: PollFormValues) => onSubmit(makeServerPayload(v));

//   const canToggleType = mode === "create"; // disallow switching type on edit

//   return (
//     <div className="max-w-3xl space-y-8">
//       {canToggleType && (
//         <div className="flex items-center gap-3">
//           <input
//             id="isTrial"
//             type="checkbox"
//             checked={isTrial}
//             onChange={(e) => setIsTrial(e.target.checked)}
//           />
//           <label htmlFor="isTrial" className="text-sm">
//             This is a Trial poll (has <code>trialId</code>, no
//             rewards/expire/targets)
//           </label>
//         </div>
//       )}

//       <Form {...form}>
//         <form onSubmit={handleSubmit(submit)} className="space-y-8">
//           {/* Title */}
//           <FormField
//             control={control}
//             name={"title" as any}
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

//           {/* Description */}
//           <FormField
//             control={control}
//             name={"description" as any}
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

//           {/* Assets */}
//           <div className="space-y-2">
//             <FormLabel>Assets</FormLabel>
//             {assetsArray.fields.map((f, idx) => (
//               <div key={f.id} className="grid grid-cols-12 gap-2 items-end">
//                 <div className="col-span-4">
//                   <label className="text-xs">Type</label>
//                   <select
//                     className="w-full h-9 border rounded-md px-2 bg-transparent"
//                     {...register(`assets.${idx}.type` as const)}
//                   >
//                     <option value="image">image</option>
//                     <option value="youtube">youtube</option>
//                   </select>
//                 </div>
//                 <div className="col-span-7">
//                   <label className="text-xs">Value</label>
//                   <Input
//                     placeholder="Image URL or YouTube ID"
//                     {...register(`assets.${idx}.value` as const)}
//                   />
//                 </div>
//                 <div className="col-span-1">
//                   <Button
//                     type="button"
//                     variant="outline"
//                     onClick={() => assetsArray.remove(idx)}
//                   >
//                     Remove
//                   </Button>
//                 </div>
//               </div>
//             ))}
//             <Button
//               type="button"
//               variant="secondary"
//               onClick={() =>
//                 assetsArray.append({ type: "image", value: "" } as any)
//               }
//             >
//               Add Asset
//             </Button>
//             <FormMessage />
//           </div>

//           {/* Options */}
//           <div className="space-y-2">
//             <FormLabel>
//               Options (2–4, min 3 chars; archive to deactivate)
//             </FormLabel>
//             {optionsArray.fields.map((f, idx) => (
//               <div key={f.id} className="grid grid-cols-12 gap-2 items-end">
//                 <div className="col-span-8">
//                   <Input
//                     placeholder={`Option #${idx + 1}`}
//                     {...register(`options.${idx}.text` as const)}
//                   />
//                 </div>
//                 <div className="col-span-3 flex items-center gap-2">
//                   <input
//                     id={`options.${idx}.archived`}
//                     type="checkbox"
//                     {...register(`options.${idx}.archived` as const)}
//                   />
//                   <label
//                     htmlFor={`options.${idx}.archived`}
//                     className="text-sm"
//                   >
//                     Archived
//                   </label>
//                 </div>
//                 <div className="col-span-1">
//                   <Button
//                     type="button"
//                     variant="outline"
//                     onClick={() => optionsArray.remove(idx)}
//                     disabled={optionsArray.fields.length <= 2}
//                   >
//                     Remove
//                   </Button>
//                 </div>
//               </div>
//             ))}
//             <Button
//               type="button"
//               variant="secondary"
//               onClick={() => {
//                 if (optionsArray.fields.length >= 4) return;
//                 optionsArray.append({ text: "" } as any);
//               }}
//             >
//               Add Option
//             </Button>
//             <FormMessage />
//           </div>

//           {/* Trial-only */}
//           {isTrial && (
//             <FormField
//               control={control}
//               name={"trialId" as any}
//               render={({ field }) => (
//                 <FormItem>
//                   <FormLabel>Trial ID</FormLabel>
//                   <FormControl>
//                     <Input placeholder="trialId" {...field} />
//                   </FormControl>
//                   <FormMessage />
//                 </FormItem>
//               )}
//             />
//           )}

//           {/* Standalone-only */}
//           {!isTrial && (
//             <>
//               {/* Rewards */}
//               <div className="space-y-2">
//                 <FormLabel>Rewards (≥1)</FormLabel>
//                 {rewardsArray.fields.map((f, idx) => (
//                   <div key={f.id} className="grid grid-cols-12 gap-2 items-end">
//                     <div className="col-span-3">
//                       <label className="text-xs">Asset ID</label>
//                       <Input
//                         placeholder="assetId (enum on server)"
//                         {...register(`rewards.${idx}.assetId` as const)}
//                       />
//                     </div>
//                     <div className="col-span-2">
//                       <label className="text-xs">Amount</label>
//                       <Input
//                         type="number"
//                         min={1}
//                         {...register(`rewards.${idx}.amount` as const)}
//                       />
//                     </div>
//                     <div className="col-span-3">
//                       <label className="text-xs">Reward Cap</label>
//                       <Input
//                         type="number"
//                         min={1}
//                         {...register(`rewards.${idx}.rewardAmountCap` as const)}
//                       />
//                     </div>
//                     <div className="col-span-3">
//                       <label className="text-xs">Current Distribution</label>
//                       <Input
//                         type="number"
//                         min={0}
//                         {...register(
//                           `rewards.${idx}.currentDistribution` as const
//                         )}
//                       />
//                     </div>
//                     <div className="col-span-1">
//                       <Button
//                         type="button"
//                         variant="outline"
//                         onClick={() => rewardsArray.remove(idx)}
//                       >
//                         Remove
//                       </Button>
//                     </div>
//                   </div>
//                 ))}
//                 <Button
//                   type="button"
//                   variant="secondary"
//                   onClick={() =>
//                     rewardsArray.append({
//                       assetId: "",
//                       amount: 1,
//                       rewardAmountCap: 1,
//                       currentDistribution: 0,
//                     } as any)
//                   }
//                 >
//                   Add Reward
//                 </Button>
//                 <FormMessage />
//               </div>

//               {/* Expire Reward At */}
//               <FormField
//                 control={control}
//                 name={"expireRewardAt" as any}
//                 render={({ field }) => (
//                   <FormItem>
//                     <FormLabel>Expire Reward At</FormLabel>
//                     <FormControl>
//                       <input
//                         type="datetime-local"
//                         className="flex h-9 w-full rounded-md border border-input bg-transparent text-foreground px-3 py-1 text-base shadow-sm md:text-sm"
//                         {...field}
//                       />
//                     </FormControl>
//                     <FormMessage />
//                   </FormItem>
//                 )}
//               />

//               {/* Target Locations (array of MongoIds) */}
//               <FormField
//                 control={control}
//                 name={"targetLocations" as any}
//                 render={({ field }) => (
//                   <FormItem>
//                     <FormLabel>Target Locations</FormLabel>
//                     <FormControl>
//                       <Input
//                         placeholder="Comma-separated Mongo IDs (24 hex)"
//                         value={(field.value ?? []).join(",")}
//                         onChange={(e) =>
//                           field.onChange(
//                             e.target.value
//                               .split(",")
//                               .map((s) => s.trim())
//                               .filter(Boolean)
//                           )
//                         }
//                       />
//                     </FormControl>
//                     <FormMessage />
//                   </FormItem>
//                 )}
//               />
//             </>
//           )}

//           <div className="flex gap-2 justify-end">
//             <Button type="submit" disabled={isSubmitting}>
//               {mode === "create" ? "Create" : "Update"}
//             </Button>
//           </div>
//         </form>
//       </Form>
//     </div>
//   );
// }
