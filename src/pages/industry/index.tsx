// src/pages/industry/index.tsx
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
import ListingPagination from "@/components/commons/listing-pagination";
import { Plus, X } from "lucide-react";

// ✅ you should create this store same as useAdOwnerFilters but for industries
import { useIndustryFilters, Opt } from "@/stores/useIndustryFilters";
import IndustryInfiniteSelect from "@/components/commons/selects/industry-infinite-select";

// ✅ new select

const PAGE_SIZE = 10;
const SEARCH_DEBOUNCE_MS = 350;

type Industry = {
  _id: string;
  name: string;
  description?: string | null;
  archivedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
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

function IndustryCard({
  item,
  onOpen,
}: {
  item: Industry;
  onOpen: (id: string) => void;
}) {
  const isArchived = item.archivedAt != null;

  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={() => onOpen(item._id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onOpen(item._id);
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
          title={item.name}
        >
          {item.name}
        </CardTitle>

        <CardDescription className="text-muted-foreground">
          <p className="line-clamp-2">{item.description || "—"}</p>
        </CardDescription>

        <div className="text-xs text-muted-foreground">
          <span className="mr-3">ID: {item._id}</span>
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
          <h1 className="text-3xl font-bold">Industries</h1>
          <p className="text-muted-foreground">Manage and review industries</p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="default" onClick={onCreate}>
            <Plus className="h-4 w-4" /> Create Industry
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
        <div className="text-red-500 text-sm">Failed to load industries.</div>
      ) : null}

      {loading ? (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Loading…</span>
        </div>
      ) : null}
    </>
  );
}

function ItemsList({
  entries,
  onOpenItem,
}: {
  entries: Industry[];
  onOpenItem: (id: string) => void;
}) {
  return (
    <div className="flex flex-col gap-4 max-h-[70vh] overflow-y-auto">
      {entries.map((x) => (
        <IndustryCard key={x._id} item={x} onOpen={onOpenItem} />
      ))}
    </div>
  );
}

const MemoIndustriesPage = () => {
  const navigate = useNavigate();

  const {
    name,
    description,
    includeArchived,
    excludedIndustryOpts,
    page,
    patch,
    reset,
  } = useIndustryFilters();

  const debouncedName = useDebouncedValue(name, SEARCH_DEBOUNCE_MS);
  const debouncedDescription = useDebouncedValue(
    description,
    SEARCH_DEBOUNCE_MS,
  );

  const excludedIds = useMemo(
    () => excludedIndustryOpts.map((o) => o.value),
    [excludedIndustryOpts],
  );

  const urlWithQuery = useMemo(() => {
    const usp = new URLSearchParams();
    usp.set("page", String(page));
    usp.set("pageSize", String(PAGE_SIZE));
    usp.set("includeArchived", String(includeArchived));

    const tn = debouncedName.trim();
    const td = debouncedDescription.trim();

    if (tn) usp.set("name", tn);
    if (td) usp.set("description", td);
    if (excludedIds.length) usp.set("excludeIds", excludedIds.join(","));

    const base = endpoints.entities.industry.advancedListing;
    const qs = usp.toString();
    return qs ? `${base}?${qs}` : base;
  }, [page, includeArchived, debouncedName, debouncedDescription, excludedIds]);

  const { data, isLoading, isFetching, error, refetch } = useApiQuery(
    urlWithQuery,
    { key: ["industries-advanced", urlWithQuery] } as any,
  );

  useEffect(() => {
    try {
      (refetch as any)?.();
    } catch {}
  }, [urlWithQuery]); // eslint-disable-line react-hooks/exhaustive-deps

  const payload = data?.data?.data ?? {};
  const entries: Industry[] = Array.isArray(payload.entries)
    ? payload.entries
    : [];
  const total: number =
    typeof payload.total === "number" ? payload.total : (entries.length ?? 0);

  const totalPages = Math.max(1, Math.ceil((total || 1) / PAGE_SIZE));

  const handleResetAll = () => {
    useIndustryFilters.persist?.clearStorage?.();
    reset();
  };

  const openItem = (id: string) => navigate(`/industry/${id}`);
  const goToCreate = () => navigate("/industry/create");

  const addExcluded = (opt: Opt | null) => {
    if (!opt) return;
    if (excludedIndustryOpts.some((x) => x.value === opt.value)) return;

    patch({
      page: 1,
      excludedIndustryOpts: [...excludedIndustryOpts, opt],
    });
  };

  const removeExcluded = (id: string) => {
    patch({
      page: 1,
      excludedIndustryOpts: excludedIndustryOpts.filter((x) => x.value !== id),
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

        <section className="flex flex-col gap-1">
          <label className="text-sm text-muted-foreground">
            Exclude Industries
          </label>

          <IndustryInfiniteSelect
            placeholder="Select an industry to exclude…"
            queryParams={{
              includeArchived: false, // ✅ hide archived inside exclude select
              excludeIds: excludedIds.join(","), // ✅ hide already-selected chip values
            }}
            onChange={(opt) => addExcluded(opt as any)}
            selectProps={{ menuPortalTarget: document.body }}
          />

          {excludedIndustryOpts.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-2">
              {excludedIndustryOpts.map((o) => (
                <Chip
                  key={o.value}
                  label={o.label}
                  onRemove={() => removeExcluded(o.value)}
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

      <ItemsList entries={entries} onOpenItem={openItem} />

      <ListingPagination
        page={page}
        totalPages={totalPages}
        onPageChange={handlers.setPage}
      />
    </div>
  );
};

const IndustriesPage = memo(MemoIndustriesPage);
export default IndustriesPage;
