// src/components/ad/ad-owner-ads-section.tsx

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, ExternalLink, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { useApiQuery } from "@/hooks/useApiQuery";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";

import ListingPagination from "@/components/commons/listing-pagination";
import IndustryInfiniteSelect from "@/components/commons/selects/industry-infinite-select";

const PAGE_SIZE = 10;
const SEARCH_DEBOUNCE_MS = 350;

type AdStatus = "draft" | "scheduled" | "live" | "ended";

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

function Chip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs bg-muted px-2 py-1 rounded-full border">
      <span className="max-w-[220px] truncate">{label}</span>
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

        <div className="flex items-center gap-2 min-w-0">
          <CardTitle
            className={cn(
              "text-base font-semibold @[250px]/card:text-lg",
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
          <div className="font-mono">ID: {ad._id}</div>
        </div>
      </CardHeader>
    </Card>
  );
}

export default function AdOwnerAdsSection({
  adOwnerId,
  className,
}: {
  adOwnerId: string;
  className?: string;
}) {
  const navigate = useNavigate();

  // filters (local, NOT persisted)
  const [search, setSearch] = useState("");
  const [includeArchived, setIncludeArchived] = useState(false);
  const [status, setStatus] = useState<"" | AdStatus>("");
  const [industryIds, setIndustryIds] = useState<string[]>([]);
  const [industryLabels, setIndustryLabels] = useState<Record<string, string>>(
    {},
  );
  const [page, setPage] = useState(1);

  const debouncedSearch = useDebouncedValue(search, SEARCH_DEBOUNCE_MS);

  const urlWithQuery = useMemo(() => {
    const usp = new URLSearchParams();
    usp.set("page", String(page));
    usp.set("pageSize", String(PAGE_SIZE));
    usp.set("includeArchived", String(includeArchived));

    // ✅ exact owner filter (per your note)
    usp.set("adOwner", String(adOwnerId));

    // ✅ single search input: apply to both title + description
    const q = String(debouncedSearch || "").trim();
    if (q) {
      usp.set("title", q);
      usp.set("description", q);
    }

    if (status) usp.set("status", status);
    if (industryIds.length) usp.set("industryIds", industryIds.join(","));

    const base = "/internal/advertisement/ad/advanced-listing";
    const qs = usp.toString();
    return qs ? `${base}?${qs}` : base;
  }, [page, includeArchived, debouncedSearch, adOwnerId, status, industryIds]);

  const { data, isLoading, isFetching, error, refetch } = useApiQuery(
    urlWithQuery,
    {
      key: ["ad-owner-ads-advanced", adOwnerId, urlWithQuery],
      enabled: !!adOwnerId,
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

  const isBusy = isLoading || isFetching;

  const openAd = (id: string) => navigate(`/ad/ads/${id}`);

  const resetAll = () => {
    setSearch("");
    setIncludeArchived(false);
    setStatus("");
    setIndustryIds([]);
    setIndustryLabels({});
    setPage(1);
  };

  const removeIndustry = (id: string) => {
    setIndustryIds((prev) => prev.filter((x) => x !== id));
    setPage(1);
  };

  return (
    <Card
      className={cn(
        "rounded-3xl overflow-hidden",
        "bg-gradient-to-b from-primary/10 via-background to-background",
        className,
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base font-semibold">Ads</CardTitle>
              <span className="text-xs text-muted-foreground tabular-nums">
                {total ? `${total} total` : "—"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              type="button"
              variant="secondary"
              className="rounded-xl"
              onClick={() => navigate("/ad/ads")}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              View all ads
            </Button>

            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              onClick={resetAll}
              disabled={isBusy}
              title="Reset filters"
            >
              Reset
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="flex flex-col gap-1 md:col-span-1">
            <label className="text-xs text-muted-foreground">
              Search (title or description)
            </label>
            <Input
              value={search}
              onChange={(e) => {
                setPage(1);
                setSearch(e.target.value);
              }}
              placeholder="Search…"
              autoComplete="off"
              className="rounded-2xl"
            />
            <div className="text-[11px] text-muted-foreground">
              Uses backend <span className="font-mono">title</span> +{" "}
              <span className="font-mono">description</span>.
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">Status</label>
            <select
              className="h-10 rounded-2xl border bg-transparent px-3 text-sm"
              value={status}
              onChange={(e) => {
                setPage(1);
                setStatus(e.target.value as any);
              }}
            >
              <option value="">All</option>
              <option value="draft">Draft</option>
              <option value="scheduled">Scheduled</option>
              <option value="live">Live</option>
              <option value="ended">Ended</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground flex items-center justify-between">
              Include Archived
              <Switch
                checked={includeArchived}
                onCheckedChange={(v) => {
                  setPage(1);
                  setIncludeArchived(v);
                }}
                aria-label="Toggle include archived"
              />
            </label>
            <div className="text-[11px] text-muted-foreground">
              {includeArchived
                ? "Showing archived + active"
                : "Showing active only"}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">Industries</label>
            <IndustryInfiniteSelect
              placeholder="Add industry filter…"
              queryParams={{ includeArchived: true }}
              onChange={(opt) => {
                const id = opt?.value ? String(opt.value) : "";
                const label = opt?.label ? String(opt.label) : "";
                if (!id) return;
                setIndustryIds((prev) => {
                  if (prev.includes(id)) return prev;
                  return [...prev, id];
                });
                setIndustryLabels((prev) => ({ ...prev, [id]: label || id }));
                setPage(1);
              }}
              selectProps={{ menuPortalTarget: document.body }}
            />

            {industryIds.length > 0 ? (
              <div className="flex flex-wrap gap-2 pt-2">
                {industryIds.map((id) => (
                  <Chip
                    key={id}
                    label={industryLabels[id] || id}
                    onRemove={() => removeIndustry(id)}
                  />
                ))}
              </div>
            ) : null}
          </div>

          <div className="rounded-2xl border bg-background/50 p-3 text-xs text-muted-foreground flex items-center justify-between">
            <span className="tabular-nums">
              Page {page} / {totalPages}
            </span>
            <span className="tabular-nums">
              Showing {entries.length} / {total || 0}
            </span>
          </div>
        </div>

        {/* Load state */}
        {error ? (
          <div className="text-red-500 text-sm">Failed to load ads.</div>
        ) : null}

        {isBusy ? (
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm text-muted-foreground">Loading…</span>
          </div>
        ) : null}

        {/* List */}
        {!isBusy && entries.length === 0 ? (
          <div className="text-sm text-muted-foreground">
            No ads found for this owner.
          </div>
        ) : null}

        <div className="flex flex-col gap-3">
          {entries.map((ad) => (
            <AdCard key={ad._id} ad={ad} onOpen={openAd} />
          ))}
        </div>

        {/* Pagination */}
        <ListingPagination
          page={page}
          totalPages={totalPages}
          onPageChange={(next) => setPage(next)}
        />
      </CardContent>
    </Card>
  );
}
