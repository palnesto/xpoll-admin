import { useMemo, useState, useEffect } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useFieldArray, useForm } from "react-hook-form";
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
import { fmt } from "@/components/paginated-table";
import TrialPollTable from "@/components/table-trial-poll";
import { Pencil, Trash2, Loader2 } from "lucide-react";
import ResourceAssetsEditor from "@/components/polling/editors/ResourceAssetsEditor";
import ExpireRewardAtPicker from "@/components/polling/editors/ExpireRewardAtPicker";
import TargetGeoEditor from "@/components/polling/editors/TargetGeoEditor";
import { useImageUpload } from "@/hooks/upload/useAssetUpload";
import { extractYouTubeId } from "@/utils/youtube";
import { FormCard } from "@/components/form/form-card";
import TwoPane from "@/layouts/TwoPane";
import RewardDetailPanel from "@/components/polling/editors/RewardDetailPanel";
import RewardsList from "@/components/polling/editors/RewardsList";
import {
  arrEqUnorderedById,
  ASSET_OPTIONS,
  cmpTrialRewards,
  editSchema,
  EditValues,
  OutputResourceAsset,
  renderGeoList,
  toComparableAssets,
  TOTAL_LEVELS,
  Trial,
  TrialReward,
} from "@/components/types/trial";

