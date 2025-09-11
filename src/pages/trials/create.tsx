import React, { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm } from "react-hook-form";
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

import { CitySelect } from "@/components/commons/selects/city-select";
import StateSelect from "@/components/commons/selects/state-select";
import CountrySelect from "@/components/commons/selects/country-select";
import FileUploadButton from "@/components/file-upload-button";

import { X, Loader2, Calendar as CalendarIcon, Clock } from "lucide-react";
import { useImageUpload } from "@/hooks/upload/useAssetUpload";
import RewardCurveTable from "@/components/commons/reward-curve-table";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

/* =========================================================
   Constants
   ========================================================= */

// Change this to control the preview table depth (server "highestLevel")
const TOTAL_LEVELS = 10 as const;

const ASSET_OPTIONS = [
  { label: "OCTA", value: "xOcta" },
  { label: "MYST", value: "xMYST" },
  { label: "DROP", value: "xDrop" },
  { label: "XPOLL", value: "xPoll" },
] as const;

const REWARD_TYPES = [
  { label: "Max", value: "max" },
  { label: "Min", value: "min" },
] as const;

/* =========================================================
   Zod (mirror server expectations)
   ========================================================= */

// Options
const optionZ = z.object({
  text: z.string().min(3, "Min 3 chars").trim(),
});

// Rewards (row)
const AssetEnumZ = z.enum(["xOcta", "xMYST", "xDrop", "xPoll"]);
const rewardRowZ = z
  .object({
    assetId: AssetEnumZ,
    amount: z.coerce.number().int().min(1, "Min 1"),
    rewardAmountCap: z.coerce.number().int().min(1, "Min 1"),
    rewardType: z.enum(["max", "min"]).default("max"),
  })
  .refine((r) => r.rewardAmountCap >= r.amount, {
    path: ["rewardAmountCap"],
    message: "rewardAmountCap must be >= amount",
  });

// Resource assets (form-side)
const youtubeAssetZ = z.object({
  type: z.literal("youtube"),
  value: z.string().min(11, "YouTube ID or URL").trim(),
});
const imageAssetZ = z.object({
  type: z.literal("image"),
  // Kept as array in-form for preview; collapsed to single string URL in final payload
  value: z.array(z.union([z.instanceof(File), z.string()])).nullable(),
});
const resourceAssetFormZ = z.union([youtubeAssetZ, imageAssetZ]);

// Entire form
const formSchema = z
  .object({
    title: z.string().min(3, "Min 3 chars").trim(),
    description: z.string().min(3, "Min 3 chars").trim(),
    options: z
      .array(optionZ)
      .min(2, "Need 2–4 options")
      .max(4, "Need 2–4 options"),
    rewards: z.array(rewardRowZ).min(1, "At least one reward is required"),
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
      .or(z.literal("").optional()) // allow empty input (maps to undefined)
      .optional(),
  })
  // Client-side duplicate guard (server also validates)
  .superRefine((v, ctx) => {
    const ids = v.rewards.map((r) => r.assetId);
    const dup = ids.find((a, i) => ids.indexOf(a) !== i);
    if (dup) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["rewards"],
        message: `Duplicate reward assetId: ${dup}`,
      });
    }
  });

type FormValues = z.infer<typeof formSchema>;

type OutputResourceAsset =
  | { type: "youtube"; value: string }
  | { type: "image"; value: string };

/* =========================================================
   Helpers
   ========================================================= */

function extractYouTubeId(input: string): string {
  const s = input.trim();
  const patterns = [
    /(?:https?:\/\/)?(?:www\.)?youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  ];
  for (const re of patterns) {
    const m = s.match(re);
    if (m?.[1]) return m[1];
  }
  if (/^[a-zA-Z0-9_-]{11}$/.test(s)) return s;
  return s; // fallback (server validates again)
}

