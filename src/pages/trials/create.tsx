// src/pages/trials/create.tsx
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { useForm, useFieldArray, Control, UseFormWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { endpoints } from "@/api/endpoints";
import { useApiMutation } from "@/hooks/useApiMutation";
import { queryClient } from "@/api/queryClient";
import { appToast } from "@/utils/toast";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { extractYouTubeId } from "../polls/create";

/* -------------------- Schema -------------------- */

const ASSET_OPTIONS = [
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

const pollCreateZ = z.object({
  title: z.string().min(3, "Min 3 chars").trim(),
  description: z.string().min(3, "Min 3 chars").trim(),
  resourceAssets: z.array(resourceAssetZ).default([]),
  options: z
    .array(optionZ)
    .min(2, "Need 2–4 options")
    .max(4, "Need 2–4 options"),
});

const formSchema = z.object({
  trial: z.object({
    title: z.string().min(3, "Min 3 chars").trim(),
    description: z.string().min(3, "Min 3 chars").trim(),
    resourceAssets: z.array(resourceAssetZ).default([]),
    rewards: z.array(rewardZ).optional(),
  }),
  polls: z.array(pollCreateZ).min(1, "Add at least 1 poll"),
});

type FormValues = z.infer<typeof formSchema>;

/* -------------------- Child component (per poll) -------------------- */

function PollCard({
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

/* -------------------- Page -------------------- */

export default function TrialCreatePage() {
  const navigate = useNavigate();

  const defaultValues: FormValues = useMemo(
    () => ({
      trial: {
        title: "",
        description: "",
        resourceAssets: [],
        rewards: [
          { assetId: ASSET_OPTIONS[0].value, amount: 1, rewardAmountCap: 1 },
        ],
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

  const { control, handleSubmit, watch } = form;

  const trialAssetsArray = useFieldArray({
    control,
    name: "trial.resourceAssets",
  });
  const trialRewardsArray = useFieldArray({
    control,
    name: "trial.rewards" as const,
  });
  const pollsArray = useFieldArray({ control, name: "polls" });

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

  const onSubmit = async (v: FormValues) => {
    // helper: normalize images/youtube (accepts undefined)
    const normalizeAssets = (
      arr?: { type: "image" | "youtube"; value: string }[]
    ) =>
      (arr ?? []).map((a) => ({
        type: a.type,
        value:
          a.type === "youtube"
            ? extractYouTubeId(a.value.trim())
            : a.value.trim(),
      }));

    const payload = {
      trial: {
        title: v.trial.title,
        description: v.trial.description,
        resourceAssets: normalizeAssets(v.trial.resourceAssets),
        ...(Array.isArray(v.trial.rewards) && v.trial.rewards.length > 0
          ? {
              rewards: v.trial.rewards.map((r) => ({
                assetId: r.assetId,
                amount: r.amount,
                rewardAmountCap: r.rewardAmountCap,
              })),
            }
          : {}),
        // no expireRewardAt per your instruction
      },
      polls: v.polls.map((p) => ({
        title: p.title,
        description: p.description,
        resourceAssets: normalizeAssets(p.resourceAssets),
        options: p.options.map((o) => ({ text: o.text.trim() })), // server fills archivedAt/null & ids
      })),
    };

    await mutate(payload as any);
  };

  return (
    <div className="p-4 space-y-6 max-w-5xl">
      <h1 className="text-2xl font-bold">Create Trial</h1>

      {/* TRIAL */}
      <Card>
        <CardHeader>
          <CardTitle>Trial</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <Form {...form}>
            {/* Title */}
            <FormField
              control={control}
              name="trial.title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Trial title" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Description */}
            <FormField
              control={control}
              name="trial.description"
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

            {/* Trial Assets */}
            <div className="space-y-2">
              <FormLabel>Media (Images / YouTube) – optional</FormLabel>
              {trialAssetsArray.fields.map((f, idx) => {
                const typeName = `trial.resourceAssets.${idx}.type` as const;
                const valueName = `trial.resourceAssets.${idx}.value` as const;
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
                              {t === "youtube"
                                ? "YouTube URL or ID"
                                : "Image URL"}
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
                        onClick={() => trialAssetsArray.remove(idx)}
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
                  onClick={() =>
                    trialAssetsArray.append({ type: "image", value: "" })
                  }
                >
                  + Image
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() =>
                    trialAssetsArray.append({ type: "youtube", value: "" })
                  }
                >
                  + YouTube
                </Button>
              </div>
            </div>

            {/* Rewards (optional) */}
            <div className="space-y-2">
              <FormLabel>Rewards (optional)</FormLabel>
              {trialRewardsArray.fields.map((f, rIdx) => (
                <div key={f.id} className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-4">
                    <FormField
                      control={control}
                      name={`trial.rewards.${rIdx}.assetId` as const}
                      render={({ field }) => (
                        <FormItem>
                          <label className="text-xs">Asset</label>
                          <FormControl>
                            <select
                              className="w-full h-9 border rounded-md px-2 bg-transparent"
                              {...field}
                            >
                              {ASSET_OPTIONS.map((o) => (
                                <option
                                  key={o.value}
                                  value={o.value}
                                  className="bg-gray-900"
                                >
                                  {o.label}
                                </option>
                              ))}
                            </select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="col-span-3">
                    <FormField
                      control={control}
                      name={`trial.rewards.${rIdx}.amount` as const}
                      render={({ field }) => (
                        <FormItem>
                          <label className="text-xs">Amount</label>
                          <FormControl>
                            <Input type="number" min={1} step={1} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="col-span-3">
                    <FormField
                      control={control}
                      name={`trial.rewards.${rIdx}.rewardAmountCap` as const}
                      render={({ field }) => (
                        <FormItem>
                          <label className="text-xs">Reward Cap</label>
                          <FormControl>
                            <Input type="number" min={1} step={1} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="col-span-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => trialRewardsArray.remove(rIdx)}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              ))}

              <div>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() =>
                    trialRewardsArray.append({
                      assetId: ASSET_OPTIONS[0].value,
                      amount: 1,
                      rewardAmountCap: 1,
                    })
                  }
                >
                  + Reward
                </Button>
              </div>
            </div>
          </Form>
        </CardContent>
      </Card>

      {/* POLLS */}
      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle>Polls</CardTitle>
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
        </CardHeader>

        <CardContent className="space-y-8">
          <Form {...form}>
            {pollsArray.fields.map((pf, pIdx) => (
              <PollCard
                key={pf.id}
                control={control}
                watch={watch}
                index={pIdx}
                onRemove={() => pollsArray.remove(pIdx)}
                disableRemove={pollsArray.fields.length <= 1}
              />
            ))}
          </Form>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button onClick={handleSubmit(onSubmit)} disabled={isPending}>
          Create Trial
        </Button>
      </div>
    </div>
  );
}
