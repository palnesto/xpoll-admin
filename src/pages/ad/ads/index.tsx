import { memo, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { useApiQuery } from "@/hooks/useApiQuery";
import ListingPagination from "@/components/commons/listing-pagination";
import { Plus, X } from "lucide-react";

import { useAdFilters, Opt, AdStatus } from "@/stores/adFilters.store";
import AdInfiniteSelect from "@/components/commons/selects/ad/ad-infinite-select";
import AdOwnerInfiniteSelect from "@/components/commons/selects/ad/ad-owner-infinite-select";
import IndustryInfiniteSelect from "@/components/commons/selects/industry-infinite-select";

const PAGE_SIZE = 10;
const SEARCH_DEBOUNCE_MS = 350;

type AdOwnerLite = { _id: string; name: string; description?: string | null };

type AdListItem = {
  _id: string;
  adOwnerId: string;
  title: string;
  description?: string | null;
  archivedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  status?: AdStatus;
  adOwner?: AdOwnerLite | null;
};

function useDebouncedValue<T>(value: T, delayMs: number) {
  const [debounced, setDebounced] = useState<T>(value);
  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}

function Chip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs bg-muted px-2 py-1 rounded-full border">
      {label}
      <button
        type="button"
        onClick={onRemove}
        className="hover:opacity-80 transition"
        aria-label="Remove"
      >
        <X className="w-3 h-3" />
      </button>
    </span>
  );
}

function ArchivedTag() {
  return (
    <span className="absolute top-4 right-4 w-fit text-xs px-2 py-1 rounded-xl font-semibold border bg-red-600/15 text-red-400 border-red-600/25">
      Archived
    </span>
  );
}

function StatusTag({ status }: { status?: AdStatus }) {
  const s = status ?? "draft";
  return (
    <span className="w-fit text-[11px] px-2 py-0.5 rounded-full font-semibold border bg-muted/30 text-muted-foreground">
      {s.toUpperCase()}
    </span>
  );
}

function AdCard({
  ad,
  onOpen,
}: {
  ad: AdListItem;
  onOpen: (id: string) => void;
}) {
  const isArchived = ad.archivedAt != null;
  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={() => onOpen(ad._id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onOpen(ad._id);
      }}
      className={cn(
        "@container/card rounded-3xl cursor-pointer transition",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        isArchived
          ? "bg-red-500/10 hover:bg-red-500/15"
          : "bg-primary/5 hover:bg-primary/10",
      )}
    >
      <CardHeader className="relative flex flex-col gap-2 pr-20">
        {isArchived ? <ArchivedTag /> : null}

        <div className="flex items-center gap-2">
          <CardTitle
            className={cn(
              "text-lg font-semibold @[250px]/card:text-xl",
              "line-clamp-1",
            )}
            title={ad.title}
          >
            {ad.title}
          </CardTitle>
          <StatusTag status={ad.status} />
        </div>

        <CardDescription className="text-muted-foreground">
          <p className="line-clamp-2">{ad.description || "—"}</p>
        </CardDescription>

        <div className="text-xs text-muted-foreground space-y-1">
          <div>Owner: {ad.adOwner?.name ?? "—"}</div>
          <div className="font-mono">ID: {ad._id}</div>
        </div>
      </CardHeader>
    </Card>
  );
}

function Header({
  onReset,
  onCreate,
}: {
  onReset: () => void;
  onCreate: () => void;
}) {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold">Ads</h1>
          <p className="text-muted-foreground">
            Manage and review advertisements
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="default" onClick={onCreate}>
            <Plus className="h-4 w-4" /> Create Ad
          </Button>
          <Button variant="secondary" onClick={onReset}>
            Reset Filters
          </Button>
        </div>
      </div>
    </section>
  );
}

function LoadState({ error, loading }: { error: boolean; loading: boolean }) {
  return (
    <>
      {error ? (
        <div className="text-red-500 text-sm">Failed to load ads.</div>
      ) : null}
      {loading ? (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Loading…</span>
        </div>
      ) : null}
    </>
  );
}