export default function TrialShowPage() {
  const navigate = useNavigate();
  const { id = "" } = useParams<{ id: string }>();
  const location = useLocation() || {};
  const isNavigationEditing = location?.state?.isNavigationEditing;
  const [activeRewardIndex, setActiveRewardIndex] = useState<number | null>(
    null
  );
  const showRoute = endpoints.entities.trials.getById(id);
  const { data, isLoading, isError } = useApiQuery(showRoute);

  const trial: Trial | null = useMemo(() => {
    return data?.data?.data ?? data?.data ?? null;
  }, [data]);

  const [isEditing, setIsEditing] = useState(isNavigationEditing ?? false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  /* ===== Trial Edit form (unchanged schema/paths) ===== */
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
  const { control, handleSubmit, reset, setValue, watch } = form;
  // Debug subscription – logs every change across the form
  useEffect(() => {
    const sub = form.watch((value, { name, type }) => {
      console.log("[FORM.WATCH]", {
        name,
        type,
        targetGeo: value?.targetGeo,
        countries: value?.targetGeo?.countries,
        states: value?.targetGeo?.states,
        cities: value?.targetGeo?.cities,
      });
    });
    return () => sub.unsubscribe();
  }, [form]);

  const { uploadImage, loading: isUploading } = useImageUpload();
  const { fields, append, remove, update } = useFieldArray({
    control,
    name: "rewards",
  });
  /* ===== hydrate Trial edit form from server (unchanged) ===== */
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
    // inside useEffect hydration in TrialShowPage
    const initialTG = {
      countries: Array.isArray(trial.targetGeo?.countries)
        ? trial.targetGeo!.countries.map((c: any) => ({
            _id: String(c?._id ?? c?.id ?? c?.value ?? c),
            name: String(c?.name ?? c?.label ?? c?._id ?? c),
          }))
        : [],
      states: Array.isArray(trial.targetGeo?.states)
        ? trial.targetGeo!.states.map((s: any) => ({
            _id: String(s?._id ?? s?.id ?? s?.value ?? s),
            name: String(s?.name ?? s?.label ?? s?._id ?? s),
          }))
        : [],
      cities: Array.isArray(trial.targetGeo?.cities)
        ? trial.targetGeo!.cities.map((ci: any) => ({
            _id: String(ci?._id ?? ci?.id ?? ci?.value ?? ci),
            name: String(ci?.name ?? ci?.label ?? ci?._id ?? ci),
          }))
        : [],
    };

    reset({
      title: trial.title ?? "",
      description: trial.description ?? "",
      resourceAssets: initialAssets,
      rewards: initialRewards,
      targetGeo: initialTG, // 👈 same normalized TG
      expireRewardAt: trial.expireRewardAt ?? "",
    });
  }, [trial, reset]);

  /* ===== Mutations (unchanged) ===== */
  const { mutateAsync: updateTrial, isPending: isSaving } = useApiMutation<
    any,
    any
  >({
    route: endpoints.entities.trials.update,
    method: "PUT",
    onSuccess: () => {
      appToast.success("Trial updated");
      queryClient.invalidateQueries({ queryKey: [showRoute] });
      queryClient.invalidateQueries({
        queryKey: [endpoints.entities.trials.all],
      });
      setIsEditing(false);
      navigate(location.pathname, { replace: true });
    },
  });

  const { mutate: doDelete, isPending: isDeleting } = useApiMutation<any, any>({
    route: endpoints.entities.trials.delete,
    method: "DELETE",
    onSuccess: () => {
      appToast.success("Trial deleted");
      queryClient.invalidateQueries({ queryKey: [showRoute] });
      queryClient.invalidateQueries({
        queryKey: [endpoints.entities.trials.all],
      });
      navigate("/trials");
    },
  });
  // near the top of the component (inside TrialShowPage)
  const handleDelete = async () => {
    if (!id || isDeleting) return;
    // (optional) quick confirm
    // if (!window.confirm("Delete this trial?")) return;

    try {
      await doDelete({ ids: [id] }); // 👈 sends { ids: [id] }
    } catch (e) {
      appToast.error("Failed to delete trial");
    }
  };

  /* ===== Helpers (unchanged) ===== */
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

  const onSubmitEdit = handleSubmit(async (v) => {
    if (!trial) return;

    const payload: any = { trialId: trial._id };

    // —— assets & rewards (unchanged) ——
    const normalizedNow = await normalizeAssetsForSave(v.resourceAssets);
    const prevAssets: OutputResourceAsset[] = (trial.resourceAssets ?? []).map(
      (a) =>
        a.type === "youtube"
          ? { type: "youtube", value: extractYouTubeId(a.value) }
          : { type: "image", value: a.value }
    );

    if (v.title !== (trial.title ?? "")) payload.title = v.title;
    if (v.description !== (trial.description ?? ""))
      payload.description = v.description;

    const prevCmp = toComparableAssets(prevAssets);
    const nowCmp = toComparableAssets(normalizedNow);
    if (
      prevCmp.length !== nowCmp.length ||
      prevCmp.some((x, i) => x !== nowCmp[i])
    ) {
      payload.resourceAssets = normalizedNow;
    }

    const prevRewards = (trial.rewards ?? []) as TrialReward[];
    const nowRewards = (v.rewards ?? []).map((r) => ({
      assetId: r.assetId,
      amount: r.amount,
      rewardAmountCap: r.rewardAmountCap,
    }));
    if (!cmpTrialRewards(prevRewards as any, nowRewards as any)) {
      payload.rewards = nowRewards.map((r) => ({
        assetId: r.assetId,
        amount: String(r.amount),
        rewardAmountCap: String(r.rewardAmountCap),
      }));
    }

    const prevExpire = (trial.expireRewardAt ?? "").trim();
    const nowExpire = (v.expireRewardAt ?? "").trim();
    if (prevExpire !== nowExpire) {
      payload.expireRewardAt = nowExpire ? nowExpire : undefined;
    }

    // —— targetGeo: ALWAYS send ID arrays; add logs ——
    const nextTG = v.targetGeo ?? { countries: [], states: [], cities: [] };
    const prevTG = {
      countries: Array.isArray(trial.targetGeo?.countries)
        ? trial.targetGeo!.countries
        : [],
      states: Array.isArray(trial.targetGeo?.states)
        ? trial.targetGeo!.states
        : [],
      cities: Array.isArray(trial.targetGeo?.cities)
        ? trial.targetGeo!.cities
        : [],
    };

    const geoChanged =
      !arrEqUnorderedById(nextTG.countries, prevTG.countries) ||
      !arrEqUnorderedById(nextTG.states, prevTG.states) ||
      !arrEqUnorderedById(nextTG.cities, prevTG.cities);

    // Debug what the form currently holds
    console.log("[SUBMIT:TG:FORM]", {
      nextTG,
      nextCountries: nextTG.countries,
      nextStates: nextTG.states,
      nextCities: nextTG.cities,
    });

    if (geoChanged) {
      const idsOnly = {
        countries: (nextTG.countries ?? []).map((x) =>
          typeof x === "string" ? x : x._id
        ),
        states: (nextTG.states ?? []).map((x) =>
          typeof x === "string" ? x : x._id
        ),
        cities: (nextTG.cities ?? []).map((x) =>
          typeof x === "string" ? x : x._id
        ),
      };

      // Guard: make sure all are strings (server Zod expects strings)
      const allStrings =
        idsOnly.countries.every((x) => typeof x === "string") &&
        idsOnly.states.every((x) => typeof x === "string") &&
        idsOnly.cities.every((x) => typeof x === "string");

      console.log("[SUBMIT:TG:DIFF]", {
        prevIds: {
          countries: (prevTG.countries ?? []).map((x: any) => x?._id ?? x),
          states: (prevTG.states ?? []).map((x: any) => x?._id ?? x),
          cities: (prevTG.cities ?? []).map((x: any) => x?._id ?? x),
        },
        nextIds: idsOnly,
        geoChanged,
        allStrings,
      });

      payload.targetGeo = idsOnly; // ✅ IDs only
    }

    console.log("[SUBMIT:payload]", payload);

    if (Object.keys(payload).length <= 1) {
      setIsEditing(false);
      return;
    }

    await updateTrial(payload);
  });

  /* ===== Page states (unchanged) ===== */
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
      : trial.media
      ? [{ type: "image", value: trial.media }]
      : [];

  const isBusy = isLoading || isSaving || isUploading;

  return (
    <div className="space-y-6">
      {isEditing ? (
        <div className="p-6 space-y-8 w-full">
          {/* ===== Header (parity with Poll edit) ===== */}
          <div className="flex justify-between items-center w-full">
            <h1 className="text-2xl tracking-wider">Edit Trial</h1>
            {/* <Button
              type="submit"
              form="trial-form"
              disabled={isBusy}
              className="text-base font-light tracking-wide"
            >
              {isBusy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save
            </Button> */}
          </div>

          <Form {...form}>
            <form id="trial-form" className="space-y-6" onSubmit={onSubmitEdit}>
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
                    {/* Grid: Basic Info + Assets (parity) */}
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
                                <Input
                                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                  placeholder="Trial title"
                                  {...field}
                                />
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

                      <FormCard title="Resource Assets" subtitle="Min:1">
                        <ResourceAssetsEditor
                          control={control}
                          name="resourceAssets"
                          mediaAllowed={["image"]}
                          isEditing={true}
                        />
                        {form.formState.errors.resourceAssets && (
                          <p className="mt-2 text-sm text-destructive">
                            {(form.formState.errors.resourceAssets as any)
                              .message ?? "Add at least 1 media"}
                          </p>
                        )}
                      </FormCard>
                    </div>

                    {/* Rewards (same component, just wrapped for visual parity) */}
                    <FormCard title="Rewards">
                      <RewardsList
                        fields={fields}
                        assetOptions={ASSET_OPTIONS as any}
                        onEdit={setActiveRewardIndex}
                        onAdd={() => setActiveRewardIndex(-1)}
                        remove={remove}
                        allAssets={ASSET_OPTIONS.map((a) => a.value)}
                      />
                    </FormCard>

                    {/* Expire Reward At */}
                    <ExpireRewardAtPicker
                      control={control}
                      name="expireRewardAt"
                    />

                    {/* Target Geo */}
                    <TargetGeoEditor
                      control={control}
                      watch={watch}
                      setValue={setValue}
                      basePath="targetGeo"
                      label="Target Geo"
                    />

                    {/* Actions */}
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
                            Array.isArray(trial.rewards) &&
                            trial.rewards.length > 0
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
                              countries: Array.isArray(
                                trial.targetGeo?.countries
                              )
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
                  </div>
                }
              />
            </form>
          </Form>
        </div>
      ) : (
        <>
          {/* ===== VIEW MODE (parity with Poll view) ===== */}
          <section className="flex justify-between items-center w-full">
            <h1 className="text-2xl tracking-wider">Trial</h1>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => setIsEditing(true)}
                aria-label="Edit trial"
                title="Edit trial"
              >
                {isBusy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Pencil className="w-4 h-4" />
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={isDeleting}
                aria-label="Delete trial"
                title="Delete trial"
              >
                {isDeleting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
              </Button>
            </div>
          </section>

          <section className="space-y-7">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormCard title="Basic Info">
                <div>
                  <div className="text-xs text-muted-foreground">ID</div>
                  <div className="font-mono break-all">{trial._id}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Title</div>
                  <div className="font-medium">{trial.title}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">
                    Description
                  </div>
                  <div>{trial.description || "-"}</div>
                </div>
              </FormCard>

              <FormCard title="Resource Assets" subtitle="Max.: 3">
                {viewAssets.length ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                    {viewAssets.map((a, i) => {
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
                  <div className="text-sm text-muted-foreground"></div>
                )}
              </FormCard>
            </div>
            <FormCard title="Rewards">
              <RewardsList
                fields={fields}
                assetOptions={ASSET_OPTIONS as any}
                onEdit={setActiveRewardIndex}
                onAdd={() => setActiveRewardIndex(-1)}
                remove={remove}
                allAssets={ASSET_OPTIONS.map((a) => a.value)}
              />
            </FormCard>
            <div className="grid grid-cols-1 gap-6">
              <FormCard title="Target Geo">
                <h2 className="break-all">
                  Countries –{renderGeoList(trial.targetGeo?.countries as any)}
                </h2>
                <h2 className="break-all">
                  States –{renderGeoList(trial.targetGeo?.states as any)}
                </h2>
                <h2 className="break-all">
                  Cities –{renderGeoList(trial.targetGeo?.cities as any)}
                </h2>

                <section className="flex items-center gap-2">
                  <h2>Created At - </h2>
                  <p className="text-xs text-muted-foreground">
                    {fmt(trial.createdAt)}
                  </p>
                </section>
                <section className="flex items-center gap-2">
                  <h2>Archived At - </h2>
                  <p className="text-xs text-muted-foreground">
                    {fmt(trial.archivedAt)}
                  </p>
                </section>
                <section className="flex items-center gap-2">
                  <h2>Expire Reward At - </h2>
                  <p className="text-xs text-muted-foreground">
                    {trial.expireRewardAt ? fmt(trial.expireRewardAt) : "-"}
                  </p>
                </section>
              </FormCard>
            </div>
          </section>
        </>
      )}

      {/* Existing polls table (unchanged) */}
      <TrialPollTable trialId={id} />

      {/* Delete confirm inline (unchanged logic; UI matches Poll page button style) */}
      {isDeleteOpen && (
        <div className="p-4 border rounded-md">
          <p className="mb-4 text-sm">
            Are you sure you want to delete this trial?
          </p>
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
        </div>
      )}
    </div>
  );
}
