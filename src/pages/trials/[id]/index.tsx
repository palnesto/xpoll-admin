import { useMemo, useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { z } from "zod";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { endpoints } from "@/api/endpoints";
import { useApiQuery } from "@/hooks/useApiQuery";
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
import { fmt } from "@/components/paginated-table";
import TrialPollTable from "@/components/table-trial-poll";
import { Pencil, Trash2 } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { CustomModal } from "@/components/modals/custom-modal";

/* === Reusable editors (same as create pages) === */
import ResourceAssetsEditor from "@/components/polling/editors/ResourceAssetsEditor";
import RewardsEditor, {
  type AssetOption,
} from "@/components/polling/editors/RewardsEditor";
import ExpireRewardAtPicker from "@/components/polling/editors/ExpireRewardAtPicker";
import TargetGeoEditor from "@/components/polling/editors/TargetGeoEditor";
import OptionsEditor from "@/components/polling/editors/OptionsEditor";
import { useImageUpload } from "@/hooks/upload/useAssetUpload";
import { extractYouTubeId } from "@/utils/youtube";

/* =========================
   Constants / helpers
   ========================= */
const TOTAL_LEVELS = 10 as const;
const ASSET_OPTIONS: AssetOption[] = [
  { label: "OCTA", value: "xOcta" },
  { label: "MYST", value: "xMYST" },
  { label: "DROP", value: "xDrop" },
  { label: "XPOLL", value: "xPoll" },
];

type OutputResourceAsset = { type: "image" | "youtube"; value: string };

function patchShowCache(showKey: string, updater: (curr: any) => any) {
  const prev = queryClient.getQueryData<any>([showKey]);
  if (!prev) return;
  const lvl1 = prev?.data ?? {};
  const curr = lvl1?.data && typeof lvl1.data === "object" ? lvl1.data : lvl1;
  const nextCurr = updater(curr);
  const next = lvl1?.data
    ? { ...prev, data: { ...lvl1, data: nextCurr } }
    : { ...prev, data: nextCurr };
  queryClient.setQueryData([showKey], next);
}

const arrEqUnordered = (a: string[], b: string[]) => {
  if (!Array.isArray(a) || !Array.isArray(b)) return false;
  if (a.length !== b.length) return false;
  const A = [...a].sort();
  const B = [...b].sort();
  return A.every((v, i) => v === B[i]);
};

function toComparableAssets(arr?: OutputResourceAsset[]) {
  return (arr ?? []).map((a) =>
    a.type === "youtube" ? `yt:${extractYouTubeId(a.value)}` : `img:${a.value}`
  );
}

function cmpTrialRewards(
  a: { assetId: string; amount: number; rewardAmountCap?: number }[] = [],
  b: { assetId: string; amount: number; rewardAmountCap?: number }[] = []
) {
  const norm = (arr: typeof a) =>
    [...arr]
      .sort((x, y) => x.assetId.localeCompare(y.assetId))
      .map((r) => `${r.assetId}:${r.amount}:${r.rewardAmountCap ?? r.amount}`)
      .join("|");
  return norm(a) === norm(b);
}

/* =========================
   API result types
   ========================= */
type TrialReward = {
  assetId: string;
  amount: number;
  rewardAmountCap?: number;
};
type Trial = {
  _id: string;
  title: string;
  description?: string;
  resourceAssets?: OutputResourceAsset[];
  rewards?: TrialReward[];
  createdAt?: string;
  archivedAt?: string | null;
  expireRewardAt?: string | null;
  targetGeo?: {
    countries?: string[];
    states?: string[];
    cities?: string[];
  };
};

/* =========================
   Zod schemas (match create Trial / Poll)
   ========================= */
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
    // UI parity with Poll editor; server payload does not require rewardType for Trial
    rewardType: z.enum(["max", "min"]).default("max"),
  })
  .refine((r) => r.rewardAmountCap >= r.amount, {
    message: "rewardAmountCap must be >= amount",
    path: ["rewardAmountCap"],
  });

const optionZ = z.object({ text: z.string().min(3, "Min 3 chars").trim() });

const subPollZ = z.object({
  title: z.string().min(3, "Min 3 chars").trim(),
  description: z.string().min(3, "Min 3 chars").trim(),
  resourceAssets: z.array(resourceAssetZ).default([]),
  options: z.array(optionZ).min(2).max(4),
});