const MemoAdsPage = () => {
  const navigate = useNavigate();
  const {
    title,
    description,
    includeArchived,
    adOwner,
    adOwnerId,
    status,
    industryIds,
    excludedAdOpts,
    page,
    patch,
    reset,
  } = useAdFilters();

  const debouncedTitle = useDebouncedValue(title, SEARCH_DEBOUNCE_MS);
  const debouncedDescription = useDebouncedValue(
    description,
    SEARCH_DEBOUNCE_MS,
  );
  const debouncedOwner = useDebouncedValue(adOwner, SEARCH_DEBOUNCE_MS);

  const excludedIds = useMemo(
    () => excludedAdOpts.map((o) => o.value),
    [excludedAdOpts],
  );

  const urlWithQuery = useMemo(() => {
    const usp = new URLSearchParams();
    usp.set("page", String(page));
    usp.set("pageSize", String(PAGE_SIZE));
    usp.set("includeArchived", String(includeArchived));

    const t = debouncedTitle.trim();
    const d = debouncedDescription.trim();
    const o = debouncedOwner.trim();

    if (t) usp.set("title", t);
    if (d) usp.set("description", d);
    if (o) usp.set("adOwner", o);
    if (adOwnerId) usp.set("adOwnerId", adOwnerId);

    if (status) usp.set("status", status);
    if (industryIds.length) usp.set("industryIds", industryIds.join(","));
    if (excludedIds.length) usp.set("excludeIds", excludedIds.join(","));

    const base = "/internal/advertisement/ad/advanced-listing";
    const qs = usp.toString();
    return qs ? `${base}?${qs}` : base;
  }, [
    page,
    includeArchived,
    debouncedTitle,
    debouncedDescription,
    debouncedOwner,
    adOwnerId,
    status,
    industryIds,
    excludedIds,
  ]);

  const { data, isLoading, isFetching, error, refetch } = useApiQuery(
    urlWithQuery,
    {
      key: ["ads-advanced", urlWithQuery],
    } as any,
  );

  useEffect(() => {
    try {
      (refetch as any)?.();
    } catch {}
  }, [urlWithQuery]); // eslint-disable-line react-hooks/exhaustive-deps

  const payload = (data as any)?.data?.data ?? {};
  const entries: AdListItem[] = Array.isArray(payload.entries)
    ? payload.entries
    : [];
  const total: number =
    typeof payload.total === "number" ? payload.total : (entries.length ?? 0);
  const totalPages = Math.max(1, Math.ceil((total || 1) / PAGE_SIZE));

  const handleResetAll = () => {
    useAdFilters.persist?.clearStorage?.();
    reset();
  };

  const openAd = (id: string) => navigate(`/ad/ads/${id}`);
  const goToCreate = () => navigate("/ad/ads/create");

  const addExcludedAd = (opt: Opt | null) => {
    if (!opt) return;
    if (excludedAdOpts.some((x) => x.value === opt.value)) return;
    patch({ page: 1, excludedAdOpts: [...excludedAdOpts, opt] });
  };

  const removeExcludedAd = (id: string) => {
    patch({
      page: 1,
      excludedAdOpts: excludedAdOpts.filter((x) => x.value !== id),
    });
  };

  const removeIndustry = (id: string) => {
    patch({ page: 1, industryIds: industryIds.filter((x) => x !== id) });
  };

  const handlers = {
    setTitle: (v: string) => patch({ page: 1, title: v }),
    setDescription: (v: string) => patch({ page: 1, description: v }),
    setIncludeArchived: (v: boolean) => patch({ page: 1, includeArchived: v }),
    setOwnerSearch: (v: string) =>
      patch({ page: 1, adOwner: v, adOwnerId: null }),
    setOwnerId: (v: string | null) =>
      patch({ page: 1, adOwnerId: v, adOwner: "" }),
    setStatus: (v: "" | AdStatus) => patch({ page: 1, status: v }),
    setPage: (next: number) => patch({ page: next }),
  };

  return (
    <div className="flex flex-col gap-6 md:px-4 h-full">
      <Header onReset={handleResetAll} onCreate={goToCreate} />

      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        <section className="flex flex-col gap-1">
          <label className="text-sm text-muted-foreground">Title</label>
          <Input
            placeholder="Search by title…"
            value={title}
            onChange={(e) => handlers.setTitle(e.target.value)}
            autoComplete="off"
          />
        </section>

        <section className="flex flex-col gap-1">
          <label className="text-sm text-muted-foreground">Description</label>
          <Input
            placeholder="Search by description…"
            value={description}
            onChange={(e) => handlers.setDescription(e.target.value)}
            autoComplete="off"
          />
        </section>

        <section className="flex flex-col gap-1">
          <label className="text-sm text-muted-foreground">
            Owner (search)
          </label>
          <Input
            placeholder="Search owner name/desc/id…"
            value={adOwner}
            onChange={(e) => handlers.setOwnerSearch(e.target.value)}
            autoComplete="off"
          />
          <div className="text-[11px] text-muted-foreground">
            Uses backend <span className="font-mono">adOwner</span> filter
            (matches owner id/name/desc).
          </div>
        </section>

        <section className="flex flex-col gap-1">
          <label className="text-sm text-muted-foreground">Owner (exact)</label>
          <AdOwnerInfiniteSelect
            placeholder="Pick exact owner…"
            queryParams={{ includeArchived: false }}
            onChange={(opt) => handlers.setOwnerId(opt?.value ?? null)}
            selectProps={{ menuPortalTarget: document.body }}
          />
        </section>

        <section className="flex flex-col gap-1">
          <label className="text-sm text-muted-foreground">Status</label>
          <select
            className="h-10 rounded-md border bg-transparent px-3 text-sm"
            value={status}
            onChange={(e) => handlers.setStatus(e.target.value as any)}
          >
            <option value="">All</option>
            <option value="draft">Draft</option>
            <option value="scheduled">Scheduled</option>
            <option value="live">Live</option>
            <option value="ended">Ended</option>
          </select>
        </section>

        <section className="flex flex-col gap-1">
          <label className="text-sm text-muted-foreground">Industries</label>
          <IndustryInfiniteSelect
            placeholder="Add industry filter…"
            queryParams={{ includeArchived: false }}
            onChange={(opt) => {
              const id = opt?.value;
              if (!id) return;
              if (industryIds.includes(id)) return;
              patch({ page: 1, industryIds: [...industryIds, id] });
            }}
            selectProps={{ menuPortalTarget: document.body }}
          />
          {industryIds.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-2">
              {industryIds.map((id) => (
                <Chip key={id} label={id} onRemove={() => removeIndustry(id)} />
              ))}
            </div>
          )}
        </section>

        <section className="flex flex-col gap-1">
          <label className="text-sm text-muted-foreground">Exclude Ads</label>
          <AdInfiniteSelect
            placeholder="Select an ad to exclude…"
            queryParams={{
              includeArchived: false,
              excludeIds: excludedIds.join(","),
            }}
            onChange={(opt) => addExcludedAd(opt as any)}
            selectProps={{ menuPortalTarget: document.body }}
          />

          {excludedAdOpts.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-2">
              {excludedAdOpts.map((o) => (
                <Chip
                  key={o.value}
                  label={o.label}
                  onRemove={() => removeExcludedAd(o.value)}
                />
              ))}
            </div>
          )}
        </section>

        <section className="flex flex-col gap-1">
          <label className="text-sm text-muted-foreground flex items-center justify-between">
            Include Archived
            <Switch
              checked={includeArchived}
              onCheckedChange={handlers.setIncludeArchived}
              aria-label="Toggle include archived"
            />
          </label>

          <div className="text-xs text-muted-foreground">
            {includeArchived
              ? "Showing archived + active"
              : "Showing active only"}
          </div>
        </section>
      </section>

      <LoadState error={!!error} loading={isLoading || isFetching} />

      <div className="flex flex-col gap-4 max-h-[70vh] overflow-y-auto">
        {entries.map((ad) => (
          <AdCard key={ad._id} ad={ad} onOpen={openAd} />
        ))}
      </div>

      <ListingPagination
        page={page}
        totalPages={totalPages}
        onPageChange={handlers.setPage}
      />
    </div>
  );
};

const AdsPage = memo(MemoAdsPage);
export default AdsPage;
