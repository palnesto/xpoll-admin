import { useMemo, useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { z } from "zod";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { endpoints } from "@/api/endpoints";
import { useApiQuery } from "@/hooks/useApiQuery";
import { useApiMutation } from "@/hooks/useApiMutation";
import { queryClient } from "@/api/queryClient";
import { appToast } from "@/utils/toast";

import { Button } from "@/components/ui/button";
import {
  Edit,
  Loader2,
  Pencil,
  PlusSquare,
  Recycle,
  Trash2,
} from "lucide-react";
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

import ResourceAssetsEditor, {
  getYTImageUrl,
} from "@/components/polling/editors/ResourceAssetsEditor";
import ExpireRewardAtPicker from "@/components/polling/editors/ExpireRewardAtPicker";
import TargetGeoEditor from "@/components/polling/editors/TargetGeoEditor";
import { useImageUpload } from "@/hooks/upload/useAssetUpload";
import { extractYouTubeId } from "@/utils/youtube";
import { FormCard } from "@/components/form/form-card";
import TwoPane from "@/layouts/TwoPane";
import RewardDetailPanel from "@/components/polling/editors/RewardDetailPanel";
import RewardsList from "@/components/polling/editors/RewardsList";
import ResourceAssetsPreview from "@/components/polling/editors/ResourceAssetsPreview";
import { AssetOption } from "@/components/commons/selects/asset-multi-select";
import { assetSpecs } from "@/utils/currency-assets/asset";
import { adminZone, utcToAdmin } from "@/utils/time";

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

export type ResourceAsset = { type: "image" | "youtube"; value: string };

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

// add near other zod helpers
const geoItemZ = z.union([
  z.string(), // server shape or simple ID
  z.object({ _id: z.string().min(1), name: z.string().min(1) }), // editor shape
]);

const baseSchema = {
  title: z.string().min(3, "Min 3 chars").trim(),
  description: z.string().min(3, "Min 3 chars").trim(),
  resourceAssets: z.array(resourceAssetZ).default([]),
  targetGeo: z.object({
    countries: z.array(geoItemZ).default([]),
    states: z.array(geoItemZ).default([]),
    cities: z.array(geoItemZ).default([]),
  }),
};

const trialEditSchema = z.object(baseSchema); // no rewards, no expireRewardAt

const normalEditSchema = z
  .object({
    ...baseSchema,
    rewards: z.array(rewardRowZ).min(1, "At least one reward is required"),
    expireRewardAt: z
      .string()
      .datetime()
      .optional()
      .or(z.literal("").optional())
      .refine(
        (val) => {
          if (!val || val === "") return true; // allow empty / optional
          const d = new Date(val);
          const now = new Date();
          return d >= now;
        },
        {
          message: "Expiry date must not be in the past",
        }
      ),
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

type EditValues = z.infer<typeof normalEditSchema>;
type OutputResourceAsset = { type: "image" | "youtube"; value: string };

function toComparableAssets(arr?: OutputResourceAsset[]) {
  return (arr ?? []).map((a) =>
    a.type === "youtube" ? `yt:${extractYouTubeId(a.value)}` : `img:${a.value}`
  );
}

export default function PollShowPage() {
  const navigate = useNavigate();
  const location = useLocation() || {};
  const isNavigationEditing = location?.state?.isNavigationEditing;
  const { id = "" } = useParams<{ id: string }>();
  const [activeRewardIndex, setActiveRewardIndex] = useState<number | null>(
    null
  );

  const showRoute = (endpoints.entities as any)?.polls?.getById
    ? (endpoints.entities as any).polls.getById(id)
    : `/internal/poll/${id}`;
  const { data, isLoading, isError } = useApiQuery(showRoute);

  const poll: Poll | null = useMemo(() => {
    return data?.data?.data ?? data?.data ?? null;
  }, [data]);
  const isTrialPoll = !!(poll?.trialId || poll?.trial?._id);

  const [isEditing, setIsEditing] = useState(isNavigationEditing ?? false);
  function renderGeoList(list?: Array<{ _id: string; name: string } | string>) {
    if (!Array.isArray(list) || list.length === 0)
      return (
        <span className="text-zinc-400 text-sm">No Location Selected</span>
      );
    const names = list
      .map((item) =>
        typeof item === "string" ? item : item?.name || item?._id || ""
      )
      .filter(Boolean);
    return (
      <div className="flex flex-wrap gap-2">
        {names.map((name, idx) => {
          return (
            <span key={idx + name} className="bg-gray-950 py-1 px-2 rounded-lg">
              {name}
            </span>
          );
        })}
      </div>
    );
  }

  const form = useForm<EditValues>({
    resolver: zodResolver(isTrialPoll ? trialEditSchema : normalEditSchema),
    defaultValues: {
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
    mode: "onChange",
  });
  const { control, handleSubmit, reset, getValues, setValue, watch } = form;

  const { uploadImage, loading: isUploading } = useImageUpload();
  const { fields, append, remove, update } = useFieldArray({
    control,
    name: "rewards",
  });
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
    const initialTG = {
      countries: Array.isArray(poll.targetGeo?.countries)
        ? poll.targetGeo!.countries.map((c: any) => ({
            _id: String(c?._id ?? c?.id ?? c?.value ?? c),
            name: String(c?.name ?? c?.label ?? c?._id ?? c),
          }))
        : [],
      states: Array.isArray(poll.targetGeo?.states)
        ? poll.targetGeo!.states.map((s: any) => ({
            _id: String(s?._id ?? s?.id ?? s?.value ?? s),
            name: String(s?.name ?? s?.label ?? s?._id ?? s),
          }))
        : [],
      cities: Array.isArray(poll.targetGeo?.cities)
        ? poll.targetGeo!.cities.map((ci: any) => ({
            _id: String(ci?._id ?? ci?.id ?? ci?.value ?? ci),
            name: String(ci?.name ?? ci?.label ?? ci?._id ?? ci),
          }))
        : [],
    };

    reset({
      title: poll.title ?? "",
      description: poll.description ?? "",
      resourceAssets: initialAssets,
      rewards: initialRewards,
      targetGeo: initialTG, // 👈 important
      expireRewardAt: poll.expireRewardAt ?? "",
    });
  }, [poll, reset]);
  useEffect(() => {
    if (isNavigationEditing) {
      setIsEditing(true);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [isNavigationEditing]);

  const { mutate: saveEdit, isPending: isSaving } = useApiMutation<any, any>({
    route: endpoints.entities.polls.edit.details,
    method: "PUT",
    onSuccess: (_resp, _vars) => {
      appToast.success("Poll updated");

      const v = getValues();
      const idsOnlyTG = {
        countries: (v.targetGeo?.countries ?? []).map((x: any) =>
          typeof x === "string" ? x : x._id
        ),
        states: (v.targetGeo?.states ?? []).map((x: any) =>
          typeof x === "string" ? x : x._id
        ),
        cities: (v.targetGeo?.cities ?? []).map((x: any) =>
          typeof x === "string" ? x : x._id
        ),
      };
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
        targetGeo: isTrialPoll ? curr.targetGeo : idsOnlyTG, // 👈 store IDs
        media:
          normalizedNow.find((x) => x.type === "image")?.value ??
          (curr as any)?.media,
      }));

      queryClient.invalidateQueries({ queryKey: ["GET", showRoute] });
      setIsEditing(false);
      navigate(location.pathname, { replace: true });
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

      // extract ids regardless of objects/strings in-form
      const idsOnly = {
        countries: (nextTG.countries ?? []).map((x: any) =>
          typeof x === "string" ? x : x._id
        ),
        states: (nextTG.states ?? []).map((x: any) =>
          typeof x === "string" ? x : x._id
        ),
        cities: (nextTG.cities ?? []).map((x: any) =>
          typeof x === "string" ? x : x._id
        ),
      };

      const arrEqUnordered = (a: string[], b: string[]) => {
        if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length)
          return false;
        const A = [...a].sort(),
          B = [...b].sort();
        return A.every((v, i) => v === B[i]);
      };

      const prevIds = {
        countries: (prevTG.countries ?? []).map((x: any) =>
          typeof x === "string" ? x : x?._id
        ),
        states: (prevTG.states ?? []).map((x: any) =>
          typeof x === "string" ? x : x?._id
        ),
        cities: (prevTG.cities ?? []).map((x: any) =>
          typeof x === "string" ? x : x?._id
        ),
      };

      const geoChanged =
        !arrEqUnordered(idsOnly.countries, prevIds.countries) ||
        !arrEqUnordered(idsOnly.states, prevIds.states) ||
        !arrEqUnordered(idsOnly.cities, prevIds.cities);

      console.log("[POLL SUBMIT:TG]", { nextTG, idsOnly, prevIds, geoChanged });

      if (geoChanged) payload.targetGeo = idsOnly; // ✅ server expects string[]
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
    // rewards diffs
    if (!isTrialPoll) {
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

      // expireRewardAt diff
      const prevExpire = (poll.expireRewardAt ?? "").trim();
      const nowExpire = (v.expireRewardAt ?? "").trim();
      if (prevExpire !== nowExpire) {
        payload.expireRewardAt = nowExpire ? nowExpire : undefined;
      }
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
  const isBusy = isLoading || isUploading || isSaving;
  return (
    <div className="space-y-6">
      {isEditing ? (
        <div className="p-6 space-y-8 w-full">
          {/* Header */}
          <div className="flex justify-between items-center w-full">
            <h1 className="text-2xl tracking-wider">Edit Poll</h1>
            {/* <Button
              type="submit"
              form="poll-form"
              disabled={isBusy}
              className="text-base tracking-wide"
            >
              {isBusy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Edit Poll
            </Button> */}
          </div>
          <Form {...form}>
            <form className="space-y-6" onSubmit={onSubmitEdit}>
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormCard title="Basic Info">
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
                      </FormCard>

                      {/* Resource Assets (same as create) */}
                      <FormCard
                        title="Resource Assets (Optional)"
                        subtitle="Max.: 3"
                      >
                        <ResourceAssetsEditor
                          control={control}
                          name="resourceAssets"
                          label="Media (Images / YouTube)"
                          isEditing={true}
                        />
                      </FormCard>
                    </div>
                    <FormCard title="Add Options">
                      {/* ===== Options card (kept at bottom exactly as before) ===== */}
                      <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                          <CardTitle>Options</CardTitle>
                          <TooltipProvider delayDuration={0}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  type="button"
                                  className={`rounded-md p-1 hover:bg-foreground/10 ${
                                    !canAddOption
                                      ? "opacity-50 cursor-not-allowed"
                                      : ""
                                  }`}
                                  onClick={() => {
                                    if (!canAddOption) return;
                                    setIsAddOption({
                                      pollId: (poll as any)._id,
                                    });
                                  }}
                                  aria-label="Add option"
                                  title={
                                    canAddOption
                                      ? "Add option"
                                      : "Max 4 active options"
                                  }
                                  disabled={!canAddOption}
                                >
                                  <PlusSquare className="w-4 h-4" />
                                </button>
                              </TooltipTrigger>
                              {!canAddOption && (
                                <TooltipContent>
                                  Maximum of 4 active options
                                </TooltipContent>
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
                                      isArchived &&
                                        "opacity-50 cursor-not-allowed"
                                    )}
                                  >
                                    <div className="absolute right-2 top-2 flex items-center gap-2">
                                      {!isArchived && (
                                        <button
                                          type="button"
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

                                      {isArchived &&
                                      activeCount + 1 > MAX_OPTIONS ? null : (
                                        <button
                                          type="button"
                                          className="rounded-md p-1 hover:bg-foreground/10"
                                          onClick={() => {
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
                                            <Trash2
                                              className={`w-4 h-4 text-red-600`}
                                            />
                                          ) : (
                                            <Recycle
                                              className={`w-4 h-4 text-white`}
                                            />
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
                                          isArchived &&
                                            "line-through opacity-60"
                                        )}
                                      >
                                        {opt.text}
                                      </div>
                                      <div className="text-xs text-muted-foreground mt-2">
                                        Archived:{" "}
                                        {opt.archivedAt
                                          ? fmt(opt.archivedAt)
                                          : "-"}
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
                    </FormCard>

                    {/* Rewards (same as create) */}
                    {!isTrialPoll && (
                      <>
                        <div className="flex gap-2 items-center">
                          <Button
                            type="button"
                            size="icon"
                            onClick={() => setActiveRewardIndex(-1)}
                            className="w-fit p-2"
                            disabled={
                              fields?.length >= Object.keys(assetSpecs)?.length
                            }
                          >
                            Add reward
                          </Button>
                        </div>
                        <FormCard title="Rewards">
                          <RewardsList
                            fields={fields}
                            assetOptions={ASSET_OPTIONS as any}
                            onEdit={setActiveRewardIndex}
                            onAdd={() => setActiveRewardIndex(-1)}
                            remove={remove}
                            allAssets={ASSET_OPTIONS.map((a) => a.value)}
                            hideEditButton={!isEditing}
                            hideDeleteButton={!isEditing}
                          />
                        </FormCard>
                      </>
                    )}

                    {/* Target Geo (hidden for trial polls) */}
                    {!isTrialPoll && (
                      <TargetGeoEditor
                        control={control}
                        watch={watch}
                        setValue={setValue}
                        basePath="targetGeo"
                        label="Target Geo (Optional)"
                      />
                    )}

                    <section className="flex items-end justify-between">
                      {/* Expire Reward At (same as create) */}
                      {!isTrialPoll && (
                        <ExpireRewardAtPicker
                          control={control}
                          name="expireRewardAt"
                        />
                      )}
                      <div className="flex items-center gap-2">
                        <Button
                          className="text-lg font-bold px-6 py-5"
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
                              Array.isArray(poll.rewards) &&
                              poll.rewards.length > 0
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
                              rewards: isTrialPoll ? [] : initialRewards,
                              targetGeo: {
                                countries: Array.isArray(
                                  poll.targetGeo?.countries
                                )
                                  ? poll.targetGeo!.countries
                                  : [],
                                states: Array.isArray(poll.targetGeo?.states)
                                  ? poll.targetGeo!.states
                                  : [],
                                cities: Array.isArray(poll.targetGeo?.cities)
                                  ? poll.targetGeo!.cities
                                  : [],
                              },
                              expireRewardAt: isTrialPoll
                                ? ""
                                : poll.expireRewardAt ?? "",
                            });
                            setIsEditing(false);
                          }}
                          disabled={isSaving || isUploading}
                        >
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          disabled={isSaving || isUploading}
                          className="text-lg font-bold px-6 py-5"
                        >
                          {isSaving || isUploading ? "Saving…" : "Save"}
                        </Button>
                      </div>
                    </section>
                  </div>
                }
              />
            </form>
          </Form>
        </div>
      ) : (
        <>
          <section className="flex justify-between items-center w-full">
            <h1 className="text-2xl tracking-wider">Poll</h1>
            <Button
              className="rounded-md p-1"
              onClick={() => setIsEditing(true)}
              aria-label="Edit poll"
              title="Edit poll"
            >
              {isBusy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Edit className="w-4 h-4" />
            </Button>
          </section>
          <section className="space-y-7">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormCard title="Basic Info">
                <div>
                  <div className="text-xs text-muted-foreground">ID</div>
                  <div className="font-mono break-all">{poll._id}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Title</div>
                  <div className="font-medium">{poll.title}</div>
                </div>

                <div>
                  <div className="text-xs text-muted-foreground">
                    Description
                  </div>
                  <div>{poll.description || "-"}</div>
                </div>
              </FormCard>

              <FormCard title="Resource Assets">
                {viewAssets.length ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                    {viewAssets.map((a, i) => {
                      return a.type === "youtube" ? (
                        <>
                          <div
                            key={`yt-${i}`}
                            className="flex items-center justify-between rounded-md border p-1 h-16 w-full"
                          >
                            <a
                              target="_blank"
                              href={`https://www.youtube.com/watch?v=${a.value}`}
                              rel="noreferrer"
                            >
                              <ResourceAssetsPreview
                                src={getYTImageUrl(extractYouTubeId(a.value))}
                                label={`youtube`}
                              />
                            </a>
                          </div>
                        </>
                      ) : (
                        <div
                          key={`img-${i}`}
                          className="flex items-center h-16 justify-between gap-3 rounded-md border p-1 w-full"
                        >
                          <a target="_blank" href={a.value} rel="noreferrer">
                            <ResourceAssetsPreview
                              src={a.value}
                              label={`Image`}
                            />
                          </a>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">-</div>
                )}
              </FormCard>
            </div>
            <FormCard title="Options">
              <Card>
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
                                Archived:{" "}
                                {opt.archivedAt ? fmt(opt.archivedAt) : "-"}
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
            </FormCard>
            <FormCard title="Rewards">
              <RewardsList
                fields={fields}
                assetOptions={ASSET_OPTIONS as any}
                onEdit={setActiveRewardIndex}
                onAdd={() => setActiveRewardIndex(-1)}
                remove={remove}
                allAssets={ASSET_OPTIONS.map((a) => a.value)}
                showDistribution={true}
                hideEditButton={!isEditing}
                hideDeleteButton={!isEditing}
              />
            </FormCard>
            {/* Hide Target Geo block entirely for trial polls */}
            {!isTrialPoll && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormCard title="Target Geo">
                  <div className="flex flex-col gap-2">
                    <span className="text-sm font-semibold">Countries</span>{" "}
                    {renderGeoList(poll.targetGeo?.countries as any)}
                  </div>
                  <div className="flex flex-col gap-2">
                    <span className="text-sm font-semibold">States</span>{" "}
                    {renderGeoList(poll.targetGeo?.states as any)}
                  </div>
                  <div className="flex flex-col gap-2">
                    <span className="text-sm font-semibold">Cities</span>{" "}
                    {renderGeoList(poll.targetGeo?.cities as any)}
                  </div>
                </FormCard>
                <FormCard title="Details">
                  {poll?.createdAt && (
                    <section className="flex items-center gap-2">
                      <h2>Created At - </h2>
                      <p className="text-xs text-muted-foreground">
                        {utcToAdmin(poll.createdAt, adminZone).format(
                          "DD/MM/YYYY HH:mm:ss"
                        )}
                      </p>
                    </section>
                  )}
                  {poll?.expireRewardAt && (
                    <section className="flex items-center gap-2">
                      <h2>Expire Rewards At - </h2>
                      <p className="text-xs text-muted-foreground">
                        {utcToAdmin(poll.expireRewardAt, adminZone).format(
                          "DD/MM/YYYY HH:mm:ss"
                        )}
                      </p>
                    </section>
                  )}
                  {poll?.archivedAt && (
                    <section className="flex items-center gap-2">
                      <h2>Archived At - </h2>
                      <p className="text-xs text-muted-foreground">
                        {fmt(poll?.archivedAt)}
                      </p>
                    </section>
                  )}
                </FormCard>
              </div>
            )}
          </section>
        </>
      )}

      {isAddOption && <AddOptionModal />}
      {isEditOption && <EditOptionModal />}
      {isArchiveToggleOption && <ArchiveToggleOptionModal />}
    </div>
  );
}
