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
import { assetSpecs } from "@/utils/currency-assets/asset";
import {
  __SYSYEM_STANDARAD_DATE_FORMAT__,
  localAdminISOtoUTC,
  utcToAdminFormatted,
} from "@/utils/time";
import {
  __MAX_OPTIONS_COUNT__,
  _MAX_RESOURCE_ASSETS_COUNT_,
  ASSET_OPTIONS,
  descriptionZod,
  expireRewardAtZod,
  RESOURCE_TYPES_STRING,
  pollResourceAssetFormZ,
  REWARD_TYPE,
  rewardsZod,
  RewardType,
  targetGeoZod,
  titleZod,
  OutputResourceAsset,
  toComparableAssets,
  renderGeoList,
} from "@/validators/poll-trial-form";
import dayjs from "dayjs";
import { useTablePollsStore } from "@/stores/table_polls.store";
import { ConfirmDeletePollsModal } from "@/components/modals/table_polls/delete";
import { EntityLinkModal } from "@/components/modals/entity-link-modal";
import { LinkedEntityForwardList } from "@/components/LinkedEntityForwardList";

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
        (r) => `${r.assetId}:${r.amount}:${r.rewardAmountCap}:${r.rewardType}`,
      )
      .join("|");
  return norm(a) === norm(b);
}

const baseSchema = {
  title: titleZod,
  description: descriptionZod,
  targetGeo: targetGeoZod,
  resourceAssets: pollResourceAssetFormZ,
};
const trialEditSchema = z.object(baseSchema);
const normalEditSchema = z.object({
  ...baseSchema,
  rewards: rewardsZod,
  expireRewardAt: expireRewardAtZod,
});

type EditValues = z.infer<typeof normalEditSchema>;

