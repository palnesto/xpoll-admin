import { memo, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { useNavigate } from "react-router-dom";
import { useApiQuery } from "@/hooks/useApiQuery";
import { endpoints } from "@/api/endpoints";
import { Switch } from "@/components/ui/switch";
import AssetMultiSelect from "@/components/commons/selects/asset-multi-select";
import { ChartNoAxesCombined, Edit, Eye, Plus, X } from "lucide-react";
import CountrySelect from "@/components/commons/selects/country-select";
import StateSelect from "@/components/commons/selects/state-select";
import CitySelect from "@/components/commons/selects/city-select";
type TrendingWindow = "hour" | "day" | "week" | "month" | "quarter" | "year";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useTableTrialsStore } from "@/stores/table_trials.store";
import { Opt, Tri, useTrialFilters } from "@/stores/useTrialFilters";
import { ConfirmDeleteTrialPollsModal } from "@/components/modals/table_trials/delete";

const PAGE_SIZE = 10;

/* -----------------------------
   Multi-select store (persisted)
   Stores objects: { trialId, title }
------------------------------*/
export type SelectedTrial = { trialId: string; title: string };

type SelectedState = {
  selected: Record<string, SelectedTrial>; // keyed by trialId
  toggle: (item: SelectedTrial) => void;
  addMany: (items: SelectedTrial[]) => void;
  removeManyByIds: (ids: string[]) => void;
  clear: () => void;
  isSelected: (id: string) => boolean;
  all: () => SelectedTrial[];
  allIds: () => string[];
  count: () => number;
};

export const useSelectedTrials = create<SelectedState>()(
  persist(
    (set, get) => ({
      selected: {},
      toggle: (item) =>
        set((s) => {
          const next = { ...s.selected };
          if (next[item.trialId]) delete next[item.trialId];
          else next[item.trialId] = item;
          return { selected: next };
        }),
      addMany: (items) =>
        set((s) => {
          if (!items?.length) return s;
          const next = { ...s.selected };
          for (const it of items) next[it.trialId] = it;
          return { selected: next };
        }),
      removeManyByIds: (ids) =>
        set((s) => {
          if (!ids?.length) return s;
          const next = { ...s.selected };
          for (const id of ids) delete next[id];
          return { selected: next };
        }),
      clear: () => set({ selected: {} }),
      isSelected: (id) => !!get().selected[id],
      all: () => Object.values(get().selected),
      allIds: () => Object.keys(get().selected),
      count: () => Object.keys(get().selected).length,
    }),
    { name: "trials-multiselect" }
  )
);

/* -----------------------------------
   Configurable bulk operations (UI)
   onClick receives Array<{trialId,title}>
------------------------------------*/
type BulkOp = {
  label: string;
  btnClassName?: string;
  onClick?: (
    items: SelectedTrial[],
    api: {
      clear: () => void;
      removeByIds: (ids: string[]) => void;
      refresh: () => void;
    }
  ) => void;
};

