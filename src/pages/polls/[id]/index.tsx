import { useMemo, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { endpoints } from "@/api/endpoints";
import { useApiQuery } from "@/hooks/useApiQuery";
import { useApiMutation } from "@/hooks/useApiMutation";
import { queryClient } from "@/api/queryClient";
import { appToast } from "@/utils/toast";

import { Button } from "@/components/ui/button";
import { Edit, Pencil, PlusSquare, Recycle, Trash2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { fmt } from "@/components/paginated-table";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

import { usePollViewStore } from "@/stores/poll_view.store";
import { AddOptionModal } from "@/components/modals/table_polls/add-option";
import { EditOptionModal } from "@/components/modals/table_polls/edit-option";
import { ArchiveToggleOptionModal } from "@/components/modals/table_polls/archive-toggle-option";
import { cn } from "@/lib/utils";

import ResourceAssetsEditor from "@/components/polling/editors/ResourceAssetsEditor";
import RewardsEditor, {
  type AssetOption,
} from "@/components/polling/editors/RewardsEditor";
import ExpireRewardAtPicker from "@/components/polling/editors/ExpireRewardAtPicker";
import TargetGeoEditor from "@/components/polling/editors/TargetGeoEditor";
import { useImageUpload } from "@/hooks/upload/useAssetUpload";
import { extractYouTubeId } from "@/utils/youtube";

/* ---------- constants ---------- */
const TOTAL_LEVELS = 10 as const;
const ASSET_OPTIONS: AssetOption[] = [
  { label: "OCTA", value: "xOcta" },
  { label: "MYST", value: "xMYST" },
  { label: "DROP", value: "xDrop" },
  { label: "XPOLL", value: "xPoll" },
];

/* ---------- types ---------- */
type PollOption = {
  _id: string;
  text: string;
  archivedAt?: string | null;
};

type ResourceAsset = { type: "image" | "youtube"; value: string };

type RewardRow = {
  assetId: "xOcta" | "xMYST" | "xDrop" | "xPoll";
  amount: number;
  rewardAmountCap: number;
  rewardType: "max" | "min";
};

type Poll = {
  _id?: string;
  pollId: string;
  title: string;
  description?: string;
  createdAt?: string;
  archivedAt?: string | null;

  // modern preferred
  resourceAssets?: ResourceAsset[];
  // legacy single url
  media?: string;

  // optional if your backend returns rewards on show
  rewards?: RewardRow[];
  expireRewardAt?: string | null;

  options?: PollOption[];
  targetGeo?: {
    countries?: string[];
    states?: string[];
    cities?: string[];
  };
  /** present if this poll belongs to a trial */
  trialId?: string;
  /** some backends embed trial object instead */
  trial?: { _id: string; title?: string };
};

const MAX_OPTIONS = 4;

/* ---------- helpers ---------- */
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

function cmpRewards(a: RewardRow[] = [], b: RewardRow[] = []) {
  const norm = (arr: RewardRow[]) =>
    [...arr]
      .sort((x, y) => x.assetId.localeCompare(y.assetId))
      .map(
        (r) => `${r.assetId}:${r.amount}:${r.rewardAmountCap}:${r.rewardType}`
      )
      .join("|");
  return norm(a) === norm(b);
}

/* ---------- zod: same field names/rules as Create Poll ---------- */
const resourceAssetZ = z.union([
  z.object({ type: z.literal("youtube"), value: z.string().min(11) }),
  z.object({
    type: z.literal("image"),
    // keep as [File|string] in-form for preview; collapse to string on save
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

const editSchema = z
  .object({
    title: z.string().min(3, "Min 3 chars").trim(),
    description: z.string().min(3, "Min 3 chars").trim(),
    resourceAssets: z.array(resourceAssetZ).default([]),
    rewards: z.array(rewardRowZ).min(1, "At least one reward is required"),
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
type OutputResourceAsset = { type: "image" | "youtube"; value: string };

/* ---------- assets helpers ---------- */
function toComparableAssets(arr?: OutputResourceAsset[]) {
  return (arr ?? []).map((a) =>
    a.type === "youtube" ? `yt:${extractYouTubeId(a.value)}` : `img:${a.value}`
  );
}

/* =========================================================
   Component
   ========================================================= */
export default function PollShowPage() {
  const navigate = useNavigate();
  const { id = "" } = useParams<{ id: string }>();

  const showRoute = (endpoints.entities as any)?.polls?.getById
    ? (endpoints.entities as any).polls.getById(id)
    : `/poll/${id}`;
  const { data, isLoading, isError } = useApiQuery(showRoute);

  const poll: Poll | null = useMemo(() => {
    return data?.data?.data ?? data?.data ?? null;
  }, [data]);
  console.log("poll", poll);
  const isTrialPoll = !!(poll?.trialId || poll?.trial?._id);

  const [isEditing, setIsEditing] = useState(false);

  const form = useForm<EditValues>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      title: "",
      description: "",
      resourceAssets: [],
      rewards: [
        {
          assetId: ASSET_OPTIONS[0].value as any,
          amount: "",
          rewardAmountCap: "",
          rewardType: "max",
        },
      ],
      targetGeo: { countries: [], states: [], cities: [] },
      expireRewardAt: "",
    },
    mode: "onChange",
  });
  const { control, handleSubmit, reset, getValues, setValue, watch } = form;

  const { uploadImage, loading: isUploading } = useImageUpload();

  // hydrate form when poll loads
  useEffect(() => {
    if (!poll) return;

    // Prefer modern resourceAssets; fallback to legacy media string
    const initialAssets: EditValues["resourceAssets"] =
      Array.isArray(poll.resourceAssets) && poll.resourceAssets.length > 0
        ? poll.resourceAssets.map((a) =>
            a.type === "image"
              ? { type: "image", value: [a.value] }
              : { type: "youtube", value: extractYouTubeId(a.value) }
          )
        : poll.media
        ? [{ type: "image", value: [poll.media] }]
        : [];

    const initialRewards: EditValues["rewards"] =
      Array.isArray(poll.rewards) && poll.rewards.length > 0
        ? poll.rewards
        : [
            {
              assetId: ASSET_OPTIONS[0].value as any,
              amount: 1,
              rewardAmountCap: 1,
              rewardType: "max",
            },
          ];

    reset({
      title: poll.title ?? "",
      description: poll.description ?? "",
      resourceAssets: initialAssets,
      rewards: initialRewards,
      targetGeo: {
        countries: Array.isArray(poll.targetGeo?.countries)
          ? poll.targetGeo!.countries
          : [],
        states: Array.isArray(poll.targetGeo?.states)
          ? poll.targetGeo!.states
          : [],
        cities: Array.isArray(poll.targetGeo?.cities)
          ? poll.targetGeo!.cities
          : [],
      },
      expireRewardAt: poll.expireRewardAt ?? "",
    });
  }, [poll, reset]);

  const { mutate: saveEdit, isPending: isSaving } = useApiMutation<any, any>({
    route: endpoints.entities.polls.edit.details,
    method: "PUT",
    onSuccess: (_resp, _vars) => {
      appToast.success("Poll updated");
      setIsEditing(false);

      const v = getValues();

      // Prepare normalized assets for cache patch
      const normalizedNow: OutputResourceAsset[] = (v.resourceAssets ?? []).map(
        (a: any) =>
          a.type === "youtube"
            ? { type: "youtube", value: extractYouTubeId(a.value) }
            : {
                type: "image",
                value:
                  typeof a.value?.[0] === "string"
                    ? a.value[0]
                    : String(a.value),
              }
      );

      patchShowCache(showRoute, (curr) => ({
        ...curr,
        title: v.title,
        description: v.description,
        resourceAssets: normalizedNow,
        rewards: v.rewards,
        expireRewardAt: v.expireRewardAt?.trim() ? v.expireRewardAt : undefined,
        // IMPORTANT: trial polls do not update targetGeo here (controlled at trial)
        targetGeo: isTrialPoll ? curr.targetGeo : v.targetGeo ?? curr.targetGeo,
        // legacy "media" (first image) for backward-compat viewers
        media:
          normalizedNow.find((x) => x.type === "image")?.value ??
          (curr as any)?.media,
      }));

      queryClient.invalidateQueries({ queryKey: [showRoute] });
      queryClient.invalidateQueries({
        predicate: (q) =>
          typeof q.queryKey?.[0] === "string" &&
          (q.queryKey[0] as string).startsWith(
            (endpoints.entities as any)?.polls?.all ?? "/poll/list"
          ),
      });
    },
  });

  // normalize editor assets -> server format (uploads new Files)
  const normalizeAssetsForSave = async (
    arr?: EditValues["resourceAssets"]
  ): Promise<OutputResourceAsset[]> => {
    const items = arr ?? [];
    return Promise.all(
      items.map(async (a) => {
        if (a.type === "youtube") {
          return { type: "youtube", value: extractYouTubeId(String(a.value)) };
        }
        // image: a.value is [File|string] | null
        const list = (a.value ?? []) as (File | string)[];
        let first = list[0];
        if (first instanceof File) {
          first = await uploadImage(first); // upload and replace with URL
        }
        return { type: "image", value: typeof first === "string" ? first : "" };
      })
    );
  };

  // submit with diffs only
  const onSubmitEdit = handleSubmit(async (v) => {
    if (!poll) return;

    // Build normalized assets from current editor state
    const normalizedNow = await normalizeAssetsForSave(v.resourceAssets);

    // Build previous normalized assets (from poll) for diff
    const prevAssets: OutputResourceAsset[] =
      Array.isArray(poll.resourceAssets) && poll.resourceAssets.length > 0
        ? poll.resourceAssets.map((a) =>
            a.type === "youtube"
              ? { type: "youtube", value: extractYouTubeId(a.value) }
              : { type: "image", value: a.value }
          )
        : poll.media
        ? [{ type: "image", value: poll.media }]
        : [];

    const payload: any = { pollId: id };

    if (v.title !== (poll.title ?? "")) payload.title = v.title;
    if (v.description !== (poll.description ?? ""))
      payload.description = v.description;

    // Only include targetGeo for NON-trial polls
    if (!isTrialPoll) {
      const prevTG = {
        countries: poll.targetGeo?.countries ?? [],
        states: poll.targetGeo?.states ?? [],
        cities: poll.targetGeo?.cities ?? [],
      };
      const nextTG = v.targetGeo ?? { countries: [], states: [], cities: [] };

      const geoChanged =
        !arrEqUnordered(nextTG.countries, prevTG.countries) ||
        !arrEqUnordered(nextTG.states, prevTG.states) ||
        !arrEqUnordered(nextTG.cities, prevTG.cities);

      if (geoChanged) payload.targetGeo = nextTG;
    }

    // resourceAssets diffs
    const prevCmp = toComparableAssets(prevAssets);
    const nowCmp = toComparableAssets(normalizedNow);
    const assetsChanged =
      prevCmp.length !== nowCmp.length ||
      prevCmp.some((v, i) => v !== nowCmp[i]); // order preserved by UI
    if (assetsChanged) {
      payload.resourceAssets = normalizedNow;
      // Optional: keep legacy "media" in sync if your backend still reads it
      const firstImg = normalizedNow.find((x) => x.type === "image")?.value;
      if (firstImg) payload.media = firstImg;
    }

    // rewards diffs
    const prevRewards = (poll.rewards ?? []) as RewardRow[];
    const nowRewards = (v.rewards ?? []) as RewardRow[];
    if (!cmpRewards(prevRewards, nowRewards)) {
      payload.rewards = nowRewards.map((r) => ({
        assetId: r.assetId,
        amount: r.amount,
        rewardAmountCap: r.rewardAmountCap,
        rewardType: r.rewardType,
      }));
    }

    // expireRewardAt diff (treat "" and undefined as unset)
    const prevExpire = (poll.expireRewardAt ?? "").trim();
    const nowExpire = (v.expireRewardAt ?? "").trim();
    if (prevExpire !== nowExpire) {
      payload.expireRewardAt = nowExpire ? nowExpire : undefined;
    }

    if (Object.keys(payload).length <= 1) {
      // nothing changed
      setIsEditing(false);
      return;
    }

    saveEdit(payload);
  });

  const activeCount = (poll?.options ?? []).filter((o) => !o.archivedAt).length;
  const canAddOption = activeCount < MAX_OPTIONS;

  // ===== option modals =====
  const isAddOption = usePollViewStore((s) => s.isAddOption);
  const setIsAddOption = usePollViewStore((s) => s.setIsAddOption);
  const isEditOption = usePollViewStore((s) => s.isEditOption);
  const setIsEditOption = usePollViewStore((s) => s.setIsEditOption);
  const isArchiveToggleOption = usePollViewStore(
    (s) => s.isArchiveToggleOption
  );

  console.log("isArchiveToggleOption", isArchiveToggleOption);
  const setIsArchiveToggleOption = usePollViewStore(
    (s) => s.setIsArchiveToggleOption
  );

  // ===== page loading / error =====
  if (!id) {
    return (
      <div className="p-4">
        <p className="mb-4 text-sm text-muted-foreground">
          Missing poll id in the route.
        </p>
        <Button onClick={() => navigate("/polls")}>Back to Polls</Button>
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
  if (isError || !poll) {
    return (
      <div className="p-4">
        <p className="mb-4 text-sm text-destructive">
          Failed to load this poll.
        </p>
        <Button variant="outline" onClick={() => navigate("/polls")}>
          Back to Polls
        </Button>
      </div>
    );
  }

  const viewAssets: OutputResourceAsset[] =
    Array.isArray(poll.resourceAssets) && poll.resourceAssets.length > 0
      ? poll.resourceAssets
      : poll.media
      ? [{ type: "image", value: poll.media }]
      : [];

  return (
    <div className="p-4 space-y-6 max-w-4xl">
      {isEditing ? (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              Edit Poll
              {/* {isTrialPoll && (
                <span className="text-xs rounded px-2 py-0.5 bg-muted">
                  Trial poll — Target Geo managed by Trial
                </span>
              )} */}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form className="space-y-6" onSubmit={onSubmitEdit}>
                {/* Title (same as create) */}
                <FormField
                  control={control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-muted-foreground">
                        Title
                      </FormLabel>
                      <FormControl>
                        <input
                          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                          placeholder="Poll title"
                          required
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Description (same as create) */}
                <FormField
                  control={control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-muted-foreground">
                        Description
                      </FormLabel>
                      <FormControl>
                        <textarea
                          placeholder="Short description"
                          className="flex h-28 w-full rounded-md border border-input bg-transparent text-foreground px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                          {...field}
                        />
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

                {/* Rewards (same as create) */}
                <RewardsEditor
                  control={control}
                  name="rewards"
                  assetOptions={ASSET_OPTIONS}
                  includeRewardType
                  showCurvePreview
                  totalLevelsForPreview={TOTAL_LEVELS}
                  label="Rewards"
                />

                {/* Expire Reward At (same as create) */}
                <ExpireRewardAtPicker control={control} name="expireRewardAt" />

                {/* Target Geo (hidden for trial polls) */}
                {!isTrialPoll && (
                  <TargetGeoEditor
                    control={control}
                    watch={watch}
                    setValue={setValue}
                    basePath="targetGeo"
                    label="Target Geo"
                  />
                )}

                <div className="flex items-center gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      if (!poll) return;

                      // Reset to server state
                      const initialAssets: EditValues["resourceAssets"] =
                        Array.isArray(poll.resourceAssets) &&
                        poll.resourceAssets.length > 0
                          ? poll.resourceAssets.map((a) =>
                              a.type === "image"
                                ? { type: "image", value: [a.value] }
                                : {
                                    type: "youtube",
                                    value: extractYouTubeId(a.value),
                                  }
                            )
                          : poll.media
                          ? [{ type: "image", value: [poll.media] }]
                          : [];

                      const initialRewards: EditValues["rewards"] =
                        Array.isArray(poll.rewards) && poll.rewards.length > 0
                          ? poll.rewards.map((r) => ({
                              assetId: r.assetId as any,
                              amount: Number(r.amount), // convert
                              rewardAmountCap: Number(r.rewardAmountCap), // convert
                              rewardType: r.rewardType as "max" | "min",
                            }))
                          : [
                              {
                                assetId: ASSET_OPTIONS[0].value as any,
                                amount: 1,
                                rewardAmountCap: 1,
                                rewardType: "max",
                              },
                            ];

                      reset({
                        title: poll.title ?? "",
                        description: poll.description ?? "",
                        resourceAssets: initialAssets,
                        rewards: initialRewards,
                        targetGeo: {
                          countries: Array.isArray(poll.targetGeo?.countries)
                            ? poll.targetGeo!.countries
                            : [],
                          states: Array.isArray(poll.targetGeo?.states)
                            ? poll.targetGeo!.states
                            : [],
                          cities: Array.isArray(poll.targetGeo?.cities)
                            ? poll.targetGeo!.cities
                            : [],
                        },
                        expireRewardAt: poll.expireRewardAt ?? "",
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
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              Poll
              {/* {isTrialPoll && (
                <span className="text-xs rounded px-2 py-0.5 bg-muted">
                  Trial poll — Target Geo is controlled by Trial
                </span>
              )} */}
            </CardTitle>
            <button
              className="rounded-md p-1 hover:bg-foreground/10"
              onClick={() => setIsEditing(true)}
              aria-label="Edit poll"
              title="Edit poll"
            >
              <Edit className="w-4 h-4" />
            </button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-xs text-muted-foreground">ID</div>
              <div className="font-mono break-all">{poll._id}</div>
            </div>

            <div>
              <div className="text-xs text-muted-foreground">Title</div>
              <div className="font-medium">{poll.title}</div>
            </div>

            <div>
              <div className="text-xs text-muted-foreground">Description</div>
              <div>{poll.description || "-"}</div>
            </div>

            {/* Resource Assets view */}
            <div>
              <div className="text-xs text-muted-foreground">Media</div>
              {viewAssets.length ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                  {viewAssets.map((a, i) => {
                    console.log("a", a);
                    return a.type === "youtube" ? (
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
                        <div className="flex items-center gap-3">
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
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">-</div>
              )}
            </div>

            {/* Hide Target Geo block entirely for trial polls */}
            {!isTrialPoll && (
              <div>
                <div className="text-xs text-muted-foreground">Target Geo</div>
                <h2 className="break-all">
                  Countries –{" "}
                  {Array.isArray(poll.targetGeo?.countries)
                    ? poll.targetGeo!.countries.join(", ")
                    : "-"}
                </h2>
                <h2 className="break-all">
                  States –{" "}
                  {Array.isArray(poll.targetGeo?.states)
                    ? poll.targetGeo!.states.join(", ")
                    : "-"}
                </h2>
                <h2 className="break-all">
                  Cities –{" "}
                  {Array.isArray(poll.targetGeo?.cities)
                    ? poll.targetGeo!.cities.join(", ")
                    : "-"}
                </h2>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-muted-foreground">Created At</div>
                <div>{fmt(poll.createdAt)}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Archived At</div>
                <div>{fmt(poll.archivedAt)}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ===== Options card (kept at bottom exactly as before) ===== */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Options</CardTitle>

          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  className={`rounded-md p-1 hover:bg-foreground/10 ${
                    !canAddOption ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                  onClick={() => {
                    if (!canAddOption) return;
                    setIsAddOption({ pollId: (poll as any)._id });
                  }}
                  aria-label="Add option"
                  title={canAddOption ? "Add option" : "Max 4 active options"}
                  disabled={!canAddOption}
                >
                  <PlusSquare className="w-4 h-4" />
                </button>
              </TooltipTrigger>
              {!canAddOption && (
                <TooltipContent>Maximum of 4 active options</TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        </CardHeader>

        <CardContent className="space-y-4">
          {poll?.options?.length ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {(poll.options ?? []).map((opt) => {
                const isArchived = !!opt.archivedAt;
                return (
                  <div
                    key={opt._id}
                    className={cn(
                      "relative border rounded-lg p-3 hover:bg-muted/30",
                      isArchived && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <div className="absolute right-2 top-2 flex items-center gap-2">
                      {!isArchived && (
                        <button
                          className="rounded-md p-1 hover:bg-foreground/10"
                          onClick={() =>
                            setIsEditOption({
                              pollId: (poll as any)._id,
                              optionId: opt._id,
                              oldText: opt.text,
                            })
                          }
                          aria-label="Edit option"
                          title="Edit option"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                      )}

                      {isArchived && activeCount + 1 > MAX_OPTIONS ? null : (
                        <button
                          className="rounded-md p-1 hover:bg-foreground/10"
                          onClick={() => {
                            console.log("is reaching archiving");
                            setIsArchiveToggleOption({
                              pollId: (poll as any)._id,
                              optionId: opt._id,
                              shouldArchive: !isArchived,
                            });
                          }}
                          aria-label={`Delete option ${opt.text}`}
                          title="Delete option"
                        >
                          {!isArchived ? (
                            <>
                              <Trash2 className={`w-4 h-4 text-red-600`} />
                            </>
                          ) : (
                            <Recycle className={`w-4 h-4 text-white`} />
                          )}
                        </button>
                      )}
                    </div>

                    <div className="pr-10">
                      <div className="text-xs text-muted-foreground mb-1">
                        Option ID
                      </div>
                      <div className="font-mono text-xs break-all mb-2">
                        {opt._id}
                      </div>
                      <div
                        className={cn(
                          "text-sm",
                          isArchived && "line-through opacity-60"
                        )}
                      >
                        {opt.text}
                      </div>
                      <div className="text-xs text-muted-foreground mt-2">
                        Archived: {opt.archivedAt ? fmt(opt.archivedAt) : "-"}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">
              No options were found on this poll.
            </div>
          )}
        </CardContent>
      </Card>

      {isAddOption && <AddOptionModal />}
      {isEditOption && <EditOptionModal />}
      {isArchiveToggleOption && <ArchiveToggleOptionModal />}
    </div>
  );
}