export default function PollShowPage() {
  const navigate = useNavigate();
  const location = useLocation() || {};
  const isNavigationEditing = (location as any)?.state?.isNavigationEditing;
  const { id = "" } = useParams<{ id: string }>();
  const [activeRewardIndex, setActiveRewardIndex] = useState<number | null>(
    null,
  );
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);

  const showRoute = (endpoints.entities as any)?.polls?.getById
    ? (endpoints.entities as any).polls.getById(id)
    : `/internal/poll/${id}`;
  const { data, isLoading, isError } = useApiQuery(showRoute);

  const poll: Poll | null = useMemo(() => {
    return (data?.data as any)?.data ?? data?.data ?? null;
  }, [data]);

  const trialId = poll?.trialId;
  const isArchived = poll?.archivedAt !== null;
  const unArchivedOptionsLength =
    poll?.options?.filter((opt) => opt?.archivedAt === null).length ?? 0;

  const userDetails = useMemo(() => {
    const isExternalAuthor = poll?.externalAuthor;
    if (!isExternalAuthor) return null;
    return {
      username: poll?.externalAuthorInfo?.username,
      location: `${poll?.externalAuthorInfo?.city?.name ?? ""}${
        poll?.externalAuthorInfo?.state?.name
          ? `, ${poll?.externalAuthorInfo?.state?.name}`
          : ""
      }${
        poll?.externalAuthorInfo?.country?.name
          ? `, ${poll?.externalAuthorInfo?.country?.name}`
          : ""
      }`,
    };
  }, [poll]);

  const isTrialPoll = !!(poll?.trialId || poll?.trial?._id);

  const [isEditing, setIsEditing] = useState<boolean>(
    isNavigationEditing ?? false,
  );

  // ===== entity referral analytics (for this poll) =====
  const entityAnalyticsUrl = useMemo(
    () => (id ? endpoints.referral.analytics.entity(id) : ""),
    [id],
  );

  const {
    data: entityAnalyticsRaw,
    isLoading: isLoadingEntityAnalytics,
    error: entityAnalyticsError,
  } = useApiQuery(entityAnalyticsUrl, {
    key: ["entity-referral-analytics", "poll", id],
  } as any);

  const entityAnalytics: EntityReferralAnalytics | undefined = (
    entityAnalyticsRaw?.data as any
  )?.data;

  // ===== form setup =====
  const form = useForm<EditValues>({
    resolver: zodResolver(isTrialPoll ? trialEditSchema : normalEditSchema),
    defaultValues: {
      title: "",
      description: "",
      resourceAssets: [],
      rewards: [
        {
          assetId: ASSET_OPTIONS[0].value,
          amount: 1,
          rewardAmountCap: 1,
          rewardType: REWARD_TYPE.MAX,
        },
      ],
      targetGeo: { countries: [], states: [], cities: [] },
      expireRewardAt: null,
    },
    mode: "onChange",
  });

  const { control, handleSubmit, reset, getValues, setValue, watch } = form;

  const { uploadImage, loading: isUploading } = useImageUpload();
  const { fields, append, remove, update } = useFieldArray({
    control,
    name: "rewards",
  });

  useEffect(() => {
    if (!poll) return;
    // Prefer modern resourceAssets; fallback to legacy media string
    const initialAssets: EditValues["resourceAssets"] =
      Array.isArray(poll.resourceAssets) && poll.resourceAssets.length > 0
        ? poll.resourceAssets.map((a) =>
            a.type === RESOURCE_TYPES_STRING.IMAGE
              ? { type: RESOURCE_TYPES_STRING.IMAGE, value: [a.value] }
              : {
                  type: RESOURCE_TYPES_STRING.YOUTUBE,
                  value: extractYouTubeId(a.value),
                },
          )
        : poll.media
          ? [{ type: RESOURCE_TYPES_STRING.IMAGE, value: [poll.media] }]
          : [];

    const initialRewards: EditValues["rewards"] =
      Array.isArray(poll.rewards) && poll.rewards.length > 0
        ? poll.rewards
        : [
            {
              assetId: ASSET_OPTIONS[0].value as any,
              amount: 1,
              rewardAmountCap: 1,
              rewardType: REWARD_TYPE.MAX,
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
      targetGeo: initialTG,
      expireRewardAt: poll.expireRewardAt ?? null,
    });
  }, [poll, reset]);

  useEffect(() => {
    if (isNavigationEditing) {
      setIsEditing(true);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [isNavigationEditing, navigate, location]);

  const { mutate: saveEdit, isPending: isSaving } = useApiMutation<any, any>({
    route: endpoints.entities.polls.edit.details,
    method: "PUT",
    onSuccess: (_resp, _vars) => {
      appToast.success("Poll updated");

      const v = getValues();
      const idsOnlyTG = {
        countries: (v.targetGeo?.countries ?? []).map((x) =>
          typeof x === "string" ? x : x._id,
        ),
        states: (v.targetGeo?.states ?? []).map((x) =>
          typeof x === "string" ? x : x._id,
        ),
        cities: (v.targetGeo?.cities ?? []).map((x) =>
          typeof x === "string" ? x : x._id,
        ),
      };
      // Prepare normalized assets for cache patch
      const normalizedNow: OutputResourceAsset[] = (v.resourceAssets ?? []).map(
        (a: any) =>
          a.type === RESOURCE_TYPES_STRING.YOUTUBE
            ? {
                type: RESOURCE_TYPES_STRING.YOUTUBE,
                value: extractYouTubeId(a.value),
              }
            : {
                type: RESOURCE_TYPES_STRING.IMAGE,
                value:
                  typeof a.value?.[0] === "string"
                    ? a.value[0]
                    : String(a.value),
              },
      );

      patchShowCache(showRoute, (curr) => ({
        ...curr,
        title: v.title,
        description: v.description,
        resourceAssets: normalizedNow,
        rewards: v.rewards,
        expireRewardAt: v.expireRewardAt?.trim() ? v.expireRewardAt : undefined,
        targetGeo: isTrialPoll ? curr.targetGeo : idsOnlyTG,
        media:
          normalizedNow.find((x) => x.type === RESOURCE_TYPES_STRING.IMAGE)
            ?.value ?? (curr as any)?.media,
      }));

      queryClient.invalidateQueries({ queryKey: ["GET", showRoute] });
      setIsEditing(false);
      navigate(location.pathname, { replace: true });
    },
  });

  // normalize editor assets -> server format (uploads new Files)
  const normalizeAssetsForSave = async (
    arr?: EditValues["resourceAssets"],
  ): Promise<OutputResourceAsset[]> => {
    const items = arr ?? [];
    return Promise.all(
      items.map(async (a) => {
        if (a.type === RESOURCE_TYPES_STRING.YOUTUBE) {
          return {
            type: RESOURCE_TYPES_STRING.YOUTUBE,
            value: extractYouTubeId(String(a.value)),
          };
        }
        // image: a.value is [File|string] | null
        const list = (a.value ?? []) as (File | string)[];
        let first = list[0];
        if (first instanceof File) {
          first = await uploadImage(first); // upload and replace with URL
        }
        return {
          type: RESOURCE_TYPES_STRING.IMAGE,
          value: typeof first === "string" ? first : "",
        };
      }),
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
            a.type === RESOURCE_TYPES_STRING.YOUTUBE
              ? {
                  type: RESOURCE_TYPES_STRING.YOUTUBE,
                  value: extractYouTubeId(a.value),
                }
              : { type: RESOURCE_TYPES_STRING.IMAGE, value: a.value },
          )
        : poll.media
          ? [{ type: RESOURCE_TYPES_STRING.IMAGE, value: poll.media }]
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
          typeof x === "string" ? x : x._id,
        ),
        states: (nextTG.states ?? []).map((x: any) =>
          typeof x === "string" ? x : x._id,
        ),
        cities: (nextTG.cities ?? []).map((x: any) =>
          typeof x === "string" ? x : x._id,
        ),
      };

      const arrEqUnordered = (a: string[], b: string[]) => {
        if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length)
          return false;
        const A = [...a].sort();
        const B = [...b].sort();
        return A.every((v, i) => v === B[i]);
      };

      const prevIds = {
        countries: (prevTG.countries ?? []).map((x: any) =>
          typeof x === "string" ? x : x?._id,
        ),
        states: (prevTG.states ?? []).map((x: any) =>
          typeof x === "string" ? x : x?._id,
        ),
        cities: (prevTG.cities ?? []).map((x: any) =>
          typeof x === "string" ? x : x?._id,
        ),
      };

      const geoChanged =
        !arrEqUnordered(idsOnly.countries, prevIds.countries) ||
        !arrEqUnordered(idsOnly.states, prevIds.states) ||
        !arrEqUnordered(idsOnly.cities, prevIds.cities);

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
      const firstImg = normalizedNow.find(
        (x) => x.type === RESOURCE_TYPES_STRING.IMAGE,
      )?.value;
      if (firstImg) payload.media = firstImg;
    }

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
      const nowExpire =
        v.expireRewardAt === null
          ? null
          : (
              localAdminISOtoUTC(
                dayjs(v.expireRewardAt?.trim()).format(
                  __SYSYEM_STANDARAD_DATE_FORMAT__,
                ),
              ) ?? ""
            ).trim();
      if (nowExpire === null) {
        payload.expireRewardAt = null;
      } else if (prevExpire !== nowExpire) {
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
  const canAddOption = activeCount < __MAX_OPTIONS_COUNT__;

  const setIsDeleting = useTablePollsStore((s) => s.setIsDeleting);
  const isDeleting = useTablePollsStore((s) => s.isDeleting);

  // ===== option modals =====
  const isAddOption = usePollViewStore((s) => s.isAddOption);
  const setIsAddOption = usePollViewStore((s) => s.setIsAddOption);
  const isEditOption = usePollViewStore((s) => s.isEditOption);
  const setIsEditOption = usePollViewStore((s) => s.setIsEditOption);
  const isArchiveToggleOption = usePollViewStore(
    (s) => s.isArchiveToggleOption,
  );

  const setIsArchiveToggleOption = usePollViewStore(
    (s) => s.setIsArchiveToggleOption,
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
        ? [{ type: RESOURCE_TYPES_STRING.IMAGE, value: poll.media }]
        : [];
  const isBusy = isLoading || isUploading || isSaving;

  return (
    <>
      <div
        className={cn("space-y-6 py-3 px-5 rounded-xl", {
          "bg-red-500/10": isArchived,
        })}
      >
        {isEditing ? (
          <div className="p-6 space-y-8 w-full">
            <div className="flex justify-between items-center w-full">
              <h1 className="text-2xl tracking-wider">Edit Poll</h1>
            </div>
            {!!trialId && (
              <p className="bg-sidebar px-2 py-2">
                <strong>Trail:</strong> {trialId}
              </p>
            )}
            <Form {...form}>
              <form className="space-y-6" onSubmit={onSubmitEdit}>
                <TwoPane
                  isRightOpen={activeRewardIndex !== null}
                  right={
                    activeRewardIndex !== null && (
                      <RewardDetailPanel
                        index={activeRewardIndex}
                        assetOptions={ASSET_OPTIONS as any}
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

                          {/* Description */}
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

                        {/* Resource Assets */}
                        <FormCard
                          title="Resource Assets (Optional)"
                          subtitle="Max.: 3"
                        >
                          <ResourceAssetsEditor
                            control={control}
                            name="resourceAssets"
                            label="Media (Images / YouTube)"
                            maxAssets={_MAX_RESOURCE_ASSETS_COUNT_}
                            isEditing={true}
                          />
                        </FormCard>
                      </div>

                      <FormCard title="Add Options">
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
                                        : `Max ${__MAX_OPTIONS_COUNT__} active options`
                                    }
                                    disabled={!canAddOption}
                                  >
                                    <PlusSquare className="w-4 h-4" />
                                  </button>
                                </TooltipTrigger>
                                {!canAddOption && (
                                  <TooltipContent>
                                    Maximum of {__MAX_OPTIONS_COUNT__} active
                                    options
                                  </TooltipContent>
                                )}
                              </Tooltip>
                            </TooltipProvider>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            {poll?.options?.length ? (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {(poll.options ?? []).map((opt) => {
                                  const isArchivedOpt = !!opt.archivedAt;

                                  return (
                                    <div
                                      key={opt._id}
                                      className={cn(
                                        "relative border rounded-lg p-3 hover:bg-muted/30",
                                        isArchivedOpt &&
                                          "opacity-50 cursor-not-allowed",
                                      )}
                                    >
                                      <div className="absolute right-2 top-2 flex items-center gap-2">
                                        {!isArchivedOpt && (
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

                                        {!(
                                          (isArchivedOpt &&
                                            activeCount + 1 >
                                              __MAX_OPTIONS_COUNT__) ||
                                          (!isArchivedOpt &&
                                            unArchivedOptionsLength <= 2)
                                        ) && (
                                          <button
                                            type="button"
                                            className="rounded-md p-1 hover:bg-foreground/10"
                                            onClick={() =>
                                              setIsArchiveToggleOption({
                                                pollId: (poll as any)._id,
                                                optionId: opt._id,
                                                optionText: opt.text,
                                                shouldArchive: !isArchivedOpt,
                                              })
                                            }
                                            aria-label={`Delete option ${opt.text}`}
                                            title="Delete option"
                                          >
                                            {!isArchivedOpt ? (
                                              <Trash2 className="w-4 h-4 text-red-600" />
                                            ) : (
                                              <Recycle className="w-4 h-4 text-white" />
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
                                            isArchivedOpt &&
                                              "line-through opacity-60",
                                          )}
                                        >
                                          {opt.text}
                                        </div>
                                        <div className="text-xs text-muted-foreground mt-2">
                                          Archived:{" "}
                                          {opt.archivedAt
                                            ? utcToAdminFormatted(
                                                opt.archivedAt,
                                              )
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
                          <FormCard title="Rewards">
                            <div className="flex gap-2 items-center justify-end">
                              <Button
                                type="button"
                                size="sm"
                                onClick={() => setActiveRewardIndex(-1)}
                                className="w-fit p-2"
                                disabled={
                                  fields?.length >=
                                  Object.keys(assetSpecs)?.length
                                }
                              >
                                Add reward
                              </Button>
                            </div>
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
                            {form?.formState?.errors?.rewards?.message && (
                              <p className="text-sm text-destructive">
                                {form?.formState?.errors?.rewards?.message}
                              </p>
                            )}
                          </FormCard>
                        </>
                      )}
                      {!isTrialPoll && (
                        <TargetGeoEditor
                          control={control}
                          watch={watch}
                          setValue={setValue}
                          basePath="targetGeo"
                          label="Target Geo (Optional)"
                          selectProps={{
                            menuPlacement: "top",
                          }}
                        />
                      )}
                      <section className="flex items-end justify-between">
                        {!isTrialPoll && (
                          <ExpireRewardAtPicker
                            control={control}
                            name="expireRewardAt"
                          />
                        )}
                      </section>
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          type="button"
                          size={"sm"}
                          className="text-sm font-bold px-3 py-2.5"
                          variant="outline"
                          onClick={() => {
                            if (!poll) return;
                            const initialAssets: EditValues["resourceAssets"] =
                              Array.isArray(poll.resourceAssets) &&
                              poll.resourceAssets.length > 0
                                ? poll.resourceAssets.map((a) =>
                                    a.type === RESOURCE_TYPES_STRING.IMAGE
                                      ? {
                                          type: RESOURCE_TYPES_STRING.IMAGE,
                                          value: [a.value],
                                        }
                                      : {
                                          type: RESOURCE_TYPES_STRING.YOUTUBE,
                                          value: extractYouTubeId(a.value),
                                        },
                                  )
                                : poll.media
                                  ? [
                                      {
                                        type: RESOURCE_TYPES_STRING.IMAGE,
                                        value: [poll.media],
                                      },
                                    ]
                                  : [];

                            const initialRewards: EditValues["rewards"] =
                              Array.isArray(poll.rewards) &&
                              poll.rewards.length > 0
                                ? poll.rewards.map((r) => ({
                                    assetId: r.assetId as any,
                                    amount: Number(r.amount),
                                    rewardAmountCap: Number(r.rewardAmountCap),
                                    rewardType: r.rewardType as RewardType,
                                  }))
                                : [
                                    {
                                      assetId: ASSET_OPTIONS[0].value,
                                      amount: 1,
                                      rewardAmountCap: 1,
                                      rewardType: REWARD_TYPE.MAX,
                                    },
                                  ];

                            reset({
                              title: poll.title ?? "",
                              description: poll.description ?? "",
                              resourceAssets: initialAssets,
                              rewards: isTrialPoll ? [] : initialRewards,
                              targetGeo: {
                                countries: Array.isArray(
                                  poll.targetGeo?.countries,
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
                                : (poll.expireRewardAt ?? ""),
                            });
                            setIsEditing(false);
                          }}
                          disabled={isSaving || isUploading}
                        >
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          size={"sm"}
                          className="text-sm font-bold px-3 py-2.5"
                          disabled={isSaving || isUploading}
                        >
                          {isSaving || isUploading ? "Saving…" : "Save"}
                        </Button>
                      </div>
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
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsLinkModalOpen(true)}
                >
                  Link
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => navigate(`/polls/${id}/referrals`)}
                >
                  Referral links
                </Button>

                {!isArchived && (
                  <Button
                    className="rounded-md px-2"
                    aria-label="Edit poll"
                    title="Edit poll"
                    onClick={() => setIsEditing(true)}
                  >
                    {isBusy && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    <Edit className="w-4 h-4" />
                  </Button>
                )}

                {!!poll && !trialId && !isArchived && (
                  <Button
                    variant={"destructive"}
                    className="rounded-md px-2"
                    aria-label="Delete poll"
                    title="Edit poll"
                    onClick={() => {
                      setIsDeleting([
                        {
                          pollId: poll._id!,
                          title: poll.title,
                        },
                      ]);
                    }}
                  >
                    {isBusy && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </section>
            {!!trialId && (
              <p
                onClick={() => {
                  navigate(`/trials/${trialId}`);
                }}
                className="bg-sidebar px-2 py-2 hover:underline cursor-pointer"
              >
                <strong>Trail:</strong> {trialId}
              </p>
            )}
            <section className="space-y-7">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormCard title="Basic Info">
                  {userDetails && (
                    <div>
                      <div className="text-xs text-muted-foreground">User</div>
                      <div className="font-medium">{userDetails?.username}</div>
                    </div>
                  )}
                  {userDetails && (
                    <div>
                      <div className="text-xs text-muted-foreground">
                        User Location
                      </div>
                      <div className="font-medium">{userDetails?.location}</div>
                    </div>
                  )}
                  <div>
                    <div className="text-xs text-muted-foreground">ID</div>
                    <div className="font-mono break-all">{poll._id}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Title</div>
                    <div className="font-medium break-words">{poll.title}</div>
                  </div>

                  <div>
                    <div className="text-xs text-muted-foreground">
                      Description
                    </div>
                    <div className="break-words">{poll.description || "-"}</div>
                  </div>
                </FormCard>

                <FormCard title="Resource Assets">
                  {viewAssets.length ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                      {viewAssets.map((a, i) => {
                        return a.type === RESOURCE_TYPES_STRING.YOUTUBE ? (
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
                                label={"Youtube"}
                              />
                            </a>
                          </div>
                        ) : (
                          <div
                            key={`img-${i}`}
                            className="flex items-center h-16 justify-between gap-3 rounded-md border p-1 w-full"
                          >
                            <a target="_blank" href={a.value} rel="noreferrer">
                              <ResourceAssetsPreview
                                src={a.value}
                                label={"Image"}
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
              <FormCard title="Linked Entities">
                <LinkedEntityForwardList fromType="poll" fromId={id} />
              </FormCard>
              <FormCard title="Options">
                <Card>
                  <CardContent className="space-y-4">
                    {poll?.options?.length ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {(poll.options ?? []).map((opt) => {
                          const isArchivedOpt = !!opt.archivedAt;
                          return (
                            <div
                              key={opt._id}
                              className={cn(
                                "relative border rounded-lg p-3 hover:bg-muted/30",
                                isArchivedOpt &&
                                  "opacity-50 cursor-not-allowed",
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
                                    isArchivedOpt && "line-through opacity-60",
                                  )}
                                >
                                  {opt.text}
                                </div>
                                <div className="text-xs text-muted-foreground mt-2">
                                  Archived:{" "}
                                  {opt.archivedAt
                                    ? utcToAdminFormatted(opt.archivedAt)
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

              {!trialId && (
                <FormCard title="Rewards">
                  <RewardsList
                    fields={fields}
                    assetOptions={ASSET_OPTIONS}
                    onEdit={setActiveRewardIndex}
                    onAdd={() => setActiveRewardIndex(-1)}
                    remove={remove}
                    allAssets={ASSET_OPTIONS.map((a) => a.value)}
                    showDistribution={true}
                    hideEditButton={!isEditing}
                    hideDeleteButton={!isEditing}
                  />
                </FormCard>
              )}

              {/* Hide Target Geo block entirely for trial polls */}
              {!isTrialPoll && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormCard title="Target Geo">
                    <div className="flex flex-col gap-2">
                      <span className="text-sm font-semibold">Countries</span>{" "}
                      {renderGeoList(poll.targetGeo?.countries ?? [])}
                    </div>
                    <div className="flex flex-col gap-2">
                      <span className="text-sm font-semibold">States</span>{" "}
                      {renderGeoList(poll.targetGeo?.states ?? [])}
                    </div>
                    <div className="flex flex-col gap-2">
                      <span className="text-sm font-semibold">Cities</span>{" "}
                      {renderGeoList(poll.targetGeo?.cities ?? [])}
                    </div>
                  </FormCard>
                  <FormCard title="Details">
                    {poll?.createdAt && (
                      <section className="flex items-center gap-2">
                        <h2>Created At - </h2>
                        <p className="text-xs text-muted-foreground">
                          {utcToAdminFormatted(poll.createdAt)}
                        </p>
                      </section>
                    )}
                    {poll?.expireRewardAt && (
                      <section className="flex items-center gap-2">
                        <h2>Expire Rewards At - </h2>
                        <p className="text-xs text-muted-foreground">
                          {utcToAdminFormatted(poll.expireRewardAt)}
                        </p>
                      </section>
                    )}
                    {poll?.archivedAt && (
                      <section className="flex items-center gap-2">
                        <h2>Archived At - </h2>
                        <p className="text-xs text-muted-foreground">
                          {utcToAdminFormatted(poll?.archivedAt)}
                        </p>
                      </section>
                    )}
                  </FormCard>
                </div>
              )}

              {/* === Referral Analytics for this poll entity === */}
              <FormCard title="Referral Analytics">
                {isLoadingEntityAnalytics && (
                  <p className="text-xs text-muted-foreground">
                    Loading referral analytics…
                  </p>
                )}

                {entityAnalyticsError && !isLoadingEntityAnalytics && (
                  <p className="text-xs text-red-500">
                    Failed to load referral analytics.
                  </p>
                )}

                {!isLoadingEntityAnalytics &&
                  !entityAnalyticsError &&
                  !entityAnalytics && (
                    <p className="text-xs text-muted-foreground">
                      No referral analytics found for this poll.
                    </p>
                  )}

                {entityAnalytics && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    <span className="px-3 py-1 rounded-full border bg-background text-[11px]">
                      Unique links:{" "}
                      <span className="font-semibold">
                        {entityAnalytics.uniqueLinks}
                      </span>
                    </span>
                    <span className="px-3 py-1 rounded-full border bg-background text-[11px]">
                      Total views:{" "}
                      <span className="font-semibold">
                        {entityAnalytics.totals.views}
                      </span>
                    </span>
                    <span className="px-3 py-1 rounded-full border bg-background text-[11px]">
                      Total uniques:{" "}
                      <span className="font-semibold">
                        {entityAnalytics.totals.uniques}
                      </span>
                    </span>
                  </div>
                )}
              </FormCard>
            </section>
            <EntityLinkModal
              open={isLinkModalOpen}
              onOpenChange={setIsLinkModalOpen}
              fromType="poll"
              fromId={id}
            />
          </>
        )}

        {isAddOption && <AddOptionModal />}
        {isEditOption && <EditOptionModal />}
        {isArchiveToggleOption && <ArchiveToggleOptionModal />}
      </div>
      {isDeleting && isDeleting?.length > 0 && (
        <ConfirmDeletePollsModal url={showRoute} />
      )}
    </>
  );
}