const MemoTrials = () => {
  const navigate = useNavigate();
  const setIsDeleting = useTableTrialsStore((s) => s.setIsDeleting);
  const isDeleting = useTableTrialsStore((s) => s.isDeleting);

  // 👉 Edit this array to add/remove bulk ops. You can attach your own handlers.
  const BULK_OPS: BulkOp[] = [
    // {
    //   label: "Export",
    //   btnClassName: "bg-emerald-600 hover:bg-emerald-700 text-white",
    //   onClick: (items, api) => {
    //     console.log("Export trials:", items);
    //     // TODO: call your API here; on success:
    //     // api.clear(); or api.removeByIds(items.map(i => i.trialId));
    //     // api.refresh();
    //   },
    // },
    {
      label: "Delete",
      btnClassName: "bg-red-600 hover:bg-red-700 text-white",
      onClick: (items, api) => {
        console.log("Delete trials:", items);
        setIsDeleting(items);
        // TODO: call your API here; on success:
        // api.removeByIds(items.map(i => i.trialId));
        // api.refresh();
      },
    },
  ];

  const [trendingOn, setTrendingOn] = useState(false);
  const [trendingWindow, setTrendingWindow] = useState<TrendingWindow>("year");

  const {
    search,
    countryOpts,
    stateOpts,
    cityOpts,
    assetOpts,
    expired,
    exhausted,
    page,
    uiNonce,
    patch,
    reset,
  } = useTrialFilters();

  // ---- Build params (ALWAYS pageSize=10) ----
  const params = useMemo(() => {
    const p: Record<string, any> = { page, pageSize: PAGE_SIZE };

    if (search.trim()) p.title = search.trim();

    const csv = (arr: Opt[]) =>
      arr.length ? arr.map((o) => o.value).join(",") : "";

    const countryId = csv(countryOpts);
    const stateId = csv(stateOpts);
    const cityId = csv(cityOpts);
    const assetId = csv(assetOpts);

    if (countryId) p.countryId = countryId;
    if (stateId) p.stateId = stateId;
    if (cityId) p.cityId = cityId;
    if (assetId) p.assetId = assetId;

    if (expired !== "all") p.expired = expired === "true";
    if (exhausted !== "all") p.exhausted = exhausted === "true";
    if (trendingOn) p.sortedByHighestResponses = trendingWindow;

    return p;
  }, [
    page,
    search,
    countryOpts,
    stateOpts,
    cityOpts,
    assetOpts,
    expired,
    exhausted,
    trendingOn,
    trendingWindow,
  ]);

  const urlWithQuery = useMemo(() => {
    const usp = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") usp.set(k, String(v));
    });
    const base = endpoints.entities.trials.advancedListing; // "/internal/trial/advanced-listing"
    const qs = usp.toString();
    return qs ? `${base}?${qs}` : base;
  }, [params]);

  const { data, isLoading, isFetching, error, refetch } = useApiQuery(
    urlWithQuery,
    { key: ["trials-advanced", urlWithQuery] } as any
  );

  useEffect(() => {
    try {
      (refetch as any)?.();
    } catch {}
  }, [urlWithQuery]); // eslint-disable-line react-hooks/exhaustive-deps

  const payload = data?.data?.data ?? {};
  const meta = payload?.meta ?? {};
  const entries: any[] = Array.isArray(payload.entries) ? payload.entries : [];
  const total: number =
    typeof meta.total === "number" ? meta.total : entries.length ?? 0;

  const totalPages: number =
    typeof meta.totalPages === "number" && meta.totalPages > 0
      ? meta.totalPages
      : Math.max(1, Math.ceil((total || 1) / PAGE_SIZE));

  const currentPage: number =
    typeof meta.page === "number" && meta.page > 0 ? meta.page : page;

  const handleViewMore = (id: string, title: string) => {
    navigate(`/analytics/trials/${id}`, { state: { title } });
  };

  // Build page list with ellipses: Prev 1 2 3 … Next
  const buildPages = (): (number | "...")[] => {
    const maxPagesToShow = 9;
    const pages: (number | "...")[] = [];

    if (totalPages <= maxPagesToShow) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
      return pages;
    }

    const window = 2;
    const start = Math.max(2, currentPage - window);
    const end = Math.min(totalPages - 1, currentPage + window);

    pages.push(1);
    if (start > 2) pages.push("...");
    for (let i = start; i <= end; i++) pages.push(i);
    if (end < totalPages - 1) pages.push("...");
    pages.push(totalPages);

    return pages;
  };

  const handleResetAll = () => {
    useTrialFilters.persist?.clearStorage?.();
    reset();
    setTrendingOn(false);
    setTrendingWindow("day");
  };

  /* -----------------------------
     Multi-select helpers (page)
  ------------------------------*/
  const selectedApi = useSelectedTrials();
  const selectedCount = selectedApi.count();
  const selectedItems = selectedApi.all(); // Array<{trialId,title}>
  const selectedIds = selectedApi.allIds();

  // Items for current page: Array<{trialId,title}>
  const pageItems: SelectedTrial[] = useMemo(
    () =>
      entries.map((t: any) => ({
        trialId: t._id,
        title: t.title ?? "",
      })),
    [entries]
  );
  const pageIds = useMemo(() => pageItems.map((it) => it.trialId), [pageItems]);

  const allPageSelected =
    pageIds.length > 0 && pageIds.every((id) => selectedApi.isSelected(id));
  const anySelected = selectedCount > 0;

  const selectPage = () => selectedApi.addMany(pageItems);
  const deselectPage = () => selectedApi.removeManyByIds(pageIds);
  const clearAll = () => selectedApi.clear();

  /* -----------------------------
     Chips (active filters)
  ------------------------------*/
  const Chip = ({
    label,
    onRemove,
  }: {
    label: string;
    onRemove: () => void;
  }) => (
    <span className="inline-flex items-center gap-1 text-xs bg-muted px-2 py-1 rounded-full border">
      {label}
      <button
        type="button"
        onClick={onRemove}
        className="hover:opacity-80 transition"
        aria-label="Remove filter"
      >
        <X className="w-3 h-3" />
      </button>
    </span>
  );

  const { patch: patchStore } = useTrialFilters.getState();

  const chipBar = (
    <div className="flex flex-wrap gap-2">
      {/* Countries */}
      {countryOpts.map((o, idx) => (
        <Chip
          key={`c-${o.value}-${idx}`}
          label={`Country: ${o.label}`}
          onRemove={() =>
            patchStore({
              page: 1,
              countryOpts: countryOpts.filter((x) => x.value !== o.value),
            })
          }
        />
      ))}
      {/* States */}
      {stateOpts.map((o, idx) => (
        <Chip
          key={`s-${o.value}-${idx}`}
          label={`State: ${o.label}`}
          onRemove={() =>
            patchStore({
              page: 1,
              stateOpts: stateOpts.filter((x) => x.value !== o.value),
            })
          }
        />
      ))}
      {/* Cities */}
      {cityOpts.map((o, idx) => (
        <Chip
          key={`ci-${o.value}-${idx}`}
          label={`City: ${o.label}`}
          onRemove={() =>
            patchStore({
              page: 1,
              cityOpts: cityOpts.filter((x) => x.value !== o.value),
            })
          }
        />
      ))}
      {/* Assets */}
      {assetOpts.map((o, idx) => (
        <Chip
          key={`a-${o.value}-${idx}`}
          label={`Asset: ${o.label}`}
          onRemove={() =>
            patchStore({
              page: 1,
              assetOpts: assetOpts.filter((x) => x.value !== o.value),
            })
          }
        />
      ))}
      {/* Expired / Exhausted */}
      {expired !== "all" && (
        <Chip
          label={expired === "true" ? "Expired" : "Non-expired"}
          onRemove={() => patchStore({ page: 1, expired: "all" })}
        />
      )}
      {exhausted !== "all" && (
        <Chip
          label={exhausted === "true" ? "Exhausted" : "Non-exhausted"}
          onRemove={() => patchStore({ page: 1, exhausted: "all" })}
        />
      )}
      {/* Title search */}
      {search.trim() && (
        <Chip
          label={`Title: "${search.trim()}"`}
          onRemove={() => patchStore({ page: 1, search: "" })}
        />
      )}
      {/* Trending */}
      {trendingOn && (
        <Chip
          label={`Trending: ${trendingWindow}`}
          onRemove={() => {
            setTrendingOn(false);
            // page reset for consistency
            patch({ page: 1 });
          }}
        />
      )}
    </div>
  );

  /* -----------------------------
     Bulk operations bar (appears when selected)
  ------------------------------*/
  const bulkBar = anySelected ? (
    <div className="sticky top-[64px] bg-background/95 backdrop-blur border rounded-2xl px-3 py-2 flex flex-wrap gap-2 items-center justify-between">
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={allPageSelected}
          onChange={(e) => (e.target.checked ? selectPage() : deselectPage())}
          className="h-4 w-4"
          aria-label="Select all on this page"
        />
        <span className="text-sm">
          <strong>{selectedCount}</strong> selected
        </span>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={clearAll}>
            Clear all
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {BULK_OPS.map((op) => (
          <Button
            key={op.label}
            size="sm"
            className={op.btnClassName}
            onClick={() =>
              op.onClick?.(selectedItems, {
                clear: clearAll,
                removeByIds: (ids) => selectedApi.removeManyByIds(ids),
                refresh: () => (refetch as any)?.(),
              })
            }
          >
            {op.label}
          </Button>
        ))}
      </div>
    </div>
  ) : null;

  return (
    <>
      <div className="flex flex-col gap-6 md:px-4 h-full">
        {/* Header & create */}
        <section className="flex flex-col gap-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex flex-col gap-1">
              <h1 className="text-3xl font-bold">Trials</h1>
              <p className="text-muted-foreground">
                View detailed analytics of all the trials
              </p>
            </div>
            <div>
              <Button
                variant="default"
                onClick={() => navigate("/trials/create")}
              >
                <Plus /> Create New Trial
              </Button>
            </div>
          </div>

          <div className="flex justify-between w-full gap-2">
            <Input
              className="md:w-[40dvw]"
              placeholder="Search by title…"
              value={search}
              onChange={(e) => patch({ page: 1, search: e.target.value })}
              autoComplete="off"
            />
            <Button variant="secondary" onClick={handleResetAll}>
              Reset Filters
            </Button>
          </div>

          {/* Filters row */}
          <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
            <section className="flex flex-col gap-1">
              <label className="text-sm text-muted-foreground">Countries</label>
              <CountrySelect
                key={`country-${uiNonce}`}
                value={countryOpts}
                onChange={(opts) => patch({ page: 1, countryOpts: opts })}
                selectProps={{ menuPortalTarget: document.body }}
              />
            </section>

            <section className="flex flex-col gap-1">
              <label className="text-sm text-muted-foreground">States</label>
              <StateSelect
                key={`state-${uiNonce}`}
                value={stateOpts}
                onChange={(opts) => patch({ page: 1, stateOpts: opts })}
                selectProps={{ menuPortalTarget: document.body }}
              />
            </section>

            <section className="flex flex-col gap-1">
              <label className="text-sm text-muted-foreground">Cities</label>
              <CitySelect
                key={`city-${uiNonce}`}
                value={cityOpts}
                onChange={(opts) => patch({ page: 1, cityOpts: opts })}
                selectProps={{ menuPortalTarget: document.body }}
              />
            </section>

            <section className="flex flex-col gap-1">
              <label className="text-sm text-muted-foreground">Assets</label>
              <AssetMultiSelect
                value={assetOpts}
                onChange={(opts) => patch({ page: 1, assetOpts: opts })}
                selectProps={{ menuPortalTarget: document.body }}
              />
            </section>

            <section className="flex flex-col gap-1">
              <label className="text-sm text-muted-foreground">Expired</label>
              <Select
                value={expired}
                onValueChange={(v: Tri) => patch({ page: 1, expired: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="true">True</SelectItem>
                  <SelectItem value="false">False</SelectItem>
                </SelectContent>
              </Select>
            </section>

            <section className="flex flex-col gap-1">
              <label className="text-sm text-muted-foreground">Exhausted</label>
              <Select
                value={exhausted}
                onValueChange={(v: Tri) => patch({ page: 1, exhausted: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="true">True</SelectItem>
                  <SelectItem value="false">False</SelectItem>
                </SelectContent>
              </Select>
            </section>

            {/* Trending: sortedByHighestResponses */}
            <section className="flex flex-col gap-1">
              <label className="text-sm text-muted-foreground flex items-center gap-2">
                Trending
                <Switch
                  checked={trendingOn}
                  onCheckedChange={(v) => {
                    setTrendingOn(v);
                    if (v) patch({ page: 1 });
                  }}
                  aria-label="Toggle Trending"
                />
              </label>

              {/* Direct dropdown shown only when ON */}
              {trendingOn ? (
                <Select
                  value={trendingWindow}
                  onValueChange={(v: TrendingWindow) => {
                    setTrendingWindow(v);
                    patch({ page: 1 });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select window" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hour">Hour</SelectItem>
                    <SelectItem value="day">Day</SelectItem>
                    <SelectItem value="week">Week</SelectItem>
                    <SelectItem value="month">Month</SelectItem>
                    <SelectItem value="quarter">Quarter</SelectItem>
                    <SelectItem value="year">Year</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <div className="h-9" />
              )}
            </section>
          </section>

          {/* Active filter chips */}
          {chipBar}
        </section>

        {/* Bulk ops bar (only when any selected) */}
        {bulkBar}

        {error ? (
          <div className="text-red-500 text-sm">Failed to load trials.</div>
        ) : null}

        <div className="flex items-center gap-2">
          {(isLoading || isFetching) && (
            <span className="text-sm text-muted-foreground">Loading…</span>
          )}
        </div>

        {/* Trial list with per-card checkbox */}
        <div className="flex flex-col gap-4 max-h-[70vh] overflow-y-auto">
          {entries?.map((trial: any) => {
            const checked = selectedApi.isSelected(trial._id);
            return (
              <div key={trial._id} className="flex items-stretch gap-3">
                {/* Checkbox on the left */}
                <div className="pt-5 pl-1">
                  <input
                    type="checkbox"
                    className="h-4 w-4 mt-1"
                    checked={checked}
                    aria-label={`Select trial ${trial.title}`}
                    onChange={() =>
                      selectedApi.toggle({
                        trialId: trial._id,
                        title: trial.title ?? "",
                      })
                    }
                  />
                </div>

                {/* Card content */}
                <Card className="@container/card bg-primary/5 rounded-3xl flex flex-row justify-between items-center gap-32 w-full">
                  <CardHeader className="w-full">
                    <CardTitle className="text-lg font-semibold @[250px]/card:text-xl overflow-hidden text-ellipsis whitespace-nowrap">
                      {trial.title}
                    </CardTitle>
                    <CardDescription className="text-muted-foreground">
                      {trial.viewCount ?? 0} views • {trial.responseCount ?? 0}{" "}
                      responses
                    </CardDescription>
                  </CardHeader>
                  <CardFooter className="flex items-center gap-3">
                    <Button
                      onClick={() =>
                        navigate(`/trials/${trial._id}`, {
                          state: {
                            isNavigationEditing: false,
                          },
                        })
                      }
                      variant="outline"
                      className="w-fit md:h-12 rounded-2xl"
                    >
                      <Eye />
                    </Button>
                    <Button
                      onClick={() =>
                        navigate(`/trials/${trial._id}`, {
                          state: {
                            isNavigationEditing: true,
                          },
                        })
                      }
                      variant="outline"
                      className="w-fit md:h-12 rounded-2xl"
                    >
                      <Edit />
                    </Button>
                    {/* <Button
                      onClick={() => handleViewMore(trial._id, trial.title)}
                      variant="outline"
                      className="w-fit md:h-12 rounded-2xl"
                    >
                      <ChartNoAxesCombined />
                    </Button> */}
                  </CardFooter>
                </Card>
              </div>
            );
          })}
        </div>

        {/* Pagination Footer */}
        <section className="sticky bottom-0 left-0 bg-background flex justify-center py-4 shadow-md w-fit mx-auto rounded-2xl">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  aria-disabled={currentPage <= 1}
                  className={
                    currentPage <= 1 ? "pointer-events-none opacity-50" : ""
                  }
                  onClick={(e) => {
                    e.preventDefault();
                    if (currentPage > 1) patch({ page: currentPage - 1 });
                  }}
                />
              </PaginationItem>

              {buildPages().map((p, idx) =>
                p === "..." ? (
                  <PaginationItem key={`ellipsis-${idx}`}>
                    <PaginationEllipsis />
                  </PaginationItem>
                ) : (
                  <PaginationItem key={p}>
                    <PaginationLink
                      href="#"
                      isActive={p === currentPage}
                      onClick={(e) => {
                        e.preventDefault();
                        if (p !== currentPage) patch({ page: p as number });
                      }}
                    >
                      {p}
                    </PaginationLink>
                  </PaginationItem>
                )
              )}

              <PaginationItem>
                <PaginationNext
                  href="#"
                  aria-disabled={currentPage >= totalPages}
                  className={
                    currentPage >= totalPages
                      ? "pointer-events-none opacity-50"
                      : ""
                  }
                  onClick={(e) => {
                    e.preventDefault();
                    if (currentPage < totalPages)
                      patch({ page: currentPage + 1 });
                  }}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </section>
      </div>
      {isDeleting && isDeleting?.length > 0 && (
        <ConfirmDeleteTrialPollsModal url={urlWithQuery} />
      )}
    </>
  );
};

const Trials = memo(MemoTrials);
export default Trials;