/** Trial edit form (only trial fields) */
const editSchema = z
  .object({
    title: z.string().min(3, "Min 3 chars").trim(),
    description: z.string().min(3, "Min 3 chars").trim(),
    resourceAssets: z.array(resourceAssetZ).default([]),
    rewards: z.array(rewardRowZ).default([]),
    targetGeo: z.object({
      countries: z.array(z.string()).default([]),
      states: z.array(z.string()).default([]),
      cities: z.array(z.string()).default([]),
    }),
    expireRewardAt: z
      .string()
      .datetime()
      .optional()
      .or(z.literal("").optional())
      .optional(),
  })
  .superRefine((v, ctx) => {
    const ids = (v.rewards ?? []).map((r) => r.assetId);
    const dup = ids.find((a, i) => ids.indexOf(a) !== i);
    if (dup)
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["rewards"],
        message: `Duplicate reward assetId: ${dup}`,
      });
  });

type EditValues = z.infer<typeof editSchema>;

/** Separate Add-Polls form */
const addPollsSchema = z.object({
  newPolls: z.array(subPollZ).min(1, "Add at least one poll"),
});
type AddPollsValues = z.infer<typeof addPollsSchema>;

/* =========================
   InlinePollCard for the Add-Polls form
   ========================= */
function InlinePollCard({
  index,
  control,
  base = "newPolls",
  onRemove,
  disableRemove,
}: {
  index: number;
  control: any;
  base?: string; // default "newPolls"
  onRemove: () => void;
  disableRemove?: boolean;
}) {
  const path = `${base}.${index}`;

  return (
    <div className="rounded-lg border p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-base font-medium">Poll #{index + 1}</div>
        <Button
          type="button"
          variant="outline"
          onClick={onRemove}
          disabled={!!disableRemove}
        >
          Remove Poll
        </Button>
      </div>

      {/* Title */}
      <FormField
        control={control}
        name={`${path}.title`}
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
        name={`${path}.description`}
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

      {/* Media */}
      <ResourceAssetsEditor
        control={control}
        name={`${path}.resourceAssets`}
        label="Media (Images / YouTube)"
      />

      {/* Options */}
      <OptionsEditor
        control={control}
        name={`${path}.options`}
        label="Options (2–4)"
        min={2}
        max={4}
      />
    </div>
  );
}

/* =========================
   Page
   ========================= */
