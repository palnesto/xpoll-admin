// src/pages/ad/ad-owners/index.tsx
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
import { endpoints } from "@/api/endpoints";
import { useAdOwnerFilters, Opt } from "@/stores/useAdOwnerFilters";
import ListingPagination from "@/components/commons/listing-pagination";
import { Plus, X } from "lucide-react";
import AdOwnerInfiniteSelect from "@/components/commons/selects/ad/ad-owner-infinite-select";

const PAGE_SIZE = 10;
const SEARCH_DEBOUNCE_MS = 350;

type AdOwner = {
  _id: string;
  name: string;
  description?: string | null;
  archivedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

/* -----------------------------
   Small hooks / helpers
------------------------------ */
function useDebouncedValue<T>(value: T, delayMs: number) {
  const [debounced, setDebounced] = useState<T>(value);

  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(t);
  }, [value, delayMs]);

  return debounced;
}

/* -----------------------------
   Presentational pieces
------------------------------ */
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

function AdOwnerCard({
  owner,
  onOpen,
}: {
  owner: AdOwner;
  onOpen: (id: string) => void;
}) {
  const isArchived = owner.archivedAt != null;

  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={() => onOpen(owner._id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onOpen(owner._id);
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

        <CardTitle
          className={cn(
            "text-lg font-semibold @[250px]/card:text-xl",
            "line-clamp-1",
          )}
          title={owner.name}
        >
          {owner.name}
        </CardTitle>

        <CardDescription className="text-muted-foreground">
          <p className="line-clamp-2">{owner.description || "—"}</p>
        </CardDescription>

        <div className="text-xs text-muted-foreground">
          <span className="mr-3">ID: {owner._id}</span>
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
          <h1 className="text-3xl font-bold">Ad Owners</h1>
          <p className="text-muted-foreground">
            Manage and review advertisement owners
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="default" onClick={onCreate}>
            <Plus className="h-4 w-4" /> Create Ad Owner
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
        <div className="text-red-500 text-sm">Failed to load ad owners.</div>
      ) : null}

      {loading ? (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Loading…</span>
        </div>
      ) : null}
    </>
  );
}

function OwnersList({
  entries,
  onOpenOwner,
}: {
  entries: AdOwner[];
  onOpenOwner: (id: string) => void;
}) {
  return (
    <div className="flex flex-col gap-4 max-h-[70vh] overflow-y-auto">
      {entries.map((owner) => (
        <AdOwnerCard key={owner._id} owner={owner} onOpen={onOpenOwner} />
      ))}
    </div>
  );
}

/* -----------------------------
   Page component
------------------------------ */
const MemoAdOwnersPage = () => {
  const navigate = useNavigate();

  const {
    name,
    description,
    includeArchived,
    excludedOwnerOpts,
    page,
    patch,
    reset,
  } = useAdOwnerFilters();

  // Debounce only "typing" inputs that would refetch per keystroke
  const debouncedName = useDebouncedValue(name, SEARCH_DEBOUNCE_MS);
  const debouncedDescription = useDebouncedValue(
    description,
    SEARCH_DEBOUNCE_MS,
  );

  const excludedIds = useMemo(
    () => excludedOwnerOpts.map((o) => o.value),
    [excludedOwnerOpts],
  );

  const urlWithQuery = useMemo(() => {
    const usp = new URLSearchParams();
    usp.set("page", String(page));
    usp.set("pageSize", String(PAGE_SIZE));
    usp.set("includeArchived", String(includeArchived));

    const tn = debouncedName.trim();
    const td = debouncedDescription.trim();
    const excludeCsv = excludedIds.length ? excludedIds.join(",") : "";

    if (tn) usp.set("name", tn);
    if (td) usp.set("description", td);
    if (excludeCsv) usp.set("excludeIds", excludeCsv);

    const base = endpoints.entities.ad.adOwners.advancedListing;
    const qs = usp.toString();
    return qs ? `${base}?${qs}` : base;
  }, [page, includeArchived, debouncedName, debouncedDescription, excludedIds]);

  const { data, isLoading, isFetching, error, refetch } = useApiQuery(
    urlWithQuery,
    { key: ["ad-owners-advanced", urlWithQuery] } as any,
  );

  useEffect(() => {
    try {
      (refetch as any)?.();
    } catch {}
  }, [urlWithQuery]); // eslint-disable-line react-hooks/exhaustive-deps

  const payload = data?.data?.data ?? {};
  const entries: AdOwner[] = Array.isArray(payload.entries)
    ? payload.entries
    : [];
  const total: number =
    typeof payload.total === "number" ? payload.total : (entries.length ?? 0);

  const totalPages = Math.max(1, Math.ceil((total || 1) / PAGE_SIZE));

  const handleResetAll = () => {
    useAdOwnerFilters.persist?.clearStorage?.();
    reset();
  };

  const openOwner = (id: string) => navigate(`/ad/ad-owners/${id}`);
  const goToCreate = () => navigate("/ad/ad-owners/create");

  const addExcludedOwner = (opt: Opt | null) => {
    if (!opt) return;
    if (excludedOwnerOpts.some((x) => x.value === opt.value)) return;

    patch({
      page: 1,
      excludedOwnerOpts: [...excludedOwnerOpts, opt],
    });
  };

  const removeExcludedOwner = (id: string) => {
    patch({
      page: 1,
      excludedOwnerOpts: excludedOwnerOpts.filter((x) => x.value !== id),
    });
  };

  const handlers = {
    setName: (v: string) => patch({ page: 1, name: v }),
    setDescription: (v: string) => patch({ page: 1, description: v }),
    setIncludeArchived: (v: boolean) => patch({ page: 1, includeArchived: v }),
    setPage: (next: number) => patch({ page: next }),
  };

  return (
    <div className="flex flex-col gap-6 md:px-4 h-full">
      <Header onReset={handleResetAll} onCreate={goToCreate} />

      {/* Filters */}
      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        <section className="flex flex-col gap-1">
          <label className="text-sm text-muted-foreground">Name</label>
          <Input
            placeholder="Search by name…"
            value={name}
            onChange={(e) => handlers.setName(e.target.value)}
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

        {/* Exclude IDs (Infinite Select + chips) */}
        <section className="flex flex-col gap-1">
          <label className="text-sm text-muted-foreground">
            Exclude Ad Owners
          </label>

          <AdOwnerInfiniteSelect
            excludeIds={excludedIds}
            placeholder="Select an ad owner to exclude…"
            onChange={(opt) => addExcludedOwner(opt as any)}
            selectProps={{ menuPortalTarget: document.body }}
          />

          {excludedOwnerOpts.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-2">
              {excludedOwnerOpts.map((o) => (
                <Chip
                  key={o.value}
                  label={o.label}
                  onRemove={() => removeExcludedOwner(o.value)}
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

      <OwnersList entries={entries} onOpenOwner={openOwner} />

      <ListingPagination
        page={page}
        totalPages={totalPages}
        onPageChange={handlers.setPage}
      />
    </div>
  );
};

const AdOwnersPage = memo(MemoAdOwnersPage);
export default AdOwnersPage;
