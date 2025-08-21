import { Control, useFieldArray, UseFormWatch } from "react-hook-form";
import z from "zod";
import { Button } from "./ui/button";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "./ui/form";
import { Input } from "./ui/input";

export const ASSET_OPTIONS = [
  { label: "OCTA", value: "xOcta" },
  { label: "MYST", value: "xMYST" },
  { label: "DROP", value: "xDrop" },
] as const;

const resourceAssetZ = z.object({
  type: z.enum(["image", "youtube"]),
  value: z.string().min(1, "Required"),
});

const optionZ = z.object({
  text: z.string().min(3, "Min 3 chars").trim(),
});

const rewardZ = z
  .object({
    assetId: z.enum(["xOcta", "xMYST", "xDrop"]),
    amount: z.coerce.number().int().min(1, "Min 1"),
    rewardAmountCap: z.coerce.number().int().min(1, "Min 1"),
  })
  .refine((r) => r.rewardAmountCap >= r.amount, {
    path: ["rewardAmountCap"],
    message: "Cap must be >= amount",
  });

export const pollCreateZ = z.object({
  title: z.string().min(3, "Min 3 chars").trim(),
  description: z.string().min(3, "Min 3 chars").trim(),
  resourceAssets: z.array(resourceAssetZ).default([]),
  options: z
    .array(optionZ)
    .min(2, "Need 2–4 options")
    .max(4, "Need 2–4 options"),
});
export const formSchema = z.object({
  trial: z.object({
    title: z.string().min(3, "Min 3 chars").trim(),
    description: z.string().min(3, "Min 3 chars").trim(),
    resourceAssets: z.array(resourceAssetZ).default([]),
    rewards: z.array(rewardZ).optional(),
    // NEW: targetGeo same shape as in poll/create.tsx
    targetGeo: z.object({
      countries: z.array(z.string()).default([]),
      states: z.array(z.string()).default([]),
      cities: z.array(z.string()).default([]),
    }),
  }),
  polls: z.array(pollCreateZ).min(1, "Add at least 1 poll"),
});
export type FormValues = z.infer<typeof formSchema>;

export function PollCard({
  control,
  watch,
  index,
  onRemove,
  disableRemove,
}: {
  control: Control<FormValues>;
  watch: UseFormWatch<FormValues>;
  index: number;
  onRemove: () => void;
  disableRemove: boolean;
}) {
  // These hooks live inside the child => stable per mounted child
  const pollAssetsArray = useFieldArray({
    control,
    name: `polls.${index}.resourceAssets` as const,
  });
  const pollOptionsArray = useFieldArray({
    control,
    name: `polls.${index}.options` as const,
  });

  const optionsLen = watch(`polls.${index}.options`)?.length ?? 0;

  return (
    <div className="border rounded-lg p-4 space-y-6">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium">Poll #{index + 1}</div>
        <Button
          type="button"
          variant="outline"
          onClick={onRemove}
          disabled={disableRemove}
        >
          Remove Poll
        </Button>
      </div>

      {/* Title */}
      <FormField
        control={control}
        name={`polls.${index}.title` as const}
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

      {/* Description */}
      <FormField
        control={control}
        name={`polls.${index}.description` as const}
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

      {/* Assets */}
      <div className="space-y-2">
        <FormLabel>Media (Images / YouTube) – optional</FormLabel>
        {pollAssetsArray.fields.map((f, aIdx) => {
          const typeName =
            `polls.${index}.resourceAssets.${aIdx}.type` as const;
          const valueName =
            `polls.${index}.resourceAssets.${aIdx}.value` as const;
          const t = watch(typeName);

          return (
            <div key={f.id} className="grid grid-cols-12 gap-2 items-end">
              <div className="col-span-4">
                <FormField
                  control={control}
                  name={typeName}
                  render={({ field }) => (
                    <FormItem>
                      <label className="text-xs">Type</label>
                      <FormControl>
                        <select
                          className="w-full h-9 border rounded-md px-2 bg-transparent"
                          {...field}
                        >
                          <option value="image">IMAGE</option>
                          <option value="youtube">YOUTUBE</option>
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="col-span-7">
                <FormField
                  control={control}
                  name={valueName}
                  render={({ field }) => (
                    <FormItem>
                      <label className="text-xs">
                        {t === "youtube" ? "YouTube URL or ID" : "Image URL"}
                      </label>
                      <FormControl>
                        <Input
                          placeholder={
                            t === "youtube"
                              ? "https://youtube.com/watch?v=… or 11-char ID"
                              : "https://example.com/pic.jpg"
                          }
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="col-span-1">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => pollAssetsArray.remove(aIdx)}
                >
                  Remove
                </Button>
              </div>
            </div>
          );
        })}

        <div className="flex gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => pollAssetsArray.append({ type: "image", value: "" })}
          >
            + Image
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() =>
              pollAssetsArray.append({ type: "youtube", value: "" })
            }
          >
            + YouTube
          </Button>
        </div>
      </div>

      {/* Options */}
      <div className="space-y-2">
        <FormLabel>Options (2–4)</FormLabel>
        {pollOptionsArray.fields.map((f, oIdx) => (
          <div key={f.id} className="flex gap-2 items-end">
            <FormField
              control={control}
              name={`polls.${index}.options.${oIdx}.text` as const}
              render={({ field }) => (
                <FormItem className="flex-1">
                  <FormControl>
                    <Input placeholder={`Option #${oIdx + 1}`} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => pollOptionsArray.remove(oIdx)}
              disabled={pollOptionsArray.fields.length <= 2}
            >
              Remove
            </Button>
          </div>
        ))}

        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={() => pollOptionsArray.append({ text: "" })}
            disabled={optionsLen >= 4}
          >
            Add Option
          </Button>
          <span className="text-sm text-destructive">
            {(false as any) || (formSchema?.shape?.polls && undefined)}
          </span>
        </div>
      </div>
    </div>
  );
}
