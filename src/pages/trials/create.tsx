import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useForm, useFieldArray } from "react-hook-form";
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

// NEW: geo selects + chip icon
import CountrySelect from "@/components/commons/selects/country-select";
import StateSelect from "@/components/commons/selects/state-select";
import { CitySelect } from "@/components/commons/selects/city-select";
import { X } from "lucide-react";
import {
  ASSET_OPTIONS,
  formSchema,
  FormValues,
  PollCard,
} from "@/components/poll-card";

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
        // NEW: default geo
        targetGeo: {
          countries: [],
          states: [],
          cities: [],
        },
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

  const { control, handleSubmit, watch, setValue, getValues } = form;

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
        // NEW: include targetGeo
        targetGeo: {
          countries: v.trial.targetGeo.countries,
          states: v.trial.targetGeo.states,
          cities: v.trial.targetGeo.cities,
        },
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

  // small helper: push unique values (no duplicates)
  const pushUnique = (
    path:
      | "trial.targetGeo.countries"
      | "trial.targetGeo.states"
      | "trial.targetGeo.cities",
    val?: string
  ) => {
    if (!val) return;
    const curr = getValues(path) as string[];
    if (curr.includes(val)) return;
    setValue(path, [...curr, val], { shouldValidate: true, shouldDirty: true });
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

            <div className="space-y-2">
              <FormLabel>Target Geo</FormLabel>

              {/* Countries */}
              <CountrySelect
                placeholder="Select country"
                onChange={(opt: any) => {
                  if (opt?.value) {
                    const current = watch("trial.targetGeo.countries");
                    if (!current.includes(opt.value)) {
                      setValue(
                        "trial.targetGeo.countries",
                        [...current, opt.value],
                        { shouldValidate: true, shouldDirty: true }
                      );
                    }
                  }
                }}
              />
              <div className="flex flex-wrap gap-2 mt-2">
                {watch("trial.targetGeo.countries").map((c, i) => (
                  <span
                    key={`country-${i}`}
                    className="flex items-center gap-1 px-2 py-1 border rounded text-sm"
                  >
                    {c}
                    <X
                      className="w-4 h-4 cursor-pointer"
                      onClick={() =>
                        setValue(
                          "trial.targetGeo.countries",
                          watch("trial.targetGeo.countries").filter(
                            (_, idx) => idx !== i
                          ),
                          { shouldValidate: true, shouldDirty: true }
                        )
                      }
                    />
                  </span>
                ))}
              </div>

              {/* States */}
              <StateSelect
                placeholder="Select state"
                onChange={(opt: any) => {
                  if (opt?.value) {
                    const current = watch("trial.targetGeo.states");
                    if (!current.includes(opt.value)) {
                      setValue(
                        "trial.targetGeo.states",
                        [...current, opt.value],
                        { shouldValidate: true, shouldDirty: true }
                      );
                    }
                  }
                }}
              />
              <div className="flex flex-wrap gap-2 mt-2">
                {watch("trial.targetGeo.states").map((s, i) => (
                  <span
                    key={`state-${i}`}
                    className="flex items-center gap-1 px-2 py-1 border rounded text-sm"
                  >
                    {s}
                    <X
                      className="w-4 h-4 cursor-pointer"
                      onClick={() =>
                        setValue(
                          "trial.targetGeo.states",
                          watch("trial.targetGeo.states").filter(
                            (_, idx) => idx !== i
                          ),
                          { shouldValidate: true, shouldDirty: true }
                        )
                      }
                    />
                  </span>
                ))}
              </div>

              {/* Cities */}
              <CitySelect
                placeholder="Select city"
                onChange={(opt: any) => {
                  if (opt?.value) {
                    const current = watch("trial.targetGeo.cities");
                    if (!current.includes(opt.value)) {
                      setValue(
                        "trial.targetGeo.cities",
                        [...current, opt.value],
                        { shouldValidate: true, shouldDirty: true }
                      );
                    }
                  }
                }}
              />
              <div className="flex flex-wrap gap-2 mt-2">
                {watch("trial.targetGeo.cities").map((city, i) => (
                  <span
                    key={`city-${i}`}
                    className="flex items-center gap-1 px-2 py-1 border rounded text-sm"
                  >
                    {city}
                    <X
                      className="w-4 h-4 cursor-pointer"
                      onClick={() =>
                        setValue(
                          "trial.targetGeo.cities",
                          watch("trial.targetGeo.cities").filter(
                            (_, idx) => idx !== i
                          ),
                          { shouldValidate: true, shouldDirty: true }
                        )
                      }
                    />
                  </span>
                ))}
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