function toIsoOrNull(v?: string) {
  const s = (v ?? "").trim();
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

/* =========================================================
   Component
   ========================================================= */

export default function PollCreatePage() {
  const navigate = useNavigate();

  const defaultValues: FormValues = useMemo(
    () => ({
      title: "",
      description: "",
      options: [{ text: "" }, { text: "" }],
      rewards: [
        {
          assetId: ASSET_OPTIONS[0].value,
          amount: 1,
          rewardAmountCap: 1,
          rewardType: "max",
        },
      ],
      targetGeo: { countries: [], states: [], cities: [] },
      resourceAssets: [],
      expireRewardAt: "", // empty → not set
    }),
    []
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
    mode: "onChange",
  });

  const { control, handleSubmit, watch } = form;

  // Arrays
  const optionsArray = useFieldArray({ control, name: "options" });
  const rewardsArray = useFieldArray({ control, name: "rewards" });
  const resourcesArray = useFieldArray({ control, name: "resourceAssets" });

  // API + uploads
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
  const [addingType, setAddingType] = useState<null | "youtube" | "image">(
    null
  );
  const [ytInput, setYtInput] = useState("");

  const isBusy = isPending || imageUploading;

  /* ---------- Reward assets: keep selects mutually exclusive ---------- */

  const rewardsWatch = watch("rewards");
  const usedAssetIds = new Set((rewardsWatch ?? []).map((r) => r.assetId));

  function availableAssetOptions(currentAssetId?: string) {
    // Allow current selection to remain visible; disallow assets used in other rows.
    return ASSET_OPTIONS.filter(
      (opt) => opt.value === currentAssetId || !usedAssetIds.has(opt.value)
    );
  }

  const canAddMoreRewards =
    rewardsArray.fields.length < ASSET_OPTIONS.length &&
    ASSET_OPTIONS.some((o) => !usedAssetIds.has(o.value));

  const handleAddRewardRow = () => {
    const current = form.getValues("rewards");
    const used = new Set(current.map((r) => r.assetId));
    const next = ASSET_OPTIONS.find((o) => !used.has(o.value));
    if (!next) return;
    rewardsArray.append({
      assetId: next.value,
      amount: 1,
      rewardAmountCap: 1,
      rewardType: "max",
    });
  };

  /* ---------- Resource add handlers ---------- */

  const handleChooseYouTube = () => {
    setAddingType("youtube");
    setYtInput("");
  };

  const handleAddYouTube = () => {
    const value = extractYouTubeId(ytInput);
    resourcesArray.append({ type: "youtube", value });
    setAddingType(null);
    setYtInput("");
  };

  const handleChooseImage = () => setAddingType("image");

  const handleImageSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length > 0) {
      // keep as [File] in form for preview; collapse to string on submit
      resourcesArray.append({ type: "image", value: [files[0]] });
    }
    setAddingType(null);
  };

  /* ---------- Expire Reward At local time state (moved to top-level) ---------- */

  const [expireLocalTime, setExpireLocalTime] = useState<string>("12:00");
  const expireRewardAtValue = watch("expireRewardAt");

  useEffect(() => {
    if (expireRewardAtValue && expireRewardAtValue.trim()) {
      const d = new Date(expireRewardAtValue);
      if (!isNaN(d.getTime())) {
        const hh = String(d.getHours()).padStart(2, "0");
        const mm = String(d.getMinutes()).padStart(2, "0");
        setExpireLocalTime(`${hh}:${mm}`);
      }
    }
  }, [expireRewardAtValue]);

  /* ---------- Submit ---------- */

  const onSubmit = async (v: FormValues) => {
    // Normalize resourceAssets: upload image -> string URL; youtube -> ID string
    const normalizedResources: OutputResourceAsset[] = await Promise.all(
      (v.resourceAssets ?? []).map(async (a) => {
        if (a.type === "youtube") {
          return { type: "youtube", value: extractYouTubeId(a.value) };
        }
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
        amount: r.amount,
        rewardAmountCap: r.rewardAmountCap,
        currentDistribution: 0,
        rewardType: r.rewardType, // "max" | "min"
      })),
      targetGeo: {
        countries: v.targetGeo.countries,
        states: v.targetGeo.states,
        cities: v.targetGeo.cities,
      },
      expireRewardAt: toIsoOrNull(v.expireRewardAt) ?? undefined, // optional on server
    };

    console.log("CREATE POLL -> payload:", payload);
    mutate(payload as any);
  };

  /* ---------- UI helpers ---------- */

  const optsArrayMsg =
    (form.formState.errors.options as any)?.message ??
    (form.formState.errors.options as any)?.root?.message;

  const rewardsArrayMsg =
    (form.formState.errors.rewards as any)?.message ??
    (form.formState.errors.rewards as any)?.root?.message;

  const resourceAssets = watch("resourceAssets");

  return (
    <div className="p-4 space-y-6 max-w-3xl">
      <h1 className="text-2xl font-bold">Create Poll</h1>

      <Form {...form}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          {/* Title */}
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

          {/* Description */}
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

          {/* Resource Assets */}
          <div className="space-y-3">
            <FormLabel>Resource Assets</FormLabel>

            {/* Add controls */}
            {!addingType ? (
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleChooseYouTube}
                >
                  Add YouTube
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleChooseImage}
                >
                  Add Image
                </Button>
              </div>
            ) : addingType === "youtube" ? (
              <div className="flex flex-wrap items-center gap-2 rounded-md border p-3">
                <input
                  className="h-9 w-full max-w-md rounded-md border px-3 text-sm"
                  placeholder="Paste YouTube URL or ID"
                  value={ytInput}
                  onChange={(e) => setYtInput(e.target.value)}
                />
                <Button
                  type="button"
                  onClick={handleAddYouTube}
                  disabled={!ytInput.trim()}
                >
                  Add
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setAddingType(null)}
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2 rounded-md border p-3">
                <FileUploadButton
                  accept="image/*"
                  multiple={false}
                  onChange={handleImageSelected}
                >
                  Select Image
                </FileUploadButton>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setAddingType(null)}
                >
                  Cancel
                </Button>
              </div>
            )}

            <FormMessage>
              {(form.formState.errors as any)?.resourceAssets &&
                "Invalid resource assets payload."}
            </FormMessage>

            {/* Render resource list */}
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {resourcesArray.fields.map((f, idx) => {
                const item = resourceAssets?.[idx] as
                  | z.infer<typeof resourceAssetFormZ>
                  | undefined;
                if (!item) return null;

                if (item.type === "youtube") {
                  const displayId = extractYouTubeId(item.value);
                  return (
                    <div
                      key={f.id}
                      className="flex items-center justify-between rounded-md border p-3"
                    >
                      <div className="flex min-w-0 flex-col">
                        <div className="text-xs text-muted-foreground">
                          YouTube
                        </div>
                        <div className="truncate text-sm font-medium">
                          {displayId}
                        </div>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        onClick={() => resourcesArray.remove(idx)}
                      >
                        Remove
                      </Button>
                    </div>
                  );
                }

                const arr = (item.value ?? []) as (File | string)[];
                const first = arr[0];
                const src =
                  first instanceof File ? URL.createObjectURL(first) : first;

                return (
                  <div
                    key={f.id}
                    className="flex items-center justify-between gap-3 rounded-md border p-3"
                  >
                    <div className="flex items-center gap-3">
                      {src ? (
                        <img
                          src={src}
                          alt="image"
                          className="h-16 w-16 rounded object-cover"
                        />
                      ) : (
                        <div className="flex h-16 w-16 items-center justify-center rounded bg-muted text-xs">
                          no image
                        </div>
                      )}
                      <div className="text-xs text-muted-foreground">Image</div>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      onClick={() => resourcesArray.remove(idx)}
                    >
                      Remove
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Options (2–4) */}
          <div className="space-y-2">
            <FormLabel>Options (2–4)</FormLabel>
            {optionsArray.fields.map((f, idx) => (
              <div key={f.id} className="flex gap-2 items-end">
                <FormField
                  control={control}
                  name={`options.${idx}.text` as const}
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormControl>
                        <Input placeholder={`Option #${idx + 1}`} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => optionsArray.remove(idx)}
                  disabled={optionsArray.fields.length <= 2}
                >
                  Remove
                </Button>
              </div>
            ))}
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="secondary"
                onClick={() => optionsArray.append({ text: "" })}
                disabled={optionsArray.fields.length >= 4}
              >
                Add Option
              </Button>
              {optsArrayMsg && (
                <p className="text-sm text-destructive">{optsArrayMsg}</p>
              )}
            </div>
          </div>

          {/* Rewards (array, mutually exclusive asset selects) */}
          <div className="space-y-2">
            <FormLabel>Rewards</FormLabel>

            {rewardsArray.fields.map((f, idx) => {
              const currentAsset = rewardsWatch?.[idx]?.assetId;
              const amount = rewardsWatch?.[idx]?.amount ?? 0;
              const rtype = (rewardsWatch?.[idx]?.rewardType ?? "max") as
                | "max"
                | "min";

              return (
                <div key={f.id} className="grid grid-cols-12 gap-2 items-end">
                  {/* Asset */}
                  <div className="col-span-3">
                    <FormField
                      control={control}
                      name={`rewards.${idx}.assetId` as const}
                      render={({ field }) => {
                        const options = availableAssetOptions(currentAsset);
                        // If current value is not in available list (rare), auto-correct
                        if (
                          field.value &&
                          !options.find((o) => o.value === field.value)
                        ) {
                          const fallback = options[0]?.value;
                          if (fallback) field.onChange(fallback);
                        }

                        return (
                          <FormItem>
                            <label className="text-xs">Asset</label>
                            <FormControl>
                              <select
                                className="w-full h-9 border rounded-md px-2 bg-transparent"
                                {...field}
                              >
                                {options.map((o) => (
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
                        );
                      }}
                    />
                  </div>

                  {/* Amount */}
                  <div className="col-span-3">
                    <FormField
                      control={control}
                      name={`rewards.${idx}.amount` as const}
                      render={({ field }) => (
                        <FormItem>
                          <label className="text-xs">Amount / person</label>
                          <FormControl>
                            <Input type="number" min={1} step={1} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Reward Cap */}
                  <div className="col-span-3">
                    <FormField
                      control={control}
                      name={`rewards.${idx}.rewardAmountCap` as const}
                      render={({ field }) => (
                        <FormItem>
                          <label className="text-xs">Reward Amount Cap</label>
                          <FormControl>
                            <Input type="number" min={1} step={1} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Reward Type */}
                  <div className="col-span-2">
                    <FormField
                      control={control}
                      name={`rewards.${idx}.rewardType` as const}
                      render={({ field }) => (
                        <FormItem>
                          <label className="text-xs">Reward Type</label>
                          <FormControl>
                            <select
                              className="w-full h-9 border rounded-md px-2 bg-transparent"
                              {...field}
                            >
                              {REWARD_TYPES.map((t) => (
                                <option
                                  key={t.value}
                                  value={t.value}
                                  className="bg-gray-900"
                                >
                                  {t.label}
                                </option>
                              ))}
                            </select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Remove */}
                  <div className="col-span-1 flex justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => rewardsArray.remove(idx)}
                      disabled={rewardsArray.fields.length <= 1}
                    >
                      Remove
                    </Button>
                  </div>

                  {/* Curve Preview */}
                  {form.getValues(`rewards.${idx}.amount`) > 0 && (
                    <div className="col-span-12">
                      <RewardCurveTable
                        perUserReward={Number(amount) || 0}
                        rewardType={rtype}
                        totalLevels={TOTAL_LEVELS}
                        rewardAmountCap={
                          Number(rewardsWatch?.[idx]?.rewardAmountCap) || 0
                        }
                        label={currentAsset}
                      />
                    </div>
                  )}
                </div>
              );
            })}

            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="secondary"
                onClick={handleAddRewardRow}
                disabled={!canAddMoreRewards}
              >
                Add Reward
              </Button>
              {rewardsArrayMsg && (
                <p className="text-sm text-destructive">{rewardsArrayMsg}</p>
              )}
            </div>
          </div>

          {/* Expire Reward At (optional) */}
          <FormField
            control={control}
            name="expireRewardAt"
            render={({ field }) => {
              // Parse current string -> Date
              const current =
                field.value && field.value.trim()
                  ? new Date(field.value)
                  : undefined;

              function commit(newDate: Date | undefined, timeStr: string) {
                if (!newDate) {
                  field.onChange("");
                  return;
                }
                const [hh, mm] = timeStr
                  .split(":")
                  .map((n) => parseInt(n || "0", 10));
                const d = new Date(newDate);
                if (!Number.isNaN(hh)) d.setHours(hh);
                if (!Number.isNaN(mm)) d.setMinutes(mm);
                d.setSeconds(0);
                d.setMilliseconds(0);
                // Store ISO so zod .datetime() passes
                field.onChange(d.toISOString());
              }

              return (
                <FormItem className="flex flex-col">
                  <FormLabel>Expire Reward At (optional)</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className={cn(
                          "w-[280px] justify-start text-left font-normal",
                          !current && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {current
                          ? new Date(current).toLocaleString()
                          : "Pick date & time"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-3" align="start">
                      <div className="flex gap-3">
                        <Calendar
                          mode="single"
                          selected={current}
                          onSelect={(d: Date | undefined) =>
                            commit(d, expireLocalTime)
                          }
                          initialFocus
                        />
                        <div className="flex flex-col gap-2">
                          <label className="text-xs text-muted-foreground">
                            Time
                          </label>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <Input
                              type="time"
                              value={expireLocalTime}
                              onChange={(e) => {
                                const t = e.target.value || "12:00";
                                setExpireLocalTime(t);
                                commit(current ?? new Date(), t);
                              }}
                            />
                          </div>
                          <Button
                            type="button"
                            variant="secondary"
                            onClick={() => {
                              field.onChange(""); // clear
                            }}
                          >
                            Clear
                          </Button>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              );
            }}
          />

          {/* Target Geo */}
          <div className="space-y-2">
            <FormLabel>Target Geo</FormLabel>

            {/* Countries */}
            <CountrySelect
              placeholder="Select country"
              onChange={(opt) => {
                if (opt?.value) {
                  form.setValue("targetGeo.countries", [
                    ...form.getValues("targetGeo.countries"),
                    opt.value,
                  ]);
                }
              }}
            />
            <div className="flex flex-wrap gap-2 mt-2">
              {watch("targetGeo.countries").map((c, i) => (
                <span
                  key={`country-${i}`}
                  className="flex items-center gap-1 px-2 py-1 border rounded text-sm"
                >
                  {c}
                  <X
                    className="w-4 h-4 cursor-pointer"
                    onClick={() =>
                      form.setValue(
                        "targetGeo.countries",
                        watch("targetGeo.countries").filter(
                          (_, idx) => idx !== i
                        )
                      )
                    }
                  />
                </span>
              ))}
            </div>

            {/* States */}
            <StateSelect
              placeholder="Select state"
              onChange={(opt) => {
                if (opt?.value) {
                  form.setValue("targetGeo.states", [
                    ...form.getValues("targetGeo.states"),
                    opt.value,
                  ]);
                }
              }}
            />
            <div className="flex flex-wrap gap-2 mt-2">
              {watch("targetGeo.states").map((s, i) => (
                <span
                  key={`state-${i}`}
                  className="flex items-center gap-1 px-2 py-1 border rounded text-sm"
                >
                  {s}
                  <X
                    className="w-4 h-4 cursor-pointer"
                    onClick={() =>
                      form.setValue(
                        "targetGeo.states",
                        watch("targetGeo.states").filter((_, idx) => idx !== i)
                      )
                    }
                  />
                </span>
              ))}
            </div>

            {/* Cities */}
            <CitySelect
              placeholder="Select city"
              onChange={(opt) => {
                if (opt?.value) {
                  form.setValue("targetGeo.cities", [
                    ...form.getValues("targetGeo.cities"),
                    opt.value,
                  ]);
                }
              }}
            />
            <div className="flex flex-wrap gap-2 mt-2">
              {watch("targetGeo.cities").map((city, i) => (
                <span
                  key={`city-${i}`}
                  className="flex items-center gap-1 px-2 py-1 border rounded text-sm"
                >
                  {city}
                  <X
                    className="w-4 h-4 cursor-pointer"
                    onClick={() =>
                      form.setValue(
                        "targetGeo.cities",
                        watch("targetGeo.cities").filter((_, idx) => idx !== i)
                      )
                    }
                  />
                </span>
              ))}
            </div>
          </div>

          {/* Submit */}
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