export default function TrialShowPage() {
  const navigate = useNavigate();
  const { id = "" } = useParams<{ id: string }>();

  const showRoute = endpoints.entities.trials.getById(id);
  const { data, isLoading, isError } = useApiQuery(showRoute);

  const trial: Trial | null = useMemo(() => {
    return data?.data?.data ?? data?.data ?? null;
  }, [data]);

  const [isEditing, setIsEditing] = useState(false);

  /* ===== Trial Edit form ===== */
  const form = useForm<EditValues>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      title: "",
      description: "",
      resourceAssets: [],
      rewards: [],
      targetGeo: { countries: [], states: [], cities: [] },
      expireRewardAt: "",
    },
    mode: "onChange",
  });
  const { control, handleSubmit, reset, setValue, watch, getValues } = form;

  /* ===== Separate Add-Polls form ===== */
  const pollsForm = useForm<AddPollsValues>({
    resolver: zodResolver(addPollsSchema),
    defaultValues: { newPolls: [] },
    mode: "onChange",
  });
  const { control: pollsControl, handleSubmit: handleSubmitPolls } = pollsForm;
  const newPollsArray = useFieldArray({
    control: pollsControl,
    name: "newPolls",
  });

  /* ===== image upload ===== */
  const { uploadImage, loading: isUploading } = useImageUpload();

  /* ===== hydrate Trial edit form from server ===== */
  useEffect(() => {
    if (!trial) return;

    const initialAssets: EditValues["resourceAssets"] =
      Array.isArray(trial.resourceAssets) && trial.resourceAssets.length > 0
        ? trial.resourceAssets.map((a) =>
            a.type === "image"
              ? { type: "image", value: [a.value] }
              : { type: "youtube", value: extractYouTubeId(a.value) }
          )
        : [];

    const initialRewards: EditValues["rewards"] =
      Array.isArray(trial.rewards) && trial.rewards.length > 0
        ? trial.rewards.map((r) => ({
            assetId: r.assetId as any,
            amount: Number(r.amount ?? 1),
            rewardAmountCap: Number(r.rewardAmountCap ?? r.amount ?? 1),
            rewardType: "max",
          }))
        : [];

    reset({
      title: trial.title ?? "",
      description: trial.description ?? "",
      resourceAssets: initialAssets,
      rewards: initialRewards,
      targetGeo: {
        countries: Array.isArray(trial.targetGeo?.countries)
          ? trial.targetGeo!.countries
          : [],
        states: Array.isArray(trial.targetGeo?.states)
          ? trial.targetGeo!.states
          : [],
        cities: Array.isArray(trial.targetGeo?.cities)
          ? trial.targetGeo!.cities
          : [],
      },
      expireRewardAt: trial.expireRewardAt ?? "",
    });
  }, [trial, reset]);

  /* ===== Mutations ===== */
  const { mutateAsync: updateTrial, isPending: isSaving } = useApiMutation<
    any,
    any
  >({
    route: endpoints.entities.trials.update,
    method: "PUT",
    onSuccess: (_resp, vars) => {
      appToast.success("Trial updated");
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: [showRoute] });
      queryClient.invalidateQueries({
        queryKey: [endpoints.entities.trials.all],
      });
    },
  });

  /* ===== Helpers ===== */
  const normalizeAssetsForSave = async (
    arr?: EditValues["resourceAssets"]
  ): Promise<OutputResourceAsset[]> => {
    const items = arr ?? [];
    return Promise.all(
      items.map(async (a) => {
        if (a.type === "youtube") {
          return { type: "youtube", value: extractYouTubeId(String(a.value)) };
        }
        const list = (a.value ?? []) as (File | string)[];
        let first = list[0];
        if (first instanceof File) {
          first = await uploadImage(first);
        }
        return { type: "image", value: typeof first === "string" ? first : "" };
      })
    );
  };

  const normalizeAssetsForPolls = async (
    arr?: AddPollsValues["newPolls"][number]["resourceAssets"]
  ): Promise<OutputResourceAsset[]> => {
    const items = arr ?? [];
    return Promise.all(
      items.map(async (a) => {
        if (a.type === "youtube") {
          return { type: "youtube", value: extractYouTubeId(String(a.value)) };
        }
        const list = (a.value ?? []) as (File | string)[];
        let first = list[0];
        if (first instanceof File) {
          first = await uploadImage(first);
        }
        return { type: "image", value: typeof first === "string" ? first : "" };
      })
    );
  };

  /* ===== Submit (Trial edit: diff-only) ===== */
  const onSubmitEdit = handleSubmit(async (v) => {
    if (!trial) return;

    // compute diffs
    const payload: any = { trialId: trial._id };

    // normalize assets for save & diff
    const normalizedNow = await normalizeAssetsForSave(v.resourceAssets);
    const prevAssets: OutputResourceAsset[] = (trial.resourceAssets ?? []).map(
      (a) =>
        a.type === "youtube"
          ? { type: "youtube", value: extractYouTubeId(a.value) }
          : { type: "image", value: a.value }
    );

    // title / description
    if (v.title !== (trial.title ?? "")) payload.title = v.title;
    if (v.description !== (trial.description ?? ""))
      payload.description = v.description;

    // resourceAssets diff
    const prevCmp = toComparableAssets(prevAssets);
    const nowCmp = toComparableAssets(normalizedNow);
    if (
      prevCmp.length !== nowCmp.length ||
      prevCmp.some((x, i) => x !== nowCmp[i])
    ) {
      payload.resourceAssets = normalizedNow;
    }

    // rewards diff (omit rewardType in payload for Trial)
    const prevRewards = (trial.rewards ?? []) as TrialReward[];
    const nowRewards = (v.rewards ?? []).map((r) => ({
      assetId: r.assetId,
      amount: r.amount,
      rewardAmountCap: r.rewardAmountCap,
    }));
    if (!cmpTrialRewards(prevRewards as any, nowRewards as any)) {
      payload.rewards = nowRewards;
    }

    // expireRewardAt diff ("" = unset)
    const prevExpire = (trial.expireRewardAt ?? "").trim();
    const nowExpire = (v.expireRewardAt ?? "").trim();
    if (prevExpire !== nowExpire) {
      payload.expireRewardAt = nowExpire ? nowExpire : undefined;
    }

    // targetGeo diff
    const nextTG = v.targetGeo ?? { countries: [], states: [], cities: [] };
    const prevTG = {
      countries: trial.targetGeo?.countries ?? [],
      states: trial.targetGeo?.states ?? [],
      cities: trial.targetGeo?.cities ?? [],
    };
    const geoChanged =
      !arrEqUnordered(nextTG.countries, prevTG.countries) ||
      !arrEqUnordered(nextTG.states, prevTG.states) ||
      !arrEqUnordered(nextTG.cities, prevTG.cities);
    if (geoChanged) payload.targetGeo = nextTG;

    // nothing changed?
    if (Object.keys(payload).length <= 1) {
      setIsEditing(false);
      return;
    }

    await updateTrial(payload);
  });

  /* ===== Delete ===== */
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const { mutate: doDelete, isPending: isDeleting } = useApiMutation<any, any>({
    route: endpoints.entities.trials.delete,
    method: "DELETE",
    onSuccess: () => {
      appToast.success("Trial deleted");
      queryClient.invalidateQueries({
        queryKey: [endpoints.entities.trials.all],
      });
      navigate("/trials");
    },
  });

  /* ===== Page states ===== */
  if (!id) {
    return (
      <div className="p-4">
        <p className="mb-4 text-sm text-muted-foreground">
          Missing trial id in the route.
        </p>
        <Button onClick={() => navigate("/trials")}>Back to Trials</Button>
      </div>
    );
  }
  if (isLoading) {
    return (
      <div className="p-4">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  }
  if (isError || !trial) {
    return (
      <div className="p-4">
        <p className="mb-4 text-sm text-destructive">
          Failed to load this trial.
        </p>
        <Button variant="outline" onClick={() => navigate("/trials")}>
          Back to Trials
        </Button>
      </div>
    );
  }

  const viewAssets: OutputResourceAsset[] =
    Array.isArray(trial.resourceAssets) && trial.resourceAssets.length > 0
      ? trial.resourceAssets
      : [];

  return (
    <div className="p-4 space-y-6 max-w-5xl">
      <div className="pt-2">
        <Button variant="outline" onClick={() => navigate("/trials")}>
          Back to Trials
        </Button>
      </div>

      {/* ===================== Trial Card (view/edit) ===================== */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Trial</CardTitle>

          {!isEditing && (
            <TooltipProvider delayDuration={0}>
              <div className="flex items-center gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      className="rounded-md p-1 hover:bg-foreground/10"
                      onClick={() => setIsEditing(true)}
                      aria-label="Edit trial"
                      title="Edit"
                    >
                      <Pencil className="w-5 h-5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>Edit</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      className="rounded-md p-1 hover:bg-foreground/10"
                      onClick={() => setIsDeleteOpen(true)}
                      aria-label="Delete trial"
                      title="Delete"
                    >
                      <Trash2 className="w-5 h-5 text-red-600" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>Delete</TooltipContent>
                </Tooltip>
              </div>
            </TooltipProvider>
          )}
        </CardHeader>

        <CardContent className="space-y-6">
          {isEditing ? (
            <Form {...form}>
              <form className="space-y-6" onSubmit={onSubmitEdit}>
                {/* Title */}
                <FormField
                  control={control}
                  name="title"
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

                {/* Resource Assets (same as create) */}
                <ResourceAssetsEditor
                  control={control}
                  name="resourceAssets"
                  label="Media (Images / YouTube)"
                />

                {/* Rewards (same as create, with distribution below each) */}
                <RewardsEditor
                  control={control}
                  name="rewards"
                  assetOptions={ASSET_OPTIONS}
                  includeRewardType
                  showCurvePreview
                  totalLevelsForPreview={TOTAL_LEVELS}
                  label="Rewards (optional)"
                />

                {/* Expire Reward At */}
                <ExpireRewardAtPicker control={control} name="expireRewardAt" />

                {/* Target Geo */}
                <TargetGeoEditor
                  control={control}
                  watch={watch}
                  setValue={setValue}
                  basePath="targetGeo"
                />

                <div className="flex items-center gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      if (!trial) return;

                      const initialAssets: EditValues["resourceAssets"] =
                        Array.isArray(trial.resourceAssets) &&
                        trial.resourceAssets.length > 0
                          ? trial.resourceAssets.map((a) =>
                              a.type === "image"
                                ? { type: "image", value: [a.value] }
                                : {
                                    type: "youtube",
                                    value: extractYouTubeId(a.value),
                                  }
                            )
                          : [];

                      const initialRewards: EditValues["rewards"] =
                        Array.isArray(trial.rewards) && trial.rewards.length > 0
                          ? trial.rewards.map((r) => ({
                              assetId: r.assetId as any,
                              amount: Number(r.amount ?? 1),
                              rewardAmountCap: Number(
                                r.rewardAmountCap ?? r.amount ?? 1
                              ),
                              rewardType: "max",
                            }))
                          : [];

                      reset({
                        title: trial.title ?? "",
                        description: trial.description ?? "",
                        resourceAssets: initialAssets,
                        rewards: initialRewards,
                        targetGeo: {
                          countries: Array.isArray(trial.targetGeo?.countries)
                            ? trial.targetGeo!.countries
                            : [],
                          states: Array.isArray(trial.targetGeo?.states)
                            ? trial.targetGeo!.states
                            : [],
                          cities: Array.isArray(trial.targetGeo?.cities)
                            ? trial.targetGeo!.cities
                            : [],
                        },
                        expireRewardAt: trial.expireRewardAt ?? "",
                      });
                      setIsEditing(false);
                    }}
                    disabled={isSaving || isUploading}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSaving || isUploading}>
                    {isSaving || isUploading ? "Saving…" : "Save"}
                  </Button>
                </div>
              </form>
            </Form>
          ) : (
            <>
              {/* READ-ONLY VIEW */}
              <div>
                <div className="text-xs text-muted-foreground">ID</div>
                <div className="font-mono break-all">{trial._id}</div>
              </div>

              <div>
                <div className="text-xs text-muted-foreground">Title</div>
                <div className="font-medium">{trial.title}</div>
              </div>

              <div>
                <div className="text-xs text-muted-foreground">Description</div>
                <div>{trial.description || "-"}</div>
              </div>

              {/* Resource Assets view */}
              <div>
                <div className="text-xs text-muted-foreground">Media</div>
                {viewAssets.length ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                    {viewAssets.map((a, i) =>
                      a.type === "youtube" ? (
                        <div
                          key={`yt-${i}`}
                          className="flex items-center justify-between rounded-md border p-3"
                        >
                          <div className="flex min-w-0 flex-col">
                            <div className="text-xs text-muted-foreground">
                              YouTube
                            </div>
                            <div className="truncate text-sm font-medium">
                              {extractYouTubeId(a.value)}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div
                          key={`img-${i}`}
                          className="flex items-center justify-between gap-3 rounded-md border p-3"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={a.value}
                            alt="image"
                            className="h-16 w-16 rounded object-cover"
                          />
                          <div className="text-xs text-muted-foreground">
                            Image
                          </div>
                        </div>
                      )
                    )}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">-</div>
                )}
              </div>

              {/* Target Geo */}
              <div>
                <div className="text-xs text-muted-foreground">Target Geo</div>
                <h2 className="break-all">
                  Countries –{" "}
                  {Array.isArray(trial.targetGeo?.countries)
                    ? trial.targetGeo!.countries.join(", ")
                    : "-"}
                </h2>
                <h2 className="break-all">
                  States –{" "}
                  {Array.isArray(trial.targetGeo?.states)
                    ? trial.targetGeo!.states.join(", ")
                    : "-"}
                </h2>
                <h2 className="break-all">
                  Cities –{" "}
                  {Array.isArray(trial.targetGeo?.cities)
                    ? trial.targetGeo!.cities.join(", ")
                    : "-"}
                </h2>
              </div>

              {/* Rewards summary */}
              <div>
                <div className="text-xs text-muted-foreground">Rewards</div>
                {Array.isArray(trial.rewards) && trial.rewards.length ? (
                  <ul className="list-disc pl-5">
                    {trial.rewards.map((r, i) => (
                      <li key={`${r.assetId}-${i}`}>
                        {r.assetId} – amount {r.amount} (cap{" "}
                        {r.rewardAmountCap ?? r.amount})
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-sm text-muted-foreground">-</div>
                )}
              </div>

              {/* Expire Reward At */}
              <div>
                <div className="text-xs text-muted-foreground">
                  Expire Reward At
                </div>
                <div>
                  {trial.expireRewardAt ? fmt(trial.expireRewardAt) : "-"}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-muted-foreground">
                    Created At
                  </div>
                  <div>{fmt(trial.createdAt)}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">
                    Archived At
                  </div>
                  <div>{fmt(trial.archivedAt)}</div>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* ===================== Existing polls table ===================== */}
      <TrialPollTable trialId={id} />

      {/* Delete modal */}
      {isDeleteOpen && (
        <CustomModal
          isOpen
          onClose={() => setIsDeleteOpen(false)}
          title="Delete Trial"
          onSubmit={() => {}}
          footer={<></>}
        >
          <p className="mb-4">Are you sure you want to delete this trial?</p>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setIsDeleteOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              onClick={() => doDelete({ ids: [id] })}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting…" : "Delete"}
            </Button>
          </div>
        </CustomModal>
      )}
    </div>
  );
}
